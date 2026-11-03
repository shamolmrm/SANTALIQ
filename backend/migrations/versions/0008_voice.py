"""SANTALIQ Voice: speaker consent and recordings

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "voice_speakers",
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("consent_version", sa.String(20), nullable=False),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consent_public", sa.Boolean(), nullable=False),
        sa.Column("consent_research", sa.Boolean(), nullable=False),
        sa.Column("dialect", sa.String(80)),
        sa.Column("region", sa.String(120)),
        sa.Column("age_range", sa.String(16)),
        sa.Column("gender", sa.String(24)),
        *_timestamps(),
    )
    op.create_table(
        "voice_clips",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("script", sa.String(4), nullable=False),
        sa.Column("lexeme_id", sa.Uuid(), sa.ForeignKey("lexemes.id", ondelete="SET NULL")),
        sa.Column("file_name", sa.String(80), nullable=False),
        sa.Column("mime", sa.String(40), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("review_note", sa.Text()),
        *_timestamps(),
        sa.CheckConstraint(
            "script IN ('olck', 'latn', 'beng', 'orya', 'deva')", name="ck_voice_clips_script"
        ),
    )
    op.create_index("ix_voice_clips_user_id", "voice_clips", ["user_id"])
    op.create_index("ix_voice_clips_status", "voice_clips", ["status"])


def downgrade() -> None:
    op.drop_table("voice_clips")
    op.drop_table("voice_speakers")
