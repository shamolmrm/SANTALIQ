import json

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.modules.monitoring.models import ErrorEvent
from app.modules.users.models import Role
from tests.test_write import sign_in


def _boom() -> None:
    raise RuntimeError("test explosion 42")


app.add_api_route("/api/v1/__test_boom", _boom, methods=["GET"])


def test_unhandled_api_error_is_recorded_and_hidden(
    client: TestClient, db_session: Session
) -> None:
    quiet = TestClient(app, raise_server_exceptions=False)
    for _ in range(2):
        r = quiet.get("/api/v1/__test_boom")
        assert r.status_code == 500
        assert "explosion" not in r.text and "notified" in r.json()["detail"]
    events = db_session.scalars(select(ErrorEvent)).all()
    assert len(events) == 1  # grouped
    e = events[0]
    assert e.source == "api" and e.kind == "RuntimeError" and e.count == 2
    assert "GET /api/v1/__test_boom" in e.detail["path"] and "Traceback" in e.detail["trace"]


def test_client_errors_csp_and_admin(client: TestClient, db_session: Session) -> None:
    body = {"kind": "TypeError", "message": "x is undefined", "url": "/write/abc?token=secret"}
    assert client.post("/api/v1/telemetry/client-error", json=body).status_code == 204
    csp = {
        "csp-report": {"violated-directive": "script-src", "blocked-uri": "https://evil.example"}
    }
    r = client.post(
        "/api/v1/telemetry/csp",
        content=json.dumps(csp),
        headers={"Content-Type": "application/csp-report"},
    )
    assert r.status_code == 204

    sign_in(client, db_session, "rev@example.com", Role.reviewer)
    assert client.get("/api/v1/admin/errors").status_code == 403

    sign_in(client, db_session, "boss@example.com", Role.admin)
    errors = client.get("/api/v1/admin/errors").json()
    assert {e["source"] for e in errors} == {"web", "csp"}
    web = next(e for e in errors if e["source"] == "web")
    assert web["detail"]["url"] == "/write/abc"  # query string (may hold secrets) dropped
    assert client.get("/api/v1/admin/overview").json()["open_errors"] == 2
    client.post(f"/api/v1/admin/errors/{web['id']}/resolve")
    assert len(client.get("/api/v1/admin/errors").json()) == 1
    assert len(client.get("/api/v1/admin/errors", params={"resolved": True}).json()) == 1
