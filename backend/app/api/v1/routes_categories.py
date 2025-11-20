from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return category_service.list_categories(db, current_user.id)


@router.post("", response_model=CategoryRead)
def create_category(
    data: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    payload = data.model_copy(update={"user_id": current_user.id})
    return category_service.create_category(db, payload)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return category_service.update_category(db, category_id=category_id, user_id=current_user.id, data=data)


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category_service.delete_category(db, category_id=category_id, user_id=current_user.id)
    return Response(status_code=204)
