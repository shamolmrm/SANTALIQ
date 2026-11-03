"""SANTALIQ Voice: consent, upload, access control, review and withdrawal.

Audio here is synthetic bytes with a valid container header; no real voice data.
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.language.models import VerificationStatus
from app.modules.users.models import Role
from app.modules.voice import router as voice_router
from app.modules.voice.router import sniff_audio
from tests.test_dataset import add
from tests.test_write import sign_in

WEBM = b"\x1aE\xdf\xa3" + b"\x00" * 400
CONSENT = {"agree": True, "consent_public": True, "consent_research": True, "dialect": "Test"}


@pytest.fixture(autouse=True)
def voice_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(voice_router, "audio_root", lambda: tmp_path)
    return tmp_path


def upload(client: TestClient, data: bytes = WEBM, **form: str):
    fields = {"text": "test", "script": "latn", "duration_ms": "1500", **form}
    return client.post(
        "/api/v1/voice/clips", data=fields, files={"audio": ("clip.webm", data, "audio/webm")}
    )


def test_sniff_audio() -> None:
    assert sniff_audio(WEBM) == ("audio/webm", "webm")
    assert sniff_audio(b"OggS" + b"\x00" * 10) == ("audio/ogg", "ogg")
    assert sniff_audio(b"\x00\x00\x00\x18ftypmp42") == ("audio/mp4", "m4a")
    assert sniff_audio(b"RIFF\x00\x00\x00\x00WAVEfmt ") == ("audio/wav", "wav")
    assert sniff_audio(b"<html>not audio") is None


def test_consent_required_before_recording(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "v1@example.com")
    assert client.get("/api/v1/voice/consent").json() is None
    assert upload(client).status_code == 403
    assert client.put("/api/v1/voice/consent", json={**CONSENT, "agree": False}).status_code == 422
    c = client.put("/api/v1/voice/consent", json=CONSENT).json()
    assert c["consent_public"] and c["consent_version"] == c["current_version"]
    r = upload(client)
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert upload(client, data=b"<html>" + b"x" * 200).status_code == 422
    assert upload(client, lexeme_id="00000000-0000-0000-0000-000000000000").status_code == 422


def test_review_and_public_access(client: TestClient, db_session: Session, voice_dir: Path) -> None:
    sign_in(client, db_session, "speaker@example.com")
    client.put("/api/v1/voice/consent", json=CONSENT)
    clip = upload(client).json()
    assert client.get(clip["audio_url"]).content == WEBM  # speaker can listen

    client.cookies.clear()
    assert client.get(clip["audio_url"]).status_code == 404  # pending: not public
    assert client.get("/api/v1/voice/clips").json() == []

    sign_in(client, db_session, "voicerev@example.com", Role.reviewer)
    assert [c["id"] for c in client.get("/api/v1/admin/voice").json()] == [clip["id"]]
    assert client.get(clip["audio_url"]).status_code == 200  # reviewer can listen
    r = client.post(f"/api/v1/admin/voice/{clip['id']}", json={"decision": "verified"})
    assert r.json()["status"] == "verified"

    client.cookies.clear()
    assert client.get(clip["audio_url"]).status_code == 200
    library = client.get("/api/v1/voice/clips").json()
    assert library[0]["dialect"] == "Test"
    stats = client.get("/api/v1/voice/stats").json()
    assert stats["verified_clips"] == 1 and stats["speakers"] == 1

    # speaker turns public listening off: hidden at once
    sign_in(client, db_session, "speaker@example.com")
    client.put("/api/v1/voice/consent", json={**CONSENT, "consent_public": False})
    client.cookies.clear()
    assert client.get(clip["audio_url"]).status_code == 404
    assert client.get("/api/v1/voice/clips").json() == []


def test_no_self_review_and_withdraw_all(
    client: TestClient, db_session: Session, voice_dir: Path
) -> None:
    sign_in(client, db_session, "selfrev@example.com", Role.reviewer)
    client.put("/api/v1/voice/consent", json=CONSENT)
    clip = upload(client).json()
    upload(client)
    assert len(list(voice_dir.iterdir())) == 2
    r = client.post(f"/api/v1/admin/voice/{clip['id']}", json={"decision": "verified"})
    assert r.status_code == 403

    assert client.delete(f"/api/v1/voice/clips/{clip['id']}").status_code == 204
    assert len(list(voice_dir.iterdir())) == 1
    assert client.delete("/api/v1/voice/me").status_code == 204
    assert list(voice_dir.iterdir()) == []
    assert client.get("/api/v1/voice/me/clips").json() == []
    assert client.get("/api/v1/voice/consent").json() is None


def test_prompts_come_from_verified_entries(client: TestClient, db_session: Session) -> None:
    add(db_session, "Alpha", VerificationStatus.verified)
    add(db_session, "Beta", VerificationStatus.pending)
    prompts = client.get("/api/v1/voice/prompts", params={"script": "latn"}).json()
    assert [p["text"] for p in prompts] == ["Alpha"]
    assert client.get("/api/v1/voice/prompts", params={"script": "olck"}).json() == []

    sign_in(client, db_session, "reader@example.com")
    client.put("/api/v1/voice/consent", json=CONSENT)
    r = upload(client, text="Alpha", lexeme_id=prompts[0]["lexeme_id"])
    assert r.status_code == 201
