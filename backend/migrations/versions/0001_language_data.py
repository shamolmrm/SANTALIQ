"""language data: lexemes, spellings, senses

Revision ID: 0001
Revises:
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")  # pgvector, for future AI retrieval

    op.create_table(
        "lexemes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("headword", sa.String(200), nullable=False),
        sa.Column("part_of_speech", sa.String(40)),
        sa.Column("dialect", sa.String(80)),
        sa.Column(
            "status",
            sa.Enum(
                "draft",
                "pending",
                "verified",
                "rejected",
                name="verification_status",
                native_enum=False,
                length=16,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("source", sa.Text(), comment="Citation: book, speaker, corpus"),
        sa.Column("contributor", sa.String(120)),
        sa.Column("consent_note", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_lexemes_headword", "lexemes", ["headword"])
    op.create_index("ix_lexemes_status", "lexemes", ["status"])

    op.create_table(
        "spellings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "lexeme_id", sa.Uuid(), sa.ForeignKey("lexemes.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("script", sa.String(4), nullable=False),
        sa.Column("text", sa.String(200), nullable=False),
        sa.Column(
            "search_key", sa.String(200), nullable=False, comment="lower-cased text for lookup"
        ),
        sa.CheckConstraint(
            "script IN ('olck', 'latn', 'beng', 'orya', 'deva')", name="ck_spellings_script"
        ),
        sa.UniqueConstraint("lexeme_id", "script", "text", name="uq_spellings_lexeme_script_text"),
    )
    op.create_index("ix_spellings_lexeme_id", "spellings", ["lexeme_id"])
    op.create_index("ix_spellings_search_key", "spellings", ["search_key"])

    op.create_table(
        "senses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "lexeme_id", sa.Uuid(), sa.ForeignKey("lexemes.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "language", sa.String(12), nullable=False, comment="FLORES-200 code, e.g. eng_Latn"
        ),
        sa.Column("gloss", sa.Text(), nullable=False),
        sa.Column("example", sa.Text()),
    )
    op.create_index("ix_senses_lexeme_id", "senses", ["lexeme_id"])


def downgrade() -> None:
    op.drop_table("senses")
    op.drop_table("spellings")
    op.drop_table("lexemes")
