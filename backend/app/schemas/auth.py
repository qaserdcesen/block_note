from pydantic import BaseModel


class TelegramUser(BaseModel):
    id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    language_code: str | None = None


class TelegramAuthPayload(BaseModel):
    user: TelegramUser
    auth_date: int
    hash: str
