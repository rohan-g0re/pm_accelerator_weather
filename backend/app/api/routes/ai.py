from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.weather_history import get_weather_history
from app.schemas.common import WeatherQuestionRequest, WeatherQuestionResponse
from app.services.optional_services import AiService, get_ai_service

router = APIRouter(prefix="/weather", tags=["weather Q&A"])


@router.post("/ask", response_model=WeatherQuestionResponse)
def ask_weather_question(
    payload: WeatherQuestionRequest,
    db: Session = Depends(get_db),
    ai: AiService = Depends(get_ai_service),
) -> dict:
    context = payload.weather_context or {}
    if payload.history_id is not None:
        history = get_weather_history(db, payload.history_id)
        if history is not None:
            context = {
                "location": history.location_name,
                "latitude": history.latitude,
                "longitude": history.longitude,
                "summary": history.summary,
                "current_weather": history.current_weather,
                "forecast": history.forecast,
                "date_range": {
                    "start_date": history.start_date.isoformat(),
                    "end_date": history.end_date.isoformat(),
                },
            }
    return ai.answer_weather_question(payload.question, context)
