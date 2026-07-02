from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from math import ceil

from app.services.headers import HeaderAnalysis, RequiredHeader
from app.services.ports import PortResult, PortState
from app.services.tls import TlsAnalysis
from app.services.web import HttpObservation

CERTIFICATE_EXPIRY_WARNING_DAYS = 30
MIN_HSTS_MAX_AGE_SECONDS = 15552000

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
    response_headers: dict[str, str],
    tls_analysis: TlsAnalysis,
    port_results: list[PortResult],
) -> list[FindingDraft]:
    findings: list[FindingDraft] = []
    normalized_headers = {name.lower(): value for name, value in response_headers.items()}
    certificate_expiry_threshold = datetime.now(UTC) + timedelta(
        days=CERTIFICATE_EXPIRY_WARNING_DAYS
    )

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
    elif (
        tls_analysis.certificate_valid
        and tls_analysis.expires_at is not None
        and tls_analysis.expires_at <= certificate_expiry_threshold
    ):
        findings.append(
            FindingDraft(
                category=FindingCategory.TRANSPORT,
                severity=FindingSeverity.LOW,
                title="TLS certificate expires soon",
                description=(
                    "The TLS certificate is valid now, but it is close to expiration and "
                    "could cause client trust failures if renewal is missed."
                ),
                recommendation=(
                    "Renew the certificate before expiration and verify automated renewal "
                    "monitoring."
                ),
                evidence={
                    "expires_at": tls_analysis.expires_at.isoformat(),
                    "days_remaining": _days_until(tls_analysis.expires_at),
                },
            )
        )

    if tls_analysis.https_reachable and "TLSv1.3" not in tls_analysis.supported_versions:
        findings.append(
            FindingDraft(
                category=FindingCategory.TRANSPORT,
                severity=FindingSeverity.LOW,
                title="TLS 1.3 support was not confirmed",
                description=(
                    "The HTTPS endpoint is reachable, but the safe version probe only "
                    "confirmed older TLS versions."
                ),
                recommendation=(
                    "Enable TLS 1.3 where supported by the platform, while keeping compatible "
                    "fallback settings for currently supported clients."
                ),
                evidence={"supported_versions": tls_analysis.supported_versions},
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

    content_security_policy = normalized_headers.get(
        RequiredHeader.CONTENT_SECURITY_POLICY.value, ""
    )
    if "unsafe-inline" in content_security_policy.lower():
        findings.append(
            FindingDraft(
                category=FindingCategory.HEADERS,
                severity=FindingSeverity.MEDIUM,
                title="Content-Security-Policy allows unsafe inline code",
                description=(
                    "The configured Content-Security-Policy still permits inline code execution, "
                    "which weakens XSS protection."
                ),
                recommendation=(
                    "Remove `unsafe-inline` from the policy and move scripts or styles to safer, "
                    "explicitly allowed sources."
                ),
                evidence={
                    "header": RequiredHeader.CONTENT_SECURITY_POLICY.value,
                    "value": content_security_policy,
                },
            )
        )

    strict_transport_security = normalized_headers.get(
        RequiredHeader.STRICT_TRANSPORT_SECURITY.value, ""
    )
    hsts_max_age = _parse_hsts_max_age(strict_transport_security)
    if tls_analysis.https_reachable and strict_transport_security and (
        hsts_max_age is None or hsts_max_age < MIN_HSTS_MAX_AGE_SECONDS
    ):
        findings.append(
            FindingDraft(
                category=FindingCategory.HEADERS,
                severity=FindingSeverity.LOW,
                title="Strict-Transport-Security max-age is weak",
                description=(
                    "The Strict-Transport-Security header is present, but its max-age is "
                    "missing, invalid, or too short for durable HTTPS enforcement."
                ),
                recommendation=(
                    "Set a valid Strict-Transport-Security max-age of at least 15552000 "
                    "seconds after HTTPS is fully enabled."
                ),
                evidence={
                    "header": RequiredHeader.STRICT_TRANSPORT_SECURITY.value,
                    "value": strict_transport_security,
                    "minimum_max_age_seconds": MIN_HSTS_MAX_AGE_SECONDS,
                },
            )
        )

    x_content_type_options = normalized_headers.get(
        RequiredHeader.X_CONTENT_TYPE_OPTIONS.value, ""
    )
    if x_content_type_options and x_content_type_options.lower().strip() != "nosniff":
        findings.append(
            FindingDraft(
                category=FindingCategory.HEADERS,
                severity=FindingSeverity.LOW,
                title="X-Content-Type-Options value is ineffective",
                description=(
                    "The X-Content-Type-Options header is present, but the observed value "
                    "does not enable MIME sniffing protection."
                ),
                recommendation="Set X-Content-Type-Options exactly to `nosniff`.",
                evidence={
                    "header": RequiredHeader.X_CONTENT_TYPE_OPTIONS.value,
                    "value": x_content_type_options,
                },
            )
        )

    referrer_policy = normalized_headers.get(RequiredHeader.REFERRER_POLICY.value, "")
    if referrer_policy.lower().strip() == "unsafe-url":
        findings.append(
            FindingDraft(
                category=FindingCategory.HEADERS,
                severity=FindingSeverity.LOW,
                title="Referrer-Policy leaks full source URLs",
                description=(
                    "The configured Referrer-Policy sends complete source URLs to "
                    "destination sites, "
                    "which may expose unnecessary path information."
                ),
                recommendation=(
                    "Prefer a stricter policy such as `strict-origin-when-cross-origin` or "
                    "`same-origin`."
                ),
                evidence={"header": RequiredHeader.REFERRER_POLICY.value, "value": referrer_policy},
            )
        )

    permissions_policy = normalized_headers.get(RequiredHeader.PERMISSIONS_POLICY.value, "")
    if _permissions_policy_allows_wildcard(permissions_policy):
        findings.append(
            FindingDraft(
                category=FindingCategory.HEADERS,
                severity=FindingSeverity.LOW,
                title="Permissions-Policy allows broad feature access",
                description=(
                    "The Permissions-Policy header allows at least one browser feature for "
                    "all origins, reducing the value of feature restrictions."
                ),
                recommendation=(
                    "Restrict sensitive browser features to `()` or a small set of trusted "
                    "origins."
                ),
                evidence={
                    "header": RequiredHeader.PERMISSIONS_POLICY.value,
                    "value": permissions_policy,
                },
            )
        )

    set_cookie = normalized_headers.get("set-cookie", "")
    missing_cookie_flags: list[str] = []
    if set_cookie:
        lowered_cookie = set_cookie.lower()
        if "secure" not in lowered_cookie:
            missing_cookie_flags.append("Secure")
        if "httponly" not in lowered_cookie:
            missing_cookie_flags.append("HttpOnly")
        if missing_cookie_flags:
            findings.append(
                FindingDraft(
                    category=FindingCategory.MISCONFIGURATION,
                    severity=FindingSeverity.MEDIUM,
                    title="Cookie flags are incomplete",
                    description=(
                        "Observed cookies are missing standard transport or script "
                        "access protections."
                    ),
                    recommendation=(
                        "Set at least the `Secure` and `HttpOnly` flags for "
                        "session-bearing cookies."
                    ),
                    evidence={"header": "set-cookie", "missing_flags": missing_cookie_flags},
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


def _days_until(expires_at: datetime) -> int:
    seconds_remaining = (expires_at - datetime.now(UTC)).total_seconds()
    return max(0, ceil(seconds_remaining / 86400))


def _parse_hsts_max_age(header_value: str) -> int | None:
    for directive in header_value.split(";"):
        name, separator, value = directive.strip().partition("=")
        if separator and name.lower() == "max-age":
            try:
                return int(value.strip())
            except ValueError:
                return None
    return None


def _permissions_policy_allows_wildcard(header_value: str) -> bool:
    normalized = header_value.replace(" ", "")
    return "=*" in normalized or "(*)" in normalized
