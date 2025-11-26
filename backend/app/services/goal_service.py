from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.models.category import Category
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate


def _load_category(db: Session, user_id: int, category_id: int | None) -> Category | None:
    if category_id is None:
        return None
    category = db.get(Category, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


def list_goals(db: Session, user_id: int) -> list[Goal]:
    stmt = select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def create_goal(db: Session, data: GoalCreate) -> Goal:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    payload = data.model_dump()
    category_id = payload.pop("category_id", None)
    goal = Goal(**payload)
    goal.category = _load_category(db, user_id=goal.user_id, category_id=category_id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def update_goal(db: Session, goal_id: int, user_id: int, data: GoalUpdate) -> Goal:
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    payload = data.model_dump(exclude_unset=True)
    category_id = payload.pop("category_id", None)
    for field, value in payload.items():
        setattr(goal, field, value)
    if category_id is not None:
        goal.category = _load_category(db, user_id=user_id, category_id=category_id)
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, goal_id: int, user_id: int) -> None:
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    db.delete(goal)
    db.commit()
