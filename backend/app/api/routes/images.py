from fastapi import APIRouter, Depends, Query

from app.schemas.common import WeatherBackgroundRequest, WeatherBackgroundResponse
from app.services.optional_services import ImageService, MapillaryService, get_image_service, get_mapillary_service

router = APIRouter(prefix="/images", tags=["images"])


@router.get("/mapillary")
def mapillary_images(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=5, ge=1, le=10),
    mapillary: MapillaryService = Depends(get_mapillary_service),
) -> dict:
    images = mapillary.fetch_images(lat, lon, limit=limit)
    return {
        "configured": bool(mapillary.settings.mapillary_token),
        "results": images,
        "message": None if images else "No Mapillary images found or Mapillary is not configured.",
    }


@router.post("/weather-background", response_model=WeatherBackgroundResponse)
def weather_background(
    payload: WeatherBackgroundRequest,
    images: ImageService = Depends(get_image_service),
) -> WeatherBackgroundResponse:
    return WeatherBackgroundResponse(
        generated_image_url=images.generate_clipart(payload.location, payload.weather),
    )
