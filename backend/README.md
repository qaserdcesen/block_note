# Backend

FastAPI-based modular monolith that powers tasks, habits, reminders, and the assistant.

## Run locally
```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Key deps
- FastAPI + Uvicorn — REST API/runtime.
- SQLAlchemy 2.x + SQLite — persistence (swap-ready for PostgreSQL).
- Pydantic v2 — schemas & validation.
- APScheduler — background reminder checks.
- python-jose + passlib — JWT tokens and password hashing.

## Modules
- `app/api` — routers for auth, tasks, habits, reminders, assistant.
- `app/services` — domain logic plus LLM/context/notification helpers.
- `app/core` — configuration, security helpers, scheduler, llm client.
- `app/db` — base classes, engine/session, DB init.
- `app/models` — ORM layers and relationships.
- `app/workers` — background jobs.

See the root `README.md` for the monorepo overview and flows.
