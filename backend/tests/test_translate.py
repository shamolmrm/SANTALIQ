import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.modules.translate.languages import SANTALI


def test_languages_lists_santali_first(client: TestClient) -> None:
    r = client.get("/api/v1/translate/languages")
    assert r.status_code == 200
    langs = r.json()
    assert langs[0]["code"] == SANTALI
    assert {"eng_Latn", "deu_Latn", "ben_Beng"} <= {lang["code"] for lang in langs}


def test_rejects_unknown_language(client: TestClient) -> None:
    r = client.post(
        "/api/v1/translate", json={"text": "hi", "source": "xxx_Latn", "target": SANTALI}
    )
    assert r.status_code == 422


def test_rejects_too_long_text(client: TestClient) -> None:
    r = client.post(
        "/api/v1/translate", json={"text": "a" * 2001, "source": "eng_Latn", "target": SANTALI}
    )
    assert r.status_code == 422


def test_service_down_returns_503(client: TestClient) -> None:
    r = client.post(
        "/api/v1/translate", json={"text": "hello", "source": "eng_Latn", "target": SANTALI}
    )
    assert r.status_code == 503


@pytest.fixture
def fake_model(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Replace the model service with a stub; records each call."""
    calls: list[str] = []

    async def fake_post(self: httpx.AsyncClient, url: str, json: dict) -> httpx.Response:
        calls.append(json["text"])
        return httpx.Response(200, json={"translation": f"T({json['text']})"})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    return calls


def test_translation_is_cached(client: TestClient, fake_model: list[str]) -> None:
    body = {"text": "hello", "source": "eng_Latn", "target": SANTALI}
    first = client.post("/api/v1/translate", json=body).json()
    second = client.post("/api/v1/translate", json=body).json()
    assert first["translation"] == second["translation"] == "T(hello)"
    assert first["cached"] is False and second["cached"] is True
    assert fake_model == ["hello"]  # model called once


def test_rate_limit(client: TestClient, fake_model: list[str]) -> None:
    limit = get_settings().translate_rate_limit_per_minute
    for i in range(limit):
        r = client.post(
            "/api/v1/translate", json={"text": f"t{i}", "source": "eng_Latn", "target": SANTALI}
        )
        assert r.status_code == 200
    r = client.post(
        "/api/v1/translate", json={"text": "over", "source": "eng_Latn", "target": SANTALI}
    )
    assert r.status_code == 429
