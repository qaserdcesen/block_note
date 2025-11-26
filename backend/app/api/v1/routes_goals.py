from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalRead, GoalUpdate
from app.services import goal_service

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalRead])
def list_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return goal_service.list_goals(db, user_id=current_user.id)


@router.post("", response_model=GoalRead)
def create_goal(data: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payload = data.model_copy(update={"user_id": current_user.id})
    return goal_service.create_goal(db, payload)


@router.patch("/{goal_id}", response_model=GoalRead)
def update_goal(
    goal_id: int, data: GoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return goal_service.update_goal(db, goal_id=goal_id, user_id=current_user.id, data=data)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal_service.delete_goal(db, goal_id=goal_id, user_id=current_user.id)
    return Response(status_code=204)
