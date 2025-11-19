from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.message import MessageRole


class AssistantMessage(BaseModel):
    user_message: str


class AssistantResponse(BaseModel):
    reply: str


class MessageRead(BaseModel):
    id: int
    user_id: int
    role: MessageRole
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

