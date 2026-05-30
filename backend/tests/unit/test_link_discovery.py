from app.services.link_discovery import discover_links_for_target


def test_discover_links_keeps_same_origin_and_filters_external_links() -> None:
    html = """
    <html>
      <body>
        <a href="/about">About</a>
        <a href="https://example.com/docs">Docs</a>
        <a href="http://example.com/help#section">Help</a>
        <a href="https://external.test/phishing">External</a>
        <a href="mailto:sec@example.com">Mail</a>
      </body>
    </html>
    """

    def fake_fetcher(url: str) -> tuple[str, str]:
        assert url == "https://example.com"
        return "https://example.com/", html

    links = discover_links_for_target("example.com", fetcher=fake_fetcher)

    assert links == [
        "https://example.com/about",
        "https://example.com/docs",
        "http://example.com/help",
    ]


def test_discover_links_respects_limit() -> None:
    html = """
    <a href="/one">One</a>
    <a href="/two">Two</a>
    <a href="/three">Three</a>
    """

    def fake_fetcher(_: str) -> tuple[str, str]:
        return "https://example.com/", html

    links = discover_links_for_target("example.com", limit=2, fetcher=fake_fetcher)

    assert links == [
        "https://example.com/one",
        "https://example.com/two",
    ]
