from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    telegram_id: int
    telegram_username: str | None = None
    timezone: str = "UTC"
    language: str = "en"
    first_day_of_week: str = "monday"
    day_start_hour: int = Field(0, ge=0, le=23)


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSettings(BaseModel):
    timezone: str = "UTC"
    first_day_of_week: str = "monday"
    day_start_hour: int = Field(0, ge=0, le=23)

    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    timezone: str | None = None
    first_day_of_week: str | None = None
    day_start_hour: int | None = Field(None, ge=0, le=23)


class UserStats(BaseModel):
    tasks_completed_last_7_days: int = 0
    habits_completed_last_7_days: int = 0
    tasks_completed_today: int = 0

