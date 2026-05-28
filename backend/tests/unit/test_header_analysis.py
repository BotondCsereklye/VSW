from app.services.headers import RequiredHeader, analyze_security_headers


def test_analyze_security_headers_marks_complete_header_sets() -> None:
    analysis = analyze_security_headers(
        {
            "strict-transport-security": "max-age=31536000; includeSubDomains",
            "content-security-policy": "default-src 'self'",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy": "geolocation=()",
        }
    )

    assert analysis.all_present is True
    assert analysis.missing_headers == []
    assert len(analysis.checks) == 6


def test_analyze_security_headers_tracks_missing_headers_case_insensitively() -> None:
    analysis = analyze_security_headers(
        {
            "Content-Security-Policy": "default-src 'self'",
            "X-Frame-Options": "SAMEORIGIN",
        }
    )

    assert analysis.all_present is False
    assert analysis.missing_headers == [
        RequiredHeader.STRICT_TRANSPORT_SECURITY,
        RequiredHeader.X_CONTENT_TYPE_OPTIONS,
        RequiredHeader.REFERRER_POLICY,
        RequiredHeader.PERMISSIONS_POLICY,
    ]

    present_headers = {check.name: check for check in analysis.checks if check.present}
    assert present_headers[RequiredHeader.CONTENT_SECURITY_POLICY].value == "default-src 'self'"
    assert present_headers[RequiredHeader.X_FRAME_OPTIONS].value == "SAMEORIGIN"
