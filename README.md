# Contextual Task & Habit Manager

Smart planner that mixes tasks, habits, reminders, and an LLM assistant. The repository is a monorepo: Python backend (FastAPI) plus placeholder clients (React Native + React web).

## Layout
```
root/
  backend/            # FastAPI app and service layer
  frontend/mobile/    # Expo/React Native structure
  frontend/web/       # Web client skeleton
```

Highlights:
- `backend/app/api` — REST routers grouped by domain (auth, tasks, habits, reminders, assistant).
- `backend/app/services` — business logic, assistants, context + notification abstractions.
- `backend/app/models` — SQLAlchemy 2.x models with relationships and enums.
- `backend/app/schemas` — Pydantic v2 DTOs (Base/Create/Update/Read).
- `backend/app/core` — config loading, security helpers, scheduler, LLM client stub.
- `backend/app/workers` — background jobs (reminders).
- `frontend/mobile` — React Native screens/components for Today/Chat/Tasks/Habits/Reminders/Settings.
- `frontend/web` — React pages/components for Today, tasks, habits, reminders, settings.

## Backend setup
```bash
cd backend
python -m venv .venv
# Linux/macOS
after the venv is created: source .venv/bin/activate
# Windows PowerShell
after the venv is created: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env  # set secrets and API keys
```

## Run backend
```bash
cd backend
uvicorn app.main:app --reload
```

What happens on startup:
1. FastAPI mounts `/api/v1/...` routers.
2. SQLite schema is created via declarative metadata (easy to swap to PostgreSQL).
3. APScheduler wires `workers.reminder_worker.check_and_fire_reminders` every 5 minutes.

## Typical flow
1. `POST /api/v1/auth/register` — user creation (password hashed via `passlib[bcrypt]`).
2. `POST /api/v1/auth/login` — receives JWT, required for all other routes.
3. `GET/POST/PATCH/DELETE /api/v1/tasks` — CRUD with date filtering.
4. `GET/POST/PATCH /api/v1/habits` + `/{habit_id}/logs` — recurrence management.
5. `GET/POST/PATCH/DELETE /api/v1/reminders` — contextual reminder definitions.
6. `POST /api/v1/assistant/message` — stores chat history, triggers rule-based intents, uses the LLM stub.

## Frontend scaffolds
- **Mobile (React Native/Expo)** — Tab navigator with Today, Chat, Tasks, Habits, Reminders, Settings screens and simple list items.
- **Web (React)** — Layout wrapper and placeholder pages for Today/tasks/habits/reminders/settings.

## Next steps
- Plug a real LLM SDK into `app/core/llm_client.py`.
- Ship Alembic migrations + CI.
- Expand context checks (geo/weather/behavior) inside `context_service` and the worker.
- Flesh out API clients on mobile/web and add automated tests.
