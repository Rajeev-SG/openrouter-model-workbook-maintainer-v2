from model_intel.pipeline import _apply_cohort_rules


def test_apply_cohort_rules_sets_primary_and_strict_flags() -> None:
    rows = [
        {
            "canonical_model_id": "deepseek-v3.2-thinking",
            "has_openrouter": True,
            "has_aa": True,
            "has_vals": True,
            "has_livebench": True,
            "openrouter_input_price_per_million": 0.26,
            "openrouter_output_price_per_million": 0.38,
            "openrouter_context_tokens": 163840,
            "aa_intelligence_index": 50.1,
            "aa_coding_index": 36.7,
            "aa_median_tokens_per_second": 41.2,
            "vals_accuracy": 58.0,
            "vals_latency_seconds": 240.0,
            "vals_cost_per_test": 0.14,
            "livebench_overall_score": 71.4,
        },
        {
            "canonical_model_id": "kimi-k2.5-thinking",
            "has_openrouter": True,
            "has_aa": True,
            "has_vals": True,
            "has_livebench": False,
            "openrouter_input_price_per_million": 0.45,
            "openrouter_output_price_per_million": 2.2,
            "openrouter_context_tokens": 262144,
            "aa_intelligence_index": 49.8,
            "aa_coding_index": 39.5,
            "aa_median_tokens_per_second": 55.0,
            "vals_accuracy": 61.0,
            "vals_latency_seconds": 210.0,
            "vals_cost_per_test": 0.2,
            "livebench_overall_score": None,
        },
        {
            "canonical_model_id": "gpt-4.1",
            "has_openrouter": True,
            "has_aa": True,
            "has_vals": False,
            "has_livebench": False,
            "openrouter_input_price_per_million": 2.0,
            "openrouter_output_price_per_million": 8.0,
            "openrouter_context_tokens": 1_000_000,
            "aa_intelligence_index": 45.0,
            "aa_coding_index": 33.0,
            "aa_median_tokens_per_second": 71.0,
            "vals_accuracy": None,
            "vals_latency_seconds": None,
            "vals_cost_per_test": None,
            "livebench_overall_score": None,
        },
    ]
    cohort_rules = {
        "required_sources": ["openrouter", "artificial_analysis"],
        "required_metrics": [
            "openrouter_input_price_per_million",
            "openrouter_output_price_per_million",
            "openrouter_context_tokens",
        ],
        "strict_required_sources": ["openrouter", "artificial_analysis", "vals"],
        "strict_required_metrics": [
            "openrouter_input_price_per_million",
            "openrouter_output_price_per_million",
            "openrouter_context_tokens",
            "aa_intelligence_index",
            "aa_coding_index",
            "aa_median_tokens_per_second",
            "vals_accuracy",
            "vals_latency_seconds",
            "vals_cost_per_test",
        ],
        "preferred_sources": ["vals", "livebench"],
    }

    result = _apply_cohort_rules(rows, cohort_rules)

    assert result[0]["cohort_eligible"] is True
    assert result[0]["strict_cohort_eligible"] is True
    assert result[0]["vals_enriched"] is True
    assert result[0]["livebench_enriched"] is True
    assert result[1]["cohort_eligible"] is True
    assert result[1]["strict_cohort_eligible"] is True
    assert result[1]["vals_enriched"] is True
    assert result[1]["livebench_enriched"] is False
    assert result[2]["cohort_eligible"] is True
    assert result[2]["strict_cohort_eligible"] is False
    assert result[2]["vals_enriched"] is False
    assert "missing:vals" in result[2]["strict_exclusion_reasons"]
