import pytest

from app.services.targeting import InvalidTargetError, TargetType, validate_target


@pytest.mark.parametrize(
    ("raw_target", "expected_value", "expected_type"),
    [
        ("Example.COM", "example.com", TargetType.DOMAIN),
        ("sub.example.org", "sub.example.org", TargetType.DOMAIN),
        ("192.168.1.10", "192.168.1.10", TargetType.IP),
        ("2001:db8::1", "2001:db8::1", TargetType.IP),
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
    ],
)
def test_validate_target_rejects_unsupported_values(raw_target: str) -> None:
    with pytest.raises(InvalidTargetError):
        validate_target(raw_target)
