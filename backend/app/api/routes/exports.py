from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from starlette import status

from app.core.errors import AppError
from app.db.session import get_db
from app.repositories.weather_history import get_weather_history
from app.services.export_service import ExportService, get_export_service

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/history/{history_id}.csv")
def export_history_csv(
    history_id: int,
    db: Session = Depends(get_db),
    exports: ExportService = Depends(get_export_service),
) -> Response:
    history = get_weather_history(db, history_id)
    if history is None:
        raise AppError("RECORD_NOT_FOUND", "Weather history record was not found.", status.HTTP_404_NOT_FOUND)
    csv_text = exports.csv_for_history(history)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="weather-history-{history_id}.csv"'},
    )


@router.get("/history/{history_id}.pdf")
def export_history_pdf(
    history_id: int,
    db: Session = Depends(get_db),
    exports: ExportService = Depends(get_export_service),
) -> Response:
    history = get_weather_history(db, history_id)
    if history is None:
        raise AppError("RECORD_NOT_FOUND", "Weather history record was not found.", status.HTTP_404_NOT_FOUND)
    pdf_bytes = exports.pdf_for_history(history)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="weather-history-{history_id}.pdf"'},
    )
