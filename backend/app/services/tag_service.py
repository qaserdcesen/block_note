from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate


def list_tags(db: Session, user_id: int) -> list[Tag]:
    stmt = select(Tag).where(Tag.user_id == user_id).order_by(Tag.name.asc())
    return list(db.execute(stmt).scalars().all())


def create_tag(db: Session, data: TagCreate) -> Tag:
    if data.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    tag = Tag(**data.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag_id: int, user_id: int, data: TagUpdate) -> Tag:
    tag = db.get(Tag, tag_id)
    if not tag or tag.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(tag, key, value)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag_id: int, user_id: int) -> None:
    tag = db.get(Tag, tag_id)
    if not tag or tag.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    db.delete(tag)
    db.commit()


def fetch_user_tags(db: Session, user_id: int, tag_ids: list[int]) -> list[Tag]:
    if not tag_ids:
        return []
    stmt = select(Tag).where(Tag.id.in_(tag_ids)).where(Tag.user_id == user_id)
    tags = list(db.execute(stmt).scalars().all())
    if len(tags) != len(set(tag_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more tags not found")
    return tags
