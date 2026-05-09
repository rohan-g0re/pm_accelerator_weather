def test_nearby_places_route(client):
    response = client.get("/places/nearby", params={"lat": 40.7, "lon": -74.0, "type": "restaurant"})

    assert response.status_code == 200
    assert response.json()["results"][0]["name"] == "Test Place"


def test_mapillary_images_route_degrades_without_configuration(client):
    response = client.get("/images/mapillary", params={"lat": 40.7, "lon": -74.0})

    assert response.status_code == 200
    assert response.json()["configured"] is False
    assert response.json()["results"] == []


def test_weather_background_generates_image_from_payload(client):
    response = client.post(
        "/images/weather-background",
        json={
            "location": {
                "source_input": "New York",
                "location_name": "Test City",
                "latitude": 40.7128,
                "longitude": -74.006,
                "country": "US",
                "state": "New York",
            },
            "weather": {
                "temperature": 21.5,
                "feels_like": 20.0,
                "condition": "Clouds",
                "description": "scattered clouds",
                "humidity": 65,
                "wind_speed": 3.4,
                "summary": "Scattered Clouds with 21.5C",
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["generated_image_url"].startswith("data:image/png;base64,")


def test_weather_question_route_uses_history_context(client):
    create_response = client.post(
        "/weather/history",
        json={"q": "New York", "start_date": "2026-05-09", "end_date": "2026-05-10"},
    )
    history_id = create_response.json()["id"]

    response = client.post("/weather/ask", json={"history_id": history_id, "question": "Should I take a jacket?"})

    assert response.status_code == 200
    assert response.json()["configured"] is True
    assert "jacket" in response.json()["answer"]
