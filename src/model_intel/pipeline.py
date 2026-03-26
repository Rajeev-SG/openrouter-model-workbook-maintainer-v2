from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

import pandas as pd

from .config import RunConfig, load_cohort_rules, load_scenario_profiles
from .fetch import CachedFetcher
from .helpers import coalesce, mean, percentile_from_rank, read_json, slugify, write_json
from .identity import build_canonical_registry, load_manual_links
from .scoring import enrich_model_scores
from .sources.artificial_analysis import fetch_aa_index, fetch_aa_provider_pages
from .sources.livebench import fetch_livebench_scores
from .sources.openrouter import fetch_openrouter_index, fetch_openrouter_pages
from .sources.vals import fetch_vals_models
from .workbook.builder import build_workbook


def run_pipeline(config: RunConfig, refresh: bool = False) -> dict[str, Any]:
    fetcher = CachedFetcher(config.cache_dir, refresh=refresh)
    openrouter_index = fetch_openrouter_index(fetcher)
    aa_index = fetch_aa_index(fetcher)
    vals_index = fetch_vals_models(fetcher)
    livebench_index = fetch_livebench_scores(fetcher)
    manual_links = load_manual_links(config.mapping_csv)

    registry_rows, diagnostics = build_canonical_registry(
        openrouter_models=openrouter_index,
        aa_models=aa_index,
        vals_models=vals_index,
        livebench_models=livebench_index,
        manual_rows=manual_links,
    )

    matched_aa = [
        row for row in aa_index if row["aa_model_slug"] in {item["aa_model_slug"] for item in registry_rows if item.get("aa_model_slug")}
    ]
    matched_openrouter = [row["openrouter_slug"] for row in registry_rows if row.get("openrouter_slug")]
    aa_provider_pages = fetch_aa_provider_pages(fetcher, matched_aa)
    openrouter_pages = fetch_openrouter_pages(fetcher, matched_openrouter)

    source_manifest = _load_source_manifest(config.cache_dir)
    master_rows = _enrich_registry_rows(registry_rows, openrouter_index, openrouter_pages, aa_index, aa_provider_pages, vals_index, livebench_index)

    cohort_rules = load_cohort_rules(config.cohort_rules_path)
    scenario_profiles = load_scenario_profiles(config.scenario_profiles_path)
    master_rows = _apply_cohort_rules(master_rows, cohort_rules)
    master_rows, scenario_rows = enrich_model_scores(master_rows, scenario_profiles)
    cohort_rows = [row for row in master_rows if row["cohort_eligible"]]

    _write_outputs(config, master_rows, cohort_rows, scenario_rows, diagnostics, source_manifest, cohort_rules, scenario_profiles)
    build_workbook(config.workbook_path, cohort_rows, master_rows, scenario_rows, diagnostics, source_manifest)

    return {
        "master_rows": master_rows,
        "cohort_rows": cohort_rows,
        "scenario_rows": scenario_rows,
        "diagnostics": diagnostics,
        "source_manifest": source_manifest,
    }


def rebuild_from_saved_outputs(config: RunConfig) -> dict[str, Any]:
    master_rows = _read_saved_payload(config.data_dir, "master_registry")
    cohort_rows = _read_saved_payload(config.data_dir, "guide_cohort")
    scenario_rows = _read_saved_payload(config.data_dir, "scenario_scores")
    diagnostics = _read_saved_payload(config.data_dir, "mapping_diagnostics")
    source_manifest = _read_saved_payload(config.data_dir, "source_manifest")
    cohort_rules = _read_saved_payload(config.data_dir, "cohort_rules")
    scenario_profiles = _read_saved_payload(config.data_dir, "scenario_profiles")

    _sync_site_payloads(
        config,
        config.data_dir,
        [
            "master_registry",
            "guide_cohort",
            "scenario_scores",
            "mapping_diagnostics",
            "source_manifest",
            "cohort_rules",
            "scenario_profiles",
        ],
    )
    build_workbook(
        config.workbook_path,
        cohort_rows,
        master_rows,
        scenario_rows,
        diagnostics,
        source_manifest,
    )
    return {
        "master_rows": master_rows,
        "cohort_rows": cohort_rows,
        "scenario_rows": scenario_rows,
        "diagnostics": diagnostics,
        "source_manifest": source_manifest,
        "cohort_rules": cohort_rules,
        "scenario_profiles": scenario_profiles,
    }


