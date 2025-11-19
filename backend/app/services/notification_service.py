from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import NotificationChannel, NotificationChannelType


def get_active_channels(db: Session, user_id: int) -> list[NotificationChannel]:
    stmt = select(NotificationChannel).where(
        NotificationChannel.user_id == user_id, NotificationChannel.is_active.is_(True)
    )
    return list(db.execute(stmt).scalars().all())


def send_notification(channel: NotificationChannel, message: str) -> None:
    # TODO: integrate with push/email/Telegram providers
    print(f"[{channel.channel}] -> {channel.target}: {message}")


def notify_user(db: Session, user_id: int, message: str) -> None:
    channels = get_active_channels(db, user_id)
    for channel in channels:
        send_notification(channel, message)


def broadcast(channels: Iterable[NotificationChannel], message: str) -> None:
    for channel in channels:
        send_notification(channel, message)

