from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.scans import router as scans_router
from app.core.config import Settings, get_settings
from app.db.base import Base
from app.db.session import create_engine_from_settings, create_session_factory


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version)

    engine = create_engine_from_settings(settings)
    session_factory = create_session_factory(engine)
    Base.metadata.create_all(bind=engine)

    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.scan_runner = None

    app.include_router(health_router, prefix=settings.api_prefix)
    app.include_router(scans_router, prefix=settings.api_prefix)

    return app


app = create_app()
