from types import SimpleNamespace

import pytest

from app.services.web import probe_http_target


@pytest.mark.asyncio
async def test_probe_http_target_prefers_https_and_tracks_http_redirects() -> None:
    async def fetcher(url: str):
        if url.startswith("https://"):
            return SimpleNamespace(
                url="https://example.com",
                headers={"content-security-policy": "default-src 'self'"},
            )
        return SimpleNamespace(url="https://example.com", headers={})

    result = await probe_http_target("example.com", fetcher=fetcher)

    assert result.observation.http_reachable is True
    assert result.observation.https_reachable is True
    assert result.observation.redirect_target == "https://example.com"
    assert result.headers["content-security-policy"] == "default-src 'self'"


@pytest.mark.asyncio
async def test_probe_http_target_handles_missing_https() -> None:
    async def fetcher(url: str):
        if url.startswith("https://"):
            raise RuntimeError("handshake failed")
        return SimpleNamespace(url="http://example.com", headers={"server": "test"})

    result = await probe_http_target("example.com", fetcher=fetcher)

    assert result.observation.http_reachable is True
    assert result.observation.https_reachable is False
    assert result.observation.final_http_url == "http://example.com"
    assert result.observation.final_https_url is None
    assert result.headers == {"server": "test"}
