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


@pytest.fixture
def fake_google(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Enable the Google engine with a stubbed HTTP call."""
    from app.modules.translate import router as tr

    sent: list[dict] = []

    async def fake_post(self: httpx.AsyncClient, url: str, **kwargs: dict) -> httpx.Response:
        sent.append({"url": url, **kwargs})
        body = kwargs["json"]
        return httpx.Response(
            200, json={"data": {"translations": [{"translatedText": f"G({body['q']})"}]}}
        )

    monkeypatch.setattr(tr, "google_enabled", lambda: True)
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    return sent


def test_engines_listed(client: TestClient) -> None:
    engines = {e["id"]: e["enabled"] for e in client.get("/api/v1/translate/engines").json()}
    assert engines == {"nllb": True, "google": False}
    langs = client.get("/api/v1/translate/languages").json()
    assert {"code": "ben_Beng", "name": "Bengali", "native": "বাংলা", "iso": "bn"} in langs


def test_google_disabled_by_default(client: TestClient) -> None:
    r = client.post(
        "/api/v1/translate",
        json={"text": "hi", "source": "eng_Latn", "target": "ben_Beng", "engine": "google"},
    )
    assert r.status_code == 503


def test_google_engine_maps_codes_and_caches_separately(
    client: TestClient, fake_google: list[dict]
) -> None:
    body = {"text": "hello", "source": "eng_Latn", "target": SANTALI, "engine": "google"}
    r = client.post("/api/v1/translate", json=body).json()
    assert r["translation"] == "G(hello)" and r["engine"] == "google"
    sent = fake_google[0]["json"]
    assert (sent["source"], sent["target"], sent["format"]) == ("en", "sat", "text")
    again = client.post("/api/v1/translate", json=body).json()
    assert again["cached"] is True and len(fake_google) == 1  # second call served from cache


def test_google_monthly_free_limit(
    client: TestClient, fake_google: list[dict], monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "google_monthly_char_limit", 11)
    body = {"source": "eng_Latn", "target": "ben_Beng", "engine": "google"}
    assert client.post("/api/v1/translate", json={**body, "text": "hello"}).status_code == 200
    assert client.post("/api/v1/translate", json={**body, "text": "world!"}).status_code == 200
    r = client.post("/api/v1/translate", json={**body, "text": "too much"})
    assert r.status_code == 503 and "free limit" in r.json()["detail"]
    engines = {e["id"]: e for e in client.get("/api/v1/translate/engines").json()}
    assert engines["google"]["enabled"] is False and engines["google"]["limit_reached"] is True
    # cached repeats never count against the limit
    assert client.post("/api/v1/translate", json={**body, "text": "hello"}).json()["cached"]
