from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.base import Base
from app.models.nearby_places_cache import NearbyPlacesCache
from app.services.optional_services import AiService, MapillaryService, PlacesService


def test_places_cache_accepts_naive_sqlite_timestamp():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.add(
            NearbyPlacesCache(
                latitude=18.521428,
                longitude=73.8544541,
                place_type="restaurant",
                results=[{"name": "Cached Cafe", "rating": 4.2, "address": "1 Main St"}],
                created_at=datetime.now(),
            )
        )
        db.commit()

        result = PlacesService(Settings(), db).nearby(18.521428, 73.8544541, "restaurant")

        assert result["results"][0]["name"] == "Cached Cafe"
        assert result["results"][0]["google_maps_url"].startswith("https://www.google.com/maps/search/")
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_places_service_surfaces_google_places_status_errors(mocker):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"status": "REQUEST_DENIED", "error_message": "API key is not authorized."}

    class FakeClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def get(self, url, params=None):
            return FakeResponse()

    mocker.patch("app.services.optional_services.httpx.Client", FakeClient)

    result = PlacesService(Settings(google_maps_api_key="key")).nearby(18.521428, 73.8544541, "restaurant")

    assert result["results"] == []
    assert result["message"] == "API key is not authorized."


def test_ai_service_prompt_requires_under_30_words(mocker):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "Take a light jacket and avoid long walks if rain starts."}}]}

    class FakeClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def post(self, url, headers=None, json=None):
            captured["json"] = json
            return FakeResponse()

    mocker.patch("app.services.optional_services.httpx.Client", FakeClient)

    result = AiService(Settings(deepseek_api_key="key")).answer_weather_question(
        "Should I go outside?",
        {"summary": "Rain likely after 4 PM with cool wind."},
    )

    system_prompt = captured["json"]["messages"][0]["content"]
    assert result["configured"] is True
    assert "fewer than 30 words" in system_prompt
    assert "Rain likely after 4 PM with cool wind." in system_prompt


def test_mapillary_fetch_images_uses_documented_bbox_endpoint(mocker):
    settings = Settings(mapillary_token="token")
    service = MapillaryService(settings)
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": [{"id": "1", "thumb_1024_url": "https://example.com/1.jpg"}]}

    class FakeClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def get(self, url, params=None):
            captured["url"] = url
            captured["params"] = params
            return FakeResponse()

    mocker.patch("app.services.optional_services.httpx.Client", FakeClient)

    images = service.fetch_images(10.0, 20.0, limit=3)

    assert captured["url"] == "https://graph.mapillary.com/images"
    assert captured["params"]["fields"] == "id,thumb_1024_url,captured_at,geometry"
    assert captured["params"]["bbox"] == "19.995,9.995,20.005,10.005"
    assert captured["params"]["access_token"] == "token"
    assert images[0]["thumb_1024_url"] == "https://example.com/1.jpg"
