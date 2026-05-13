def test_saved_location_crud(client):
    create_response = client.post("/saved-locations", json={"q": "New York", "tag": "work"})
    assert create_response.status_code == 201, create_response.text
    location_id = create_response.json()["id"]

    list_response = client.get("/saved-locations")
    assert list_response.status_code == 200
    assert list_response.json()[0]["tag"] == "work"

    patch_response = client.patch(f"/saved-locations/{location_id}", json={"tag": "trip_home"})
    assert patch_response.status_code == 200
    assert patch_response.json()["tag"] == "trip_home"

    image_response = client.patch(
        f"/saved-locations/{location_id}",
        json={"generated_image_url": "data:image/png;base64,abc123"},
    )
    assert image_response.status_code == 200
    assert image_response.json()["generated_image_url"] == "data:image/png;base64,abc123"

    delete_response = client.delete(f"/saved-locations/{location_id}")
    assert delete_response.status_code == 204


def test_saved_location_rejects_invalid_tag(client):
    response = client.post("/saved-locations", json={"q": "New York", "tag": "x!"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
