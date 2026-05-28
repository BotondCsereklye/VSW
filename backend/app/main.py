from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.scans import router as scans_router
from app.core.config import Settings, get_settings
from app.db.base import Base
from app.db.session import create_engine_from_settings, create_session_factory
from app.services.ports import probe_standard_ports
from app.services.scan_runner import run_scan_for_scan_id
from app.services.tls import probe_tls_target
from app.services.web import probe_http_target


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version)

    engine = create_engine_from_settings(settings)
    session_factory = create_session_factory(engine)
    Base.metadata.create_all(bind=engine)

    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.scan_runner = (
        _build_scan_runner(session_factory) if settings.enable_background_scans else None
    )

    app.include_router(health_router, prefix=settings.api_prefix)
    app.include_router(scans_router, prefix=settings.api_prefix)

    return app


def _build_scan_runner(session_factory):
    def runner(scan_id: str) -> None:
        run_scan_for_scan_id(
            session_factory=session_factory,
            scan_id=scan_id,
            http_probe=probe_http_target,
            tls_probe=probe_tls_target,
            port_probe=probe_standard_ports,
        )

    return runner


app = create_app()
