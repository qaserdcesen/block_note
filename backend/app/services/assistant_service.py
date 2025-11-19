from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.message import Message, MessageRole
from app.models.reminder import ReminderType
from app.schemas.reminder import ReminderCreate
from app.schemas.task import TaskCreate
from app.services import reminder_service, task_service


def _log_message(db: Session, user_id: int, role: MessageRole, content: str, metadata: Optional[dict] = None) -> Message:
    message = Message(user_id=user_id, role=role, content=content, meta=metadata)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def process_message(db: Session, user_id: int, user_message: str) -> str:
    _log_message(db, user_id, MessageRole.USER, user_message)
    normalized = user_message.lower()
    reply: Optional[str] = None

    if any(keyword in normalized for keyword in ["task", "todo", "задач"]):
        due = datetime.now(timezone.utc) + timedelta(days=1)
        task = task_service.create_task(
            db,
            TaskCreate(
                user_id=user_id,
                title="Auto-created task",
                description=user_message,
                due_datetime=due,
                priority=2,
            ),
        )
        reply = f"Создала задачу '{task.title}' на {due.date()}"

    elif any(keyword in normalized for keyword in ["remind", "напомн"]):
        trigger_time = datetime.now(timezone.utc) + timedelta(hours=1)
        reminder = reminder_service.create_reminder(
            db,
            ReminderCreate(
                user_id=user_id,
                type=ReminderType.TIME,
                trigger_time=trigger_time,
                trigger_timezone="UTC",
                is_active=True,
            ),
        )
        reply = f"Напоминание #{reminder.id} сработает {trigger_time.isoformat()}"

    if not reply:
        reply = "Я могу создавать задачи и напоминания. Попробуйте написать: 'создай задачу' или 'напомни через час'."

    _log_message(db, user_id, MessageRole.ASSISTANT, reply)
    return reply