def _enrich_registry_rows(
    registry_rows: list[dict[str, Any]],
    openrouter_index: list[dict[str, Any]],
    openrouter_pages: dict[str, dict[str, Any]],
    aa_index: list[dict[str, Any]],
    aa_provider_pages: dict[str, dict[str, Any]],
    vals_index: list[dict[str, Any]],
    livebench_index: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    openrouter_by_slug = {item["openrouter_slug"]: item for item in openrouter_index}
    aa_by_slug = {item["aa_model_slug"]: item for item in aa_index}
    vals_by_url = {item["vals_model_url"]: item for item in vals_index}
    livebench_by_name = {item["livebench_model_name"]: item for item in livebench_index}

    rows = []
    for row in registry_rows:
        openrouter = openrouter_by_slug.get(row.get("openrouter_slug"))
        aa = aa_by_slug.get(row.get("aa_model_slug"))
        aa_page = aa_provider_pages.get(aa["aa_source_key"]) if aa else None
        vals = vals_by_url.get(row.get("vals_model_url"))
        livebench = livebench_by_name.get(row.get("livebench_model_name"))
        merged = {
            **row,
            "openrouter_input_price_per_million": openrouter.get("openrouter_input_price_per_million") if openrouter else None,
            "openrouter_output_price_per_million": openrouter.get("openrouter_output_price_per_million") if openrouter else None,
            "openrouter_blended_price_per_million": _blend_price(openrouter),
            "openrouter_context_tokens": coalesce(
                openrouter_pages.get(row.get("openrouter_slug") or "", {}).get("openrouter_page_context_tokens"),
                openrouter.get("openrouter_context_tokens") if openrouter else None,
            ),
            "openrouter_release_date": openrouter_pages.get(row.get("openrouter_slug") or "", {}).get("openrouter_release_date"),
            "openrouter_page_url": openrouter_pages.get(row.get("openrouter_slug") or "", {}).get("openrouter_page_url"),
            "aa_release_date": aa.get("aa_release_date") if aa else None,
            "aa_intelligence_index": aa.get("aa_intelligence_index") if aa else None,
            "aa_coding_index": aa.get("aa_coding_index") if aa else None,
            "aa_math_index": aa.get("aa_math_index") if aa else None,
            "aa_aime": aa.get("aa_aime") if aa else None,
            "aa_aime_25": aa.get("aa_aime_25") if aa else None,
            "aa_gpqa": aa.get("aa_gpqa") if aa else None,
            "aa_hle": aa.get("aa_hle") if aa else None,
            "aa_ifbench": aa.get("aa_ifbench") if aa else None,
            "aa_lcr": aa.get("aa_lcr") if aa else None,
            "aa_livecodebench": aa.get("aa_livecodebench") if aa else None,
            "aa_math_500": aa.get("aa_math_500") if aa else None,
            "aa_mmlu_pro": aa.get("aa_mmlu_pro") if aa else None,
            "aa_scicode": aa.get("aa_scicode") if aa else None,
            "aa_tau2": aa.get("aa_tau2") if aa else None,
            "aa_terminalbench_hard": aa.get("aa_terminalbench_hard") if aa else None,
            "aa_median_tokens_per_second": aa.get("aa_median_tokens_per_second") if aa else None,
            "aa_median_ttft_seconds": aa.get("aa_median_ttft_seconds") if aa else None,
            "aa_median_ttfat_seconds": aa.get("aa_median_ttfat_seconds") if aa else None,
            "aa_blended_price_per_million": aa.get("aa_blended_price_per_million") if aa else None,
            "aa_input_price_per_million": aa.get("aa_input_price_per_million") if aa else None,
            "aa_output_price_per_million": aa.get("aa_output_price_per_million") if aa else None,
            "aa_model_url": aa.get("aa_model_url") if aa else None,
            "aa_provider_url": aa.get("aa_provider_url") if aa else None,
            "aa_fastest_provider": aa_page.get("aa_fastest_provider") if aa_page else None,
            "aa_fastest_tokens_per_second": aa_page.get("aa_fastest_tokens_per_second") if aa_page else None,
            "aa_lowest_latency_provider": aa_page.get("aa_lowest_latency_provider") if aa_page else None,
            "aa_lowest_latency_seconds": aa_page.get("aa_lowest_latency_seconds") if aa_page else None,
            "aa_cheapest_provider": aa_page.get("aa_cheapest_provider") if aa_page else None,
            "aa_cheapest_blended_price_per_million": aa_page.get("aa_cheapest_blended_price_per_million") if aa_page else None,
            "aa_json_support": aa_page.get("aa_json_support") if aa_page else None,
            "aa_function_calling": aa_page.get("aa_function_calling") if aa_page else None,
            "vals_release_date": vals.get("vals_release_date") if vals else None,
            "vals_accuracy": vals.get("vals_accuracy") if vals else None,
            "vals_ci_plus_minus": vals.get("vals_ci_plus_minus") if vals else None,
            "vals_latency_seconds": vals.get("vals_latency_seconds") if vals else None,
            "vals_cost_per_test": vals.get("vals_cost_per_test") if vals else None,
            "vals_avg_cost_input": vals.get("vals_avg_cost_input") if vals else None,
            "vals_avg_cost_output": vals.get("vals_avg_cost_output") if vals else None,
            "vals_context_tokens": vals.get("vals_context_tokens") if vals else None,
            "vals_max_output_tokens": vals.get("vals_max_output_tokens") if vals else None,
            "vals_default_provider": vals.get("vals_default_provider") if vals else None,
            "vals_reasoning_effort": vals.get("vals_reasoning_effort") if vals else None,
            "vals_benchmarks": vals.get("vals_benchmarks") if vals else [],
            "vals_index_rank": _rank_for(vals, "Vals Index"),
            "vals_index_population": _population_for(vals, "Vals Index"),
            "livebench_overall_score": livebench.get("livebench_overall_score") if livebench else None,
            "livebench_categories": livebench.get("livebench_categories") if livebench else {},
            "livebench_tasks": livebench.get("livebench_tasks") if livebench else {},
        }
        merged["source_freshness"] = _source_freshness(merged)
        rows.append(merged)
    return rows


def _apply_cohort_rules(rows: list[dict[str, Any]], cohort_rules: dict[str, Any]) -> list[dict[str, Any]]:
    required_sources = set(cohort_rules["required_sources"])
    required_metrics = cohort_rules["required_metrics"]
    strict_required_sources = set(cohort_rules.get("strict_required_sources", required_sources))
    strict_required_metrics = cohort_rules.get("strict_required_metrics", required_metrics)
    preferred_sources = set(cohort_rules.get("preferred_sources", []))
    for row in rows:
        exclusion_reasons = []
        strict_exclusion_reasons = []
        available_sources = {
            "openrouter": row["has_openrouter"],
            "artificial_analysis": row["has_aa"],
            "vals": row["has_vals"],
            "livebench": row["has_livebench"],
        }
        for source_name in required_sources:
            if not available_sources[source_name]:
                exclusion_reasons.append(f"missing:{source_name}")
        for metric in required_metrics:
            if row.get(metric) in (None, "", {}, []):
                exclusion_reasons.append(f"missing_metric:{metric}")
        for source_name in strict_required_sources:
            if not available_sources[source_name]:
                strict_exclusion_reasons.append(f"missing:{source_name}")
        for metric in strict_required_metrics:
            if row.get(metric) in (None, "", {}, []):
                strict_exclusion_reasons.append(f"missing_metric:{metric}")
        row["cohort_eligible"] = not exclusion_reasons
        row["exclusion_reasons"] = "; ".join(exclusion_reasons)
        row["strict_cohort_eligible"] = not strict_exclusion_reasons
        row["strict_exclusion_reasons"] = "; ".join(strict_exclusion_reasons)
        row["coverage_score"] = sum(int(value) for value in available_sources.values()) / len(available_sources)
        row["source_flags"] = available_sources
        row["preferred_source_flags"] = {name: available_sources[name] for name in preferred_sources}
        row["vals_enriched"] = _has_vals_benchmark_signal(row)
        row["livebench_enriched"] = _has_livebench_benchmark_signal(row)
    return rows


def _has_vals_benchmark_signal(row: dict[str, Any]) -> bool:
    if not row.get("has_vals"):
        return False
    benchmark_values = (
        row.get("vals_accuracy"),
        row.get("vals_latency_seconds"),
        row.get("vals_cost_per_test"),
    )
    return any(value is not None for value in benchmark_values)


def _has_livebench_benchmark_signal(row: dict[str, Any]) -> bool:
    if not row.get("has_livebench"):
        return False
    return row.get("livebench_overall_score") is not None


def _write_outputs(
    config: RunConfig,
    master_rows: list[dict[str, Any]],
    cohort_rows: list[dict[str, Any]],
    scenario_rows: list[dict[str, Any]],
    diagnostics: list[dict[str, Any]],
    source_manifest: dict[str, Any],
    cohort_rules: dict[str, Any],
    scenario_profiles: dict[str, Any],
) -> None:
    config.data_dir.mkdir(parents=True, exist_ok=True)
    payloads = {
        "master_registry": master_rows,
        "guide_cohort": cohort_rows,
        "scenario_scores": scenario_rows,
        "mapping_diagnostics": diagnostics,
        "source_manifest": source_manifest,
        "cohort_rules": cohort_rules,
        "scenario_profiles": scenario_profiles,
    }
    for name, payload in payloads.items():
        json_path = config.data_dir / f"{name}.json"
        write_json(json_path, payload)
        if isinstance(payload, list) and payload:
            frame = pd.json_normalize(payload, sep=".")
            frame.to_parquet(config.data_dir / f"{name}.parquet", index=False)
    _sync_site_payloads(config, config.data_dir, payloads.keys())


def _load_source_manifest(cache_dir: Path) -> dict[str, Any]:
    manifest = {}
    for manifest_path in sorted(cache_dir.glob("*/manifest.json")):
        manifest[manifest_path.parent.name] = read_json(manifest_path)
    return manifest


def _read_saved_payload(data_dir: Path, name: str) -> Any:
    path = data_dir / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Saved dataset is missing: {path}")
    return read_json(path)


def _sync_site_payloads(config: RunConfig, data_dir: Path, names: Any) -> None:
    config.site_data_dir.mkdir(parents=True, exist_ok=True)
    for name in names:
        json_path = data_dir / f"{name}.json"
        (config.site_data_dir / f"{name}.json").write_text(
            json_path.read_text(encoding="utf-8"),
            encoding="utf-8",
        )


def _blend_price(openrouter: dict[str, Any] | None) -> float | None:
    if not openrouter:
        return None
    input_price = openrouter.get("openrouter_input_price_per_million")
    output_price = openrouter.get("openrouter_output_price_per_million")
    if input_price is None or output_price is None:
        return None
    return (input_price * 3 + output_price) / 4


def _rank_for(vals: dict[str, Any] | None, benchmark_name: str) -> int | None:
    if not vals:
        return None
    for item in vals.get("vals_benchmarks", []):
        if item["benchmark"].lower() == benchmark_name.lower():
            return item["rank"]
    return None


def _population_for(vals: dict[str, Any] | None, benchmark_name: str) -> int | None:
    if not vals:
        return None
    for item in vals.get("vals_benchmarks", []):
        if item["benchmark"].lower() == benchmark_name.lower():
            return item["population"]
    return None


def _source_freshness(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "openrouter_last_seen": row.get("openrouter_release_date"),
        "artificial_analysis_last_seen": row.get("aa_release_date"),
        "vals_last_seen": row.get("vals_release_date"),
    }
