from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from starlette import status

from app.core.errors import AppError
from app.db.session import get_db
from app.models.saved_location import SavedLocation
from app.repositories.saved_locations import (
    create_saved_location,
    delete_saved_location,
    get_saved_location,
    list_saved_locations,
    update_saved_location,
)
from app.schemas.common import SavedLocationCreate, SavedLocationRead, SavedLocationUpdate
from app.services.location_service import LocationService, get_location_service

router = APIRouter(prefix="/saved-locations", tags=["saved locations"])


@router.post("", response_model=SavedLocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: SavedLocationCreate,
    db: Session = Depends(get_db),
    locations: LocationService = Depends(get_location_service),
) -> SavedLocation:
    location = locations.resolve(payload)
    saved_location = SavedLocation(
        source_input=location.source_input,
        location_name=location.location_name,
        country=location.country,
        state=location.state,
        latitude=location.latitude,
        longitude=location.longitude,
        tag=payload.tag,
        generated_image_url=payload.generated_image_url,
    )
    return create_saved_location(db, saved_location)


@router.get("", response_model=list[SavedLocationRead])
def list_locations(
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[SavedLocation]:
    return list_saved_locations(db, limit=limit, offset=offset)


@router.patch("/{location_id}", response_model=SavedLocationRead)
def patch_location(
    location_id: int,
    payload: SavedLocationUpdate,
    db: Session = Depends(get_db),
) -> SavedLocation:
    saved_location = get_saved_location(db, location_id)
    if saved_location is None:
        raise AppError("RECORD_NOT_FOUND", "Saved location was not found.", status.HTTP_404_NOT_FOUND)
    return update_saved_location(
        db,
        saved_location,
        tag=payload.tag,
        generated_image_url=payload.generated_image_url,
    )


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_location(location_id: int, db: Session = Depends(get_db)) -> None:
    saved_location = get_saved_location(db, location_id)
    if saved_location is None:
        raise AppError("RECORD_NOT_FOUND", "Saved location was not found.", status.HTTP_404_NOT_FOUND)
    delete_saved_location(db, saved_location)
