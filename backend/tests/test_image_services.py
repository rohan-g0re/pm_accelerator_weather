from app.core.config import Settings
from app.services.optional_services import MapillaryService


def test_mapillary_fetch_images_uses_documented_bbox_endpoint(mocker):
    settings = Settings(mapillary_token="token")
    service = MapillaryService(settings)
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": [{"id": "1", "thumb_1024_url": "https://example.com/1.jpg"}]}

    class FakeClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def get(self, url, params=None):
            captured["url"] = url
            captured["params"] = params
            return FakeResponse()

    mocker.patch("app.services.optional_services.httpx.Client", FakeClient)

    images = service.fetch_images(10.0, 20.0, limit=3)

    assert captured["url"] == "https://graph.mapillary.com/images"
    assert captured["params"]["fields"] == "id,thumb_1024_url,captured_at,geometry"
    assert captured["params"]["bbox"] == "19.995,9.995,20.005,10.005"
    assert captured["params"]["access_token"] == "token"
    assert images[0]["thumb_1024_url"] == "https://example.com/1.jpg"
