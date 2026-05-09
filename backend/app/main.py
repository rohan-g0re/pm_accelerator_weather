from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, exports, health, images, places, saved_locations, weather
from app.core.config import get_settings
from app.core.errors import register_error_handlers


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(weather.router)
    app.include_router(saved_locations.router)
    app.include_router(exports.router)
    app.include_router(places.router)
    app.include_router(images.router)
    app.include_router(ai.router)

    return app


app = create_app()
