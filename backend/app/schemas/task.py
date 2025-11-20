from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import CompletionMode, TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_datetime: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 2
    completion_mode: CompletionMode = CompletionMode.PERCENT
    completion_value: int = Field(0, ge=0, le=100)


class TaskCreate(TaskBase):
    user_id: int | None = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_datetime: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    priority: Optional[int] = None
    completion_mode: Optional[CompletionMode] = None
    completion_value: Optional[int] = Field(None, ge=0, le=100)


class TaskRead(TaskBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

