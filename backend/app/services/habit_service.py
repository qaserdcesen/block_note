from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.habit import Habit, HabitLog
from app.schemas.habit import HabitCreate, HabitLogCreate, HabitUpdate


def list_habits(db: Session, user_id: int) -> list[Habit]:
    stmt = select(Habit).where(Habit.user_id == user_id)
    return list(db.execute(stmt).scalars().all())


def create_habit(db: Session, data: HabitCreate) -> Habit:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    habit = Habit(**data.model_dump())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def update_habit(db: Session, habit_id: int, user_id: int, data: HabitUpdate) -> Habit:
    habit = db.get(Habit, habit_id)
    if not habit or habit.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(habit, key, value)
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
    db.commit()
    db.refresh(log)
    return log

