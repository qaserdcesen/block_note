from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reminder import Reminder, ReminderType
from app.schemas.reminder import ReminderCreate, ReminderUpdate


def list_reminders(db: Session, user_id: int) -> list[Reminder]:
    stmt = (
        select(Reminder)
        .where(Reminder.user_id == user_id)
        .where(Reminder.is_active.is_(True))
        .order_by(Reminder.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def list_active_time_based(db: Session) -> list[Reminder]:
    now = datetime.now(timezone.utc)
    stmt = (
        select(Reminder)
        .where(Reminder.is_active.is_(True))
        .where(Reminder.type == ReminderType.TIME)
        .where(Reminder.trigger_time.is_not(None))
        .where(Reminder.trigger_time <= now)
    )
    return list(db.execute(stmt).scalars().all())


def create_reminder(db: Session, data: ReminderCreate) -> Reminder:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    reminder = Reminder(**data.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def update_reminder(db: Session, reminder_id: int, user_id: int, data: ReminderUpdate) -> Reminder:
    reminder = db.get(Reminder, reminder_id)
    if not reminder or reminder.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(reminder, key, value)
    db.commit()
    db.refresh(reminder)
    return reminder


def delete_reminder(db: Session, reminder_id: int, user_id: int) -> None:
    reminder = db.get(Reminder, reminder_id)
    if not reminder or reminder.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    db.delete(reminder)
    db.commit()


def mark_triggered(db: Session, reminder: Reminder) -> Reminder:
    reminder.is_active = False
    reminder.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reminder)
    return reminder

