from model_intel.scoring import enrich_model_scores


def test_enrich_model_scores_prefers_stronger_coding_model() -> None:
    rows = [
        {
            "canonical_model_id": "model-a",
            "aa_intelligence_index": 60.0,
            "aa_coding_index": 70.0,
            "aa_median_tokens_per_second": 40.0,
            "openrouter_context_tokens": 200000,
            "openrouter_blended_price_per_million": 1.0,
            "vals_index_rank": 1,
            "vals_index_population": 10,
            "livebench_overall_score": 80.0,
        },
        {
            "canonical_model_id": "model-b",
            "aa_intelligence_index": 55.0,
            "aa_coding_index": 30.0,
            "aa_median_tokens_per_second": 20.0,
            "openrouter_context_tokens": 64000,
            "openrouter_blended_price_per_million": 5.0,
            "vals_index_rank": 5,
            "vals_index_population": 10,
            "livebench_overall_score": 60.0,
        },
    ]
    profiles = {
        "profiles": {
            "coding": {
                "label": "Coding-heavy",
                "weights": {
                    "coding": 0.4,
                    "value": 0.2,
                    "budget": 0.1,
                    "latency": 0.1,
                    "reasoning": 0.1,
                    "long_context": 0.1,
                },
            }
        }
    }

    _, scenario_rows = enrich_model_scores(rows, profiles)
    scores = {row["canonical_model_id"]: row["scenario_score"] for row in scenario_rows}

    assert scores["model-a"] > scores["model-b"]


def test_enrich_model_scores_uses_tool_use_benchmarks_for_coding_strength() -> None:
    rows = [
        {
            "canonical_model_id": "tool-use-winner",
            "aa_intelligence_index": 52.0,
            "aa_coding_index": 48.0,
            "aa_livecodebench": 0.88,
            "aa_scicode": 0.86,
            "aa_terminalbench_hard": 0.83,
            "aa_ifbench": 0.8,
            "aa_tau2": 0.91,
            "aa_median_tokens_per_second": 36.0,
            "openrouter_context_tokens": 200000,
            "openrouter_blended_price_per_million": 8.0,
            "vals_index_rank": 3,
            "vals_index_population": 10,
            "livebench_overall_score": 76.0,
        },
        {
            "canonical_model_id": "coding-index-only",
            "aa_intelligence_index": 49.0,
            "aa_coding_index": 60.0,
            "aa_livecodebench": 0.21,
            "aa_scicode": 0.18,
            "aa_terminalbench_hard": 0.12,
            "aa_ifbench": 0.2,
            "aa_tau2": 0.24,
            "aa_median_tokens_per_second": 36.0,
            "openrouter_context_tokens": 200000,
            "openrouter_blended_price_per_million": 8.0,
            "vals_index_rank": 4,
            "vals_index_population": 10,
            "livebench_overall_score": 70.0,
        },
    ]
    profiles = {
        "profiles": {
            "coding": {
                "label": "Best coding model",
                "weights": {
                    "coding": 0.8,
                    "reasoning": 0.1,
                    "latency": 0.1,
                },
            }
        }
    }

    _, scenario_rows = enrich_model_scores(rows, profiles)
    by_id = {row["canonical_model_id"]: row for row in scenario_rows}

    assert by_id["tool-use-winner"]["scenario_score"] > by_id["coding-index-only"]["scenario_score"]


def test_enrich_model_scores_budget_profile_can_exclude_expensive_models() -> None:
    rows = [
        {
            "canonical_model_id": "expensive-frontier",
            "aa_intelligence_index": 60.0,
            "aa_coding_index": 60.0,
            "aa_median_tokens_per_second": 120.0,
            "openrouter_context_tokens": 200000,
            "openrouter_blended_price_per_million": 12.0,
            "vals_index_rank": 1,
            "vals_index_population": 10,
            "livebench_overall_score": 90.0,
        },
        {
            "canonical_model_id": "cheap-capable",
            "aa_intelligence_index": 35.0,
            "aa_coding_index": 32.0,
            "aa_median_tokens_per_second": 180.0,
            "openrouter_context_tokens": 128000,
            "openrouter_blended_price_per_million": 0.5,
            "vals_index_rank": 5,
            "vals_index_population": 10,
            "livebench_overall_score": 60.0,
        },
    ]
    profiles = {
        "profiles": {
            "budget": {
                "label": "Cheap all-rounder",
                "weights": {
                    "budget": 0.55,
                    "latency": 0.2,
                    "coding": 0.1,
                    "reasoning": 0.1,
                    "long_context": 0.05,
                },
                "hard_filters": {
                    "max_price_per_million": 2.0,
                    "min_tokens_per_second": 20,
                    "min_coding_index": 20,
                    "min_reasoning_index": 20,
                },
            }
        }
    }

    _, scenario_rows = enrich_model_scores(rows, profiles)
    by_id = {row["canonical_model_id"]: row for row in scenario_rows}

    assert by_id["expensive-frontier"]["scenario_score"] is None
    assert by_id["cheap-capable"]["scenario_score"] is not None


