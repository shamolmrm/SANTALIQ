from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "SANTALIQ API"


def test_ready_reports_each_dependency(client: TestClient) -> None:
    # No Postgres or model service in unit tests → degraded with per-check detail.
    r = client.get("/api/v1/health/ready")
    assert r.status_code == 503
    assert set(r.json()["checks"]) == {"database", "redis", "translate"}
