from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Enum as SAEnum, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.tag import habit_tags


class HabitSchedule(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"


class HabitLogStatus(str, Enum):
    DONE = "done"
    SKIPPED = "skipped"


class HabitCompletionMode(str, Enum):
    BINARY = "binary"
    PERCENT = "percent"


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text())
    schedule_type: Mapped[HabitSchedule] = mapped_column(SAEnum(HabitSchedule), nullable=False)
    schedule_config: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    completion_mode: Mapped[HabitCompletionMode] = mapped_column(
        SAEnum(HabitCompletionMode), default=HabitCompletionMode.PERCENT, nullable=False
    )
    completion_value: Mapped[int] = mapped_column(Integer, default=0)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="habits")
    category = relationship("Category", back_populates="habits")
    tags = relationship("Tag", secondary=habit_tags, back_populates="habits")
    logs: Mapped[List["HabitLog"]] = relationship(back_populates="habit")
    reminders: Mapped[List["Reminder"]] = relationship(back_populates="habit")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habits.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[HabitLogStatus] = mapped_column(SAEnum(HabitLogStatus), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    habit = relationship("Habit", back_populates="logs")
    user = relationship("User", back_populates="habit_logs")

