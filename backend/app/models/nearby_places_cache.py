from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NearbyPlacesCache(Base):
    __tablename__ = "nearby_places_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    place_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    results: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
