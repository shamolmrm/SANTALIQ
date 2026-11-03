from fastapi.testclient import TestClient

from app.main import app
from app.modules.translate.languages import SANTALI

client = TestClient(app)


def test_languages_lists_santali_first() -> None:
    r = client.get("/api/v1/translate/languages")
    assert r.status_code == 200
    langs = r.json()
    assert langs[0]["code"] == SANTALI
    assert {"eng_Latn", "deu_Latn", "ben_Beng"} <= {lang["code"] for lang in langs}


def test_rejects_unknown_language() -> None:
    r = client.post(
        "/api/v1/translate", json={"text": "hi", "source": "xxx_Latn", "target": SANTALI}
    )
    assert r.status_code == 422


def test_rejects_too_long_text() -> None:
    r = client.post(
        "/api/v1/translate", json={"text": "a" * 2001, "source": "eng_Latn", "target": SANTALI}
    )
    assert r.status_code == 422


def test_service_down_returns_503() -> None:
    # No translate service runs during unit tests.
    r = client.post(
        "/api/v1/translate", json={"text": "hello", "source": "eng_Latn", "target": SANTALI}
    )
    assert r.status_code == 503
