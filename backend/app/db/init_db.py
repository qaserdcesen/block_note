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


def _drop_column(table: str, column: str) -> None:
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns(table)}
    if column not in existing:
        return
    with engine.connect() as conn:
        conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {column}"))
        conn.commit()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # Lightweight migrations for SQLite/initial runs.
    _ensure_column("tasks", "completion_mode", "completion_mode VARCHAR(20) NOT NULL DEFAULT 'percent'")
    _ensure_column("tasks", "completion_value", "completion_value INTEGER NOT NULL DEFAULT 0")
    _ensure_column("tasks", "category_id", "category_id INTEGER REFERENCES categories(id)")
    _ensure_column("habits", "completion_mode", "completion_mode VARCHAR(20) NOT NULL DEFAULT 'percent'")
    _ensure_column("habits", "completion_value", "completion_value INTEGER NOT NULL DEFAULT 0")
    _ensure_column("habits", "category_id", "category_id INTEGER REFERENCES categories(id)")
    _ensure_column("users", "telegram_id", "telegram_id BIGINT UNIQUE")
    _ensure_column("users", "telegram_username", "telegram_username VARCHAR(64)")
    _ensure_column("users", "first_day_of_week", "first_day_of_week VARCHAR(16) NOT NULL DEFAULT 'monday'")
    _ensure_column("users", "day_start_hour", "day_start_hour INTEGER NOT NULL DEFAULT 0")
    _ensure_column("users", "theme_mode", "theme_mode VARCHAR(16) NOT NULL DEFAULT 'system'")
    _ensure_column("users", "ui_density", "ui_density VARCHAR(16) NOT NULL DEFAULT 'standard'")
    _ensure_column("users", "font_scale", "font_scale VARCHAR(16) NOT NULL DEFAULT 'normal'")
    _ensure_column("users", "assistant_tone", "assistant_tone VARCHAR(16) NOT NULL DEFAULT 'friendly'")
    _ensure_column("users", "assistant_detail", "assistant_detail VARCHAR(16) NOT NULL DEFAULT 'concise'")
    _ensure_column(
        "users",
        "assistant_tips_suggest_habits",
        "assistant_tips_suggest_habits BOOLEAN NOT NULL DEFAULT 1",
    )
    _ensure_column(
        "users",
        "assistant_tips_overdue_tasks",
        "assistant_tips_overdue_tasks BOOLEAN NOT NULL DEFAULT 1",
    )
    _ensure_column(
        "users",
        "assistant_suggestions_enabled",
        "assistant_suggestions_enabled BOOLEAN NOT NULL DEFAULT 1",
    )
    _drop_column("users", "email")
    _drop_column("users", "hashed_password")
    _normalize_enum_values("tasks", "completion_mode")
    _normalize_enum_values("habits", "completion_mode")
