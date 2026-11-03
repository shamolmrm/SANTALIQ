"""SANTALIQ Write: posts and post reports

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "article",
                "poetry",
                "story",
                "essay",
                "journal",
                name="post_kind",
                native_enum=False,
                length=16,
            ),
            nullable=False,
        ),
        sa.Column("script", sa.String(4), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("excerpt", sa.String(300), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "draft", "published", "removed", name="post_status", native_enum=False, length=16
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("moderation_note", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "script IN ('olck', 'latn', 'beng', 'orya', 'deva')", name="ck_posts_script"
        ),
    )
    op.create_index("ix_posts_slug", "posts", ["slug"], unique=True)
    op.create_index("ix_posts_author_id", "posts", ["author_id"])
    op.create_index("ix_posts_kind", "posts", ["kind"])
    op.create_index("ix_posts_status", "posts", ["status"])
    op.create_index("ix_posts_published_at", "posts", ["published_at"])

    op.create_table(
        "post_reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "post_id", sa.Uuid(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("reporter_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("post_id", "reporter_id", name="uq_post_reports_post_reporter"),
    )
    op.create_index("ix_post_reports_post_id", "post_reports", ["post_id"])
    op.create_index("ix_post_reports_resolved_at", "post_reports", ["resolved_at"])


def downgrade() -> None:
    op.drop_table("post_reports")
    op.drop_table("posts")
