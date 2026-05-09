# Weather App Backend

FastAPI backend for the weather app technical assessment. It provides real weather retrieval, location validation, PostgreSQL persistence, CRUD operations, CSV/PDF exports, and optional standout integrations.

## Stack

- Python 3.13
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL on Render
- OpenWeather One Call API 3.0 and Geocoding API
- Optional: Google Maps, Mapillary, DeepSeek, Gemini/Nano Banana

## Setup

1. Create a virtual environment and install dependencies.

   ```bash
   uv sync
   ```

   If you are not using `uv`, install from `requirements.txt`.

2. Copy `.env.example` to `.env` and fill in the required values.

   ```bash
   cp .env.example .env
   ```

3. Run migrations.

   ```bash
   uv run alembic upgrade head
   ```

4. Start the API.

   ```bash
   uv run uvicorn app.main:app --reload
   ```

5. Open API docs.

   ```text
   http://localhost:8000/docs
   ```

## Required Environment Variables

- `DATABASE_URL`: PostgreSQL database URL.
- `OPENWEATHER_API_KEY`: required for location validation and OpenWeather One Call 3.0 weather data.

## Optional Environment Variables

- `GOOGLE_MAPS_API_KEY`: enables nearby restaurant/hotel results.
- `MAPILLARY_TOKEN`: enables street image lookup through Mapillary API v4.
- `GEMINI_API_KEY` or `NANOBANANA_API_KEY`: enables Gemini/Nano Banana image generation.
- `NANOBANANA_MODEL`: defaults to `gemini-3.1-flash-image-preview` for Nano Banana 2 Preview.
- `DEEPSEEK_API_KEY`: enables AI weather Q&A.
- `CORS_ORIGINS`: comma-separated frontend origins, defaults to `http://localhost:3000`.

Optional integrations return stable fallback responses when keys are missing, so core weather and CRUD behavior remains testable.

## API Overview

- `GET /health`: backend health check.
- `GET /weather/current`: current weather for `q`, `zip`, or `lat` + `lon`.
- `GET /weather/forecast`: 5-day forecast for `q`, `zip`, or `lat` + `lon`.
- `GET /weather/one-call`: OpenWeather One Call 3.0 data including current, minutely, hourly, daily, and alerts.
- `POST /weather/history`: create a stored weather request with location and date range.
- `GET /weather/history`: list stored weather records.
- `GET /weather/history/{id}`: read one stored weather record.
- `PATCH /weather/history/{id}`: update editable note/label.
- `DELETE /weather/history/{id}`: delete a stored weather record.
- `POST /saved-locations`: save a resolved location with a tag.
- `GET /saved-locations`: list saved locations.
- `PATCH /saved-locations/{id}`: update a saved-location tag.
- `DELETE /saved-locations/{id}`: delete a saved location.
- `GET /exports/history/{id}.csv`: export a stored weather record as CSV.
- `GET /exports/history/{id}.pdf`: export a stored weather record as PDF.
- `GET /places/nearby`: optional nearby restaurant/hotel lookup.
- `GET /images/mapillary`: optional Mapillary image lookup around coordinates.
- `POST /weather/ask`: optional AI Q&A over weather context.

## Example Requests

Current weather:

```bash
curl "http://localhost:8000/weather/current?q=New%20York"
```

Create weather history:

```bash
curl -X POST "http://localhost:8000/weather/history" \
  -H "Content-Type: application/json" \
  -d '{"q":"New York","start_date":"2026-05-09","end_date":"2026-05-10","label":"NYC trip"}'
```

Save location:

```bash
curl -X POST "http://localhost:8000/saved-locations" \
  -H "Content-Type: application/json" \
  -d '{"q":"New York","tag":"work"}'
```

Export CSV:

```bash
curl "http://localhost:8000/exports/history/1.csv"
```

## Error Handling

Errors use a consistent JSON shape:

```json
{
  "error": {
    "code": "LOCATION_NOT_FOUND",
    "message": "Could not find that location.",
    "details": {}
  }
}
```

Important error codes:

- `LOCATION_NOT_FOUND`
- `AMBIGUOUS_LOCATION`
- `INVALID_DATE_RANGE`
- `WEATHER_PROVIDER_ERROR`
- `WEATHER_PROVIDER_TIMEOUT`
- `MISSING_CONFIGURATION`
- `RECORD_NOT_FOUND`
- `EXPORT_FAILED`
- `VALIDATION_ERROR`

## Assessment Criteria Coverage

- Real weather data: OpenWeather One Call 3.0 current, minutely, hourly, daily, alerts, and 5-day forecast projection.
- Location input: city/town, ZIP/postal code, coordinates, current-location coordinates, landmarks if geocoding resolves them.
- CRUD: `weather_history` and `saved_locations` tables support create, read, update, and delete.
- Validation: location resolution, date-range validation, tag validation, and structured API errors.
- REST API: FastAPI routes expose weather, CRUD, exports, nearby places, and Q&A.
- Data export: CSV and PDF exports are generated from stored database records.
- Additional APIs: Google Maps, Mapillary, DeepSeek, and Gemini/Nano Banana are represented as optional integration boundaries.

## Provider Notes

- OpenWeather uses One Call API 3.0 at `https://api.openweathermap.org/data/3.0/onecall`.
- OpenWeather geocoding uses `/geo/1.0/direct`, `/geo/1.0/zip`, and `/geo/1.0/reverse`.
- Mapillary uses `https://graph.mapillary.com/images` with `bbox`, `fields=id,thumb_1024_url,captured_at,geometry`, and `access_token`.
- Gemini/Nano Banana uses `generateContent` with the default model `gemini-3.1-flash-image-preview` and `responseModalities: ["Image"]`.

## Tests

Run:

```bash
uv run pytest
```

The test suite mocks external providers and verifies core API behavior without real API keys.
