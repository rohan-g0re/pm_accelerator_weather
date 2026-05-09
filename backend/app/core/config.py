from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Weather App API"
    environment: str = "development"
    database_url: str = "sqlite:///./weather.db"
    openweather_api_key: str | None = None
    google_maps_api_key: str | None = None
    mapillary_token: str | None = None
    gemini_api_key: str | None = None
    deepseek_api_key: str | None = None
    nanobanana_api_key: str | None = None
    nanobanana_model: str = "gemini-3.1-flash-image-preview"
    cors_origins: str = "http://localhost:3000"
    external_timeout_seconds: float = 12.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return ",".join(value)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
