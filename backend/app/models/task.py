from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class CompletionMode(str, Enum):
    BINARY = "binary"
    PERCENT = "percent"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text())
    due_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=2)
    completion_mode: Mapped[CompletionMode] = mapped_column(
        SAEnum(CompletionMode), default=CompletionMode.BINARY, nullable=False
    )
    completion_value: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="tasks")
    reminders: Mapped[List["Reminder"]] = relationship(back_populates="task")

