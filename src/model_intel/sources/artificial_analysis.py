from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup
import requests

from ..fetch import CachedFetcher, require_env
from ..helpers import canonical_provider, detect_reasoning_mode, normalized_name, parse_float


AA_API_URL = "https://artificialanalysis.ai/api/v2/data/llms/models"


def fetch_aa_index(fetcher: CachedFetcher) -> list[dict[str, Any]]:
    api_key = require_env("AA_API_KEY")
    payload = fetcher.get_json(
        AA_API_URL,
        "artificialanalysis_api",
        "llm_models",
        headers={"x-api-key": api_key},
    )
    fetcher.write_snapshot_metadata(
        "artificialanalysis_api",
        {
            "source_url": AA_API_URL,
            "parser_version": "2026-03-22-aa-index-v1",
            "record_count": len(payload.get("data", [])),
        },
    )
    rows: list[dict[str, Any]] = []
    for item in payload.get("data", []):
        creator = item.get("model_creator") or {}
        evaluations = item.get("evaluations") or {}
        pricing = item.get("pricing") or {}
        display_name = item.get("name") or item.get("slug") or ""
        provider = canonical_provider(creator.get("name") or creator.get("slug"))
        rows.append(
            {
                "aa_source_key": f"{creator.get('slug') or provider}::{item.get('slug')}",
                "aa_model_slug": item.get("slug"),
                "aa_creator_slug": creator.get("slug"),
                "aa_display_name": display_name,
                "display_name": display_name,
                "provider": provider,
                "reasoning_mode": detect_reasoning_mode(display_name, item.get("slug")),
                "normalized_name": normalized_name(display_name),
                "aa_release_date": item.get("release_date"),
                "aa_intelligence_index": parse_float(evaluations.get("artificial_analysis_intelligence_index")),
                "aa_coding_index": parse_float(evaluations.get("artificial_analysis_coding_index")),
                "aa_math_index": parse_float(evaluations.get("artificial_analysis_math_index")),
                "aa_aime": parse_float(evaluations.get("aime")),
                "aa_aime_25": parse_float(evaluations.get("aime_25")),
                "aa_gpqa": parse_float(evaluations.get("gpqa")),
                "aa_hle": parse_float(evaluations.get("hle")),
                "aa_ifbench": parse_float(evaluations.get("ifbench")),
                "aa_lcr": parse_float(evaluations.get("lcr")),
                "aa_livecodebench": parse_float(evaluations.get("livecodebench")),
                "aa_math_500": parse_float(evaluations.get("math_500")),
                "aa_mmlu_pro": parse_float(evaluations.get("mmlu_pro")),
                "aa_scicode": parse_float(evaluations.get("scicode")),
                "aa_tau2": parse_float(evaluations.get("tau2")),
                "aa_terminalbench_hard": parse_float(evaluations.get("terminalbench_hard")),
                "aa_blended_price_per_million": parse_float(pricing.get("price_1m_blended_3_to_1")),
                "aa_input_price_per_million": parse_float(pricing.get("price_1m_input_tokens")),
                "aa_output_price_per_million": parse_float(pricing.get("price_1m_output_tokens")),
                "aa_median_tokens_per_second": parse_float(item.get("median_output_tokens_per_second")),
                "aa_median_ttft_seconds": parse_float(item.get("median_time_to_first_token_seconds")),
                "aa_median_ttfat_seconds": parse_float(item.get("median_time_to_first_answer_token")),
                "aa_model_url": f"https://artificialanalysis.ai/models/{item.get('slug')}",
                "aa_provider_url": f"https://artificialanalysis.ai/models/{item.get('slug')}/providers",
            }
        )
    return rows


def fetch_aa_provider_pages(fetcher: CachedFetcher, models: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    failed_urls: list[str] = []
    for model in models:
        url = model["aa_provider_url"]
        try:
            html = fetcher.get_text(url, "artificialanalysis_provider_pages", model["aa_source_key"])
        except requests.HTTPError:
            failed_urls.append(url)
            continue
        rows[model["aa_source_key"]] = parse_aa_provider_page(html)
        rows[model["aa_source_key"]]["aa_provider_url"] = url
    fetcher.write_snapshot_metadata(
        "artificialanalysis_provider_pages",
        {
            "source_url": "https://artificialanalysis.ai/models/{slug}/providers",
            "parser_version": "2026-03-22-aa-provider-v1",
            "record_count": len(rows),
            "failed_count": len(failed_urls),
        },
    )
    return rows


def parse_aa_provider_page(html: str) -> dict[str, Any]:
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    text = re.sub(r"\s+", " ", text)
    result = {
        "aa_fastest_provider": None,
        "aa_fastest_tokens_per_second": None,
        "aa_lowest_latency_provider": None,
        "aa_lowest_latency_seconds": None,
        "aa_cheapest_provider": None,
        "aa_cheapest_blended_price_per_million": None,
        "aa_json_support": None,
        "aa_function_calling": None,
    }
    match = re.search(r"([A-Za-z0-9 .&/+_-]+?) is the fastest at ([\d.]+)\s*t/s", text, re.I)
    if match:
        result["aa_fastest_provider"] = match.group(1).strip()
        result["aa_fastest_tokens_per_second"] = parse_float(match.group(2))
    match = re.search(r"provider with the lowest latency is ([A-Za-z0-9 .&/+_-]+?) at ([\d.]+)\s*seconds", text, re.I)
    if match:
        result["aa_lowest_latency_provider"] = match.group(1).strip()
        result["aa_lowest_latency_seconds"] = parse_float(match.group(2))
    match = re.search(r"most affordable .*? are ([^($]+)\(\$([\d.]+) per 1M tokens\)", text, re.I)
    if match:
        result["aa_cheapest_provider"] = match.group(1).strip().rstrip(",")
        result["aa_cheapest_blended_price_per_million"] = parse_float(match.group(2))
    match = re.search(r"JSON(?: output| mode)?[^0-9]*(\d+\s*/\s*\d+)", text, re.I)
    if match:
        result["aa_json_support"] = match.group(1)
    elif re.search(r"\bAll providers(?: of [^.]+)? support JSON mode\b", text, re.I):
        result["aa_json_support"] = "All providers"
    elif re.search(r"\b(?:Some|Selected|Most) providers(?: of [^.]+)? support JSON mode\b", text, re.I):
        result["aa_json_support"] = "Partial support"
    match = re.search(r"Function Calling[^0-9]*(\d+\s*/\s*\d+)", text, re.I)
    if match:
        result["aa_function_calling"] = match.group(1)
    elif re.search(r"\bAll providers(?: of [^.]+)? support function calling\b", text, re.I):
        result["aa_function_calling"] = "All providers"
    elif re.search(r"\b(?:Some|Selected|Most) providers(?: of [^.]+)? support function calling\b", text, re.I):
        result["aa_function_calling"] = "Partial support"
    return result
