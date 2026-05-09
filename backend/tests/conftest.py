from collections.abc import Generator
from datetime import UTC, date, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.schemas.common import (
    ForecastDay,
    ForecastResponse,
    HourlyForecast,
    LocationQuery,
    MinutelyForecast,
    OneCallWeatherResponse,
    ResolvedLocation,
    WeatherAlert,
    WeatherSummary,
)
from app.services.location_service import get_location_service
from app.services.optional_services import get_ai_service, get_image_service, get_mapillary_service, get_places_service
from app.services.weather_service import get_weather_service


class FakeLocationService:
    def resolve(self, query: LocationQuery) -> ResolvedLocation:
        return ResolvedLocation(
            source_input=query.source_input,
            location_name="Test City",
            latitude=40.7128,
            longitude=-74.006,
            country="US",
            state="New York",
        )


class FakeWeatherService:
    def current_weather(self, location: ResolvedLocation) -> WeatherSummary:
        return WeatherSummary(
            temperature=21.5,
            feels_like=20.0,
            condition="Clouds",
            description="scattered clouds",
            humidity=65,
            wind_speed=3.4,
            sunrise=datetime(2026, 5, 9, 10, 0, tzinfo=UTC),
            sunset=datetime(2026, 5, 9, 23, 0, tzinfo=UTC),
            local_time=datetime(2026, 5, 9, 15, 0, tzinfo=UTC),
            summary="Scattered Clouds with 21.5C",
            raw={"provider": "fake"},
        )

    def five_day_forecast(self, location: ResolvedLocation) -> ForecastResponse:
        one_call = self.one_call_weather(location)
        return ForecastResponse(location=location, days=one_call.daily[:5], raw=one_call.raw)

    def one_call_weather(
        self,
        location: ResolvedLocation,
        exclude: list[str] | None = None,
    ) -> OneCallWeatherResponse:
        current = self.current_weather(location)
        return OneCallWeatherResponse(
            location=location,
            timezone="America/New_York",
            timezone_offset=-14400,
            current=current,
            minutely=[MinutelyForecast(forecast_time=datetime(2026, 5, 9, 15, 1, tzinfo=UTC), precipitation=0.0)],
            hourly=[
                HourlyForecast(
                    forecast_time=datetime(2026, 5, 9, 16, 0, tzinfo=UTC),
                    temperature=22.0,
                    feels_like=21.0,
                    condition="Clouds",
                    description="scattered clouds",
                    humidity=66,
                    wind_speed=3.8,
                    precipitation_chance=0.2,
                    icon="03d",
                )
            ],
            daily=[
                ForecastDay(
                    date=date(2026, 5, 9),
                    high=23.0,
                    low=17.0,
                    condition="Clouds",
                    description="scattered clouds",
                    precipitation_chance=0.2,
                    icon="03d",
                ),
                ForecastDay(
                    date=date(2026, 5, 10),
                    high=25.0,
                    low=18.0,
                    condition="Clear",
                    description="clear sky",
                    precipitation_chance=0.0,
                    icon="01d",
                ),
            ],
            alerts=[
                WeatherAlert(
                    sender_name="Test Weather Service",
                    event="Heat advisory",
                    start=datetime(2026, 5, 9, 18, 0, tzinfo=UTC),
                    end=datetime(2026, 5, 10, 0, 0, tzinfo=UTC),
                    description="Stay hydrated.",
                    tags=["Heat"],
                )
            ],
            raw={"provider": "fake"},
        )

    def date_range_weather(self, location: ResolvedLocation, start_date: date, end_date: date) -> dict[str, Any]:
        return {
            "provider": "fake",
            "supported": True,
            "days": [{"date": start_date.isoformat(), "high": 23.0, "low": 17.0}],
        }

    def date_range_from_daily(self, daily: list[ForecastDay], start_date: date, end_date: date) -> dict[str, Any]:
        return {
            "provider": "fake",
            "supported": True,
            "days": [day.model_dump(mode="json") for day in daily if start_date <= day.date <= end_date],
        }

    def weather_overview(self, location: ResolvedLocation, requested_date: date | None = None) -> str:
        return "AI weather overview from OpenWeather for testing."


class FakeImageService:
    def generate_clipart(self, location: ResolvedLocation, weather: WeatherSummary) -> str:
        return (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
        )


class FakePlacesService:
    def nearby(self, lat: float, lon: float, place_type: str) -> dict[str, Any]:
        return {
            "configured": True,
            "approximate": False,
            "results": [{"name": "Test Place", "rating": 4.5, "address": "1 Main St", "open_now": True}],
            "message": None,
        }


class FakeMapillaryService:
    settings = type("Settings", (), {"mapillary_token": None})()

    def fetch_images(self, lat: float, lon: float, limit: int = 5) -> list[dict[str, Any]]:
        return []


class FakeAiService:
    def answer_weather_question(self, question: str, context: dict[str, Any] | None) -> dict[str, Any]:
        return {"configured": True, "answer": "Carry a light jacket and check the forecast before leaving."}


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_location_service] = lambda: FakeLocationService()
    app.dependency_overrides[get_weather_service] = lambda: FakeWeatherService()
    app.dependency_overrides[get_image_service] = lambda: FakeImageService()
    app.dependency_overrides[get_places_service] = lambda: FakePlacesService()
    app.dependency_overrides[get_mapillary_service] = lambda: FakeMapillaryService()
    app.dependency_overrides[get_ai_service] = lambda: FakeAiService()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
