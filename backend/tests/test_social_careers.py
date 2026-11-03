from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.models import Role
from tests.test_heritage import ITEM
from tests.test_write import PIECE, sign_in


def test_follow_feed_comments_and_notifications(client: TestClient, db_session: Session) -> None:
    author = sign_in(client, db_session, "author@example.com")
    post = client.post("/api/v1/write/posts", json={**PIECE, "publish": True}).json()

    reader = sign_in(client, db_session, "reader@example.com")
    assert client.post(f"/api/v1/people/{reader}/follow").status_code == 400  # not self
    f = client.post(f"/api/v1/people/{author}/follow").json()
    assert f == {"followers": 1, "following": 0, "i_follow": True}
    assert client.get("/api/v1/feed").json()["total"] == 1
    c = client.post(f"/api/v1/write/posts/{post['id']}/comments", json={"body": "Nice!"}).json()
    assert c["can_delete"] and c["author_name"] == "reader@example.com"

    sign_in(client, db_session, "author@example.com")
    n = client.get("/api/v1/notifications").json()
    assert n["unread"] == 2 and {i["kind"] for i in n["items"]} == {"follow", "comment"}
    client.post("/api/v1/notifications/read")
    assert client.get("/api/v1/notifications").json()["unread"] == 0
    # the post author may remove comments on their own piece
    assert client.delete(f"/api/v1/comments/{c['id']}").status_code == 204
    assert client.get(f"/api/v1/write/posts/{post['id']}/comments").json() == []

    client.cookies.clear()
    assert client.get(f"/api/v1/people/{author}/follow").json()["followers"] == 1
    assert client.get("/api/v1/feed").status_code == 401


def test_review_decisions_notify_contributors(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "teller@example.com")
    item = client.post("/api/v1/heritage/items", json=ITEM).json()
    sign_in(client, db_session, "checker@example.com", Role.reviewer)
    client.post(f"/api/v1/admin/heritage/{item['id']}", json={"decision": "verified"})
    sign_in(client, db_session, "teller@example.com")
    items = client.get("/api/v1/notifications").json()["items"]
    assert items[0]["kind"] == "heritage_reviewed" and items[0]["data"]["decision"] == "verified"


def test_news_is_for_reviewers_only(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "member@example.com")
    assert client.post("/api/v1/write/posts", json={**PIECE, "kind": "news"}).status_code == 403
    sign_in(client, db_session, "editor@example.com", Role.reviewer)
    r = client.post("/api/v1/write/posts", json={**PIECE, "kind": "news", "publish": True})
    assert r.status_code == 201
    assert client.get("/api/v1/write/posts", params={"kind": "news"}).json()["total"] == 1


JOB = {
    "kind": "scholarship",
    "title": "Test scholarship",
    "organization": "Test Org",
    "description": "Placeholder description for an automated test.",
    "apply_url": "https://example.org/apply",
}


def test_career_listings_are_reviewed(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "poster@example.com")
    bad = {**JOB, "apply_url": None}
    assert client.post("/api/v1/careers", json=bad).status_code == 422  # no way to apply
    assert client.post("/api/v1/careers", json={**JOB, "apply_url": "http://x"}).status_code == 422
    past = {**JOB, "deadline": str(date.today() - timedelta(days=1))}
    assert client.post("/api/v1/careers", json=past).status_code == 422
    job = client.post("/api/v1/careers", json=JOB).json()
    assert job["status"] == "pending"
    client.cookies.clear()
    assert client.get("/api/v1/careers").json() == []

    sign_in(client, db_session, "jobrev@example.com", Role.reviewer)
    assert [j["id"] for j in client.get("/api/v1/admin/careers").json()] == [job["id"]]
    client.post(f"/api/v1/admin/careers/{job['id']}", json={"decision": "verified"})
    assert client.get("/api/v1/admin/overview").json()["careers"]["verified"] == 1
    client.cookies.clear()
    listing = client.get("/api/v1/careers", params={"kind": "scholarship"}).json()
    assert [j["title"] for j in listing] == ["Test scholarship"]
