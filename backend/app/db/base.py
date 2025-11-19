from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models for metadata registration
from app.models import habit, message, notification, reminder, task, user  # noqa: E402,F401

