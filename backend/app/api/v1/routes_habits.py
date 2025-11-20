from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.habit import HabitCreate, HabitLogCreate, HabitLogRead, HabitRead, HabitUpdate
from app.services import habit_service

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("", response_model=list[HabitRead])
def list_habits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    category_id: int | None = None,
    tag_id: int | None = None,
):
    return habit_service.list_habits(db, current_user.id, category_id=category_id, tag_id=tag_id)


@router.post("", response_model=HabitRead)
def create_habit(data: HabitCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payload = data.model_copy(update={"user_id": current_user.id})
    return habit_service.create_habit(db, payload)


@router.patch("/{habit_id}", response_model=HabitRead)
def update_habit(
    habit_id: int,
    data: HabitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return habit_service.update_habit(db, habit_id=habit_id, user_id=current_user.id, data=data)


@router.get("/{habit_id}/logs", response_model=list[HabitLogRead])
def get_logs(habit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return habit_service.get_habit_logs(db, habit_id=habit_id, user_id=current_user.id)


@router.post("/{habit_id}/logs", response_model=HabitLogRead)
def add_log(
    habit_id: int,
    payload: HabitLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return habit_service.add_habit_log(db, habit_id=habit_id, user_id=current_user.id, payload=payload)

