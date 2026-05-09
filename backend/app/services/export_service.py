import csv
import base64
import binascii
from io import BytesIO, StringIO
from typing import Any

from fastapi import Depends
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.export_record import ExportRecord
from app.models.weather_history import WeatherHistory


class ExportService:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db

    def csv_for_history(self, history: WeatherHistory) -> str:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "location",
                "start_date",
                "end_date",
                "temperature",
                "condition",
                "description",
                "humidity",
                "wind_speed",
                "summary",
            ]
        )
        weather = history.current_weather or {}
        writer.writerow(
            [
                history.location_name,
                history.start_date.isoformat(),
                history.end_date.isoformat(),
                weather.get("temperature"),
                weather.get("condition"),
                weather.get("description"),
                weather.get("humidity"),
                weather.get("wind_speed"),
                history.summary,
            ]
        )
        for day in self._forecast_days(history.forecast):
            writer.writerow(
                [
                    history.location_name,
                    day.get("date"),
                    day.get("date"),
                    f"{day.get('low')} - {day.get('high')}",
                    day.get("condition"),
                    day.get("description"),
                    "",
                    "",
                    "5-day forecast",
                ]
            )
        
        if self.db is not None:
            record = ExportRecord(weather_history_id=history.id, format="csv", status="generated")
            self.db.add(record)
            self.db.commit()
            
        return output.getvalue()

    def pdf_for_history(self, history: WeatherHistory) -> bytes:
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        y = height - 72
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(72, y, f"Weather Report: {history.location_name}")
        y -= 18
        y = self._draw_generated_image(pdf, history.generated_image_url, 72, y, width - 144, 190)
        y -= 14
        pdf.setFont("Helvetica", 11)
        lines = [
            f"Date range: {history.start_date.isoformat()} to {history.end_date.isoformat()}",
            f"Coordinates: {history.latitude:.4f}, {history.longitude:.4f}",
            f"Summary: {history.summary}",
        ]
        weather = history.current_weather or {}
        lines.extend(
            [
                f"Temperature: {weather.get('temperature')}C",
                f"Feels like: {weather.get('feels_like')}C",
                f"Condition: {weather.get('condition')} - {weather.get('description')}",
                f"Humidity: {weather.get('humidity')}%",
                f"Wind speed: {weather.get('wind_speed')} m/s",
            ]
        )
        lines.append("")
        lines.append("5-day forecast:")
        for day in self._forecast_days(history.forecast):
            lines.append(
                f"- {day.get('date')}: {day.get('description')} "
                f"({day.get('low')}C to {day.get('high')}C)"
            )

        for line in lines:
            if y < 72:
                pdf.showPage()
                pdf.setFont("Helvetica", 11)
                y = height - 72
            pdf.drawString(72, y, str(line)[:100])
            y -= 18
        pdf.save()

        if self.db is not None:
            record = ExportRecord(weather_history_id=history.id, format="pdf", status="generated")
            self.db.add(record)
            self.db.commit()

        return buffer.getvalue()

    def _draw_generated_image(
        self,
        pdf: canvas.Canvas,
        image_url: str | None,
        x: float,
        y: float,
        max_width: float,
        max_height: float,
    ) -> float:
        image_reader = self._image_reader_from_data_url(image_url)
        if image_reader is None:
            return y - 14

        image_width, image_height = image_reader.getSize()
        scale = min(max_width / image_width, max_height / image_height)
        draw_width = image_width * scale
        draw_height = image_height * scale
        draw_y = y - draw_height
        pdf.drawImage(image_reader, x, draw_y, width=draw_width, height=draw_height, preserveAspectRatio=True)
        return draw_y

    def _image_reader_from_data_url(self, image_url: str | None) -> ImageReader | None:
        if not image_url or not image_url.startswith("data:image/"):
            return None

        header, separator, encoded = image_url.partition(",")
        if not separator or ";base64" not in header:
            return None

        try:
            image_bytes = base64.b64decode(encoded, validate=True)
            return ImageReader(BytesIO(image_bytes))
        except (binascii.Error, OSError, ValueError):
            return None

    def _forecast_days(self, forecast: dict[str, Any]) -> list[dict[str, Any]]:
        days = forecast.get("days", []) if isinstance(forecast, dict) else []
        return days if isinstance(days, list) else []


def get_export_service(db: Session = Depends(get_db)) -> ExportService:
    return ExportService(db=db)
