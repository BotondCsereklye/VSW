from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.models.scan import Scan, ScanStatus, TargetType


def test_scan_creation_rate_limit_returns_429(tmp_path) -> None:
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'rate-limit.db'}",
        enable_background_scans=False,
        rate_limit_max_requests=1,
        rate_limit_window_seconds=60,
        api_key="test-api-key",
    )
    app = create_app(settings=settings)

    with TestClient(app) as client:
        client.headers.update({"X-VSW-API-Key": "test-api-key"})
        first = client.post("/api/v1/scans", json={"target": "example.com"})
        second = client.post("/api/v1/scans", json={"target": "example.com"})

    assert first.status_code == 202
    assert second.status_code == 429
    assert second.json()["detail"] == "Rate limit exceeded. Please try again later."


def test_link_discovery_rate_limit_returns_429(tmp_path) -> None:
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'rate-limit-links.db'}",
        enable_background_scans=False,
        rate_limit_max_requests=1,
        rate_limit_window_seconds=60,
        api_key="test-api-key",
    )
    app = create_app(settings=settings)
    app.state.link_discovery = lambda target, *, limit=12: []

    with TestClient(app) as client:
        session = app.state.session_factory()
        try:
            scan = Scan(
                target="example.com",
                normalized_target="example.com",
                target_type=TargetType.DOMAIN,
                status=ScanStatus.COMPLETED,
                score=82,
            )
            session.add(scan)
            session.commit()
            scan_id = scan.id
        finally:
            session.close()

        client.headers.update({"X-VSW-API-Key": "test-api-key"})
        first = client.get(f"/api/v1/scans/{scan_id}/links")
        second = client.get(f"/api/v1/scans/{scan_id}/links")

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"] == "Rate limit exceeded. Please try again later."
