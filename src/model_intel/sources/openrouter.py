from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

from ..fetch import CachedFetcher
from ..helpers import canonical_provider, detect_reasoning_mode, normalized_name, parse_date, parse_float, parse_int


OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models"


def fetch_openrouter_index(fetcher: CachedFetcher) -> list[dict[str, Any]]:
    payload = fetcher.get_json(OPENROUTER_API_URL, "openrouter_api", "models")
    fetcher.write_snapshot_metadata(
        "openrouter_api",
        {
            "source_url": OPENROUTER_API_URL,
            "parser_version": "2026-03-22-openrouter-index-v1",
            "record_count": len(payload.get("data", [])),
        },
    )
    rows: list[dict[str, Any]] = []
    for item in payload.get("data", []):
        slug = item.get("canonical_slug") or item.get("id")
        if not slug:
            continue
        pricing = item.get("pricing") or {}
        display_name = item.get("name") or slug
        row = {
            "openrouter_slug": slug,
            "display_name": display_name.split(": ", 1)[-1],
            "provider": canonical_provider(slug.split("/")[0]),
            "reasoning_mode": detect_reasoning_mode(slug, display_name),
            "variant_label": _variant_label(display_name, slug),
            "normalized_name": normalized_name(display_name),
            "openrouter_source_url": f"https://openrouter.ai/{slug}",
            "openrouter_pricing_url": f"https://openrouter.ai/{slug}/pricing",
            "openrouter_context_tokens": parse_int(item.get("context_length")),
            "openrouter_prompt_price_per_token": parse_float(pricing.get("prompt")),
            "openrouter_completion_price_per_token": parse_float(pricing.get("completion")),
            "openrouter_input_price_per_million": _price_to_million(parse_float(pricing.get("prompt"))),
            "openrouter_output_price_per_million": _price_to_million(parse_float(pricing.get("completion"))),
            "openrouter_request_price": parse_float(pricing.get("request")),
            "openrouter_created_epoch": item.get("created"),
            "openrouter_architecture": item.get("architecture"),
            "openrouter_supported_parameters": item.get("supported_parameters"),
        }
        rows.append(row)
    return rows


def fetch_openrouter_pages(fetcher: CachedFetcher, slugs: list[str]) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for slug in sorted(set(slugs)):
        url = f"https://openrouter.ai/{slug}/pricing"
        html = fetcher.get_text(url, "openrouter_pages", slug)
        rows[slug] = parse_openrouter_page(html)
        rows[slug]["openrouter_page_url"] = url
    fetcher.write_snapshot_metadata(
        "openrouter_pages",
        {
            "source_url": "https://openrouter.ai/{slug}/pricing",
            "parser_version": "2026-03-22-openrouter-page-v1",
            "record_count": len(rows),
        },
    )
    return rows


def parse_openrouter_page(html: str) -> dict[str, Any]:
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    result = {
        "openrouter_release_date": None,
        "openrouter_page_context_tokens": None,
        "openrouter_audio_input_price_per_million": None,
        "openrouter_web_search_price_per_thousand": None,
    }
    match = re.search(r"Released\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})", text)
    if match:
        result["openrouter_release_date"] = parse_date(match.group(1))
    match = re.search(r"Released\s+[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}\s+([\d.,kKmM]+)\s+context", text)
    if match:
        result["openrouter_page_context_tokens"] = parse_int(match.group(1))
    match = re.search(r"\$([\d.]+)\/M\s+audio input", text, re.I)
    if match:
        result["openrouter_audio_input_price_per_million"] = parse_float(match.group(1))
    match = re.search(r"\$([\d.]+)\/K\s+web search", text, re.I)
    if match:
        result["openrouter_web_search_price_per_thousand"] = parse_float(match.group(1))
    return result


def _variant_label(display_name: str, slug: str) -> str:
    text = f"{display_name} {slug}".lower()
    if "non" in text and ("thinking" in text or "reasoning" in text):
        return "Non-reasoning"
    if "thinking" in text or "reasoning" in text:
        return "Reasoning"
    return "Standard"


def _price_to_million(value: float | None) -> float | None:
    if value is None:
        return None
    return value * 1_000_000
