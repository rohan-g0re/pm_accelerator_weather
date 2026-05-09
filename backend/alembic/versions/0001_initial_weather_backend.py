"""initial weather backend tables

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weather_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_input", sa.String(length=255), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=False),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("state", sa.String(length=120), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("current_weather", sa.JSON(), nullable=False),
        sa.Column("forecast", sa.JSON(), nullable=False),
        sa.Column("date_range_weather", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("generated_image_url", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("label", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_weather_history_id", "weather_history", ["id"])
    op.create_index("ix_weather_history_location_name", "weather_history", ["location_name"])
    op.create_table(
        "saved_locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_input", sa.String(length=255), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=False),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("state", sa.String(length=120), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("tag", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_saved_locations_id", "saved_locations", ["id"])
    op.create_index("ix_saved_locations_location_name", "saved_locations", ["location_name"])
    op.create_index("ix_saved_locations_tag", "saved_locations", ["tag"])
    op.create_table(
        "nearby_places_cache",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("place_type", sa.String(length=40), nullable=False),
        sa.Column("results", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_nearby_places_cache_id", "nearby_places_cache", ["id"])
    op.create_index("ix_nearby_places_cache_latitude", "nearby_places_cache", ["latitude"])
    op.create_index("ix_nearby_places_cache_longitude", "nearby_places_cache", ["longitude"])
    op.create_index("ix_nearby_places_cache_place_type", "nearby_places_cache", ["place_type"])
    op.create_table(
        "export_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("weather_history_id", sa.Integer(), nullable=False),
        sa.Column("format", sa.String(length=12), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_export_records_id", "export_records", ["id"])
    op.create_index("ix_export_records_weather_history_id", "export_records", ["weather_history_id"])


def downgrade() -> None:
    op.drop_table("export_records")
    op.drop_table("nearby_places_cache")
    op.drop_table("saved_locations")
    op.drop_table("weather_history")
