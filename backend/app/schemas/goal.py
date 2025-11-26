from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.category import CategoryRead


class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    category_id: int | None = None


class GoalCreate(GoalBase):
    user_id: int | None = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[date] = None
    category_id: int | None = None


class GoalRead(GoalBase):
    id: int
    user_id: int
    category: CategoryRead | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
