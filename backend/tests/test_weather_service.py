from datetime import date

from app.core.config import Settings
from app.schemas.common import ResolvedLocation
from app.services.weather_service import WeatherService


def test_one_call_normalizer_matches_openweather_3_shape():
    service = WeatherService(Settings(openweather_api_key="test"))
    location = ResolvedLocation(
        source_input="coords",
        location_name="Doc City",
        latitude=33.44,
        longitude=-94.04,
        country="US",
    )
    data = {
        "lat": 33.44,
        "lon": -94.04,
        "timezone": "America/Chicago",
        "timezone_offset": -18000,
        "current": {
            "dt": 1_715_260_000,
            "sunrise": 1_715_240_000,
            "sunset": 1_715_290_000,
            "temp": 22.4,
            "feels_like": 22.0,
            "humidity": 60,
            "wind_speed": 4.2,
            "weather": [{"main": "Rain", "description": "light rain", "icon": "10d"}],
        },
        "minutely": [{"dt": 1_715_260_060, "precipitation": 0.1}],
        "hourly": [
            {
                "dt": 1_715_263_600,
                "temp": 23.1,
                "feels_like": 23.0,
                "humidity": 61,
                "wind_speed": 4.5,
                "pop": 0.8,
                "weather": [{"main": "Rain", "description": "moderate rain", "icon": "10d"}],
            }
        ],
        "daily": [
            {
                "dt": 1_715_260_000,
                "temp": {"min": 18.0, "max": 25.0},
                "pop": 0.4,
                "weather": [{"main": "Clouds", "description": "broken clouds", "icon": "04d"}],
            }
        ],
        "alerts": [
            {
                "sender_name": "National Weather Service",
                "event": "Flood Watch",
                "start": 1_715_260_000,
                "end": 1_715_300_000,
                "description": "Flooding possible.",
                "tags": ["Flood"],
            }
        ],
    }

    response = service._normalize_one_call(location, data)

    assert response.current.temperature == 22.4
    assert response.minutely[0].precipitation == 0.1
    assert response.hourly[0].precipitation_chance == 0.8
    assert response.daily[0].high == 25.0
    assert response.alerts[0].event == "Flood Watch"


def test_date_range_uses_one_call_daily_window(mocker):
    service = WeatherService(Settings(openweather_api_key="test"))
    location = ResolvedLocation(source_input="coords", location_name="Doc City", latitude=33.44, longitude=-94.04)
    mocker.patch.object(
        service,
        "one_call_weather",
        return_value=service._normalize_one_call(
            location,
            {
                "timezone_offset": 0,
                "current": {"dt": 1, "temp": 20, "weather": [{"main": "Clear", "description": "clear sky"}]},
                "daily": [
                    {
                        "dt": 1_715_260_000,
                        "temp": {"min": 18.0, "max": 25.0},
                        "weather": [{"main": "Clear", "description": "clear sky"}],
                    }
                ],
            },
        ),
    )

    result = service.date_range_weather(location, date(2024, 5, 9), date(2024, 5, 10))

    assert result["provider"] == "openweather_one_call_3"
    assert result["supported"] is True


def test_date_range_from_daily_reports_unsupported_outside_one_call_window():
    service = WeatherService(Settings(openweather_api_key="test"))

    result = service.date_range_from_daily([], date(2026, 1, 1), date(2026, 1, 2))

    assert result["provider"] == "openweather_one_call_3"
    assert result["supported"] is False
    assert "8-day" in result["message"]
