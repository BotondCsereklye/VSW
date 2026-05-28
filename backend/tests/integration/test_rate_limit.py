from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_scan_creation_rate_limit_returns_429(tmp_path) -> None:
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'rate-limit.db'}",
        enable_background_scans=False,
        rate_limit_max_requests=1,
        rate_limit_window_seconds=60,
    )
    app = create_app(settings=settings)

    with TestClient(app) as client:
        first = client.post("/api/v1/scans", json={"target": "example.com"})
        second = client.post("/api/v1/scans", json={"target": "example.com"})

    assert first.status_code == 202
    assert second.status_code == 429
    assert second.json()["detail"] == "Rate limit exceeded. Please try again later."
