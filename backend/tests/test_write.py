from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.models import Role, User
from app.modules.write.router import make_excerpt, make_slug

PASSWORD = "correct horse battery"
PIECE = {
    "title": "A test piece",
    "kind": "poetry",
    "script": "latn",
    "body": "# Heading\n\nFirst **line**\nsecond line\n\n> quoted",
}


def sign_in(client: TestClient, db: Session, email: str, role: Role = Role.member) -> str:
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
    return str(user.id)


def test_helpers() -> None:
    assert make_excerpt("# Title\n\n**bold** and *it*") == "Title bold and it"
    assert make_slug("Hello, World!").startswith("hello-world-")
    assert make_slug("ᱥᱟᱱᱛᱟᱲᱤ").startswith("post-")


def test_draft_is_private_until_published(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "a@example.com")
    post = client.post("/api/v1/write/posts", json=PIECE).json()
    assert post["status"] == "draft"
    assert client.get("/api/v1/write/posts").json()["total"] == 0
    assert client.get(f"/api/v1/write/posts/{post['slug']}").status_code == 200  # author sees it

    sign_in(client, db_session, "b@example.com")
    assert client.get(f"/api/v1/write/posts/{post['slug']}").status_code == 404
    assert (
        client.patch(f"/api/v1/write/posts/{post['id']}", json={"publish": True}).status_code == 403
    )

    sign_in(client, db_session, "a@example.com")
    published = client.patch(f"/api/v1/write/posts/{post['id']}", json={"publish": True}).json()
    assert published["status"] == "published" and published["published_at"]
    client.cookies.clear()
    listing = client.get("/api/v1/write/posts", params={"kind": "poetry"}).json()
    assert (
        listing["total"] == 1 and listing["items"][0]["author"]["display_name"] == "a@example.com"
    )
    assert client.get(f"/api/v1/write/posts/{post['slug']}").json()["body"] == PIECE["body"]


def test_validation_and_auth(client: TestClient, db_session: Session) -> None:
    assert client.post("/api/v1/write/posts", json=PIECE).status_code == 401
    sign_in(client, db_session, "a@example.com")
    assert client.post("/api/v1/write/posts", json={**PIECE, "script": "xxxx"}).status_code == 422
    assert client.post("/api/v1/write/posts", json={**PIECE, "kind": "spam"}).status_code == 422
    assert client.post("/api/v1/write/posts", json={**PIECE, "title": ""}).status_code == 422


def test_report_and_moderation(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "a@example.com")
    post = client.post("/api/v1/write/posts", json={**PIECE, "publish": True}).json()

    sign_in(client, db_session, "b@example.com")
    for _ in range(2):  # duplicate reports count once
        r = client.post(f"/api/v1/write/posts/{post['id']}/report", json={"reason": "spam content"})
        assert r.status_code == 202
    assert client.get("/api/v1/admin/reports").status_code == 403

    sign_in(client, db_session, "mod@example.com", Role.reviewer)
    reports = client.get("/api/v1/admin/reports").json()
    assert len(reports) == 1 and reports[0]["open_reports"] == 1
    r = client.post(
        f"/api/v1/admin/posts/{post['id']}/moderate", json={"action": "remove", "note": "spam"}
    )
    assert r.status_code == 200 and r.json()["status"] == "removed"
    assert client.get("/api/v1/admin/reports").json() == []

    client.cookies.clear()
    assert client.get("/api/v1/write/posts").json()["total"] == 0
    assert client.get(f"/api/v1/write/posts/{post['slug']}").status_code == 404

    sign_in(client, db_session, "a@example.com")
    own = client.get(f"/api/v1/write/posts/{post['slug']}").json()
    assert own["status"] == "removed" and own["moderation_note"] == "spam"
    assert (
        client.patch(f"/api/v1/write/posts/{post['id']}", json={"publish": True}).status_code == 403
    )


def test_author_can_delete(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "a@example.com")
    post = client.post("/api/v1/write/posts", json=PIECE).json()
    assert client.delete(f"/api/v1/write/posts/{post['id']}").status_code == 204
    assert client.get("/api/v1/write/me/posts").json() == []
