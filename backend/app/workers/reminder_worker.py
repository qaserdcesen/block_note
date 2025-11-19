from app.db.session import SessionLocal
from app.services import context_service, notification_service, reminder_service


def check_and_fire_reminders() -> None:
    db = SessionLocal()
    try:
        due_reminders = reminder_service.list_active_time_based(db)
        for reminder in due_reminders:
            notification_service.notify_user(
                db,
                user_id=reminder.user_id,
                message=f"Reminder #{reminder.id}: check task/habit context",
            )
            reminder_service.mark_triggered(db, reminder)

        # TODO: implement location/weather/behavior triggers using context_service helpers
    finally:
        db.close()

