from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from app.services.headers import HeaderAnalysis, RequiredHeader
from app.services.ports import PortResult, PortState
from app.services.tls import TlsAnalysis
from app.services.web import HttpObservation

DATABASE_PORTS = {
    3306: "MySQL",
    5432: "PostgreSQL",
    6379: "Redis",
}


class FindingSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class FindingCategory(StrEnum):
    TRANSPORT = "transport"
    HEADERS = "headers"
    NETWORK = "network"
    MISCONFIGURATION = "misconfiguration"


@dataclass(frozen=True, slots=True)
class FindingDraft:
    category: FindingCategory
    severity: FindingSeverity
    title: str
    description: str
    recommendation: str
    evidence: dict[str, object] = field(default_factory=dict)


def detect_misconfigurations(
    *,
    http_observation: HttpObservation,
    header_analysis: HeaderAnalysis,
    tls_analysis: TlsAnalysis,
    port_results: list[PortResult],
) -> list[FindingDraft]:
    findings: list[FindingDraft] = []

    if not http_observation.https_reachable:
        findings.append(
            FindingDraft(
                category=FindingCategory.TRANSPORT,
                severity=FindingSeverity.HIGH,
                title="HTTPS is not reachable",
                description=(
                    "The target does not expose a reachable HTTPS endpoint "
                    "for secure transport."
                ),
                recommendation=(
                    "Enable HTTPS on port 443 and redirect HTTP traffic to "
                    "the HTTPS endpoint."
                ),
                evidence={"final_http_url": http_observation.final_http_url},
            )
        )

    if http_observation.redirect_target and http_observation.redirect_target.startswith("http://"):
        findings.append(
            FindingDraft(
                category=FindingCategory.MISCONFIGURATION,
                severity=FindingSeverity.MEDIUM,
                title="HTTP redirects remain insecure",
                description=(
                    "The observed redirect target continues to use HTTP "
                    "instead of upgrading traffic to HTTPS."
                ),
                recommendation=(
                    "Update redirect rules so all user traffic is upgraded "
                    "to HTTPS immediately."
                ),
                evidence={"redirect_target": http_observation.redirect_target},
            )
        )

    if tls_analysis.certificate_expired:
        findings.append(
            FindingDraft(
                category=FindingCategory.TRANSPORT,
                severity=FindingSeverity.HIGH,
                title="TLS certificate is expired",
                description=(
                    "The TLS certificate is past its validity period and can "
                    "no longer be trusted by clients."
                ),
                recommendation=(
                    "Replace or renew the certificate and automate renewal "
                    "before expiration."
                ),
                evidence={
                    "expires_at": tls_analysis.expires_at.isoformat()
                    if tls_analysis.expires_at
                    else None
                },
            )
        )

    for check in header_analysis.checks:
        if check.present:
            continue

        severity = _severity_for_missing_header(check.name)
        findings.append(
            FindingDraft(
                category=FindingCategory.HEADERS,
                severity=severity,
                title=f"Missing header: {check.name.value}",
                description=(
                    f"The response does not contain the `{check.name.value}` "
                    "security header."
                ),
                recommendation=_recommendation_for_header(check.name),
                evidence={"header": check.name.value},
            )
        )

    for port_result in port_results:
        if port_result.state is PortState.OPEN and port_result.port in DATABASE_PORTS:
            findings.append(
                FindingDraft(
                    category=FindingCategory.NETWORK,
                    severity=FindingSeverity.HIGH,
                    title=f"Database port {port_result.port} is exposed",
                    description=(
                        f"The standard {DATABASE_PORTS[port_result.port]} port "
                        "is reachable from the scan origin."
                    ),
                    recommendation=(
                        "Restrict database exposure to trusted networks and "
                        "enforce network-level access controls."
                    ),
                    evidence={"port": port_result.port},
                )
            )

    return findings


def _severity_for_missing_header(header: RequiredHeader) -> FindingSeverity:
    if header is RequiredHeader.CONTENT_SECURITY_POLICY:
        return FindingSeverity.MEDIUM
    return FindingSeverity.LOW


def _recommendation_for_header(header: RequiredHeader) -> str:
    recommendations = {
        RequiredHeader.STRICT_TRANSPORT_SECURITY: (
            "Set a Strict-Transport-Security policy after HTTPS is fully enabled."
        ),
        RequiredHeader.CONTENT_SECURITY_POLICY: (
            "Define a restrictive Content-Security-Policy and tune it per "
            "application assets."
        ),
        RequiredHeader.X_FRAME_OPTIONS: (
            "Set X-Frame-Options to DENY or SAMEORIGIN unless framing is required."
        ),
        RequiredHeader.X_CONTENT_TYPE_OPTIONS: (
            "Set X-Content-Type-Options to nosniff to reduce MIME confusion risks."
        ),
        RequiredHeader.REFERRER_POLICY: (
            "Define a Referrer-Policy that limits unnecessary referrer leakage."
        ),
        RequiredHeader.PERMISSIONS_POLICY: (
            "Restrict browser feature access with a Permissions-Policy header."
        ),
    }
    return recommendations[header]
