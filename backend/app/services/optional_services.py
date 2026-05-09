import base64
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

import httpx
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.nearby_places_cache import NearbyPlacesCache
from app.schemas.common import ResolvedLocation, WeatherSummary


class PlacesService:
    def __init__(self, settings: Settings | None = None, db: Session | None = None) -> None:
        self.settings = settings or get_settings()
        self.db = db

    def nearby(self, lat: float, lon: float, place_type: str) -> dict[str, Any]:
        if self.db is not None:
            cache_stmt = select(NearbyPlacesCache).where(
                NearbyPlacesCache.latitude == lat,
                NearbyPlacesCache.longitude == lon,
                NearbyPlacesCache.place_type == place_type
            ).order_by(NearbyPlacesCache.created_at.desc())
            cache_record = self.db.scalars(cache_stmt).first()
            if cache_record:
                if (datetime.now(timezone.utc) - self._as_utc(cache_record.created_at)).days < 7:
                    return {
                        "configured": True,
                        "approximate": False,
                        "results": self._with_google_maps_urls(cache_record.results),
                        "message": None,
                    }

        if not self.settings.google_maps_api_key:
            return {
                "configured": False,
                "approximate": False,
                "results": [],
                "message": "Google Maps API key is not configured.",
            }
        try:
            with httpx.Client(timeout=self.settings.external_timeout_seconds) as client:
                response = client.get(
                    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                    params={
                        "key": self.settings.google_maps_api_key,
                        "location": f"{lat},{lon}",
                        "radius": 2500,
                        "type": place_type,
                    },
                )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError:
            return {
                "configured": True,
                "approximate": False,
                "results": [],
                "message": "Nearby places are temporarily unavailable.",
            }
        places_status = data.get("status")
        if places_status not in {None, "OK", "ZERO_RESULTS"}:
            return {
                "configured": True,
                "approximate": False,
                "results": [],
                "message": data.get("error_message") or f"Google Places returned {places_status}.",
            }
        results = [
            {
                "name": item.get("name"),
                "rating": item.get("rating"),
                "address": item.get("vicinity"),
                "open_now": item.get("opening_hours", {}).get("open_now"),
                "google_maps_url": self._google_maps_url(item),
            }
            for item in data.get("results", [])[:10]
        ]
        if self.db is not None:
            if cache_record:
                cache_record.results = results
                cache_record.created_at = datetime.now(timezone.utc)
            else:
                cache_record = NearbyPlacesCache(
                    latitude=lat,
                    longitude=lon,
                    place_type=place_type,
                    results=results,
                )
                self.db.add(cache_record)
            self.db.commit()

        return {"configured": True, "approximate": False, "results": results, "message": None}

    def _as_utc(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def _google_maps_url(self, item: dict[str, Any]) -> str:
        query = quote_plus(", ".join(part for part in [item.get("name"), item.get("vicinity") or item.get("address")] if part))
        if item.get("place_id"):
            return f"https://www.google.com/maps/search/?api=1&query={query}&query_place_id={item['place_id']}"
        return f"https://www.google.com/maps/search/?api=1&query={query}"

    def _with_google_maps_urls(self, results: Any) -> list[dict[str, Any]]:
        if not isinstance(results, list):
            return []
        return [
            {**item, "google_maps_url": item.get("google_maps_url") or self._google_maps_url(item)}
            for item in results
            if isinstance(item, dict)
        ]


class AiService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def answer_weather_question(self, question: str, context: dict[str, Any] | None) -> dict[str, Any]:
        if not self.settings.deepseek_api_key:
            summary = (context or {}).get("summary") or "weather data"
            return {
                "configured": False,
                "answer": f"AI is not configured. Based on {summary}, check the forecast before planning.",
            }
        context = context or {}
        summary = context.get("summary") or "weather data"

        try:
            with httpx.Client(timeout=self.settings.external_timeout_seconds) as client:
                response = client.post(
                    "https://api.deepseek.com/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.deepseek_api_key}"},
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a weather planning assistant. "
                                    f"Use this weather summary as core context for every answer: {summary}. "
                                    "Answer in fewer than 30 words. Be concise, practical, and directly answer the user."
                                ),
                            },
                            {"role": "user", "content": f"Context: {context}\nQuestion: {question}"},
                        ],
                    },
                )
            response.raise_for_status()
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            return {"configured": True, "answer": answer}
        except (httpx.HTTPError, KeyError, IndexError, TypeError):
            return {
                "configured": True,
                "answer": "AI Q&A is temporarily unavailable. Please use the weather summary and forecast.",
            }


