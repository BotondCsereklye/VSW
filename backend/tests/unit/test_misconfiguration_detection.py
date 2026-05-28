from datetime import UTC, datetime, timedelta

from app.services.headers import HeaderAnalysis, HeaderCheck, RequiredHeader
from app.services.misconfigurations import FindingSeverity, detect_misconfigurations
from app.services.ports import PortResult, PortState
from app.services.tls import TlsAnalysis
from app.services.web import HttpObservation


def test_detect_misconfigurations_flags_missing_https_and_open_database_ports() -> None:
    findings = detect_misconfigurations(
        http_observation=HttpObservation(
            http_reachable=True,
            https_reachable=False,
            final_http_url="http://example.com",
            final_https_url=None,
            redirect_target="http://example.com/login",
        ),
        header_analysis=HeaderAnalysis(checks=[], missing_headers=[], all_present=True),
        tls_analysis=TlsAnalysis(
            https_reachable=False,
            certificate_valid=False,
            certificate_expired=False,
            issuer=None,
            expires_at=None,
            supported_versions=[],
        ),
        port_results=[
            PortResult(port=80, state=PortState.OPEN),
            PortResult(port=5432, state=PortState.OPEN),
            PortResult(port=6379, state=PortState.CLOSED),
        ],
    )

    titles = {finding.title for finding in findings}
    severities = {finding.title: finding.severity for finding in findings}

    assert "HTTPS is not reachable" in titles
    assert "Database port 5432 is exposed" in titles
    assert "HTTP redirects remain insecure" in titles
    assert severities["HTTPS is not reachable"] is FindingSeverity.HIGH
    assert severities["Database port 5432 is exposed"] is FindingSeverity.HIGH
    assert severities["HTTP redirects remain insecure"] is FindingSeverity.MEDIUM


def test_detect_misconfigurations_flags_expired_certificates_and_missing_headers() -> None:
    findings = detect_misconfigurations(
        http_observation=HttpObservation(
            http_reachable=True,
            https_reachable=True,
            final_http_url="http://example.com",
            final_https_url="https://example.com",
            redirect_target="https://example.com",
        ),
        header_analysis=HeaderAnalysis(
            checks=[
                HeaderCheck(
                    name=RequiredHeader.CONTENT_SECURITY_POLICY,
                    present=False,
                    value=None,
                ),
                HeaderCheck(
                    name=RequiredHeader.X_FRAME_OPTIONS,
                    present=False,
                    value=None,
                ),
            ],
            missing_headers=[
                RequiredHeader.CONTENT_SECURITY_POLICY,
                RequiredHeader.X_FRAME_OPTIONS,
            ],
            all_present=False,
        ),
        tls_analysis=TlsAnalysis(
            https_reachable=True,
            certificate_valid=False,
            certificate_expired=True,
            issuer="Legacy CA",
            expires_at=datetime.now(UTC) - timedelta(days=1),
            supported_versions=["TLSv1.2"],
        ),
        port_results=[],
    )

    titles = {finding.title for finding in findings}
    severities = {finding.title: finding.severity for finding in findings}

    assert "TLS certificate is expired" in titles
    assert "Missing header: content-security-policy" in titles
    assert "Missing header: x-frame-options" in titles
    assert severities["TLS certificate is expired"] is FindingSeverity.HIGH
    assert severities["Missing header: content-security-policy"] is FindingSeverity.MEDIUM
    assert severities["Missing header: x-frame-options"] is FindingSeverity.LOW
