from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.weather_history import WeatherHistory
from app.schemas.common import WeatherHistoryUpdate


def create_weather_history(db: Session, history: WeatherHistory) -> WeatherHistory:
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def list_weather_history(db: Session, limit: int = 50, offset: int = 0) -> list[WeatherHistory]:
    statement = select(WeatherHistory).order_by(WeatherHistory.created_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(statement).all())


def get_weather_history(db: Session, history_id: int) -> WeatherHistory | None:
    return db.get(WeatherHistory, history_id)


def update_weather_history(db: Session, history: WeatherHistory, updates: WeatherHistoryUpdate) -> WeatherHistory:
    if updates.note is not None:
        history.note = updates.note
    if updates.label is not None:
        history.label = updates.label
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def delete_weather_history(db: Session, history: WeatherHistory) -> None:
    db.delete(history)
    db.commit()
