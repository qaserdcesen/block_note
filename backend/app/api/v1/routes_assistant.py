from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.assistant import AssistantMessage, AssistantResponse
from app.services import assistant_service

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/message", response_model=AssistantResponse)
def send_message(
    payload: AssistantMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reply = assistant_service.process_message(db, current_user.id, payload.user_message)
    return AssistantResponse(reply=reply)

