from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Coordinates(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class LocationQuery(BaseModel):
    q: str | None = Field(default=None, min_length=1, max_length=255)
    zip: str | None = Field(default=None, min_length=1, max_length=40)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def require_one_location_mode(self) -> "LocationQuery":
        has_text = bool(self.q)
        has_zip = bool(self.zip)
        has_coords = self.lat is not None or self.lon is not None
        if has_coords and (self.lat is None or self.lon is None):
            raise ValueError("Both lat and lon are required when using coordinates.")
        modes = [has_text, has_zip, has_coords]
        if sum(bool(mode) for mode in modes) != 1:
            raise ValueError("Provide exactly one location input: q, zip, or lat/lon.")
        return self

    @property
    def source_input(self) -> str:
        if self.q:
            return self.q
        if self.zip:
            return self.zip
        return f"{self.lat},{self.lon}"


class ResolvedLocation(BaseModel):
    source_input: str
    location_name: str
    latitude: float
    longitude: float
    country: str | None = None
    state: str | None = None
    approximate: bool = False


class WeatherSummary(BaseModel):
    temperature: float | None = None
    feels_like: float | None = None
    condition: str
    description: str
    humidity: int | None = None
    wind_speed: float | None = None
    sunrise: datetime | None = None
    sunset: datetime | None = None
    local_time: datetime | None = None
    summary: str
    raw: dict[str, Any] = Field(default_factory=dict)


class ForecastDay(BaseModel):
    date: date
    high: float | None = None
    low: float | None = None
    condition: str
    description: str
    precipitation_chance: float | None = None
    icon: str | None = None


class MinutelyForecast(BaseModel):
    forecast_time: datetime
    precipitation: float | None = None


class HourlyForecast(BaseModel):
    forecast_time: datetime
    temperature: float | None = None
    feels_like: float | None = None
    condition: str
    description: str
    humidity: int | None = None
    wind_speed: float | None = None
    precipitation_chance: float | None = None
    icon: str | None = None


class WeatherAlert(BaseModel):
    sender_name: str | None = None
    event: str
    start: datetime | None = None
    end: datetime | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list)


class ForecastResponse(BaseModel):
    location: ResolvedLocation
    days: list[ForecastDay]
    raw: dict[str, Any] = Field(default_factory=dict)


class WeatherCurrentResponse(BaseModel):
    location: ResolvedLocation
    weather: WeatherSummary


class OneCallWeatherResponse(BaseModel):
    location: ResolvedLocation
    timezone: str | None = None
    timezone_offset: int | None = None
    current: WeatherSummary
    minutely: list[MinutelyForecast] = Field(default_factory=list)
    hourly: list[HourlyForecast] = Field(default_factory=list)
    daily: list[ForecastDay] = Field(default_factory=list)
    alerts: list[WeatherAlert] = Field(default_factory=list)
    generated_image_url: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class DateRange(BaseModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_range(self) -> "DateRange":
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date.")
        return self


class WeatherHistoryCreate(LocationQuery):
    start_date: date
    end_date: date
    note: str | None = Field(default=None, max_length=1000)
    label: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def validate_dates(self) -> "WeatherHistoryCreate":
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date.")
        return self


class WeatherHistoryUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=1000)
    label: str | None = Field(default=None, max_length=80)


class WeatherHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_input: str
    location_name: str
    country: str | None
    state: str | None
    latitude: float
    longitude: float
    start_date: date
    end_date: date
    current_weather: dict[str, Any]
    forecast: dict[str, Any]
    date_range_weather: dict[str, Any]
    summary: str
    generated_image_url: str | None
    note: str | None
    label: str | None
    created_at: datetime
    updated_at: datetime


class SavedLocationCreate(LocationQuery):
    tag: str = Field(min_length=3, max_length=40)

    @field_validator("tag")
    @classmethod
    def validate_tag(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Tag cannot be empty.")
        if not all(char.isalnum() or char in {" ", "-", "_"} for char in stripped):
            raise ValueError("Tag can only contain letters, numbers, spaces, hyphens, and underscores.")
        return stripped


class SavedLocationUpdate(BaseModel):
    tag: str = Field(min_length=3, max_length=40)

    @field_validator("tag")
    @classmethod
    def validate_tag(cls, value: str) -> str:
        return SavedLocationCreate.validate_tag(value)


class SavedLocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_input: str
    location_name: str
    country: str | None
    state: str | None
    latitude: float
    longitude: float
    tag: str
    created_at: datetime
    updated_at: datetime


class NearbyPlacesResponse(BaseModel):
    configured: bool
    approximate: bool = False
    results: list[dict[str, Any]] = Field(default_factory=list)
    message: str | None = None


class WeatherBackgroundRequest(BaseModel):
    location: ResolvedLocation
    weather: WeatherSummary


class WeatherBackgroundResponse(BaseModel):
    generated_image_url: str | None = None


class WeatherOverviewResponse(BaseModel):
    summary: str


class WeatherQuestionRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    history_id: int | None = None
    weather_context: dict[str, Any] | None = None


class WeatherQuestionResponse(BaseModel):
    configured: bool
    answer: str


class ExportFormat(BaseModel):
    format: Literal["csv", "pdf"]
