from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import asdict, is_dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session, sessionmaker

from app.models.finding import Finding
from app.models.report_snapshot import ReportSnapshot
from app.models.scan import Scan, ScanStatus
from app.services.headers import analyze_security_headers
from app.services.misconfigurations import FindingDraft, detect_misconfigurations
from app.services.ports import PortResult, probe_standard_ports
from app.services.scoring import calculate_score
from app.services.tls import TlsAnalysis
from app.services.web import HttpScanResult


HttpProbe = Callable[[str], HttpScanResult | Awaitable[HttpScanResult]]
TlsProbe = Callable[[str], TlsAnalysis | Awaitable[TlsAnalysis]]
PortProbe = Callable[[str], list[PortResult] | Awaitable[list[PortResult]]]


def run_scan_for_scan_id(
    *,
    session_factory: sessionmaker,
    scan_id: str,
    http_probe: HttpProbe,
    tls_probe: TlsProbe | None = None,
    port_probe: PortProbe | None = None,
) -> None:
    tls_probe = tls_probe or _default_tls_probe
    port_probe = port_probe or probe_standard_ports

    with session_factory() as session:
        scan = session.get(Scan, scan_id)
        if scan is None:
            return

        scan.status = ScanStatus.RUNNING
        scan.started_at = datetime.now(UTC)
        scan.error_message = None
        session.commit()

        try:
            http_result = _resolve_probe(http_probe(scan.normalized_target))
            tls_analysis = _resolve_probe(tls_probe(scan.normalized_target))
            port_results = _resolve_probe(port_probe(scan.normalized_target))

            header_analysis = analyze_security_headers(http_result.headers)
            findings = detect_misconfigurations(
                http_observation=http_result.observation,
                header_analysis=header_analysis,
                tls_analysis=tls_analysis,
                port_results=port_results,
            )
            score = calculate_score(findings)

            _replace_findings(scan, findings)
            scan.snapshot = ReportSnapshot(
                scan_id=scan.id,
                http_headers=http_result.headers,
                tls_analysis=_serialize_tls_analysis(tls_analysis),
                port_results=[{"port": result.port, "state": result.state.value} for result in port_results],
                misconfigurations=[_serialize_finding(finding) for finding in findings],
                report_metadata={"target": scan.normalized_target},
            )
            scan.score = score
            scan.summary = _build_summary(findings)
            scan.status = ScanStatus.COMPLETED
            scan.completed_at = datetime.now(UTC)
            session.commit()
        except Exception as exc:
            session.rollback()
            scan = session.get(Scan, scan_id)
            if scan is None:
                return
            scan.status = ScanStatus.FAILED
            scan.error_message = str(exc)
            scan.completed_at = datetime.now(UTC)
            session.commit()


def _resolve_probe(result: Any) -> Any:
    if asyncio.iscoroutine(result):
        return asyncio.run(result)
    return result


def _replace_findings(scan: Scan, findings: list[FindingDraft]) -> None:
    scan.findings.clear()
    for finding in findings:
        scan.findings.append(
            Finding(
                category=finding.category.value,
                severity=finding.severity.value,
                title=finding.title,
                description=finding.description,
                recommendation=finding.recommendation,
                evidence=finding.evidence,
            )
        )


def _serialize_tls_analysis(tls_analysis: TlsAnalysis) -> dict[str, object]:
    return {
        "https_reachable": tls_analysis.https_reachable,
        "certificate_valid": tls_analysis.certificate_valid,
        "certificate_expired": tls_analysis.certificate_expired,
        "issuer": tls_analysis.issuer,
        "expires_at": tls_analysis.expires_at.isoformat() if tls_analysis.expires_at else None,
        "supported_versions": tls_analysis.supported_versions,
    }


def _serialize_finding(finding: FindingDraft) -> dict[str, object]:
    return {
        "category": finding.category.value,
        "severity": finding.severity.value,
        "title": finding.title,
        "description": finding.description,
        "recommendation": finding.recommendation,
        "evidence": finding.evidence,
    }


def _build_summary(findings: list[FindingDraft]) -> str:
    if not findings:
        return "No critical findings detected across the configured defensive checks."

    severity_counts = {
        "high": sum(1 for finding in findings if finding.severity.value == "high"),
        "medium": sum(1 for finding in findings if finding.severity.value == "medium"),
        "low": sum(1 for finding in findings if finding.severity.value == "low"),
    }
    return (
        f"{len(findings)} findings detected: "
        f"{severity_counts['high']} high, "
        f"{severity_counts['medium']} medium, "
        f"{severity_counts['low']} low."
    )


def _default_tls_probe(target: str) -> TlsAnalysis:
    raise NotImplementedError("A TLS probe implementation must be supplied.")
