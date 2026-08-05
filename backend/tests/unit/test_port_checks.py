import pytest

from app.services.ports import (
    SAFE_PORTS,
    PortState,
    probe_port,
    probe_standard_ports,
)


@pytest.mark.asyncio
async def test_probe_port_marks_open_connections() -> None:
    async def connector(host: str, port: int, timeout_seconds: float) -> None:
        assert host == "example.com"
        assert port == 443
        assert timeout_seconds == 0.8

    result = await probe_port("example.com", 443, timeout_seconds=0.8, connector=connector)

    assert result.port == 443
    assert result.state is PortState.OPEN


@pytest.mark.asyncio
async def test_probe_port_marks_closed_connections() -> None:
    async def connector(host: str, port: int, timeout_seconds: float) -> None:
        raise ConnectionRefusedError

    result = await probe_port("example.com", 22, connector=connector)

    assert result.state is PortState.CLOSED


@pytest.mark.asyncio
async def test_probe_port_marks_timeouts() -> None:
    async def connector(host: str, port: int, timeout_seconds: float) -> None:
        raise TimeoutError

    result = await probe_port("example.com", 8080, connector=connector)

    assert result.state is PortState.TIMEOUT


@pytest.mark.asyncio
async def test_probe_standard_ports_uses_safe_default_port_list() -> None:
    calls: list[int] = []

    async def connector(host: str, port: int, timeout_seconds: float) -> None:
        calls.append(port)

    results = await probe_standard_ports("example.com", connector=connector)

    assert [result.port for result in results] == SAFE_PORTS
    assert calls == SAFE_PORTS


@pytest.mark.asyncio
async def test_default_connector_uses_validated_ip_address(monkeypatch) -> None:
    calls: list[tuple[str, int]] = []

    class FakeWriter:
        def close(self) -> None:
            return None

        async def wait_closed(self) -> None:
            return None

    async def fake_open_connection(host: str, port: int):
        calls.append((host, port))
        return object(), FakeWriter()

    def fake_getaddrinfo(*args, **kwargs):
        return [(0, 0, 0, "", ("8.8.8.8", 0))]

    monkeypatch.setattr("socket.getaddrinfo", fake_getaddrinfo)
    monkeypatch.setattr("asyncio.open_connection", fake_open_connection)

    result = await probe_port("dns.google", 443)

    assert result.state is PortState.OPEN
    assert calls == [("8.8.8.8", 443)]
