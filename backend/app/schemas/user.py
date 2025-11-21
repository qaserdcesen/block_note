from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    telegram_id: int
    telegram_username: str | None = None
    timezone: str = "UTC"
    language: str = "en"


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

