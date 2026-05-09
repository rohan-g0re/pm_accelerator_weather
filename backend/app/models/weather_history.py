from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WeatherHistory(Base):
    __tablename__ = "weather_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_input: Mapped[str] = mapped_column(String(255), nullable=False)
    location_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    current_weather: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    forecast: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    date_range_weather: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
