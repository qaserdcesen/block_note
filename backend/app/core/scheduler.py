from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import get_settings
from app.workers.reminder_worker import check_and_fire_reminders

settings = get_settings()
scheduler = BackgroundScheduler(timezone=settings.scheduler_timezone)


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        func=check_and_fire_reminders,
        trigger="interval",
        minutes=5,
        id="reminder_worker",
        replace_existing=True,
    )
    scheduler.start()


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)

