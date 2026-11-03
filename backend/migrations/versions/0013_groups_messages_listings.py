"""Groups, private messages, blocks and community listings (market / media / library)

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _now(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)


def _user(name: str, *, nullable: bool = False, ondelete: str = "CASCADE") -> sa.Column:
    return sa.Column(
        name, sa.Uuid(), sa.ForeignKey("users.id", ondelete=ondelete), nullable=nullable
    )


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        _user("created_by", nullable=True, ondelete="SET NULL"),
        _now("created_at"),
    )
    op.create_index("ix_groups_slug", "groups", ["slug"], unique=True)
    op.create_table(
        "group_members",
        sa.Column(
            "group_id",
            sa.Uuid(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("is_owner", sa.Boolean(), nullable=False, server_default=sa.false()),
        _now("joined_at"),
    )
    op.create_index("ix_group_members_user_id", "group_members", ["user_id"])
    op.create_table(
        "group_posts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "group_id", sa.Uuid(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
        ),
        _user("author_id"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("removed", sa.Boolean(), nullable=False, server_default=sa.false()),
        _now("created_at"),
    )
    for col in ("group_id", "author_id", "created_at"):
        op.create_index(f"ix_group_posts_{col}", "group_posts", [col])

    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        _user("sender_id"),
        _user("recipient_id"),
        sa.Column("body", sa.Text(), nullable=False),
        _now("created_at"),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("sender_id <> recipient_id", name="ck_messages_not_self"),
    )
    for col in ("sender_id", "recipient_id", "created_at"):
        op.create_index(f"ix_messages_{col}", "messages", [col])
    op.create_table(
        "blocks",
        sa.Column(
            "blocker_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column(
            "blocked_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
        ),
        _now("created_at"),
    )

    op.create_table(
        "listings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("section", sa.String(12), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("url", sa.String(500)),
        sa.Column("contact", sa.String(200)),
        sa.Column("price", sa.String(60)),
        sa.Column("location", sa.String(120)),
        sa.Column("credit", sa.String(300)),
        sa.Column("image", sa.String(80)),
        sa.Column("status", sa.String(16), nullable=False),
        _user("submitted_by", nullable=True, ondelete="SET NULL"),
        _user("reviewed_by", nullable=True, ondelete="SET NULL"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("review_note", sa.Text()),
        _now("created_at"),
        _now("updated_at"),
    )
    for col in ("section", "category", "status", "submitted_by"):
        op.create_index(f"ix_listings_{col}", "listings", [col])


def downgrade() -> None:
    for t in ("listings", "blocks", "messages", "group_posts", "group_members", "groups"):
        op.drop_table(t)
