from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationChannelType


class NotificationChannelBase(BaseModel):
    channel: NotificationChannelType
    target: str
    is_active: bool = True


class NotificationChannelCreate(NotificationChannelBase):
    user_id: int


class NotificationChannelRead(NotificationChannelBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

