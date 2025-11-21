# Contextual Task & Habit Manager

Small personal assistant for tasks, habits, reminders, and a rule-based helper. Backend stays on FastAPI + SQLite; frontend targets a Telegram mini-app served from the backend.

## What's inside
- **backend/** - FastAPI app with REST endpoints, scheduling, and assistant logic.
- **frontend/web/** - Telegram mini-app UI (no bundler). Served from `/web`.
- **frontend/mobile/** - archived Expo/React Native drafts kept for reference.

## Layout
```
root/
  backend/            FastAPI application (app/, tests/, data/)
  frontend/
    web/
      public/         Ship-ready mini-app (index.html, app.js, styles.css)
      src/            Old React/TS sketches (not wired to the build)
    mobile/           Expo drafts (archived)
```

## Backend setup
```bash
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env  # fill secrets/DB/timezone/LLM keys if needed
```

Key `.env` values: `APP_NAME`, `DATABASE_URL` (default SQLite `data/app.db`), `TELEGRAM_BOT_TOKEN` (for Telegram signature checks; optional for local web runs), `SCHEDULER_TIMEZONE`. LLM keys are optional unless you enable those code paths.

## Run
```bash
cd backend
uvicorn app.main:app --reload
```

On start:
1. SQLite database is created at `backend/data/app.db` (unless you point to another DB).
2. REST API lives at `http://127.0.0.1:8000/api/v1/...`.
3. APScheduler polls every ~5 minutes for time-based reminders.
4. Telegram mini-app UI is served at `/web` (same host).

## API surface (v1)
- All endpoints expect raw `initData` from the Telegram WebApp in `X-Telegram-Init-Data`; the backend verifies it and auto-creates users by `telegram_id`.
- `GET|POST|PATCH|DELETE /api/v1/tasks?date=YYYY-MM-DD` - tasks with priority 1-10 and completion tracking.
- `GET|POST|PATCH /api/v1/habits` and `GET|POST /api/v1/habits/{habit_id}/logs` - habits + daily/weekly logs.
- `GET|POST|PATCH|DELETE /api/v1/reminders` - time-based reminders.
- `POST /api/v1/assistant/message` - rule-based assistant reply.

## Frontends
- **Telegram mini-app (primary)**: `frontend/web/public` is static, uses Telegram WebApp API (themes, haptics) and works without a bundler. Open `/web` locally or set the same URL in BotFather as `Web App URL`.
- **Expo skeleton (archived)**: `frontend/mobile` keeps component drafts; not wired to the current flow.

## Notes for further work
- LLM helpers live in `backend/app/core/llm_client.py` and `context_service.py`.
- Alembic migrations are not set up yet.
- React/React Native implementations can reuse the same REST API surface when/if revived.
