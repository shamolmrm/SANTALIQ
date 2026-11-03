from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.listings import router as listings_router
from app.modules.users.models import Role
from tests.test_write import sign_in

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200


def test_groups(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "owner@example.com")
    g = client.post(
        "/api/v1/groups", json={"name": "Test group", "description": "A group for tests."}
    ).json()
    assert g["i_own"] and g["members"] == 1

    sign_in(client, db_session, "joiner@example.com")
    slug = g["slug"]
    assert client.post(f"/api/v1/groups/{slug}/posts", json={"body": "hi"}).status_code == 403
    assert client.post(f"/api/v1/groups/{slug}/join").json()["members"] == 2
    p = client.post(f"/api/v1/groups/{slug}/posts", json={"body": "Hello group"}).json()
    assert p["can_delete"]
    assert client.delete(f"/api/v1/groups/{slug}").status_code == 403  # not owner

    sign_in(client, db_session, "owner@example.com")
    posts = client.get(f"/api/v1/groups/{slug}/posts").json()
    assert posts[0]["body"] == "Hello group" and posts[0]["can_delete"]  # owner moderates
    assert client.delete(f"/api/v1/groups/{slug}/posts/{p['id']}").status_code == 204
    assert client.get(f"/api/v1/groups/{slug}").json()["posts"] == 0


def test_messages_and_blocking(client: TestClient, db_session: Session) -> None:
    a = sign_in(client, db_session, "a@example.com")
    b = sign_in(client, db_session, "b@example.com")
    assert client.post(f"/api/v1/messages/{b}", json={"body": "self"}).status_code == 400
    assert client.post(f"/api/v1/messages/{a}", json={"body": "Hello A"}).status_code == 201

    sign_in(client, db_session, "a@example.com")
    assert client.get("/api/v1/messages/unread").json() == {"unread": 1}
    convs = client.get("/api/v1/messages").json()
    assert convs[0]["user_id"] == b and convs[0]["unread"] == 1
    t = client.get(f"/api/v1/messages/{b}").json()
    assert [m["body"] for m in t["items"]] == ["Hello A"] and not t["items"][0]["mine"]
    assert client.get("/api/v1/messages/unread").json() == {"unread": 0}
    client.post(f"/api/v1/messages/{b}/block")

    sign_in(client, db_session, "b@example.com")
    assert client.post(f"/api/v1/messages/{a}", json={"body": "again"}).status_code == 403
    client.cookies.clear()
    assert client.get("/api/v1/messages").status_code == 401


def test_listings_review_and_rules(
    client: TestClient, db_session: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(listings_router, "media_root", lambda: tmp_path)
    sign_in(client, db_session, "seller@example.com")
    base = {
        "section": "market",
        "category": "handmade",
        "title": "Test basket",
        "description": "Placeholder listing for tests.",
    }
    assert client.post("/api/v1/listings", data=base).status_code == 422  # no contact
    r = client.post(
        "/api/v1/listings",
        data={**base, "contact": "test contact", "price": "100"},
        files={"image": ("p.png", PNG, "image/png")},
    )
    assert r.status_code == 201 and r.json()["image_url"]
    item = r.json()
    bad = client.post(
        "/api/v1/listings",
        data={**base, "contact": "x"},
        files={"image": ("p.png", b"<svg>evil</svg>" * 20, "image/png")},
    )
    assert bad.status_code == 422
    media = {
        "section": "media",
        "category": "video",
        "title": "Test video",
        "description": "Placeholder media for tests.",
    }
    assert client.post("/api/v1/listings", data=media).status_code == 422  # needs link
    client.cookies.clear()
    assert client.get("/api/v1/listings", params={"section": "market"}).json() == []
    assert client.get(item["image_url"]).status_code == 404

    sign_in(client, db_session, "mod@example.com", Role.reviewer)
    queue = client.get("/api/v1/admin/listings", params={"section": "market"}).json()
    assert [x["id"] for x in queue] == [item["id"]]
    client.post(f"/api/v1/admin/listings/{item['id']}", json={"decision": "verified"})
    client.cookies.clear()
    assert len(client.get("/api/v1/listings", params={"section": "market"}).json()) == 1
    assert client.get(item["image_url"]).content == PNG
