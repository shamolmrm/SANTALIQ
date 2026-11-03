"""SANTALIQ Heritage archive

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "heritage_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("script", sa.String(4), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("excerpt", sa.String(300), nullable=False),
        sa.Column("region", sa.String(120)),
        sa.Column("source", sa.String(500), nullable=False),
        sa.Column("consent", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("submitted_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reviewed_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("review_note", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "script IN ('olck', 'latn', 'beng', 'orya', 'deva')", name="ck_heritage_script"
        ),
    )
    op.create_index("ix_heritage_items_slug", "heritage_items", ["slug"], unique=True)
    op.create_index("ix_heritage_items_kind", "heritage_items", ["kind"])
    op.create_index("ix_heritage_items_status", "heritage_items", ["status"])
    op.create_index("ix_heritage_items_submitted_by", "heritage_items", ["submitted_by"])


def downgrade() -> None:
    op.drop_table("heritage_items")
