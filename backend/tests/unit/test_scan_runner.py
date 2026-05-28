from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.scan import Scan, ScanStatus, TargetType
from app.services.ports import PortResult, PortState
from app.services.scan_runner import run_scan_for_scan_id
from app.services.tls import CertificateDetails, analyze_tls_posture
from app.services.web import HttpObservation, HttpScanResult


def build_session_factory():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_run_scan_for_scan_id_persists_findings_snapshot_and_score() -> None:
    session_factory = build_session_factory()
    with session_factory() as session:
        scan = Scan(
            target="example.com",
            normalized_target="example.com",
            target_type=TargetType.DOMAIN,
            status=ScanStatus.PENDING,
        )
        session.add(scan)
        session.commit()
        scan_id = scan.id

    def http_probe(target: str) -> HttpScanResult:
        return HttpScanResult(
            observation=HttpObservation(
                http_reachable=True,
                https_reachable=True,
                final_http_url="http://example.com",
                final_https_url="https://example.com",
                redirect_target="https://example.com",
            ),
            headers={"x-frame-options": "DENY"},
        )

    def tls_probe(target: str):
        return analyze_tls_posture(
            https_reachable=True,
            certificate=CertificateDetails(
                issuer="Example CA",
                not_after=datetime.now(UTC) + timedelta(days=30),
            ),
            supported_versions=["TLSv1.2", "TLSv1.3"],
        )

    async def port_probe(target: str):
        return [
            PortResult(port=80, state=PortState.OPEN),
            PortResult(port=443, state=PortState.OPEN),
            PortResult(port=5432, state=PortState.CLOSED),
        ]

    run_scan_for_scan_id(
        session_factory=session_factory,
        scan_id=scan_id,
        http_probe=http_probe,
        tls_probe=tls_probe,
        port_probe=port_probe,
    )

    with session_factory() as session:
        saved_scan = session.get(Scan, scan_id)
        assert saved_scan is not None
        assert saved_scan.status is ScanStatus.COMPLETED
        assert saved_scan.score == 68
        assert saved_scan.summary is not None
        assert len(saved_scan.findings) == 5
        assert saved_scan.snapshot is not None
        assert saved_scan.snapshot.tls_analysis["issuer"] == "Example CA"


def test_run_scan_for_scan_id_marks_failed_scans() -> None:
    session_factory = build_session_factory()
    with session_factory() as session:
        scan = Scan(
            target="example.com",
            normalized_target="example.com",
            target_type=TargetType.DOMAIN,
            status=ScanStatus.PENDING,
        )
        session.add(scan)
        session.commit()
        scan_id = scan.id

    def http_probe(target: str) -> HttpScanResult:
        raise RuntimeError("network unavailable")

    run_scan_for_scan_id(session_factory=session_factory, scan_id=scan_id, http_probe=http_probe)

    with session_factory() as session:
        saved_scan = session.get(Scan, scan_id)
        assert saved_scan is not None
        assert saved_scan.status is ScanStatus.FAILED
        assert saved_scan.error_message == "network unavailable"
