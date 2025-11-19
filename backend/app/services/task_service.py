from datetime import date, datetime, time
from typing import Any, List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import CompletionMode, Task, TaskStatus
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


def _normalize_completion(payload: dict[str, Any], fallback_mode: CompletionMode | None = None) -> None:
    mode = payload.get("completion_mode") or fallback_mode
    if mode is None:
        return
    raw_value = payload.get("completion_value", 0)
    status = payload.get("status")

    if mode == CompletionMode.BINARY:
        if status == TaskStatus.DONE:
            payload["completion_value"] = 100
        elif status in {TaskStatus.PENDING, TaskStatus.CANCELLED}:
            payload["completion_value"] = 0
        else:
            payload["completion_value"] = 100 if raw_value and int(raw_value) >= 100 else 0
    else:
        payload["completion_value"] = max(0, min(100, int(raw_value)))


def create_task(db: Session, data: TaskCreate) -> Task:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    payload = data.model_dump()
    _normalize_completion(payload)
    task = Task(**payload)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, user_id: int, data: TaskUpdate) -> Task:
    task = db.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    payload = data.model_dump(exclude_unset=True)
    _normalize_completion(payload, fallback_mode=task.completion_mode)
    for key, value in payload.items():
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
