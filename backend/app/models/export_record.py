from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExportRecord(Base):
    __tablename__ = "export_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    weather_history_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    format: Mapped[str] = mapped_column(String(12), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="generated")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
