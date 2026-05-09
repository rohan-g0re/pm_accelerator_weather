from fastapi import APIRouter, Depends, Query

from app.schemas.common import NearbyPlacesResponse
from app.services.optional_services import PlacesService, get_places_service

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/nearby", response_model=NearbyPlacesResponse)
def nearby_places(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    type: str = Query(pattern="^(restaurant|hotel)$"),
    places: PlacesService = Depends(get_places_service),
) -> dict:
    return places.nearby(lat, lon, type)
