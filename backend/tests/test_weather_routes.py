from datetime import date


def create_history(client) -> int:
    response = client.post(
        "/weather/history",
        json={
            "q": "New York",
            "start_date": date(2026, 5, 9).isoformat(),
            "end_date": date(2026, 5, 10).isoformat(),
            "note": "Trip planning",
            "label": "NYC weekend",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_current_weather_returns_normalized_location_and_weather(client):
    response = client.get("/weather/current", params={"q": "New York"})

    assert response.status_code == 200
    body = response.json()
    assert body["location"]["location_name"] == "Test City"
    assert body["weather"]["temperature"] == 21.5
    assert body["weather"]["summary"] == "Scattered Clouds with 21.5C"


def test_forecast_returns_forecast_days(client):
    response = client.get("/weather/forecast", params={"lat": 40.7, "lon": -74.0})

    assert response.status_code == 200
    body = response.json()
    assert len(body["days"]) == 2
    assert body["days"][0]["condition"] == "Clouds"


def test_one_call_returns_minutely_hourly_daily_and_alerts(client):
    response = client.get("/weather/one-call", params={"q": "New York"})

    assert response.status_code == 200
    body = response.json()
    assert body["current"]["temperature"] == 21.5
    assert len(body["minutely"]) == 1
    assert len(body["hourly"]) == 1
    assert len(body["daily"]) == 2
    assert body["alerts"][0]["event"] == "Heat advisory"
    assert body["generated_image_url"] is None


def test_weather_overview_returns_openweather_ai_summary(client):
    response = client.get("/weather/overview", params={"q": "New York"})

    assert response.status_code == 200
    assert response.json()["summary"] == "AI weather overview from OpenWeather for testing."


def test_weather_history_crud(client):
    history_id = create_history(client)

    list_response = client.get("/weather/history")
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == history_id

    read_response = client.get(f"/weather/history/{history_id}")
    assert read_response.status_code == 200
    assert read_response.json()["summary"] == "AI weather overview from OpenWeather for testing."
    assert read_response.json()["forecast"]["provider"] == "openweather_one_call_3"
    assert read_response.json()["forecast"]["alerts"][0]["event"] == "Heat advisory"

    patch_response = client.patch(f"/weather/history/{history_id}", json={"note": "Updated note"})
    assert patch_response.status_code == 200
    assert patch_response.json()["note"] == "Updated note"

    delete_response = client.delete(f"/weather/history/{history_id}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/weather/history/{history_id}")
    assert missing_response.status_code == 404
    assert missing_response.json()["error"]["code"] == "RECORD_NOT_FOUND"


def test_history_rejects_invalid_date_range(client):
    response = client.post(
        "/weather/history",
        json={
            "q": "New York",
            "start_date": "2026-05-11",
            "end_date": "2026-05-09",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DATE_RANGE"


def test_exports_return_csv_and_pdf(client):
    history_id = create_history(client)

    csv_response = client.get(f"/exports/history/{history_id}.csv")
    assert csv_response.status_code == 200
    assert csv_response.headers["content-type"].startswith("text/csv")
    assert csv_response.text.splitlines()[0] == "date,temperature,condition,description,humidity,wind_speed"
    assert "start_date" not in csv_response.text
    assert "end_date" not in csv_response.text
    assert "summary" not in csv_response.text
    assert "2026-05-09,17.0 - 23.0,Clouds,scattered clouds,," in csv_response.text

    pdf_response = client.get(f"/exports/history/{history_id}.pdf")
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert pdf_response.content.startswith(b"%PDF")
    assert b"Generated image:" not in pdf_response.content
    assert b"/Subtype /Image" in pdf_response.content
