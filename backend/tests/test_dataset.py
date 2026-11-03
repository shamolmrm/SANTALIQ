"""Open dataset exports and contributor credits. Placeholder data only."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.language.models import Lexeme, Sense, Spelling, VerificationStatus
from app.modules.users.models import User

PASSWORD = "correct horse battery"


def add(db: Session, word: str, status: VerificationStatus, by: User | None = None) -> None:
    lex = Lexeme(
        headword=word,
        status=status,
        source="fixture",
        submitted_by=by.id if by else None,
        contributor=by.display_name if by else None,
    )
    lex.spellings = [Spelling(script="latn", text=word, search_key=word.lower())]
    lex.senses = [Sense(language="eng_Latn", gloss=f"gloss {word}")]
    db.add(lex)
    db.commit()


def test_exports_only_verified(client: TestClient, db_session: Session) -> None:
    add(db_session, "Alpha", VerificationStatus.verified)
    add(db_session, "Beta", VerificationStatus.pending)
    data = client.get("/api/v1/dataset/lexicon.json").json()
    assert data["count"] == 1 and data["entries"][0]["headword"] == "Alpha"
    assert data["entries"][0]["spellings"]["latn"] == ["Alpha"]
    assert "Licence" in data["license"]

    r = client.get("/api/v1/dataset/lexicon.csv")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    lines = r.content.decode("utf-8-sig").strip().splitlines()
    assert len(lines) == 2 and "Alpha" in lines[1] and "Beta" not in r.text


def test_contributors_ranked_by_verified(client: TestClient, db_session: Session) -> None:
    for email in ("a@example.com", "b@example.com"):
        client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": PASSWORD, "display_name": email[0].upper()},
        )
    a = db_session.scalar(select(User).where(User.email == "a@example.com"))
    b = db_session.scalar(select(User).where(User.email == "b@example.com"))
    add(db_session, "One", VerificationStatus.verified, a)
    add(db_session, "Two", VerificationStatus.verified, b)
    add(db_session, "Three", VerificationStatus.verified, b)
    add(db_session, "Four", VerificationStatus.pending, a)
    ranking = client.get("/api/v1/dictionary/contributors").json()
    assert [(c["display_name"], c["verified_entries"]) for c in ranking] == [("B", 2), ("A", 1)]
