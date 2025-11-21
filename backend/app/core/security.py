import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TelegramAuthPayload, TelegramUser

INIT_DATA_HEADER = "X-Telegram-Init-Data"
INIT_DATA_TTL_SECONDS = 60 * 60 * 24
settings = get_settings()


def _build_data_check_string(data: dict[str, str]) -> str:
    return "\n".join(f"{k}={v}" for k, v in sorted(data.items()) if k != "hash")


def verify_telegram_init_data(init_data_raw: str) -> TelegramAuthPayload:
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Telegram bot token is not configured"
        )

    parsed_pairs = dict(parse_qsl(init_data_raw, keep_blank_values=True))
    data_hash = parsed_pairs.get("hash")
    auth_date_raw = parsed_pairs.get("auth_date")
    user_payload_raw = parsed_pairs.get("user")

    if not data_hash or not auth_date_raw or not user_payload_raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram init data")

    try:
        user_payload = json.loads(user_payload_raw)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive branch
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram user payload") from exc

    data_check_string = _build_data_check_string(parsed_pairs)
    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode("utf-8"), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated_hash, data_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram signature check failed")

    try:
        auth_date = int(auth_date_raw)
    except ValueError as exc:  # pragma: no cover - malformed client payload
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram auth date") from exc

    if time.time() - auth_date > INIT_DATA_TTL_SECONDS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram init data expired")

    return TelegramAuthPayload(user=TelegramUser(**user_payload), auth_date=auth_date, hash=data_hash)


async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    def ensure_local_user() -> User:
        user = db.execute(select(User).where(User.telegram_id == 0)).scalar_one_or_none()
        if user:
            return user
        user = User(telegram_id=0, telegram_username="local", language="en")
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    init_data = request.headers.get(INIT_DATA_HEADER) or request.query_params.get("init_data")
    if not init_data or not settings.telegram_bot_token:
        return ensure_local_user()

    auth_payload = verify_telegram_init_data(init_data)
    user = db.execute(select(User).where(User.telegram_id == auth_payload.user.id)).scalar_one_or_none()

    if not user:
        user = User(
            telegram_id=auth_payload.user.id,
            telegram_username=auth_payload.user.username,
            language=auth_payload.user.language_code or "en",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    updated = False
    if auth_payload.user.username and user.telegram_username != auth_payload.user.username:
        user.telegram_username = auth_payload.user.username
        updated = True
    if auth_payload.user.language_code and user.language != auth_payload.user.language_code:
        user.language = auth_payload.user.language_code
        updated = True

    if updated:
        db.commit()
        db.refresh(user)

    return user
