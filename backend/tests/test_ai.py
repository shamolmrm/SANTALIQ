"""SANTALIQ AI: grounded retrieval and chat. The Claude call is replaced by a stub."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.ai import llm
from app.modules.ai.models import AIUsage
from app.modules.ai.retrieval import terms
from app.modules.language.models import Lexeme, Sense, Spelling, VerificationStatus
from app.modules.users.models import User

PASSWORD = "correct horse battery"


def add_entry(db: Session, word: str, gloss: str, status: VerificationStatus) -> None:
    lex = Lexeme(headword=word, status=status, source="fixture")
    lex.spellings = [Spelling(script="latn", text=word, search_key=word.lower())]
    lex.senses = [Sense(language="eng_Latn", gloss=gloss)]
    db.add(lex)
    db.commit()


def sign_in(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "a@example.com", "password": PASSWORD, "display_name": "Ann"},
    )


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    calls: list[dict] = []

    async def complete(system: str, messages: list[dict]) -> llm.Completion:
        calls.append({"system": system, "messages": messages})
        return llm.Completion(text="Answer [1]", model="stub", input_tokens=11, output_tokens=7)

    monkeypatch.setattr(llm, "ai_enabled", lambda: True)
    monkeypatch.setattr(llm, "complete", complete)
    return calls


def test_terms_drop_stopwords() -> None:
    assert terms("What is the meaning of placeholder?") == ["placeholder"]


def test_search_uses_only_verified(client: TestClient, db_session: Session) -> None:
    add_entry(db_session, "Placeholdera", "first test gloss", VerificationStatus.verified)
    add_entry(db_session, "Placeholderb", "second test gloss", VerificationStatus.pending)
    hits = client.get("/api/v1/ai/search", params={"q": "placeholder"}).json()
    assert [h["title"] for h in hits] == ["Placeholdera"]
    assert hits[0]["n"] == 1 and hits[0]["kind"] == "dictionary"
    # gloss match works too
    assert (
        client.get("/api/v1/ai/search", params={"q": "first gloss"}).json()[0]["title"]
        == "Placeholdera"
    )


def test_chat_disabled_without_key(client: TestClient) -> None:
    sign_in(client)
    assert client.get("/api/v1/ai/status").json()["chat_enabled"] is False
    r = client.post("/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 503


def test_chat_requires_login(client: TestClient, fake_llm: list[dict]) -> None:
    r = client.post("/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 401


def test_chat_grounds_answer_and_logs_usage(
    client: TestClient, db_session: Session, fake_llm: list[dict]
) -> None:
    add_entry(db_session, "Placeholdera", "test gloss", VerificationStatus.verified)
    sign_in(client)
    r = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "What does placeholdera mean?"}]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["answer"] == "Answer [1]" and body["sources"][0]["title"] == "Placeholdera"
    sent = fake_llm[0]["messages"][-1]["content"]
    assert "<sources>" in sent and "test gloss" in sent and "Never invent" in fake_llm[0]["system"]
    usage = db_session.scalar(select(AIUsage))
    user = db_session.scalar(select(User))
    assert usage is not None and user is not None
    assert (usage.input_tokens, usage.output_tokens, usage.user_id) == (11, 7, user.id)


def test_chat_rate_limited(client: TestClient, fake_llm: list[dict]) -> None:
    sign_in(client)
    codes = [
        client.post(
            "/api/v1/ai/chat", json={"messages": [{"role": "user", "content": f"q{i}"}]}
        ).status_code
        for i in range(11)
    ]
    assert codes[:10] == [200] * 10 and codes[10] == 429


def test_last_message_must_be_user(client: TestClient, fake_llm: list[dict]) -> None:
    sign_in(client)
    r = client.post(
        "/api/v1/ai/chat",
        json={
            "messages": [
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "hello"},
            ]
        },
    )
    assert r.status_code == 422
