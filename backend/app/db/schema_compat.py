from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_saved_locations_schema(engine: Engine) -> None:
    """Keep existing local SQLite databases compatible with additive fields."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if not inspector.has_table("saved_locations"):
        return

    columns = {column["name"] for column in inspector.get_columns("saved_locations")}
    if "generated_image_url" in columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE saved_locations ADD COLUMN generated_image_url TEXT"))
