from fastapi import APIRouter

from . import (
    routes_assistant,
    routes_auth,
    routes_categories,
    routes_habits,
    routes_reminders,
    routes_tags,
    routes_tasks,
)

api_router = APIRouter()
api_router.include_router(routes_auth.router)
api_router.include_router(routes_tasks.router)
api_router.include_router(routes_habits.router)
api_router.include_router(routes_reminders.router)
api_router.include_router(routes_assistant.router)
api_router.include_router(routes_categories.router)
api_router.include_router(routes_tags.router)

