from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.goal import Goal
from app.models.habit import HabitLog, HabitLogStatus
from app.models.reminder import Reminder
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.goal import GoalRead
from app.schemas.habit import HabitLogRead
from app.schemas.reminder import ReminderRead
from app.schemas.task import TaskRead
from app.schemas.user import UserSettingsUpdate
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
    if "theme_mode" in payload:
        payload["theme_mode"] = payload["theme_mode"].lower()
    if "ui_density" in payload:
        payload["ui_density"] = payload["ui_density"].lower()
    if "font_scale" in payload:
        payload["font_scale"] = payload["font_scale"].lower()
    if "assistant_tone" in payload:
        payload["assistant_tone"] = payload["assistant_tone"].lower()
    if "assistant_detail" in payload:
        payload["assistant_detail"] = payload["assistant_detail"].lower()
    for field, value in payload.items():
        setattr(user, field, value)
    if payload:
        db.commit()
        db.refresh(user)
    return user


def _compute_habit_streaks(logs: list[HabitLog]) -> tuple[int, int, int]:
    today = date.today()
    best_streak = 0
    current_streak = 0
    skips_last_30 = sum(1 for log in logs if log.status == HabitLogStatus.SKIPPED and log.date >= today - timedelta(days=30))

    logs_by_habit: dict[int, set[date]] = {}
    for log in logs:
        if log.status != HabitLogStatus.DONE:
            continue
        logs_by_habit.setdefault(log.habit_id, set()).add(log.date)

    for done_dates in logs_by_habit.values():
        # best streak
        streak = 0
        for day in sorted(done_dates):
            if streak == 0:
                streak = 1
            else:
                prev = day - timedelta(days=1)
                streak = streak + 1 if prev in done_dates else 1
            best_streak = max(best_streak, streak)

        # current streak (до сегодняшнего дня назад)
        current = 0
        cursor = today
        while cursor in done_dates:
            current += 1
            cursor -= timedelta(days=1)
        current_streak = max(current_streak, current)

    return current_streak, best_streak, skips_last_30


def get_user_stats(db: Session, user_id: int) -> dict[str, object]:
    today = date.today()
    week_ago = today - timedelta(days=6)
    month_ago = today - timedelta(days=29)
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
    tasks_last_month_stmt = (
        select(func.count())
        .select_from(Task)
        .where(Task.user_id == user_id)
        .where(Task.status == TaskStatus.DONE)
        .where(Task.due_datetime.is_not(None))
        .where(Task.due_datetime >= datetime.combine(month_ago, time.min))
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
    habits_last_month_stmt = (
        select(func.count())
        .select_from(HabitLog)
        .where(HabitLog.user_id == user_id)
        .where(HabitLog.status == HabitLogStatus.DONE)
        .where(HabitLog.date >= month_ago)
        .where(HabitLog.date <= today)
    )
    tasks_by_priority_stmt = (
        select(Task.priority, func.count())
        .select_from(Task)
        .where(Task.user_id == user_id)
        .group_by(Task.priority)
    )
    tasks_by_category_stmt = (
        select(Task.category_id, Category.name, func.count())
        .select_from(Task)
        .join(Category, Task.category_id == Category.id, isouter=True)
        .where(Task.user_id == user_id)
        .group_by(Task.category_id, Category.name)
    )

    tasks_week_total = db.execute(tasks_last_week_stmt).scalar_one()
    tasks_month_total = db.execute(tasks_last_month_stmt).scalar_one()
    tasks_today_total = db.execute(tasks_today_stmt).scalar_one()
    habits_week_total = db.execute(habits_last_week_stmt).scalar_one()
    habits_month_total = db.execute(habits_last_month_stmt).scalar_one()
    tasks_by_priority = [
        {"label": f"Приоритет {priority}", "count": count}
        for priority, count in db.execute(tasks_by_priority_stmt).all()
    ]
    tasks_by_category = []
    for cat_id, cat_name, count in db.execute(tasks_by_category_stmt).all():
        name = cat_name or "Без категории"
        tasks_by_category.append({"label": name, "count": count})

    habit_logs = (
        db.execute(select(HabitLog).where(HabitLog.user_id == user_id).where(HabitLog.date >= month_ago))
        .scalars()
        .all()
    )
    current_streak, best_streak, skips_last_30 = _compute_habit_streaks(list(habit_logs))

    return {
        "tasks_completed_today": tasks_today_total or 0,
        "tasks_completed_last_7_days": tasks_week_total or 0,
        "tasks_completed_last_30_days": tasks_month_total or 0,
        "habits_completed_last_7_days": habits_week_total or 0,
        "habits_completed_last_30_days": habits_month_total or 0,
        "habit_current_streak": current_streak,
        "habit_best_streak": best_streak,
        "habit_skips_last_30_days": skips_last_30,
        "tasks_by_priority": tasks_by_priority,
        "tasks_by_category": tasks_by_category,
    }


def export_user_data(db: Session, user_id: int) -> dict[str, object]:
    tasks = db.execute(select(Task).where(Task.user_id == user_id)).scalars().all()
    reminders = db.execute(select(Reminder).where(Reminder.user_id == user_id)).scalars().all()
    habit_logs = db.execute(select(HabitLog).where(HabitLog.user_id == user_id)).scalars().all()
    goals = db.execute(select(Goal).where(Goal.user_id == user_id)).scalars().all()
    return {
        "tasks": [TaskRead.model_validate(task).model_dump() for task in tasks],
        "reminders": [ReminderRead.model_validate(item).model_dump() for item in reminders],
        "habit_logs": [HabitLogRead.model_validate(log).model_dump() for log in habit_logs],
        "goals": [GoalRead.model_validate(goal).model_dump() for goal in goals],
    }


def cleanup_completed_tasks(db: Session, user_id: int) -> int:
    deleted = db.query(Task).where(Task.user_id == user_id).where(Task.status == TaskStatus.DONE).delete()
    db.commit()
    return deleted


def cleanup_habit_logs(db: Session, user_id: int) -> int:
    deleted = db.query(HabitLog).where(HabitLog.user_id == user_id).delete()
    db.commit()
    return deleted
