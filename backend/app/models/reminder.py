from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReminderType(str, Enum):
    TIME = "time"
    LOCATION = "location"
    WEATHER = "weather"
    BEHAVIOR = "behavior"


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tasks.id"))
    habit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("habits.id"))
    type: Mapped[ReminderType] = mapped_column(SAEnum(ReminderType), nullable=False)
    trigger_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    trigger_timezone: Mapped[Optional[str]] = mapped_column(String(64))
    trigger_location_lat: Mapped[Optional[float]] = mapped_column(Float)
    trigger_location_lon: Mapped[Optional[float]] = mapped_column(Float)
    trigger_location_radius_m: Mapped[Optional[float]] = mapped_column(Float)
    trigger_weather_condition: Mapped[Optional[str]] = mapped_column(String(64))
    behavior_rule: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="reminders")
    task = relationship("Task", back_populates="reminders")
    habit = relationship("Habit", back_populates="reminders")

