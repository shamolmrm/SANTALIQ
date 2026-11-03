from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.test_write import PIECE, sign_in


def test_public_profile_shows_only_public_fields(client: TestClient, db_session: Session) -> None:
    uid = sign_in(client, db_session, "writer@example.com")
    client.post("/api/v1/write/posts", json={**PIECE, "publish": True})
    client.post("/api/v1/write/posts", json=PIECE)  # draft — not counted

    client.cookies.clear()
    r = client.get(f"/api/v1/people/{uid}")
    assert r.status_code == 200
    body = r.json()
    assert body["published_posts"] == 1 and body["verified_entries"] == 0
    assert "email" not in body and "role" not in body


def test_unknown_profile_is_404(client: TestClient) -> None:
    assert client.get("/api/v1/people/00000000-0000-0000-0000-000000000000").status_code == 404


def test_edit_own_profile(client: TestClient, db_session: Session) -> None:
    uid = sign_in(client, db_session, "me@example.com")
    r = client.patch("/api/v1/people/me", json={"display_name": "  Writer  ", "bio": "Hello"})
    assert r.status_code == 200
    assert r.json()["display_name"] == "Writer" and r.json()["bio"] == "Hello"
    assert client.get("/api/v1/auth/me").json()["bio"] == "Hello"
    assert client.patch("/api/v1/people/me", json={"display_name": "   "}).status_code == 422
    assert client.patch("/api/v1/people/me", json={"bio": "x" * 501}).status_code == 422
    # clearing the bio
    assert client.patch("/api/v1/people/me", json={"bio": ""}).json()["bio"] is None

    client.cookies.clear()
    assert client.patch("/api/v1/people/me", json={"bio": "x"}).status_code == 401
    assert client.get(f"/api/v1/people/{uid}").json()["display_name"] == "Writer"


def test_sitemap_lists_published_only(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "s@example.com")
    pub = client.post("/api/v1/write/posts", json={**PIECE, "publish": True}).json()
    client.post("/api/v1/write/posts", json=PIECE)
    client.cookies.clear()
    items = client.get("/api/v1/write/sitemap").json()
    assert [i["slug"] for i in items] == [pub["slug"]]
