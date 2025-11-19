from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.reminder import ReminderType


class ReminderBase(BaseModel):
    task_id: Optional[int] = None
    habit_id: Optional[int] = None
    type: ReminderType
    trigger_time: Optional[datetime] = None
    trigger_timezone: Optional[str] = None
    trigger_location_lat: Optional[float] = None
    trigger_location_lon: Optional[float] = None
    trigger_location_radius_m: Optional[float] = None
    trigger_weather_condition: Optional[str] = None
    behavior_rule: Optional[str] = None
    is_active: bool = True


class ReminderCreate(ReminderBase):
    user_id: int | None = None


class ReminderUpdate(BaseModel):
    task_id: Optional[int] = None
    habit_id: Optional[int] = None
    type: Optional[ReminderType] = None
    trigger_time: Optional[datetime] = None
    trigger_timezone: Optional[str] = None
    trigger_location_lat: Optional[float] = None
    trigger_location_lon: Optional[float] = None
    trigger_location_radius_m: Optional[float] = None
    trigger_weather_condition: Optional[str] = None
    behavior_rule: Optional[str] = None
    is_active: Optional[bool] = None


class ReminderRead(ReminderBase):
    id: int
    user_id: int
    last_checked_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