class ImageService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.mapillary = MapillaryService(self.settings)

    def generate_clipart(self, location: ResolvedLocation, weather: WeatherSummary) -> str | None:
        api_key = self.settings.nanobanana_api_key or self.settings.gemini_api_key
        if not api_key:
            return None

        local_time = weather.local_time.strftime("%Y-%m-%d %H:%M") if weather.local_time else "unknown local time"
        prompt = (
            "Create a polished cinematic weather app background image for "
            f"{location.location_name}. Weather: {weather.summary}. "
            f"Condition: {weather.condition}; description: {weather.description}; "
            f"temperature: {weather.temperature}C; feels like: {weather.feels_like}C; "
            f"humidity: {weather.humidity}%; wind speed: {weather.wind_speed} m/s. "
            f"Exact location-local time from the weather app: {local_time}. "
            "Base the lighting, sky color, shadows, and atmosphere on this exact time of day. "
            "If it is sunny or bright, keep the scene sunny but reduce brightness and highlights enough "
            "for fluorescent lime and white UI text to remain readable; do not turn it into night unless "
            "the supplied local time is actually night. "
            "Use a darkened, slightly desaturated editorial grade, with calm lower-contrast areas suitable "
            "for text overlays. No text, no logos, no people, no UI elements."
        )
        parts: list[dict[str, Any]] = [{"text": prompt}]
        street_image = self.mapillary.first_street_image_data_url(location.latitude, location.longitude)
        if street_image is not None:
            parts.append(
                {
                    "inlineData": {
                        "mimeType": street_image["mime_type"],
                        "data": street_image["base64"],
                    }
                }
            )

        try:
            with httpx.Client(timeout=max(self.settings.external_timeout_seconds, 30.0)) as client:
                response = client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.nanobanana_model}:generateContent",
                    headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": parts}],
                        "generationConfig": {"responseModalities": ["Image"]},
                    },
                )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError:
            return None

        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                inline_data = part.get("inlineData") or part.get("inline_data")
                if inline_data and inline_data.get("data"):
                    mime_type = inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png"
                    return f"data:{mime_type};base64,{inline_data['data']}"
        return None


class MapillaryService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def fetch_images(self, lat: float, lon: float, limit: int = 5, delta: float = 0.005) -> list[dict[str, Any]]:
        if not self.settings.mapillary_token:
            return []
        bbox = f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"
        try:
            with httpx.Client(timeout=self.settings.external_timeout_seconds) as client:
                response = client.get(
                    "https://graph.mapillary.com/images",
                    params={
                        "access_token": self.settings.mapillary_token,
                        "fields": "id,thumb_1024_url,captured_at,geometry",
                        "bbox": bbox,
                        "limit": limit,
                    },
                )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError:
            return []
        images = data.get("data", [])
        return images if isinstance(images, list) else []

    def first_street_image_data_url(self, lat: float, lon: float) -> dict[str, str] | None:
        images = self.fetch_images(lat, lon, limit=3)
        thumb_url = next((image.get("thumb_1024_url") for image in images if image.get("thumb_1024_url")), None)
        if not thumb_url:
            return None
        try:
            with httpx.Client(timeout=max(self.settings.external_timeout_seconds, 20.0)) as client:
                response = client.get(thumb_url)
            response.raise_for_status()
        except httpx.HTTPError:
            return None
        content_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
        return {
            "mime_type": content_type,
            "base64": base64.b64encode(response.content).decode("ascii"),
        }


def get_places_service(db: Session = Depends(get_db)) -> PlacesService:
    return PlacesService(db=db)


def get_ai_service() -> AiService:
    return AiService()


def get_image_service() -> ImageService:
    return ImageService()


def get_mapillary_service() -> MapillaryService:
    return MapillaryService()
