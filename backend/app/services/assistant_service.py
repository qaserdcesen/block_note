import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.llm_client import LLMClient
from app.models.habit import Habit, HabitSchedule
from app.models.message import Message, MessageRole
from app.models.reminder import ReminderType
from app.models.task import Task
from app.models.user import User
from app.schemas.habit import HabitCreate
from app.schemas.reminder import ReminderCreate
from app.schemas.task import TaskCreate
from app.services import habit_service, reminder_service, task_service

settings = get_settings()
llm_client = LLMClient()


def _log_message(db: Session, user_id: int, role: MessageRole, content: str, metadata: Optional[dict] = None) -> Message:
    message = Message(user_id=user_id, role=role, content=content, meta=metadata)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def _parse_iso_datetime(raw: Optional[str]) -> Optional[datetime]:
    if not raw:
        return None
    cleaned = str(raw).strip()
    if not cleaned:
        return None
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _load_recent_messages(db: Session, user_id: int, limit: int = 10) -> List[Message]:
    stmt = (
        select(Message)
        .where(Message.user_id == user_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = list(db.execute(stmt).scalars().all())
    return list(reversed(messages))


def _format_task_line(task: Task) -> str:
    due = task.due_datetime.isoformat() if task.due_datetime else "no due date"
    status = task.status.value if hasattr(task.status, "value") else str(task.status)
    return f"#{task.id} {task.title} [{status}] due {due}, priority {task.priority}"


def _build_state_snapshot(db: Session, user_id: int) -> str:
    tasks = (
        db.execute(
            select(Task)
            .where(Task.user_id == user_id)
            .order_by(Task.due_datetime.is_(None), Task.due_datetime.asc(), Task.created_at.desc())
            .limit(8)
        )
        .scalars()
        .all()
    )
    reminders = reminder_service.list_reminders(db, user_id)[:5]
    habits = (
        db.execute(
            select(Habit)
            .where(Habit.user_id == user_id)
            .where(Habit.is_active.is_(True))
            .order_by(Habit.created_at.desc())
            .limit(5)
        )
        .scalars()
        .all()
    )

    parts: list[str] = []
    if tasks:
        parts.append("Tasks:")
        parts.extend(f"- {_format_task_line(task)}" for task in tasks)
    else:
        parts.append("Tasks: empty.")

    if reminders:
        parts.append("Reminders:")
        for reminder in reminders:
            trigger = reminder.trigger_time.isoformat() if reminder.trigger_time else "no time"
            reminder_type = reminder.type.value if hasattr(reminder.type, "value") else str(reminder.type)
            parts.append(f"- #{reminder.id} {reminder_type} @ {trigger} (active={reminder.is_active})")
    else:
        parts.append("Reminders: empty.")

    if habits:
        parts.append("Habits:")
        parts.extend(
            f"- #{habit.id} {habit.name} ({habit.schedule_type}) progress {habit.completion_value}%"
            for habit in habits
        )
    else:
        parts.append("Habits: empty.")

    return "\n".join(parts)


def _build_system_prompt(user: Optional[User], snapshot: str) -> str:
    tz = (user.timezone if user and user.timezone else settings.scheduler_timezone) or "UTC"
    language = "Russian"
    return (
        "You are an AI assistant for a productivity app (tasks/reminders/habits). "
        f"Prefer replying in {language} and keep answers concise unless the user asks for another language. "
        "Always respond with JSON containing keys reply and actions. "
        "actions is an array. Allowed type values: create_task, create_reminder, create_habit. "
        "create_task fields: title (required), description (optional), "
        "due_datetime (ISO 8601 with timezone), priority (1-5), reminder_time (ISO for a quick reminder for the task). "
        "create_reminder fields: trigger_time (ISO 8601), timezone (e.g., Europe/Moscow), "
        "task_title (optional to link to an existing or new task). "
        "create_habit fields: name (required), description (optional), schedule_type (daily/weekly/custom; default daily). "
        "If no actions are needed, return actions: []. Use the snapshot only; do not invent data. "
        f"User timezone: {tz}. "
        "Data snapshot:\n"
        f"{snapshot}"
    )


def _prepare_messages(user: Optional[User], history: List[Message], snapshot: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": _build_system_prompt(user, snapshot)}]
    for msg in history:
        messages.append({"role": msg.role.value, "content": msg.content})
    return messages


def _parse_llm_plan(raw_content: str, user_message: str) -> tuple[str, list[dict]]:
    reply = raw_content.strip() or ""
    actions: list[dict] = []
    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError:
        return reply or user_message, actions

    if isinstance(data, dict):
        reply = str(data.get("reply") or reply or user_message)
        raw_actions = data.get("actions") or []
        actions = [item for item in raw_actions if isinstance(item, dict)]
    return reply, actions


def _find_task_by_hint(db: Session, user_id: int, hint: str) -> Optional[Task]:
    stmt = (
        select(Task)
        .where(Task.user_id == user_id)
        .order_by(Task.created_at.desc())
        .limit(15)
    )
    for candidate in db.execute(stmt).scalars().all():
        if hint.lower() in candidate.title.lower():
            return candidate
    return None


def _execute_actions(db: Session, user: User, actions: list[dict]) -> list[str]:
    created_notes: list[str] = []
    created_tasks: dict[str, Task] = {}
    created_habits: dict[str, Habit] = {}

    for action in actions:
        action_type = str(action.get("type") or "").lower()
        if action_type == "create_task":
            title = (action.get("title") or action.get("name") or "").strip()
            if not title:
                continue

            description = (action.get("description") or action.get("details") or "").strip() or None
            due_dt = _parse_iso_datetime(action.get("due_datetime") or action.get("deadline"))
            if due_dt is None:
                # Ensure tasks show up in today's list by default.
                due_dt = datetime.now(timezone.utc)
            try:
                priority = max(1, min(5, int(action.get("priority") or 2)))
            except (TypeError, ValueError):
                priority = 2

            task = task_service.create_task(
                db,
                TaskCreate(
                    user_id=user.id,
                    title=title,
                    description=description,
                    due_datetime=due_dt,
                    priority=priority,
                ),
            )
            created_notes.append(f"task #{task.id} \"{task.title}\"")
            created_tasks[title.lower()] = task

            reminder_time = _parse_iso_datetime(action.get("reminder_time") or action.get("trigger_time"))
            if reminder_time:
                reminder_tz = action.get("timezone") or action.get("trigger_timezone") or user.timezone or "UTC"
                reminder = reminder_service.create_reminder(
                    db,
                    ReminderCreate(
                        user_id=user.id,
                        task_id=task.id,
                        type=ReminderType.TIME,
                        trigger_time=reminder_time,
                        trigger_timezone=reminder_tz,
                        is_active=True,
                    ),
                )
                created_notes.append(f"reminder #{reminder.id} at {reminder_time.isoformat()}")

        elif action_type == "create_reminder":
            reminder_time = _parse_iso_datetime(action.get("trigger_time") or action.get("reminder_time"))
            if not reminder_time:
                continue

            reminder_tz = action.get("timezone") or action.get("trigger_timezone") or user.timezone or "UTC"
            task_hint = (
                action.get("task_title") or action.get("task_name") or action.get("for_task") or action.get("title")
            )
            task_obj = None
            if isinstance(task_hint, str):
                normalized = task_hint.lower()
                task_obj = created_tasks.get(normalized) or _find_task_by_hint(db, user.id, normalized)
            if not task_obj and isinstance(task_hint, str) and task_hint.strip():
                # Create a lightweight task so reminder has a title in the UI.
                task_obj = task_service.create_task(
                    db,
                    TaskCreate(
                        user_id=user.id,
                        title=task_hint.strip()[:120],
                        description=None,
                        due_datetime=datetime.now(timezone.utc),
                        priority=2,
                    ),
                )
                created_notes.append(f"task #{task_obj.id} \"{task_obj.title}\"")
                created_tasks[task_obj.title.lower()] = task_obj
            if not task_obj:
                # Fallback: create a generic task from the user message so reminder is not orphaned.
                task_obj = task_service.create_task(
                    db,
                    TaskCreate(
                        user_id=user.id,
                        title=(action.get("title") or task_hint or "Reminder")[:120],
                        description=None,
                        due_datetime=datetime.now(timezone.utc),
                        priority=2,
                    ),
                )
                created_notes.append(f"task #{task_obj.id} \"{task_obj.title}\"")
                created_tasks[task_obj.title.lower()] = task_obj

            reminder = reminder_service.create_reminder(
                db,
                ReminderCreate(
                    user_id=user.id,
                    task_id=task_obj.id if task_obj else None,
                    type=ReminderType.TIME,
                    trigger_time=reminder_time,
                    trigger_timezone=reminder_tz,
                    is_active=True,
                ),
            )
            created_notes.append(f"reminder #{reminder.id} at {reminder_time.isoformat()}")

        elif action_type == "create_habit":
            name = (action.get("name") or action.get("title") or "").strip()
            if not name:
                continue
            description = (action.get("description") or action.get("details") or "").strip() or None
            schedule_raw = str(action.get("schedule_type") or action.get("schedule") or "daily").lower()
            if schedule_raw not in {s.value for s in HabitSchedule}:
                schedule_raw = HabitSchedule.DAILY.value
            habit = habit_service.create_habit(
                db,
                HabitCreate(
                    user_id=user.id,
                    name=name,
                    description=description,
                    schedule_type=HabitSchedule(schedule_raw),
                    schedule_config=None,
                    is_active=True,
                ),
            )
            created_habits[habit.name.lower()] = habit
            created_notes.append(f"habit #{habit.id} \"{habit.name}\"")

    return created_notes


def _rule_based_fallback(user_message: str) -> tuple[str, list[dict]]:
    normalized = user_message.lower()
    if any(keyword in normalized for keyword in ["task", "todo", "todo list", "task list"]):
        due = datetime.now(timezone.utc).isoformat()
        return (
            "Creating a quick task for today.",
            [{"type": "create_task", "title": user_message[:80], "description": user_message, "due_datetime": due}],
        )
    if any(keyword in normalized for keyword in ["habit", "routine", "привыч", "habit track"]):
        return ("Создаю привычку.", [{"type": "create_habit", "name": user_message[:80]}])
    if any(keyword in normalized for keyword in ["remind", "reminder", "ping"]):
        trigger = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        return ("Scheduling a reminder in one hour.", [{"type": "create_reminder", "trigger_time": trigger}])
    return ("Not sure what to do with that request, so I kept it in history.", [])


def process_message(db: Session, user_id: int, user_message: str) -> str:
    user = db.get(User, user_id)
    _log_message(db, user_id, MessageRole.USER, user_message)

    snapshot = _build_state_snapshot(db, user_id)
    history = _load_recent_messages(db, user_id)
    llm_messages = _prepare_messages(user, history, snapshot)

    llm_result = llm_client.chat(llm_messages, response_format={"type": "json_object"})
    reply_text, actions = _parse_llm_plan(llm_result.get("content", "") or "", user_message)

    if settings.llm_provider == "mock" and not actions:
        fallback_reply, fallback_actions = _rule_based_fallback(user_message)
        reply_text = reply_text or fallback_reply
        actions = fallback_actions

    if not reply_text and not actions:
        reply_text, actions = _rule_based_fallback(user_message)

    created_notes: list[str] = []
    if user and actions:
        created_notes = _execute_actions(db, user, actions)
    elif actions:
        reply_text = reply_text or "User record is missing, cannot run actions."
        actions = []

    if created_notes and all(note not in reply_text for note in created_notes):
        reply_text = f"{reply_text}\n\nDone: {', '.join(created_notes)}."

    if not reply_text:
        reply_text = "I could not understand the request. Please clarify what to create or show."

    _log_message(db, user_id, MessageRole.ASSISTANT, reply_text)
    return reply_text
