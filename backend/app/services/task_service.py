from datetime import date, datetime, time
from typing import Any, List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.tag import Tag
from app.models.task import CompletionMode, Task, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.tag_service import fetch_user_tags


def list_tasks_for_date(
    db: Session, user_id: int, day: date, category_id: int | None = None, tag_id: int | None = None
) -> List[Task]:
    start_dt = datetime.combine(day, time.min)
    end_dt = datetime.combine(day, time.max)
    stmt = (
        select(Task)
        .where(Task.user_id == user_id)
        .where(Task.due_datetime.is_not(None))
        .where(Task.due_datetime >= start_dt)
        .where(Task.due_datetime <= end_dt)
    )
    if category_id is not None:
        stmt = stmt.where(Task.category_id == category_id)
    if tag_id is not None:
        stmt = stmt.join(Task.tags).where(Tag.id == tag_id)
    stmt = stmt.order_by(Task.due_datetime.asc()).distinct()
    return list(db.execute(stmt).scalars().all())


def _normalize_completion(payload: dict[str, Any], fallback_mode: CompletionMode | None = None) -> None:
    mode = payload.get("completion_mode") or fallback_mode or CompletionMode.PERCENT
    payload["completion_mode"] = mode
    raw_value = payload.get("completion_value", 0)
    value = max(0, min(100, int(raw_value)))

    if payload.get("status") == TaskStatus.DONE:
        value = 100
    elif payload.get("status") == TaskStatus.CANCELLED:
        value = 0

    payload["completion_value"] = value
    if "status" not in payload:
        payload["status"] = TaskStatus.DONE if value >= 100 else TaskStatus.IN_PROGRESS if value > 0 else TaskStatus.PENDING


def _load_category(db: Session, user_id: int, category_id: int | None) -> Category | None:
    if category_id is None:
        return None
    category = db.get(Category, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


def create_task(db: Session, data: TaskCreate) -> Task:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    payload = data.model_dump()
    tag_ids = payload.pop("tag_ids", [])
    category_id = payload.pop("category_id", None)
    _normalize_completion(payload)

    task = Task(**payload)
    task.category = _load_category(db, user_id=task.user_id, category_id=category_id)
    db.add(task)
    db.flush()
    task.tags = fetch_user_tags(db, user_id=task.user_id, tag_ids=tag_ids)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, user_id: int, data: TaskUpdate) -> Task:
    task = db.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    payload = data.model_dump(exclude_unset=True)
    tag_ids = payload.pop("tag_ids", None)
    category_id = payload.pop("category_id", None)
    _normalize_completion(payload, fallback_mode=task.completion_mode)
    for key, value in payload.items():
        setattr(task, key, value)

    if category_id is not None:
        task.category = _load_category(db, user_id=user_id, category_id=category_id)
    if tag_ids is not None:
        task.tags = fetch_user_tags(db, user_id=user_id, tag_ids=tag_ids)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int, user_id: int) -> None:
    task = db.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()
