from model_intel.sources.artificial_analysis import parse_aa_provider_page
from model_intel.sources.openrouter import parse_openrouter_page
from model_intel.sources.vals import _extract_first_match


def test_parse_openrouter_page_extracts_release_and_context() -> None:
    payload = parse_openrouter_page(
        """
        <html>
          <body>
            Released January 27, 2026 262k context
            $1.50/M audio input
            $2.00/K web search
          </body>
        </html>
        """
    )

    assert payload["openrouter_release_date"] == "2026-01-27"
    assert payload["openrouter_page_context_tokens"] == 262000
    assert payload["openrouter_audio_input_price_per_million"] == 1.5
    assert payload["openrouter_web_search_price_per_thousand"] == 2.0


def test_parse_aa_provider_page_extracts_fastest_and_cheapest() -> None:
    payload = parse_aa_provider_page(
        """
        <html>
          <body>
            Provider A is the fastest at 123.4 t/s.
            The provider with the lowest latency is Provider B at 0.8 seconds.
            The most affordable providers are Provider C ($0.55 per 1M tokens).
          </body>
        </html>
        """
    )

    assert payload["aa_fastest_provider"] == "Provider A"
    assert payload["aa_fastest_tokens_per_second"] == 123.4
    assert payload["aa_lowest_latency_provider"] == "Provider B"
    assert payload["aa_lowest_latency_seconds"] == 0.8
    assert payload["aa_cheapest_provider"] == "Provider C"
    assert payload["aa_cheapest_blended_price_per_million"] == 0.55


def test_extract_first_match_raises_on_missing_pattern() -> None:
    try:
        _extract_first_match("hello world", r'component-url="(?P<path>[^"]+)"', "missing")
    except RuntimeError as exc:
        assert "missing" in str(exc)
    else:
        raise AssertionError("Expected RuntimeError when pattern is missing")
