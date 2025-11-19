# Backend

FastAPI-based modular monolith powering tasks, habits, reminders и rule-based ассистента. При запуске монтируется статичный web UI (/web).

## Run locally
`ash
python -m venv .venv
source .venv/bin/activate  # или .venv\Scripts\Activate.ps1 на Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
`

После запуска зайдите на http://127.0.0.1:8000/ — там демо-интерфейс из rontend/web/public. API живёт под /api/v1.

## Key deps
- FastAPI + Uvicorn — REST API/runtime.
- SQLAlchemy 2.x + SQLite — persistence (готов к миграции на PostgreSQL).
- Pydantic v2 — схемы & валидация.
- APScheduler — фоновые напоминания.
- python-jose + passlib — JWT и хэши паролей.

## Modules
- pp/api — роутеры (auth, tasks, habits, reminders, assistant).
- pp/services — доменная логика + контекст/уведомления.
- pp/core — конфигурация, безопасность, scheduler, stub llm client.
- pp/db — base classes, engine/session, init_db.
- pp/models — ORM-модели и связи.
- pp/workers — фоновые задачи (reminder worker).

Детали запуска/flow — в корневом README.md.
