from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.models import AuditEvent, AuthSession, User

PASSWORD = "correct horse battery"


def register(client: TestClient, email: str = "a@example.com", name: str = "Ann") -> dict:
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": name},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_register_logs_in_and_hashes_password(client: TestClient, db_session: Session) -> None:
    user = register(client, "Ann@Example.com")
    assert user["email"] == "ann@example.com"
    assert user["role"] == "member"
    assert client.get("/api/v1/auth/me").json()["id"] == user["id"]
    stored = db_session.scalar(select(User))
    assert stored is not None and stored.password_hash.startswith("$argon2")
    assert PASSWORD not in stored.password_hash
    # session token is stored hashed, never raw
    token = client.cookies.get("santaliq_session")
    assert token and db_session.get(AuthSession, token) is None


def test_duplicate_email_rejected(client: TestClient) -> None:
    register(client)
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "A@example.com", "password": PASSWORD, "display_name": "X"},
    )
    assert r.status_code == 409


def test_weak_password_and_bad_email_rejected(client: TestClient) -> None:
    for body in (
        {"email": "a@example.com", "password": "short", "display_name": "A"},
        {"email": "not-an-email", "password": PASSWORD, "display_name": "A"},
    ):
        assert client.post("/api/v1/auth/register", json=body).status_code == 422


def test_login_logout_flow(client: TestClient, db_session: Session) -> None:
    register(client)
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401

    bad = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "nope"})
    assert bad.status_code == 401
    unknown = client.post("/api/v1/auth/login", json={"email": "x@example.com", "password": "x"})
    assert unknown.status_code == 401
    assert bad.json()["detail"] == unknown.json()["detail"]  # no account enumeration

    ok = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD})
    assert ok.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200
    actions = {e.action for e in db_session.scalars(select(AuditEvent))}
    assert {"user.register", "user.login"} <= actions


def test_auth_rate_limited(client: TestClient) -> None:
    codes = [
        client.post(
            "/api/v1/auth/login", json={"email": "a@example.com", "password": "x"}
        ).status_code
        for _ in range(12)
    ]
    assert codes[-1] == 429


def test_foreign_origin_blocked(client: TestClient) -> None:
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "a@example.com", "password": PASSWORD},
        headers={"Origin": "https://evil.example"},
    )
    assert r.status_code == 403


def test_rate_limit_ignores_spoofed_forwarded_for(client: TestClient) -> None:
    """X-Forwarded-For is client-controlled; limits key on X-Real-IP set by nginx."""
    body = {"email": "nobody@example.com", "password": "wrong password"}
    codes = [
        client.post(
            "/api/v1/auth/login",
            json=body,
            headers={"X-Forwarded-For": f"10.0.0.{i}", "X-Real-IP": "203.0.113.7"},
        ).status_code
        for i in range(15)
    ]
    assert 429 in codes
