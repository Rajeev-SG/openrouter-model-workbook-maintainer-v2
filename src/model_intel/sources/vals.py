from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

from ..fetch import CachedFetcher
from ..helpers import canonical_provider, detect_reasoning_mode, normalized_name, parse_float, parse_int


VALS_MODELS_URL = "https://www.vals.ai/models"


def fetch_vals_models(fetcher: CachedFetcher) -> list[dict[str, Any]]:
    bundle_payload = _load_or_refresh_vals_bundle(fetcher)
    model_metadata = bundle_payload["models"]
    benchmark_metadata = bundle_payload["benchmark_catalog"]
    benchmark_scores = bundle_payload["benchmark_scores"]
    vals_index = bundle_payload["vals_index"]
    vals_index_overall = vals_index["tasks"]["overall"]

    rows = []
    for full_key, metadata in sorted(model_metadata.items(), key=lambda item: item[0]):
        if metadata.get("type") == "product":
            continue
        slug = metadata.get("slug")
        if not slug:
            continue

        index_metrics = vals_index_overall.get(full_key, {})
        benchmark_rows = []
        for benchmark_slug, metrics in (benchmark_scores.get(full_key) or {}).items():
            benchmark_info = benchmark_metadata.get(benchmark_slug, {})
            benchmark_rows.append(
                {
                    "benchmark_slug": benchmark_slug,
                    "benchmark": benchmark_info.get("benchmark", benchmark_slug),
                    "dataset_type": benchmark_info.get("dataset_type"),
                    "industry": benchmark_info.get("industry"),
                    "score": parse_float(metrics.get("accuracy")),
                    "ci_plus_minus": parse_float(metrics.get("stderr")),
                    "latency_seconds": parse_float(metrics.get("latency")),
                    "cost_per_test": parse_float(metrics.get("cost_per_test")),
                    "rank": metrics.get("ranking"),
                    "open_source_rank": metrics.get("open_source_ranking"),
                    "population": benchmark_info.get("total_models"),
                    "updated": benchmark_info.get("updated"),
                }
            )

        properties = metadata.get("properties") or {}
        costs = metadata.get("costs_per_million_token") or {}
        default_parameters = metadata.get("default_parameters") or {}
        provider_name = canonical_provider(metadata.get("company")) or canonical_provider(metadata.get("provider_name"))
        reasoning_mode = (
            "reasoning"
            if properties.get("reasoning_model")
            else detect_reasoning_mode(metadata.get("label"), full_key, index_metrics.get("reasoning_effort"))
        )

        rows.append(
            {
                "vals_model_url": f"{VALS_MODELS_URL}/{slug}",
                "vals_slug": slug,
                "vals_full_key": full_key,
                "vals_source_url": f"{VALS_MODELS_URL}/{slug}",
                "display_name": metadata.get("label") or full_key,
                "provider": provider_name or "unknown",
                "reasoning_mode": reasoning_mode,
                "normalized_name": normalized_name(metadata.get("label") or full_key),
                "vals_release_date": metadata.get("release_date"),
                "vals_accuracy": parse_float(index_metrics.get("accuracy")),
                "vals_ci_plus_minus": parse_float(index_metrics.get("stderr")),
                "vals_latency_seconds": parse_float(index_metrics.get("latency")),
                "vals_cost_per_test": parse_float(index_metrics.get("cost_per_test")),
                "vals_avg_cost_input": None,
                "vals_avg_cost_output": None,
                "vals_input_price_per_million": parse_float(costs.get("input")),
                "vals_output_price_per_million": parse_float(costs.get("output")),
                "vals_context_tokens": parse_int(properties.get("context_window")),
                "vals_max_output_tokens": parse_int(index_metrics.get("max_output_tokens") or properties.get("max_tokens")),
                "vals_default_provider": index_metrics.get("provider") or metadata.get("company"),
                "vals_reasoning_effort": index_metrics.get("reasoning_effort") or default_parameters.get("reasoning_effort"),
                "vals_open_source": metadata.get("open_source"),
                "vals_documentation_url": metadata.get("documentation_url"),
                "vals_benchmarks": sorted(benchmark_rows, key=lambda item: item["benchmark"].lower()),
            }
        )

    fetcher.write_snapshot_metadata(
        "vals_bundle",
        {
            "source_url": bundle_payload["source_url"],
            "parser_version": "2026-03-22-vals-bundle-v2",
            "record_count": len(rows),
            "artifact": bundle_payload["artifact"],
        },
    )
    return rows


def _load_or_refresh_vals_bundle(fetcher: CachedFetcher) -> dict[str, Any]:
    models_html = fetcher.get_text(VALS_MODELS_URL, "vals_site", "models")
    modeltable_path = _extract_first_match(
        models_html,
        r'component-url="(?P<path>/(_astro/)?ModelTable[^"]+\.js)"',
        "Vals models HTML no longer exposes the ModelTable bundle path.",
    )
    modeltable_url = urljoin(VALS_MODELS_URL, modeltable_path)
    modeltable_js = fetcher.get_text(modeltable_url, "vals_site", "model_table_bundle", suffix="js")
    constants_file = _extract_first_match(
        modeltable_js,
        r'from"\.\/(?P<path>constants\.[^"]+\.js)"|from"\./(?P<path_alt>constants\.[^"]+\.js)"',
        "Vals ModelTable bundle no longer imports the constants bundle.",
    )
    constants_path = constants_file or ""
    constants_url = urljoin(modeltable_url, constants_path)
    bundle_path = fetcher.download_file(constants_url, "vals_site", "constants_bundle", "js")
    payload = _extract_vals_bundle_payload(bundle_path)
    payload["source_url"] = constants_url
    payload["artifact"] = bundle_path.name
    return payload


def _extract_vals_bundle_payload(bundle_path: Path) -> dict[str, Any]:
    script = f"""
const mod = await import({json.dumps(bundle_path.resolve().as_uri())});
console.log(JSON.stringify({{
  models: mod.r,
  benchmark_catalog: mod.m.metadata,
  benchmark_scores: mod.m.models,
  vals_index: mod.v
}}));
"""
    try:
        completed = subprocess.run(
            ["node", "--input-type=module", "-"],
            input=script,
            text=True,
            capture_output=True,
            check=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("Node.js is required to parse the Vals client bundle.") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Failed to parse Vals bundle: {exc.stderr.strip()}") from exc
    return json.loads(completed.stdout)


def _extract_first_match(text: str, pattern: str, error_message: str) -> str:
    match = re.search(pattern, text)
    if not match:
        raise RuntimeError(error_message)
    return match.group("path") or match.groupdict().get("path_alt") or ""
