from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.models import Role
from tests.test_write import sign_in

# Placeholder text only: SANTALIQ never invents cultural content, even in tests.
ITEM = {
    "kind": "folk_story",
    "title": "Test item",
    "script": "latn",
    "body": "Placeholder body text for an automated test, not real content.",
    "region": "Test region",
    "source": "Automated test",
    "consent": True,
}


def test_consent_and_source_are_required(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "c@example.com")
    assert client.post("/api/v1/heritage/items", json={**ITEM, "consent": False}).status_code == 422
    assert client.post("/api/v1/heritage/items", json={**ITEM, "source": ""}).status_code == 422
    client.cookies.clear()
    assert client.post("/api/v1/heritage/items", json=ITEM).status_code == 401


def test_pending_until_verified_by_another_reviewer(
    client: TestClient, db_session: Session
) -> None:
    sign_in(client, db_session, "rev1@example.com", Role.reviewer)
    item = client.post("/api/v1/heritage/items", json=ITEM).json()
    assert item["status"] == "pending"
    assert client.get(f"/api/v1/heritage/items/{item['slug']}").status_code == 200  # own
    assert [i["id"] for i in client.get("/api/v1/heritage/me/items").json()] == [item["id"]]
    # a reviewer cannot verify their own submission
    r = client.post(f"/api/v1/admin/heritage/{item['id']}", json={"decision": "verified"})
    assert r.status_code == 403

    client.cookies.clear()
    assert client.get("/api/v1/heritage/items").json()["total"] == 0
    assert client.get(f"/api/v1/heritage/items/{item['slug']}").status_code == 404

    sign_in(client, db_session, "member@example.com")
    assert client.get("/api/v1/admin/heritage").status_code == 403

    sign_in(client, db_session, "rev2@example.com", Role.reviewer)
    queue = client.get("/api/v1/admin/heritage").json()
    assert [i["id"] for i in queue] == [item["id"]]
    r = client.post(f"/api/v1/admin/heritage/{item['id']}", json={"decision": "verified"})
    assert r.json()["status"] == "verified"

    client.cookies.clear()
    listing = client.get("/api/v1/heritage/items", params={"kind": "folk_story"}).json()
    assert listing["total"] == 1
    assert listing["items"][0]["contributor"]["display_name"] == "rev1@example.com"
    assert client.get("/api/v1/heritage/items", params={"q": "region"}).json()["total"] == 1
    public = client.get(f"/api/v1/heritage/items/{item['slug']}").json()
    assert public["source"] == "Automated test" and public["review_note"] is None
    assert [s["slug"] for s in client.get("/api/v1/heritage/sitemap").json()] == [item["slug"]]


def test_reject_note_and_withdraw(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "w@example.com")
    item = client.post("/api/v1/heritage/items", json=ITEM).json()

    sign_in(client, db_session, "rev3@example.com", Role.reviewer)
    client.post(
        f"/api/v1/admin/heritage/{item['id']}", json={"decision": "rejected", "note": "Need source"}
    )
    assert client.delete(f"/api/v1/heritage/items/{item['id']}").status_code == 403

    sign_in(client, db_session, "w@example.com")
    mine = client.get("/api/v1/heritage/me/items").json()
    assert mine[0]["status"] == "rejected" and mine[0]["review_note"] == "Need source"
    assert client.delete(f"/api/v1/heritage/items/{item['id']}").status_code == 204
    assert client.get("/api/v1/heritage/me/items").json() == []
