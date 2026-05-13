from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from starlette import status

from app.core.errors import AppError
from app.db.session import get_db
from app.models.weather_history import WeatherHistory
from app.repositories.weather_history import (
    create_weather_history,
    delete_weather_history,
    get_weather_history,
    list_weather_history,
    update_weather_history,
)
from app.schemas.common import (
    ForecastResponse,
    LocationQuery,
    OneCallWeatherResponse,
    WeatherCurrentResponse,
    WeatherHistoryCreate,
    WeatherHistoryRead,
    WeatherHistoryUpdate,
    WeatherOverviewResponse,
)
from app.services.location_service import LocationService, get_location_service
from app.services.optional_services import ImageService, get_image_service
from app.services.weather_service import WeatherService, get_weather_service

router = APIRouter(prefix="/weather", tags=["weather"])


def _query_from_params(
    q: str | None = None,
    zip: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
) -> LocationQuery:
    return LocationQuery(q=q, zip=zip, lat=lat, lon=lon)


@router.get("/current", response_model=WeatherCurrentResponse)
def current_weather(
    q: str | None = Query(default=None),
    zip: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    locations: LocationService = Depends(get_location_service),
    weather: WeatherService = Depends(get_weather_service),
) -> WeatherCurrentResponse:
    location = locations.resolve(_query_from_params(q=q, zip=zip, lat=lat, lon=lon))
    return WeatherCurrentResponse(location=location, weather=weather.current_weather(location))


@router.get("/forecast", response_model=ForecastResponse)
def five_day_forecast(
    q: str | None = Query(default=None),
    zip: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    locations: LocationService = Depends(get_location_service),
    weather: WeatherService = Depends(get_weather_service),
) -> ForecastResponse:
    location = locations.resolve(_query_from_params(q=q, zip=zip, lat=lat, lon=lon))
    return weather.five_day_forecast(location)


@router.get("/one-call", response_model=OneCallWeatherResponse)
def one_call_weather(
    q: str | None = Query(default=None),
    zip: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    locations: LocationService = Depends(get_location_service),
    weather: WeatherService = Depends(get_weather_service),
) -> OneCallWeatherResponse:
    location = locations.resolve(_query_from_params(q=q, zip=zip, lat=lat, lon=lon))
    return weather.one_call_weather(location)


@router.get("/overview", response_model=WeatherOverviewResponse)
def weather_overview(
    q: str | None = Query(default=None),
    zip: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    locations: LocationService = Depends(get_location_service),
    weather: WeatherService = Depends(get_weather_service),
) -> WeatherOverviewResponse:
    location = locations.resolve(_query_from_params(q=q, zip=zip, lat=lat, lon=lon))
    return WeatherOverviewResponse(summary=weather.weather_overview(location))


@router.post("/history", response_model=WeatherHistoryRead, status_code=status.HTTP_201_CREATED)
def create_history(
    payload: WeatherHistoryCreate,
    db: Session = Depends(get_db),
    locations: LocationService = Depends(get_location_service),
    weather: WeatherService = Depends(get_weather_service),
    images: ImageService = Depends(get_image_service),
) -> WeatherHistory:
    location = locations.resolve(payload)
    one_call = weather.one_call_weather(location)
    current = one_call.current
    forecast = ForecastResponse(location=location, days=one_call.daily[:5], raw=one_call.raw)
    date_range = weather.date_range_weather(location, payload.start_date, payload.end_date)
    generated_image_url = images.generate_clipart(location, current)
    try:
        ai_summary = weather.weather_overview(location, payload.start_date)
    except AppError:
        ai_summary = current.summary
    history = WeatherHistory(
        source_input=location.source_input,
        location_name=location.location_name,
        country=location.country,
        state=location.state,
        latitude=location.latitude,
        longitude=location.longitude,
        start_date=payload.start_date,
        end_date=payload.end_date,
        current_weather=current.model_dump(mode="json"),
        forecast={
            **forecast.model_dump(mode="json"),
            "minutely": [minute.model_dump(mode="json") for minute in one_call.minutely],
            "hourly": [hour.model_dump(mode="json") for hour in one_call.hourly],
            "alerts": [alert.model_dump(mode="json") for alert in one_call.alerts],
            "provider": "openweather_one_call_3",
        },
        date_range_weather=date_range,
        summary=ai_summary,
        generated_image_url=generated_image_url,
        note=payload.note,
        label=payload.label,
    )
    return create_weather_history(db, history)


@router.get("/history", response_model=list[WeatherHistoryRead])
def list_history(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[WeatherHistory]:
    return list_weather_history(db, limit=limit, offset=offset)


@router.get("/history/{history_id}", response_model=WeatherHistoryRead)
def read_history(history_id: int, db: Session = Depends(get_db)) -> WeatherHistory:
    history = get_weather_history(db, history_id)
    if history is None:
        raise AppError("RECORD_NOT_FOUND", "Weather history record was not found.", status.HTTP_404_NOT_FOUND)
    return history


@router.patch("/history/{history_id}", response_model=WeatherHistoryRead)
def patch_history(
    history_id: int,
    payload: WeatherHistoryUpdate,
    db: Session = Depends(get_db),
) -> WeatherHistory:
    history = get_weather_history(db, history_id)
    if history is None:
        raise AppError("RECORD_NOT_FOUND", "Weather history record was not found.", status.HTTP_404_NOT_FOUND)
    return update_weather_history(db, history, payload)


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_history(history_id: int, db: Session = Depends(get_db)) -> None:
    history = get_weather_history(db, history_id)
    if history is None:
        raise AppError("RECORD_NOT_FOUND", "Weather history record was not found.", status.HTTP_404_NOT_FOUND)
    delete_weather_history(db, history)
