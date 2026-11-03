"""Notifications, follows, comments and career listings

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _now(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        _now("created_at"),
        sa.Column("read_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    op.create_table(
        "follows",
        sa.Column(
            "follower_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "followee_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        _now("created_at"),
        sa.CheckConstraint("follower_id <> followee_id", name="ck_follows_not_self"),
    )
    op.create_index("ix_follows_followee_id", "follows", ["followee_id"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "post_id", sa.Uuid(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("removed", sa.Boolean(), nullable=False, server_default=sa.false()),
        _now("created_at"),
    )
    op.create_index("ix_comments_post_id", "comments", ["post_id"])
    op.create_index("ix_comments_author_id", "comments", ["author_id"])

    op.create_table(
        "job_posts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("organization", sa.String(200), nullable=False),
        sa.Column("location", sa.String(200)),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("apply_url", sa.String(500)),
        sa.Column("apply_email", sa.String(254)),
        sa.Column("deadline", sa.Date()),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("submitted_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reviewed_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("review_note", sa.Text()),
        _now("created_at"),
        _now("updated_at"),
    )
    for col in ("kind", "status", "deadline", "submitted_by"):
        op.create_index(f"ix_job_posts_{col}", "job_posts", [col])


def downgrade() -> None:
    for t in ("job_posts", "comments", "follows", "notifications"):
        op.drop_table(t)
