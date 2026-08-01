import socket

import pytest

from app.services.targeting import (
    InvalidTargetError,
    TargetType,
    UnsafeTargetError,
    ensure_public_target,
    validate_target,
)


@pytest.mark.parametrize(
    ("raw_target", "expected_value", "expected_type"),
    [
        ("Example.COM", "example.com", TargetType.DOMAIN),
        ("sub.example.org", "sub.example.org", TargetType.DOMAIN),
        ("8.8.8.8", "8.8.8.8", TargetType.IP),
        ("2606:4700:4700::1111", "2606:4700:4700::1111", TargetType.IP),
    ],
)
def test_validate_target_accepts_domains_and_ips(
    raw_target: str,
    expected_value: str,
    expected_type: TargetType,
) -> None:
    normalized = validate_target(raw_target)

    assert normalized.value == expected_value
    assert normalized.target_type is expected_type


@pytest.mark.parametrize(
    "raw_target",
    [
        "",
        "   ",
        "https://example.com",
        "example .com",
        "bad_domain",
        "-prefix.example",
        "example-.org",
        "256.1.1.1",
        "localhost",
        "localhost.local",
        "127.0.0.1",
        "10.0.0.1",
        "172.16.0.1",
        "192.168.1.10",
        "169.254.169.254",
        "2001:db8::1",
    ],
)
def test_validate_target_rejects_unsupported_values(raw_target: str) -> None:
    with pytest.raises(InvalidTargetError):
        validate_target(raw_target)


def test_ensure_public_target_rejects_domains_resolving_to_private_ips(monkeypatch) -> None:
    def fake_getaddrinfo(*args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 0, "", ("10.0.0.5", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(UnsafeTargetError):
        ensure_public_target("internal.example.com")


def test_ensure_public_target_accepts_domains_resolving_to_public_ips(monkeypatch) -> None:
    def fake_getaddrinfo(*args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 0, "", ("8.8.8.8", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    ensure_public_target("dns.google")
