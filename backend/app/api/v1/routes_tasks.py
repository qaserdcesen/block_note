from datetime import date

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
def list_tasks(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    date_param: date = Query(..., alias="date"),
    category_id: int | None = Query(None),
    tag_id: int | None = Query(None),
):
    return task_service.list_tasks_for_date(
        db, user_id=current_user.id, day=date_param, category_id=category_id, tag_id=tag_id
    )


@router.post("", response_model=TaskRead)
def create_task(data: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payload = data.model_copy(update={"user_id": current_user.id})
    return task_service.create_task(db, payload)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return task_service.update_task(db, task_id=task_id, user_id=current_user.id, data=data)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task_service.delete_task(db, task_id=task_id, user_id=current_user.id)
    return Response(status_code=204)

