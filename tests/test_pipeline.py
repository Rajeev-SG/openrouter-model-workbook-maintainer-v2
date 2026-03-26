from model_intel.pipeline import _apply_cohort_rules, _blend_price, _enrich_registry_rows


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
        {
            "canonical_model_id": "gpt-4.1-metadata-only",
            "has_openrouter": True,
            "has_aa": True,
            "has_vals": True,
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
    assert result[3]["cohort_eligible"] is True
    assert result[3]["strict_cohort_eligible"] is False
    assert result[3]["vals_enriched"] is False
    assert "missing:vals" not in result[3]["strict_exclusion_reasons"]
    assert "missing_metric:vals_accuracy" in result[3]["strict_exclusion_reasons"]


def test_enrich_registry_rows_carries_all_available_aa_metrics() -> None:
    registry_rows = [
        {
            "canonical_model_id": "gpt-5-3-codex",
            "canonical_family": "GPT-5.3 Codex",
            "canonical_variant": "xhigh",
            "provider": "openai",
            "openrouter_slug": "openai/gpt-5.3-codex",
            "aa_model_slug": "gpt-5-3-codex",
            "vals_model_url": None,
            "livebench_model_name": None,
        }
    ]
    openrouter_index = [
        {
            "openrouter_slug": "openai/gpt-5.3-codex",
            "openrouter_input_price_per_million": 10.0,
            "openrouter_output_price_per_million": 40.0,
            "openrouter_context_tokens": 400000,
        }
    ]
    openrouter_pages = {
        "openai/gpt-5.3-codex": {
            "openrouter_page_context_tokens": 400000,
            "openrouter_release_date": "2026-02-05",
            "openrouter_page_url": "https://openrouter.ai/openai/gpt-5.3-codex/pricing",
        }
    }
    aa_index = [
        {
            "aa_source_key": "openai::gpt-5-3-codex",
            "aa_model_slug": "gpt-5-3-codex",
            "aa_release_date": "2026-02-05",
            "aa_intelligence_index": 54.0,
            "aa_coding_index": 53.1,
            "aa_math_index": 47.2,
            "aa_aime": 81.0,
            "aa_aime_25": 78.0,
            "aa_gpqa": 84.0,
            "aa_hle": 21.0,
            "aa_ifbench": 74.0,
            "aa_lcr": 69.0,
            "aa_livecodebench": 79.0,
            "aa_math_500": 96.0,
            "aa_mmlu_pro": 82.0,
            "aa_scicode": 71.0,
            "aa_tau2": 66.0,
            "aa_terminalbench_hard": 58.0,
            "aa_blended_price_per_million": 17.5,
            "aa_input_price_per_million": 12.0,
            "aa_output_price_per_million": 34.0,
            "aa_median_tokens_per_second": 91.4,
            "aa_median_ttft_seconds": 0.52,
            "aa_median_ttfat_seconds": 1.22,
            "aa_model_url": "https://artificialanalysis.ai/models/gpt-5-3-codex",
            "aa_provider_url": "https://artificialanalysis.ai/models/gpt-5-3-codex/providers",
        }
    ]
    aa_provider_pages = {
        "openai::gpt-5-3-codex": {
            "aa_fastest_provider": "OpenRouter",
            "aa_fastest_tokens_per_second": 111.0,
            "aa_lowest_latency_provider": "Azure",
            "aa_lowest_latency_seconds": 0.41,
            "aa_cheapest_provider": "OpenRouter",
            "aa_cheapest_blended_price_per_million": 16.8,
            "aa_json_support": "8 / 8",
            "aa_function_calling": "8 / 8",
        }
    }

    rows = _enrich_registry_rows(
        registry_rows,
        openrouter_index,
        openrouter_pages,
        aa_index,
        aa_provider_pages,
        [],
        [],
    )

    row = rows[0]
    assert row["aa_release_date"] == "2026-02-05"
    assert row["aa_model_url"] == "https://artificialanalysis.ai/models/gpt-5-3-codex"
    assert row["aa_input_price_per_million"] == 12.0
    assert row["aa_output_price_per_million"] == 34.0
    assert row["aa_blended_price_per_million"] == 17.5
    assert row["aa_median_ttft_seconds"] == 0.52
    assert row["aa_median_ttfat_seconds"] == 1.22
    assert row["aa_gpqa"] == 84.0
    assert row["aa_livecodebench"] == 79.0
    assert row["aa_terminalbench_hard"] == 58.0
    assert row["aa_json_support"] == "8 / 8"
    assert row["aa_function_calling"] == "8 / 8"
    assert row["source_freshness"]["artificial_analysis_last_seen"] == "2026-02-05"


def test_blend_price_ignores_negative_openrouter_sentinel_values() -> None:
    assert _blend_price(
        {
            "openrouter_input_price_per_million": -1_000_000.0,
            "openrouter_output_price_per_million": 0.4,
        }
    ) is None
    assert _blend_price(
        {
            "openrouter_input_price_per_million": 0.1,
            "openrouter_output_price_per_million": -1_000_000.0,
        }
    ) is None
