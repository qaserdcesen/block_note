from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models for metadata registration
from app.models import category, habit, message, notification, reminder, tag, task, user  # noqa: E402,F401

