"""Market products: numeric price, currency, stock, WhatsApp, extra images

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("listings", sa.Column("images", sa.JSON()))
    op.add_column("listings", sa.Column("price_amount", sa.Numeric(12, 2)))
    op.add_column("listings", sa.Column("currency", sa.String(3)))
    op.add_column("listings", sa.Column("stock", sa.Integer()))
    op.add_column("listings", sa.Column("whatsapp", sa.String(20)))
    op.create_index("ix_listings_price_amount", "listings", ["price_amount"])


def downgrade() -> None:
    op.drop_index("ix_listings_price_amount", "listings")
    for col in ("whatsapp", "stock", "currency", "price_amount", "images"):
        op.drop_column("listings", col)
