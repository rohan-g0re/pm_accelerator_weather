from datetime import UTC, date, datetime
from typing import Any

import httpx
from starlette import status

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.schemas.common import (
    ForecastDay,
    ForecastResponse,
    HourlyForecast,
    MinutelyForecast,
    OneCallWeatherResponse,
    ResolvedLocation,
    WeatherAlert,
    WeatherSummary,
)


class WeatherService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def current_weather(self, location: ResolvedLocation) -> WeatherSummary:
        return self.one_call_weather(location, exclude=["minutely", "hourly", "daily", "alerts"]).current

    def five_day_forecast(self, location: ResolvedLocation) -> ForecastResponse:
        one_call = self.one_call_weather(location, exclude=["minutely", "hourly", "alerts"])
        return ForecastResponse(location=location, days=one_call.daily[:5], raw=one_call.raw)

    def one_call_weather(
        self,
        location: ResolvedLocation,
        exclude: list[str] | None = None,
    ) -> OneCallWeatherResponse:
        params: dict[str, Any] = {
            "lat": location.latitude,
            "lon": location.longitude,
            "units": "metric",
        }
        if exclude:
            params["exclude"] = ",".join(exclude)
        data = self._get_openweather("https://api.openweathermap.org/data/3.0/onecall", params)
        return self._normalize_one_call(location, data)

    def date_range_weather(self, location: ResolvedLocation, start_date: date, end_date: date) -> dict[str, Any]:
        one_call = self.one_call_weather(location, exclude=["minutely", "hourly", "alerts"])
        return self.date_range_from_daily(one_call.daily, start_date, end_date)

    def weather_overview(self, location: ResolvedLocation, requested_date: date | None = None) -> str:
        params: dict[str, Any] = {
            "lat": location.latitude,
            "lon": location.longitude,
            "units": "metric",
        }
        if requested_date is not None:
            today = datetime.now(UTC).date()
            if requested_date in {today, today + date.resolution}:
                params["date"] = requested_date.isoformat()
        data = self._get_openweather("https://api.openweathermap.org/data/3.0/onecall/overview", params)
        overview = data.get("weather_overview")
        if not isinstance(overview, str) or not overview.strip():
            raise AppError(
                "WEATHER_PROVIDER_ERROR",
                "The One Call overview response did not include weather_overview.",
                status.HTTP_502_BAD_GATEWAY,
            )
        return overview

    def date_range_from_daily(self, daily: list[ForecastDay], start_date: date, end_date: date) -> dict[str, Any]:
        selected_days = [day.model_dump(mode="json") for day in daily if start_date <= day.date <= end_date]
        if selected_days:
            return {
                "provider": "openweather_one_call_3",
                "supported": True,
                "days": selected_days,
            }
        return {
            "provider": "openweather_one_call_3",
            "supported": False,
            "days": [],
            "message": "Requested date range is outside the available 8-day One Call daily forecast window.",
        }

    def _get_openweather(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.openweather_api_key:
            raise AppError(
                "MISSING_CONFIGURATION",
                "OpenWeather API key is required for weather data.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        params = {**params, "appid": self.settings.openweather_api_key}
        try:
            with httpx.Client(timeout=self.settings.external_timeout_seconds) as client:
                response = client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise AppError(
                "WEATHER_PROVIDER_TIMEOUT",
                "The weather provider timed out. Please try again.",
                status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc
        except httpx.HTTPError as exc:
            raise AppError(
                "WEATHER_PROVIDER_ERROR",
                "The weather provider could not be reached.",
                status.HTTP_502_BAD_GATEWAY,
            ) from exc

        if response.status_code in {401, 403}:
            raise AppError(
                "MISSING_CONFIGURATION",
                "The configured OpenWeather API key was rejected.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if response.status_code == 404:
            raise AppError("LOCATION_NOT_FOUND", "Could not find weather for that location.", status.HTTP_404_NOT_FOUND)
        if response.status_code >= 400:
            raise AppError(
                "WEATHER_PROVIDER_ERROR",
                "The weather provider returned an error.",
                status.HTTP_502_BAD_GATEWAY,
                {"status_code": response.status_code},
            )
        return response.json()

    def _normalize_one_call(self, location: ResolvedLocation, data: dict[str, Any]) -> OneCallWeatherResponse:
        current_data = data.get("current")
        if not isinstance(current_data, dict):
            raise AppError(
                "WEATHER_PROVIDER_ERROR",
                "The One Call response did not include current weather data.",
                status.HTTP_502_BAD_GATEWAY,
            )
        timezone_offset = int(data.get("timezone_offset") or 0)
        return OneCallWeatherResponse(
            location=location,
            timezone=data.get("timezone"),
            timezone_offset=timezone_offset,
            current=self._normalize_current(current_data, timezone_offset),
            minutely=self._normalize_minutely(data.get("minutely", []), timezone_offset),
            hourly=self._normalize_hourly(data.get("hourly", []), timezone_offset),
            daily=self._normalize_daily(data.get("daily", []), timezone_offset),
            alerts=self._normalize_alerts(data.get("alerts", []), timezone_offset),
            raw=data,
        )

    def _normalize_current(self, data: dict[str, Any], timezone_offset: int) -> WeatherSummary:
        try:
            weather_item = data["weather"][0]
        except (KeyError, IndexError, TypeError) as exc:
            raise AppError(
                "WEATHER_PROVIDER_ERROR",
                "The One Call current weather response was incomplete.",
                status.HTTP_502_BAD_GATEWAY,
            ) from exc

        sunrise = self._timestamp_to_datetime(data.get("sunrise"), timezone_offset)
        sunset = self._timestamp_to_datetime(data.get("sunset"), timezone_offset)
        local_time = self._timestamp_to_datetime(data.get("dt"), timezone_offset)
        description = str(weather_item.get("description") or weather_item.get("main") or "weather")
        temperature = data.get("temp")
        summary = f"{description.title()} with {temperature}C" if temperature is not None else description.title()
        return WeatherSummary(
            temperature=temperature,
            feels_like=data.get("feels_like"),
            condition=str(weather_item.get("main") or "Unknown"),
            description=description,
            humidity=data.get("humidity"),
            wind_speed=data.get("wind_speed"),
            sunrise=sunrise,
            sunset=sunset,
            local_time=local_time,
            summary=summary,
            raw=data,
        )

    def _normalize_minutely(self, items: Any, timezone_offset: int) -> list[MinutelyForecast]:
        if not isinstance(items, list):
            return []
        return [
            MinutelyForecast(
                forecast_time=self._timestamp_to_datetime(item.get("dt"), timezone_offset),
                precipitation=item.get("precipitation"),
            )
            for item in items
            if item.get("dt") is not None
        ]

    def _normalize_hourly(self, items: Any, timezone_offset: int) -> list[HourlyForecast]:
        if not isinstance(items, list):
            return []
        hours: list[HourlyForecast] = []
        for item in items[:48]:
            weather_item = (item.get("weather") or [{}])[0]
            forecast_time = self._timestamp_to_datetime(item.get("dt"), timezone_offset)
            if forecast_time is None:
                continue
            hours.append(
                HourlyForecast(
                    forecast_time=forecast_time,
                    temperature=item.get("temp"),
                    feels_like=item.get("feels_like"),
                    condition=str(weather_item.get("main") or "Unknown"),
                    description=str(weather_item.get("description") or weather_item.get("main") or "weather"),
                    humidity=item.get("humidity"),
                    wind_speed=item.get("wind_speed"),
                    precipitation_chance=item.get("pop"),
                    icon=weather_item.get("icon"),
                )
            )
        return hours

    def _normalize_daily(self, items: Any, timezone_offset: int) -> list[ForecastDay]:
        if not isinstance(items, list):
            return []
        days: list[ForecastDay] = []
        for item in items[:8]:
            forecast_time = self._timestamp_to_datetime(item.get("dt"), timezone_offset)
            if forecast_time is None:
                continue
            temp = item.get("temp") if isinstance(item.get("temp"), dict) else {}
            weather_item = (item.get("weather") or [{}])[0]
            days.append(
                ForecastDay(
                    date=forecast_time.date(),
                    high=temp.get("max"),
                    low=temp.get("min"),
                    condition=str(weather_item.get("main") or "Unknown"),
                    description=str(weather_item.get("description") or weather_item.get("main") or "weather"),
                    precipitation_chance=item.get("pop"),
                    icon=weather_item.get("icon"),
                )
            )
        return days

    def _normalize_alerts(self, items: Any, timezone_offset: int) -> list[WeatherAlert]:
        if not isinstance(items, list):
            return []
        alerts: list[WeatherAlert] = []
        for item in items:
            alerts.append(
                WeatherAlert(
                    sender_name=item.get("sender_name"),
                    event=str(item.get("event") or "Weather alert"),
                    start=self._timestamp_to_datetime(item.get("start"), timezone_offset),
                    end=self._timestamp_to_datetime(item.get("end"), timezone_offset),
                    description=item.get("description"),
                    tags=item.get("tags") if isinstance(item.get("tags"), list) else [],
                )
            )
        return alerts

    def _timestamp_to_datetime(self, timestamp: int | None, offset_seconds: int) -> datetime | None:
        if timestamp is None:
            return None
        return datetime.fromtimestamp(int(timestamp) + offset_seconds, UTC)


def get_weather_service() -> WeatherService:
    return WeatherService()
