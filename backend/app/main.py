from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.core.config import get_settings
from app.core.scheduler import shutdown_scheduler, start_scheduler
from app.db.init_db import init_db

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_WEB_DIR = BASE_DIR / "frontend" / "web" / "public"
if STATIC_WEB_DIR.exists():
    app.mount("/web", StaticFiles(directory=STATIC_WEB_DIR, html=True), name="web")


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown() -> None:
    shutdown_scheduler()


@app.get("/", include_in_schema=False)
def landing_page():
    if STATIC_WEB_DIR.exists():
        return RedirectResponse(url="/web")
    return {"message": "API running"}


@app.get("/health", tags=["meta"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
