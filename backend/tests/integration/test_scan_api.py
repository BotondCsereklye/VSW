from app.models.finding import Finding
from app.models.report_snapshot import ReportSnapshot
from app.models.scan import Scan, ScanStatus, TargetType


def test_create_scan_persists_pending_scan(client) -> None:
    response = client.post("/api/v1/scans", json={"target": "Example.com"})

    assert response.status_code == 202
    body = response.json()
    assert body["target"] == "example.com"
    assert body["target_type"] == "domain"
    assert body["status"] == "pending"
    assert body["score"] is None


def test_create_scan_rejects_invalid_targets(client) -> None:
    response = client.post("/api/v1/scans", json={"target": "https://example.com"})

    assert response.status_code == 422
    assert response.json()["detail"] == "Target must be a domain or IP address."


def test_create_scan_dispatches_background_runner(client, app) -> None:
    calls: list[str] = []
    app.state.scan_runner = calls.append

    response = client.post("/api/v1/scans", json={"target": "example.com"})

    assert response.status_code == 202
    assert calls == [response.json()["id"]]


def test_list_scans_returns_saved_scans(client, db_session) -> None:
    db_session.add(
        Scan(
            target="example.com",
            normalized_target="example.com",
            target_type=TargetType.DOMAIN,
            status=ScanStatus.COMPLETED,
            score=82,
            summary="Mostly secure",
        )
    )
    db_session.commit()

    response = client.get("/api/v1/scans")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "completed"
    assert body[0]["score"] == 82


def test_get_scan_details_returns_findings_and_snapshot(client, db_session) -> None:
    scan = Scan(
        target="example.com",
        normalized_target="example.com",
        target_type=TargetType.DOMAIN,
        status=ScanStatus.COMPLETED,
        score=63,
        summary="Needs transport hardening",
    )
    db_session.add(scan)
    db_session.flush()
    db_session.add(
        Finding(
            scan_id=scan.id,
            category="transport",
            severity="high",
            title="HTTPS is not reachable",
            description="desc",
            recommendation="fix",
            evidence={"port": 443},
        )
    )
    db_session.add(
        ReportSnapshot(
            scan_id=scan.id,
            http_headers={"content-security-policy": None},
            tls_analysis={"https_reachable": False},
            port_results=[{"port": 443, "state": "closed"}],
            misconfigurations=[{"title": "HTTPS is not reachable"}],
            report_metadata={"target": "example.com"},
        )
    )
    db_session.commit()

    response = client.get(f"/api/v1/scans/{scan.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == scan.id
    assert body["findings"][0]["severity"] == "high"
    assert body["snapshot"]["tls_analysis"]["https_reachable"] is False


def test_get_scan_history_returns_recent_scans_for_same_target(client, db_session) -> None:
    first = Scan(
        target="example.com",
        normalized_target="example.com",
        target_type=TargetType.DOMAIN,
        status=ScanStatus.COMPLETED,
        score=91,
        summary="Healthy baseline",
    )
    second = Scan(
        target="example.com",
        normalized_target="example.com",
        target_type=TargetType.DOMAIN,
        status=ScanStatus.COMPLETED,
        score=73,
        summary="Headers missing",
    )
    third = Scan(
        target="api.example.com",
        normalized_target="api.example.com",
        target_type=TargetType.DOMAIN,
        status=ScanStatus.COMPLETED,
        score=67,
        summary="Different target",
    )
    db_session.add_all([first, second, third])
    db_session.commit()

    response = client.get(f"/api/v1/scans/{second.id}/history")

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body] == [second.id, first.id]
    assert all(item["target"] == "example.com" for item in body)


def test_export_scan_as_json_returns_attachment(client, db_session) -> None:
    scan = Scan(
        target="example.com",
        normalized_target="example.com",
        target_type=TargetType.DOMAIN,
        status=ScanStatus.COMPLETED,
        score=88,
        summary="Exportable report",
    )
    db_session.add(scan)
    db_session.flush()
    db_session.add(
        Finding(
            scan_id=scan.id,
            category="headers",
            severity="medium",
            title="Missing header: Content-Security-Policy",
            description="desc",
            recommendation="fix",
            evidence={"header": "content-security-policy"},
        )
    )
    db_session.commit()

    response = client.get(f"/api/v1/scans/{scan.id}/export?format=json")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert "attachment;" in response.headers["content-disposition"]
    body = response.json()
    assert body["id"] == scan.id
    assert body["findings"][0]["category"] == "headers"


def test_export_scan_as_csv_returns_rows(client, db_session) -> None:
    scan = Scan(
        target="example.com",
        normalized_target="example.com",
        target_type=TargetType.DOMAIN,
        status=ScanStatus.COMPLETED,
        score=58,
        summary="CSV export report",
    )
    db_session.add(scan)
    db_session.flush()
    db_session.add(
        Finding(
            scan_id=scan.id,
            category="network",
            severity="high",
            title="Database port 5432 is exposed",
            description="desc",
            recommendation="fix",
            evidence={"port": 5432},
        )
    )
    db_session.commit()

    response = client.get(f"/api/v1/scans/{scan.id}/export?format=csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "Database port 5432 is exposed" in response.text
    assert "scan_id,target,status,score" in response.text
