from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister

settings = get_settings()


def register_user(db: Session, data: UserRegister) -> User:
    existing = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=security.get_password_hash(data.password),
        timezone=data.timezone,
        language=data.language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, data: UserLogin) -> User:
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if not user or not security.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")
    return user


def create_access_token_for_user(user: User) -> str:
    return security.create_access_token({"sub": str(user.id)}, expires_delta=timedelta(minutes=settings.access_token_expire_minutes))

