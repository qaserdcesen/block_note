from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderRead, ReminderUpdate
from app.services import reminder_service

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderRead])
def list_reminders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return reminder_service.list_reminders(db, current_user.id)


@router.post("", response_model=ReminderRead)
def create_reminder(
    data: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_copy(update={"user_id": current_user.id})
    return reminder_service.create_reminder(db, payload)


@router.patch("/{reminder_id}", response_model=ReminderRead)
def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return reminder_service.update_reminder(db, reminder_id=reminder_id, user_id=current_user.id, data=data)


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder_service.delete_reminder(db, reminder_id=reminder_id, user_id=current_user.id)
    return Response(status_code=204)

