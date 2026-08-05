from collections.abc import Generator

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session


def get_db_session(request: Request) -> Generator[Session, None, None]:
    session_factory = request.app.state.session_factory
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def require_api_key(request: Request) -> None:
    settings = request.app.state.settings
    expected_api_key = settings.api_key
    if not expected_api_key:
        return

    supplied_api_key = request.headers.get(settings.api_key_header_name)
    if supplied_api_key != expected_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
