import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.llm_client import LLMClient
from app.models.category import Category
from app.models.habit import Habit, HabitSchedule
from app.models.message import Message, MessageRole
from app.models.reminder import ReminderType
from app.models.tag import Tag
from app.models.task import Task
from app.models.user import User
from app.schemas.category import CategoryCreate
from app.schemas.habit import HabitCreate
from app.schemas.reminder import ReminderCreate
from app.schemas.tag import TagCreate
from app.schemas.task import TaskCreate
from app.services import category_service, habit_service, reminder_service, task_service, tag_service

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


def _get_or_create_category(db: Session, user: User, name: str) -> tuple[Category, bool]:
    normalized = name.strip()
    if not normalized:
        raise ValueError("Empty category name")
    existing = (
        db.execute(select(Category).where(Category.user_id == user.id).where(func.lower(Category.name) == normalized.lower()))
        .scalar_one_or_none()
    )
    if existing:
        return existing, False
    category = category_service.create_category(db, CategoryCreate(user_id=user.id, name=normalized))
    return category, True


def _get_or_create_tags(db: Session, user: User, raw_tags: list[str]) -> tuple[list[Tag], list[str]]:
    created: list[str] = []
    result: list[Tag] = []
    for raw in raw_tags:
        name = raw.strip()
        if not name:
            continue
        existing = (
            db.execute(select(Tag).where(Tag.user_id == user.id).where(func.lower(Tag.name) == name.lower()))
            .scalar_one_or_none()
        )
        if existing:
            result.append(existing)
            continue
        tag = tag_service.create_tag(db, TagCreate(user_id=user.id, name=name))
        result.append(tag)
        created.append(tag.name)
    return result, created


def _extract_tag_names(raw_tags: Optional[object]) -> list[str]:
    if raw_tags is None:
        return []
    if isinstance(raw_tags, str):
        return [part.strip() for part in raw_tags.split(",") if part.strip()]
    if isinstance(raw_tags, list):
        names: list[str] = []
        for item in raw_tags:
            if isinstance(item, str) and item.strip():
                names.append(item.strip())
        return names
    return []


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


def _normalize_schedule(raw: str) -> HabitSchedule:
    value = (raw or "").lower()
    if any(keyword in value for keyword in ["week", "нед", "еженед"]):
        return HabitSchedule.WEEKLY
    if any(keyword in value for keyword in ["custom", "сво", "индив", "шаблон"]):
        return HabitSchedule.CUSTOM
    return HabitSchedule.DAILY


def _build_system_prompt(user: Optional[User], snapshot: str) -> str:
    tz = (user.timezone if user and user.timezone else settings.scheduler_timezone) or "UTC"
    language = "Russian"
    return (
        "Ты ИИ-ассистент планировщика с доступом к БД (задачи/привычки/напоминания). "
        f"Отвечай кратко на {language}, строго JSON с ключами reply и actions. "
        "actions — массив. Допустимые type: create_task, create_reminder, create_habit. "
        "create_task поля: title (обязательно), description (опционально), "
        "due_datetime (ISO 8601 с таймзоной), priority (1-10), category (опционально, создай если нет), "
        "tags (строка через запятую или массив, создай теги если их нет), reminder_time (ISO для быстрого напоминания). "
        "create_reminder поля: trigger_time (ISO 8601), timezone (например Europe/Moscow), "
        "task_title (опционально, создай задачу если её нет), note (заметка для напоминания). "
        "create_habit поля: name (обязательно), description (опционально), "
        "schedule_type (daily/weekly/custom), category (опционально, создай если нет), "
        "tags (строка/массив, создай если нет). "
        "Если действий не нужно, верни actions: []. Не выдумывай данные — опирайся на снимок БД и запрос пользователя. "
        f"Часовой пояс пользователя: {tz}. "
        "Снимок данных:\n"
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
            category_id = None
            extra_notes: list[str] = []
            category_name = action.get("category") or action.get("category_name")
            if isinstance(category_name, str) and category_name.strip():
                category_obj, created_cat = _get_or_create_category(db, user, category_name)
                category_id = category_obj.id
                if created_cat:
                    extra_notes.append(f"category \"{category_obj.name}\"")
            tag_names = _extract_tag_names(action.get("tags") or action.get("tag_names"))
            tag_ids: list[int] = []
            if tag_names:
                tags, created_tags = _get_or_create_tags(db, user, tag_names)
                tag_ids = [tag.id for tag in tags]
                if created_tags:
                    extra_notes.append(f"tags {', '.join(created_tags)}")
            try:
                priority = max(1, min(10, int(action.get("priority") or 2)))
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
                    category_id=category_id,
                    tag_ids=tag_ids,
                ),
            )
            created_notes.append(f"task #{task.id} \"{task.title}\"")
            if extra_notes:
                created_notes.extend(extra_notes)
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
            note = (action.get("note") or action.get("description") or "").strip() or None
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
                        description=note,
                        due_datetime=datetime.now(timezone.utc),
                        priority=2,
                    ),
                )
                created_notes.append(f"task #{task_obj.id} \"{task_obj.title}\"")
                created_tasks[task_obj.title.lower()] = task_obj
            if not task_obj:
                # Fallback: create a generic task from the user message so reminder is not orphaned.
                title_source = note or task_hint or "Reminder"
                task_obj = task_service.create_task(
                    db,
                    TaskCreate(
                        user_id=user.id,
                        title=str(title_source)[:120],
                        description=note,
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
                    behavior_rule=note,
                    is_active=True,
                ),
            )
            created_notes.append(f"reminder #{reminder.id} at {reminder_time.isoformat()}")

        elif action_type == "create_habit":
            name = (action.get("name") or action.get("title") or "").strip()
            if not name:
                continue
            description = (action.get("description") or action.get("details") or "").strip() or None
            schedule_raw = str(action.get("schedule_type") or action.get("schedule") or "daily")
            schedule = _normalize_schedule(schedule_raw)
            category_id = None
            extra_notes: list[str] = []
            category_name = action.get("category") or action.get("category_name")
            if isinstance(category_name, str) and category_name.strip():
                category_obj, created_cat = _get_or_create_category(db, user, category_name)
                category_id = category_obj.id
                if created_cat:
                    extra_notes.append(f"category \"{category_obj.name}\"")
            tag_names = _extract_tag_names(action.get("tags") or action.get("tag_names"))
            tag_ids: list[int] = []
            if tag_names:
                tags, created_tags = _get_or_create_tags(db, user, tag_names)
                tag_ids = [tag.id for tag in tags]
                if created_tags:
                    extra_notes.append(f"tags {', '.join(created_tags)}")
            habit = habit_service.create_habit(
                db,
                HabitCreate(
                    user_id=user.id,
                    name=name,
                    description=description,
                    schedule_type=schedule,
                    schedule_config=None,
                    is_active=True,
                    category_id=category_id,
                    tag_ids=tag_ids,
                ),
            )
            created_habits[habit.name.lower()] = habit
            created_notes.append(f"habit #{habit.id} \"{habit.name}\"")
            if extra_notes:
                created_notes.extend(extra_notes)

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
