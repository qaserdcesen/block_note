from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.habit import HabitLog, HabitLogStatus
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.user import UserSettingsUpdate


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def get_user_settings(db: Session, user_id: int) -> User:
    return _get_user_or_404(db, user_id)


def update_user_settings(db: Session, user_id: int, data: UserSettingsUpdate) -> User:
    user = _get_user_or_404(db, user_id)
    payload = data.model_dump(exclude_none=True)
    if "day_start_hour" in payload:
        payload["day_start_hour"] = max(0, min(23, int(payload["day_start_hour"])))
    if "first_day_of_week" in payload:
        payload["first_day_of_week"] = payload["first_day_of_week"].lower()
    for field, value in payload.items():
        setattr(user, field, value)
    if payload:
        db.commit()
        db.refresh(user)
    return user


def get_user_stats(db: Session, user_id: int) -> dict[str, int]:
    today = date.today()
    week_ago = today - timedelta(days=6)
    start_dt = datetime.combine(week_ago, time.min)
    end_dt = datetime.combine(today, time.max)

    tasks_last_week_stmt = (
        select(func.count())
        .select_from(Task)
        .where(Task.user_id == user_id)
        .where(Task.status == TaskStatus.DONE)
        .where(Task.due_datetime.is_not(None))
        .where(Task.due_datetime >= start_dt)
        .where(Task.due_datetime <= end_dt)
    )
    tasks_today_stmt = (
        select(func.count())
        .select_from(Task)
        .where(Task.user_id == user_id)
        .where(Task.status == TaskStatus.DONE)
        .where(Task.due_datetime.is_not(None))
        .where(Task.due_datetime >= datetime.combine(today, time.min))
        .where(Task.due_datetime <= datetime.combine(today, time.max))
    )
    habits_last_week_stmt = (
        select(func.count())
        .select_from(HabitLog)
        .where(HabitLog.user_id == user_id)
        .where(HabitLog.status == HabitLogStatus.DONE)
        .where(HabitLog.date >= week_ago)
        .where(HabitLog.date <= today)
    )

    tasks_week_total = db.execute(tasks_last_week_stmt).scalar_one()
    tasks_today_total = db.execute(tasks_today_stmt).scalar_one()
    habits_week_total = db.execute(habits_last_week_stmt).scalar_one()

    return {
        "tasks_completed_last_7_days": tasks_week_total or 0,
        "habits_completed_last_7_days": habits_week_total or 0,
        "tasks_completed_today": tasks_today_total or 0,
    }
