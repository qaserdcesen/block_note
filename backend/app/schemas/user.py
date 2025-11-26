from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    telegram_id: int
    telegram_username: str | None = None
    timezone: str = "UTC"
    language: str = "en"
    first_day_of_week: str = "monday"
    day_start_hour: int = Field(0, ge=0, le=23)
    theme_mode: str = "system"
    ui_density: str = "standard"
    font_scale: str = "normal"
    assistant_tone: str = "friendly"
    assistant_detail: str = "concise"
    assistant_tips_suggest_habits: bool = True
    assistant_tips_overdue_tasks: bool = True


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
    theme_mode: str = "system"
    ui_density: str = "standard"
    font_scale: str = "normal"
    assistant_tone: str = "friendly"
    assistant_detail: str = "concise"
    assistant_tips_suggest_habits: bool = True
    assistant_tips_overdue_tasks: bool = True

    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    timezone: str | None = None
    first_day_of_week: str | None = None
    day_start_hour: int | None = Field(None, ge=0, le=23)
    theme_mode: str | None = None
    ui_density: str | None = None
    font_scale: str | None = None
    assistant_tone: str | None = None
    assistant_detail: str | None = None
    assistant_tips_suggest_habits: bool | None = None
    assistant_tips_overdue_tasks: bool | None = None


class UserStats(BaseModel):
    tasks_completed_today: int = 0
    tasks_completed_last_7_days: int = 0
    tasks_completed_last_30_days: int = 0
    habits_completed_last_7_days: int = 0
    habits_completed_last_30_days: int = 0
    habit_current_streak: int = 0
    habit_best_streak: int = 0
    habit_skips_last_30_days: int = 0
    tasks_by_priority: list[dict[str, int | str]] = []
    tasks_by_category: list[dict[str, int | str]] = []

