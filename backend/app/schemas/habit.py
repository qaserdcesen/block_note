from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.habit import HabitCompletionMode, HabitLogStatus, HabitSchedule
from app.schemas.category import CategoryRead
from app.schemas.tag import TagRead


class HabitBase(BaseModel):
    name: str
    description: Optional[str] = None
    schedule_type: HabitSchedule
    schedule_config: Optional[dict] = None
    is_active: bool = True
    completion_mode: HabitCompletionMode = HabitCompletionMode.PERCENT
    completion_value: int = Field(0, ge=0, le=100)


class HabitCreate(HabitBase):
    user_id: int | None = None
    category_id: int | None = None
    tag_ids: list[int] = Field(default_factory=list)


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[HabitSchedule] = None
    schedule_config: Optional[dict] = None
    is_active: Optional[bool] = None
    completion_mode: Optional[HabitCompletionMode] = None
    completion_value: Optional[int] = Field(None, ge=0, le=100)
    category_id: Optional[int] = None
    tag_ids: Optional[list[int]] = None


class HabitRead(HabitBase):
    id: int
    user_id: int
    category_id: int | None = None
    category: CategoryRead | None = None
    tags: list[TagRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HabitLogCreate(BaseModel):
    date: date
    status: HabitLogStatus


class HabitLogRead(BaseModel):
    id: int
    habit_id: int
    user_id: int
    date: date
    status: HabitLogStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
