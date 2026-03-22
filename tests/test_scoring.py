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