def test_enrich_model_scores_long_context_profile_requires_real_throughput() -> None:
    rows = [
        {
            "canonical_model_id": "big-context-stalled",
            "aa_intelligence_index": 50.0,
            "aa_coding_index": 45.0,
            "aa_median_tokens_per_second": 0.0,
            "openrouter_context_tokens": 1048576,
            "openrouter_blended_price_per_million": 1.2,
            "vals_index_rank": 3,
            "vals_index_population": 10,
            "livebench_overall_score": 55.0,
        },
        {
            "canonical_model_id": "big-context-workhorse",
            "aa_intelligence_index": 44.0,
            "aa_coding_index": 40.0,
            "aa_median_tokens_per_second": 180.0,
            "openrouter_context_tokens": 1048576,
            "openrouter_blended_price_per_million": 1.0,
            "vals_index_rank": 4,
            "vals_index_population": 10,
            "livebench_overall_score": 52.0,
        },
    ]
    profiles = {
        "profiles": {
            "long_context": {
                "label": "Long-context workhorse",
                "weights": {
                    "long_context": 0.55,
                    "latency": 0.15,
                    "reasoning": 0.15,
                    "coding": 0.1,
                    "budget": 0.05,
                },
                "hard_filters": {
                    "min_context_tokens": 500000,
                    "min_tokens_per_second": 20,
                },
            }
        }
    }

    _, scenario_rows = enrich_model_scores(rows, profiles)
    by_id = {row["canonical_model_id"]: row for row in scenario_rows}

    assert by_id["big-context-stalled"]["scenario_score"] is None
    assert by_id["big-context-workhorse"]["scenario_score"] is not None


def test_enrich_model_scores_budget_profile_distinguishes_between_cheap_models() -> None:
    rows = [
        {
            "canonical_model_id": "ultra-fast-but-pricier",
            "aa_intelligence_index": 33.0,
            "aa_coding_index": 31.0,
            "aa_livecodebench": 0.20,
            "aa_scicode": 0.39,
            "aa_terminalbench_hard": 0.27,
            "aa_ifbench": 0.70,
            "aa_tau2": 0.71,
            "aa_median_tokens_per_second": 990.0,
            "openrouter_context_tokens": 200000,
            "openrouter_blended_price_per_million": 0.375,
            "vals_index_rank": 5,
            "vals_index_population": 10,
            "livebench_overall_score": 55.0,
        },
        {
            "canonical_model_id": "cheaper-capable",
            "aa_intelligence_index": 39.0,
            "aa_coding_index": 32.0,
            "aa_livecodebench": 0.22,
            "aa_scicode": 0.40,
            "aa_terminalbench_hard": 0.28,
            "aa_ifbench": 0.62,
            "aa_tau2": 0.69,
            "aa_median_tokens_per_second": 140.0,
            "openrouter_context_tokens": 1048576,
            "openrouter_blended_price_per_million": 0.14,
            "vals_index_rank": 4,
            "vals_index_population": 10,
            "livebench_overall_score": 58.0,
        },
    ]
    profiles = {
        "profiles": {
            "budget": {
                "label": "Cheap all-rounder",
                "weights": {
                    "budget": 0.70,
                    "latency": 0.08,
                    "coding": 0.10,
                    "reasoning": 0.10,
                    "long_context": 0.02,
                },
                "hard_filters": {
                    "max_price_per_million": 1.0,
                    "min_tokens_per_second": 20,
                    "min_coding_index": 20,
                    "min_reasoning_index": 20,
                },
            }
        }
    }

    _, scenario_rows = enrich_model_scores(rows, profiles)
    by_id = {row["canonical_model_id"]: row for row in scenario_rows}

    assert by_id["cheaper-capable"]["scenario_score"] > by_id["ultra-fast-but-pricier"]["scenario_score"]
