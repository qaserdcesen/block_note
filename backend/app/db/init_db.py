from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.session import engine


def _ensure_column(table: str, column: str, ddl: str) -> None:
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns(table)}
    if column in existing:
        return
    with engine.connect() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
        conn.commit()


def _normalize_enum_values(table: str, column: str) -> None:
    with engine.connect() as conn:
        conn.execute(text(f"UPDATE {table} SET {column} = UPPER({column}) WHERE {column} IN ('binary', 'percent')"))
        conn.commit()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # Lightweight migrations for SQLite/initial runs.
    _ensure_column("tasks", "completion_mode", "completion_mode VARCHAR(20) NOT NULL DEFAULT 'binary'")
    _ensure_column("tasks", "completion_value", "completion_value INTEGER NOT NULL DEFAULT 0")
    _ensure_column("habits", "completion_mode", "completion_mode VARCHAR(20) NOT NULL DEFAULT 'binary'")
    _ensure_column("habits", "completion_value", "completion_value INTEGER NOT NULL DEFAULT 0")
    _ensure_column("users", "telegram_id", "telegram_id BIGINT UNIQUE")
    _ensure_column("users", "telegram_username", "telegram_username VARCHAR(64)")
    _normalize_enum_values("tasks", "completion_mode")
    _normalize_enum_values("habits", "completion_mode")
