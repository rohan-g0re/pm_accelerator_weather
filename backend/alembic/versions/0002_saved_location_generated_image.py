"""add generated image to saved locations

Revision ID: 0002_saved_loc_gen_img
Revises: 0001_initial
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

# Keep <= 32 chars: alembic_version.version_num defaults to VARCHAR(32).
revision = "0002_saved_loc_gen_img"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("saved_locations", sa.Column("generated_image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("saved_locations", "generated_image_url")
