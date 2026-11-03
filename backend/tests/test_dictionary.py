"""Dictionary search serves only verified entries.

Test data uses neutral placeholders, never Santali words.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.language.models import Lexeme, Sense, Spelling, VerificationStatus


def _add(db: Session, word: str, status: VerificationStatus) -> None:
    lex = Lexeme(headword=word, status=status, source="test fixture")
    lex.spellings = [Spelling(script="latn", text=word, search_key=word.lower())]
    lex.senses = [Sense(language="eng_Latn", gloss=f"gloss of {word}")]
    db.add(lex)
    db.commit()


def test_search_returns_only_verified(client: TestClient, db_session: Session) -> None:
    _add(db_session, "Testword", VerificationStatus.verified)
    _add(db_session, "Testpending", VerificationStatus.pending)
    r = client.get("/api/v1/dictionary/search", params={"q": "test"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    entry = body["results"][0]
    assert entry["headword"] == "Testword"
    assert entry["spellings"] == [{"script": "latn", "text": "Testword"}]
    assert entry["senses"][0]["gloss"] == "gloss of Testword"


def test_search_empty_and_validation(client: TestClient) -> None:
    assert client.get("/api/v1/dictionary/search", params={"q": "nothing"}).json()["total"] == 0
    assert client.get("/api/v1/dictionary/search", params={"q": ""}).status_code == 422
