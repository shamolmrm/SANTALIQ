import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.language.models import Lexeme, VerificationStatus
from app.modules.users.models import Role, User
from app.modules.voice import router as voice_router
from tests.test_dataset import add
from tests.test_heritage import ITEM
from tests.test_voice import CONSENT, upload
from tests.test_write import PASSWORD, PIECE, sign_in

MSG = {"name": "Tester", "email": "t@example.com", "topic": "general", "message": "Hello there!"}


def test_contact_form_and_admin_inbox(client: TestClient, db_session: Session) -> None:
    assert client.post("/api/v1/contact", json=MSG).status_code == 202
    assert client.post("/api/v1/contact", json={**MSG, "email": "bad"}).status_code == 422
    # honeypot: accepted but not stored
    assert client.post("/api/v1/contact", json={**MSG, "website": "spam"}).status_code == 202

    sign_in(client, db_session, "member@example.com")
    assert client.get("/api/v1/admin/messages").status_code == 403

    sign_in(client, db_session, "admin@example.com", Role.admin)
    msgs = client.get("/api/v1/admin/messages").json()
    assert len(msgs) == 1 and msgs[0]["message"] == "Hello there!"
    assert client.get("/api/v1/admin/messages/count").json() == {"new": 1}
    r = client.patch(f"/api/v1/admin/messages/{msgs[0]['id']}", json={"status": "done"})
    assert r.json()["status"] == "done"
    assert client.get("/api/v1/admin/messages", params={"status": "new"}).json() == []


def test_delete_account_removes_personal_data(
    client: TestClient, db_session: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(voice_router, "audio_root", lambda: tmp_path)
    uid = sign_in(client, db_session, "leaver@example.com")
    user = db_session.get(User, uuid.UUID(uid))
    add(db_session, "Alpha", VerificationStatus.verified, by=user)
    client.post("/api/v1/write/posts", json={**PIECE, "publish": True})
    client.post("/api/v1/heritage/items", json=ITEM)
    client.put("/api/v1/voice/consent", json=CONSENT)
    upload(client)
    assert len(list(tmp_path.iterdir())) == 1

    bad = {"password": "wrong password", "confirm": "DELETE"}
    assert client.request("DELETE", "/api/v1/auth/account", json=bad).status_code == 403
    ok = {"password": PASSWORD, "confirm": "DELETE"}
    assert client.request("DELETE", "/api/v1/auth/account", json=ok).status_code == 204

    db_session.expire_all()
    assert db_session.scalar(select(User).where(User.email == "leaver@example.com")) is None
    assert list(tmp_path.iterdir()) == []
    client.cookies.clear()
    assert client.get("/api/v1/write/posts").json()["total"] == 0
    lex = db_session.scalar(select(Lexeme).where(Lexeme.headword == "Alpha"))
    assert lex is not None and lex.submitted_by is None and lex.contributor is None
    assert client.get("/api/v1/auth/me").status_code == 401


def test_only_admin_cannot_delete_self(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "solo-admin@example.com", Role.admin)
    ok = {"password": PASSWORD, "confirm": "DELETE"}
    assert client.request("DELETE", "/api/v1/auth/account", json=ok).status_code == 409
