from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserSettings, UserSettingsUpdate, UserStats
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/stats", response_model=UserStats)
def read_user_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.get_user_stats(db, user_id=current_user.id)


@router.get("/me/settings", response_model=UserSettings)
def read_user_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.get_user_settings(db, user_id=current_user.id)


@router.put("/me/settings", response_model=UserSettings)
def update_user_settings(
    data: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.update_user_settings(db, user_id=current_user.id, data=data)
