# Backend

FastAPI-based module that powers tasks, habits, reminders, and a rule-based helper. It also serves the static Telegram mini-app UI from `/web` when the frontend build is present.

## Run locally
```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

After start the API lives at `http://127.0.0.1:8000/api/v1` and the bundled web UI (if present) is at `/web`.

## Auth model for the Telegram mini-app
- No email/password or JWT flows. Users are recognized by Telegram.
- Each request should pass raw `initData` from `Telegram.WebApp.initData` in the `X-Telegram-Init-Data` header (or `init_data` query param).
- The backend checks the signature with `TELEGRAM_BOT_TOKEN`, rejects stale payloads (>24h), and creates/updates the user by `telegram_id` and `telegram_username`.
- When `TELEGRAM_BOT_TOKEN` or `initData` are absent (e.g., local web run), a fallback local user is created/used automatically.

## Key deps
- FastAPI + Uvicorn - REST API/runtime.
- SQLAlchemy 2.x + SQLite - persistence (swap to PostgreSQL later if needed).
- Pydantic v2 - validation & serialization.
- APScheduler - background reminder polling.

## Modules
- app/api - routers (tasks, habits, reminders, assistant, categories, tags).
- app/services - business logic and orchestrations.
- app/core - configuration, security (Telegram init data verification), scheduler, stub llm client.
- app/db - base classes, engine/session, init_db.
- app/models - ORM models.
- app/workers - background jobs (reminder worker).
