from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.admin.models import SystemStatus
from app.modules.users.models import Role
from tests.test_heritage import ITEM
from tests.test_write import PIECE, sign_in


def test_overview_counts_and_access(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "author@example.com")
    client.post("/api/v1/write/posts", json={**PIECE, "publish": True})
    client.post("/api/v1/write/posts", json=PIECE)  # draft
    client.post("/api/v1/heritage/items", json=ITEM)
    assert client.get("/api/v1/admin/overview").status_code == 403

    sign_in(client, db_session, "mod@example.com", Role.reviewer)
    o = client.get("/api/v1/admin/overview").json()
    assert o["posts_published"] == 1 and o["heritage"]["pending"] == 1
    assert o["users_total"] == 2 and o["users_by_role"]["reviewer"] == 1
    assert o["to_review"] == 1
    # reviewers cannot see the activity log or system page
    assert client.get("/api/v1/admin/activity").status_code == 403
    assert client.get("/api/v1/admin/system").status_code == 403
    # content list never includes drafts
    posts = client.get("/api/v1/admin/posts").json()
    assert posts["total"] == 1 and posts["items"][0]["status"] == "published"
    assert client.get("/api/v1/admin/posts", params={"status": "draft"}).json()["total"] == 1
    assert client.get("/api/v1/admin/posts", params={"q": "author@"}).json()["total"] == 1


def test_activity_and_system_for_admin(client: TestClient, db_session: Session) -> None:
    sign_in(client, db_session, "boss@example.com", Role.admin)
    client.post("/api/v1/heritage/items", json=ITEM)
    db_session.add(SystemStatus(key="last_backup", value={"file": "x.sql.gz", "size": "8K"}))
    db_session.commit()

    log = client.get("/api/v1/admin/activity").json()
    actions = [e["action"] for e in log["items"]]
    assert "heritage.submit" in actions and log["items"][0]["actor"] == "boss@example.com"
    assert "ip" not in log["items"][0]
    only = client.get("/api/v1/admin/activity", params={"action": "heritage."}).json()
    assert {e["action"] for e in only["items"]} == {"heritage.submit"}

    s = client.get("/api/v1/admin/system").json()
    # checks ping the real services (absent in tests), so only the shape is asserted
    assert set(s["checks"]) == {"database", "redis", "translate"}
    assert s["features"] == {"ai_chat": False, "google_translate": False, "email": False}
    assert s["last_backup"]["file"] == "x.sql.gz"
    assert s["database_rows"]["heritage_items"] == 1
    assert "anthropic_api_key" not in s and "key" not in str(s["features"])
