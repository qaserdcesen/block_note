from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.habit import Habit, HabitCompletionMode, HabitLog, HabitLogStatus
from app.models.tag import Tag
from app.schemas.habit import HabitCreate, HabitLogCreate, HabitUpdate
from app.services.tag_service import fetch_user_tags


def list_habits(db: Session, user_id: int, category_id: int | None = None, tag_id: int | None = None) -> list[Habit]:
    stmt = select(Habit).where(Habit.user_id == user_id)
    if category_id is not None:
        stmt = stmt.where(Habit.category_id == category_id)
    if tag_id is not None:
        stmt = stmt.join(Habit.tags).where(Tag.id == tag_id)
    stmt = stmt.order_by(Habit.created_at.desc()).distinct()
    return list(db.execute(stmt).scalars().all())


def _normalize_completion(payload: dict, fallback_mode: HabitCompletionMode | None = None) -> None:
    mode = payload.get("completion_mode") or fallback_mode or HabitCompletionMode.PERCENT
    payload["completion_mode"] = mode
    raw_value = payload.get("completion_value", 0)
    payload["completion_value"] = max(0, min(100, int(raw_value)))


def _load_category(db: Session, user_id: int, category_id: int | None) -> Category | None:
    if category_id is None:
        return None
    category = db.get(Category, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


def create_habit(db: Session, data: HabitCreate) -> Habit:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    payload = data.model_dump()
    tag_ids = payload.pop("tag_ids", [])
    category_id = payload.pop("category_id", None)
    _normalize_completion(payload)
    habit = Habit(**payload)
    habit.category = _load_category(db, user_id=habit.user_id, category_id=category_id)
    db.add(habit)
    db.flush()
    habit.tags = fetch_user_tags(db, user_id=habit.user_id, tag_ids=tag_ids)
    db.commit()
    db.refresh(habit)
    return habit


def update_habit(db: Session, habit_id: int, user_id: int, data: HabitUpdate) -> Habit:
    habit = db.get(Habit, habit_id)
    if not habit or habit.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    payload = data.model_dump(exclude_unset=True)
    tag_ids = payload.pop("tag_ids", None)
    category_id = payload.pop("category_id", None)
    _normalize_completion(payload, fallback_mode=habit.completion_mode)
    for key, value in payload.items():
        setattr(habit, key, value)
    if category_id is not None:
        habit.category = _load_category(db, user_id=user_id, category_id=category_id)
    if tag_ids is not None:
        habit.tags = fetch_user_tags(db, user_id=user_id, tag_ids=tag_ids)
    db.commit()
    db.refresh(habit)
    return habit


def get_habit_logs(db: Session, habit_id: int, user_id: int) -> list[HabitLog]:
    habit = db.get(Habit, habit_id)
    if not habit or habit.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    stmt = select(HabitLog).where(HabitLog.habit_id == habit_id).order_by(HabitLog.date.desc())
    return list(db.execute(stmt).scalars().all())


def add_habit_log(db: Session, habit_id: int, user_id: int, payload: HabitLogCreate) -> HabitLog:
    habit = db.get(Habit, habit_id)
    if not habit or habit.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    log = HabitLog(habit_id=habit_id, user_id=user_id, **payload.model_dump())
    db.add(log)
    if payload.status == HabitLogStatus.DONE:
        habit.completion_value = 100
    else:
        habit.completion_value = 0
    db.commit()
    db.refresh(log)
    return log
