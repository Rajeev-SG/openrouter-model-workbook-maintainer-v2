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
