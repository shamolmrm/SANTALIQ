"""Contribution → review → public search. Placeholder text only, never real Santali data."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.models import Role, User

PASSWORD = "correct horse battery"

ENTRY = {
    "headword": "ᱚᱠᱚ",  # arbitrary placeholder letters, not a claimed Santali word
    "spellings": [{"script": "latn", "text": "Placeholder"}],
    "senses": [{"language": "eng_Latn", "gloss": "test gloss"}],
    "source": "unit test fixture",
    "consent": True,
}


def sign_in_as(client: TestClient, db: Session, email: str, role: Role = Role.member) -> None:
    client.cookies.clear()
    r = client.post(
        "/api/v1/auth/register", json={"email": email, "password": PASSWORD, "display_name": email}
    )
    if r.status_code == 409:
        client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    user = db.scalar(select(User).where(User.email == email))
    assert user is not None
    user.role = role
    db.commit()


def test_contribution_requires_login_and_consent(client: TestClient, db_session: Session) -> None:
    assert client.post("/api/v1/dictionary/entries", json=ENTRY).status_code == 401
    sign_in_as(client, db_session, "m@example.com")
    assert (
        client.post("/api/v1/dictionary/entries", json={**ENTRY, "consent": False}).status_code
        == 422
    )


def test_full_review_flow(client: TestClient, db_session: Session) -> None:
    sign_in_as(client, db_session, "m@example.com")
    entry = client.post("/api/v1/dictionary/entries", json=ENTRY).json()
    assert entry["status"] == "pending"
    assert {"script": "olck", "text": "ᱚᱠᱚ"} in entry["spellings"]
    assert client.get("/api/v1/dictionary/search", params={"q": "place"}).json()["total"] == 0
    # members cannot review
    assert client.get("/api/v1/admin/review").status_code == 403

    sign_in_as(client, db_session, "r@example.com", Role.reviewer)
    queue = client.get("/api/v1/admin/review").json()
    assert queue["total"] == 1
    r = client.post(f"/api/v1/admin/review/{entry['id']}", json={"decision": "verified"})
    assert r.status_code == 200 and r.json()["status"] == "verified"

    found = client.get("/api/v1/dictionary/search", params={"q": "place"}).json()
    assert found["total"] == 1 and found["results"][0]["contributor"] == "m@example.com"


def test_reviewer_cannot_verify_own_entry(client: TestClient, db_session: Session) -> None:
    sign_in_as(client, db_session, "r@example.com", Role.reviewer)
    entry = client.post("/api/v1/dictionary/entries", json=ENTRY).json()
    r = client.post(f"/api/v1/admin/review/{entry['id']}", json={"decision": "verified"})
    assert r.status_code == 403


def test_admin_manages_users(client: TestClient, db_session: Session) -> None:
    sign_in_as(client, db_session, "m@example.com")
    member_id = client.get("/api/v1/auth/me").json()["id"]
    assert client.get("/api/v1/admin/users").status_code == 403

    sign_in_as(client, db_session, "admin@example.com", Role.admin)
    me_id = client.get("/api/v1/auth/me").json()["id"]
    assert client.get("/api/v1/admin/users").json()["total"] == 2
    r = client.patch(f"/api/v1/admin/users/{member_id}", json={"role": "reviewer"})
    assert r.status_code == 200 and r.json()["role"] == "reviewer"
    assert client.patch(f"/api/v1/admin/users/{me_id}", json={"role": "member"}).status_code == 400

    # disabling a user ends their sessions
    client.patch(f"/api/v1/admin/users/{member_id}", json={"is_active": False})
    client.cookies.clear()
    r = client.post("/api/v1/auth/login", json={"email": "m@example.com", "password": PASSWORD})
    assert r.status_code == 403
