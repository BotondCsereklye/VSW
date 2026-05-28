from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.base import Base
from app.main import create_app


@pytest.fixture
def settings(tmp_path: pytest.TempPathFactory) -> Settings:
    database_path = tmp_path / "vsw-test.db"
    return Settings(
        database_url=f"sqlite:///{database_path}",
        enable_background_scans=False,
        rate_limit_max_requests=50,
        rate_limit_window_seconds=60,
    )


@pytest.fixture
def app(settings: Settings):
    application = create_app(settings=settings)
    Base.metadata.create_all(bind=application.state.engine)
    try:
        yield application
    finally:
        Base.metadata.drop_all(bind=application.state.engine)


@pytest.fixture
def client(app) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session(app) -> Iterator[Session]:
    session = app.state.session_factory()
    try:
        yield session
    finally:
        session.close()
