from typing import Any

import httpx
from starlette import status

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.schemas.common import LocationQuery, ResolvedLocation


class LocationService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def resolve(self, query: LocationQuery) -> ResolvedLocation:
        if not self.settings.openweather_api_key:
            raise AppError(
                "MISSING_CONFIGURATION",
                "OpenWeather API key is required to validate locations.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if query.lat is not None and query.lon is not None:
            return self._reverse_geocode(query)
        if query.zip:
            return self._resolve_zip(query)
        return self._resolve_text(query)

    def _resolve_text(self, query: LocationQuery) -> ResolvedLocation:
        data = self._get_json(
            "https://api.openweathermap.org/geo/1.0/direct",
            {"q": query.q, "limit": 1, "appid": self.settings.openweather_api_key},
        )
        if not data:
            raise AppError("LOCATION_NOT_FOUND", "Could not find that location.", status.HTTP_404_NOT_FOUND)
        first = data[0]
        return self._from_openweather_location(query.source_input, first)

    def _resolve_zip(self, query: LocationQuery) -> ResolvedLocation:
        data = self._get_json(
            "https://api.openweathermap.org/geo/1.0/zip",
            {"zip": query.zip, "appid": self.settings.openweather_api_key},
        )
        if not data or "lat" not in data or "lon" not in data:
            raise AppError("LOCATION_NOT_FOUND", "Could not find that ZIP or postal code.", status.HTTP_404_NOT_FOUND)
        return ResolvedLocation(
            source_input=query.source_input,
            location_name=data.get("name") or query.zip or "Unknown location",
            latitude=float(data["lat"]),
            longitude=float(data["lon"]),
            country=data.get("country"),
            state=None,
        )

    def _reverse_geocode(self, query: LocationQuery) -> ResolvedLocation:
        data = self._get_json(
            "https://api.openweathermap.org/geo/1.0/reverse",
            {
                "lat": query.lat,
                "lon": query.lon,
                "limit": 1,
                "appid": self.settings.openweather_api_key,
            },
        )
        if not data:
            return ResolvedLocation(
                source_input=query.source_input,
                location_name=f"{query.lat:.4f}, {query.lon:.4f}",
                latitude=float(query.lat),
                longitude=float(query.lon),
                approximate=True,
            )
        return self._from_openweather_location(query.source_input, data[0])

    def _from_openweather_location(self, source_input: str, item: dict[str, Any]) -> ResolvedLocation:
        if "lat" not in item or "lon" not in item:
            raise AppError("LOCATION_NOT_FOUND", "The location response was incomplete.", status.HTTP_404_NOT_FOUND)
        return ResolvedLocation(
            source_input=source_input,
            location_name=item.get("name") or source_input,
            latitude=float(item["lat"]),
            longitude=float(item["lon"]),
            country=item.get("country"),
            state=item.get("state"),
        )

    def _get_json(self, url: str, params: dict[str, Any]) -> Any:
        try:
            with httpx.Client(timeout=self.settings.external_timeout_seconds) as client:
                response = client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise AppError(
                "WEATHER_PROVIDER_TIMEOUT",
                "The location provider timed out. Please try again.",
                status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc
        except httpx.HTTPError as exc:
            raise AppError(
                "WEATHER_PROVIDER_ERROR",
                "The location provider could not be reached.",
                status.HTTP_502_BAD_GATEWAY,
            ) from exc

        if response.status_code == 404:
            raise AppError("LOCATION_NOT_FOUND", "Could not find that location.", status.HTTP_404_NOT_FOUND)
        if response.status_code in {401, 403}:
            raise AppError(
                "MISSING_CONFIGURATION",
                "The configured OpenWeather API key was rejected.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if response.status_code >= 400:
            raise AppError(
                "WEATHER_PROVIDER_ERROR",
                "The location provider returned an error.",
                status.HTTP_502_BAD_GATEWAY,
                {"status_code": response.status_code},
            )
        return response.json()


def get_location_service() -> LocationService:
    return LocationService()
