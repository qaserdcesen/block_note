from datetime import date, datetime, time
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


def list_tasks_for_date(db: Session, user_id: int, day: date) -> List[Task]:
    start_dt = datetime.combine(day, time.min)
    end_dt = datetime.combine(day, time.max)
    stmt = (
        select(Task)
        .where(Task.user_id == user_id)
        .where(Task.due_datetime.is_not(None))
        .where(Task.due_datetime >= start_dt)
        .where(Task.due_datetime <= end_dt)
        .order_by(Task.due_datetime.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_task(db: Session, data: TaskCreate) -> Task:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    task = Task(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, user_id: int, data: TaskUpdate) -> Task:
    task = db.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int, user_id: int) -> None:
    task = db.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()

