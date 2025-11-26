from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def list_categories(db: Session, user_id: int) -> list[Category]:
    stmt = select(Category).where(Category.user_id == user_id).order_by(Category.name.asc())
    return list(db.execute(stmt).scalars().all())


def create_category(db: Session, data: CategoryCreate) -> Category:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    normalized = data.name.strip()
    # Defensive deduplication by trimmed lower name.
    existing = (
        db.execute(
            select(Category)
            .where(Category.user_id == data.user_id)
            .where(func.lower(func.trim(Category.name)) == normalized.lower())
        )
        .scalar_one_or_none()
    )
    if existing:
        return existing
    try:
        category = Category(user_id=data.user_id, name=normalized)
        db.add(category)
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError:
        db.rollback()
        existing = (
            db.execute(
                select(Category)
                .where(Category.user_id == data.user_id)
                .where(func.lower(func.trim(Category.name)) == normalized.lower())
            )
            .scalar_one_or_none()
        )
        if existing:
            return existing
        raise


def update_category(db: Session, category_id: int, user_id: int, data: CategoryUpdate) -> Category:
    category = db.get(Category, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int, user_id: int) -> None:
    category = db.get(Category, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    for task in list(category.tasks):
        task.category_id = None
    for habit in list(category.habits):
        habit.category_id = None
    db.delete(category)
    db.commit()
