from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.saved_location import SavedLocation


def create_saved_location(db: Session, saved_location: SavedLocation) -> SavedLocation:
    db.add(saved_location)
    db.commit()
    db.refresh(saved_location)
    return saved_location


def list_saved_locations(db: Session, limit: int = 100, offset: int = 0) -> list[SavedLocation]:
    statement = select(SavedLocation).order_by(SavedLocation.created_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(statement).all())


def get_saved_location(db: Session, location_id: int) -> SavedLocation | None:
    return db.get(SavedLocation, location_id)


def update_saved_location(
    db: Session,
    saved_location: SavedLocation,
    tag: str | None = None,
    generated_image_url: str | None = None,
) -> SavedLocation:
    if tag is not None:
        saved_location.tag = tag
    if generated_image_url is not None:
        saved_location.generated_image_url = generated_image_url
    db.add(saved_location)
    db.commit()
    db.refresh(saved_location)
    return saved_location


def delete_saved_location(db: Session, saved_location: SavedLocation) -> None:
    db.delete(saved_location)
    db.commit()
