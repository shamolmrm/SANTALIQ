import re

import pytest
from fastapi.testclient import TestClient

from app.core import mailer

PASSWORD = "correct horse battery"
NEW_PASSWORD = "another long password"


@pytest.fixture
def outbox(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, str]]:
    sent: list[dict[str, str]] = []
    monkeypatch.setattr(mailer, "email_enabled", lambda: True)
    monkeypatch.setattr(
        mailer, "send_email", lambda to, subject, body: sent.append({"to": to, "body": body})
    )
    return sent


def token_from(mail: dict[str, str]) -> str:
    match = re.search(r"token=([\w-]+)", mail["body"])
    assert match
    return match.group(1)


def register(client: TestClient, email: str = "a@example.com") -> None:
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": "Ann"},
    )
    assert r.status_code == 201


def test_features_reports_email_disabled_by_default(client: TestClient) -> None:
    assert client.get("/api/v1/auth/features").json() == {"email": False}
    assert (
        client.post("/api/v1/auth/password/forgot", json={"email": "a@example.com"}).status_code
        == 503
    )


def test_verify_email_flow(client: TestClient, outbox: list[dict[str, str]]) -> None:
    register(client)
    assert len(outbox) == 1 and outbox[0]["to"] == "a@example.com"
    assert client.get("/api/v1/auth/me").json()["email_verified"] is False
    token = token_from(outbox[0])
    assert client.post("/api/v1/auth/verify/confirm", json={"token": token}).status_code == 200
    assert client.get("/api/v1/auth/me").json()["email_verified"] is True
    # single use
    assert client.post("/api/v1/auth/verify/confirm", json={"token": token}).status_code == 400


def test_password_reset_flow(client: TestClient, outbox: list[dict[str, str]]) -> None:
    register(client)
    client.cookies.clear()
    # same answer for unknown email (no enumeration)
    unknown = client.post("/api/v1/auth/password/forgot", json={"email": "x@example.com"})
    known = client.post("/api/v1/auth/password/forgot", json={"email": "a@example.com"})
    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    token = token_from(outbox[-1])
    r = client.post("/api/v1/auth/password/reset", json={"token": token, "password": NEW_PASSWORD})
    assert r.status_code == 200
    client.cookies.clear()
    old = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD})
    assert old.status_code == 401
    new = client.post(
        "/api/v1/auth/login", json={"email": "a@example.com", "password": NEW_PASSWORD}
    )
    assert new.status_code == 200
    bad = client.post("/api/v1/auth/password/reset", json={"token": token, "password": "x" * 12})
    assert bad.status_code == 400


def test_change_password(client: TestClient) -> None:
    register(client)
    wrong = client.post(
        "/api/v1/auth/password/change",
        json={"current_password": "nope", "new_password": NEW_PASSWORD},
    )
    assert wrong.status_code == 400
    ok = client.post(
        "/api/v1/auth/password/change",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
    )
    assert ok.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200  # still signed in here
