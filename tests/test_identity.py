from model_intel.identity import build_canonical_registry, choose_livebench_match, choose_unique_match


def test_choose_unique_match_accepts_alias_exact_match_for_cosmetic_suffixes() -> None:
    match, ambiguous = choose_unique_match(
        "GPT-5.4 Nano",
        [
            {"aa_model_slug": "gpt-5-4-nano-medium", "normalized_name": "gpt 5 4 nano medium"},
            {"aa_model_slug": "gpt-4", "normalized_name": "gpt 4"},
            {"aa_model_slug": "gpt-4-1-nano", "normalized_name": "gpt 4 1 nano"},
        ],
        "normalized_name",
    )

    assert ambiguous == []
    assert match is not None
    assert match["aa_model_slug"] == "gpt-5-4-nano-medium"


def test_choose_unique_match_keeps_ambiguous_alias_collisions_loud() -> None:
    match, ambiguous = choose_unique_match(
        "Gemini 3.1 Pro Preview",
        [
            {"aa_model_slug": "gemini-3-pro", "normalized_name": "gemini 3 pro preview high"},
            {"aa_model_slug": "gemini-3-pro-low", "normalized_name": "gemini 3 pro preview low"},
            {"aa_model_slug": "gemini-1-0-pro", "normalized_name": "gemini 1 0 pro"},
        ],
        "normalized_name",
    )

    assert match is None
    assert [item["aa_model_slug"] for item in ambiguous] == [
        "gemini-3-pro",
        "gemini-3-pro-low",
    ]


def test_choose_unique_match_rejects_numeric_version_reordering_false_positive() -> None:
    match, ambiguous = choose_unique_match(
        "GPT-5.4",
        [
            {"aa_model_slug": "gpt-4-5", "normalized_name": "gpt 4 5"},
            {"aa_model_slug": "gpt-4-1", "normalized_name": "gpt 4 1"},
        ],
        "normalized_name",
    )

    assert match is None
    assert [item["aa_model_slug"] for item in ambiguous] == [
        "gpt-4-5",
        "gpt-4-1",
    ]


def test_choose_livebench_match_prefers_slug_specific_dated_variant() -> None:
    match, ambiguous = choose_livebench_match(
        "GPT-4o",
        [
            {"livebench_model_name": "gpt-4o-2024-05-13", "livebench_normalized_name": "gpt 4o"},
            {"livebench_model_name": "gpt-4o-2024-08-06", "livebench_normalized_name": "gpt 4o"},
            {"livebench_model_name": "gpt-4o-2024-11-20", "livebench_normalized_name": "gpt 4o"},
        ],
        openrouter_slug="openai/gpt-4o-2024-11-20",
        variant_label="Standard",
    )

    assert ambiguous == []
    assert match is not None
    assert match["livebench_model_name"] == "gpt-4o-2024-11-20"


def test_choose_livebench_match_prefers_plain_standard_variant() -> None:
    match, ambiguous = choose_livebench_match(
        "o1",
        [
            {"livebench_model_name": "o1", "livebench_normalized_name": "o1"},
            {"livebench_model_name": "o1-2024-12-17-high", "livebench_normalized_name": "o1 high"},
            {"livebench_model_name": "o1-2024-12-17-medium", "livebench_normalized_name": "o1 medium"},
        ],
        openrouter_slug="openai/o1-2024-12-17",
        variant_label="Standard",
    )

    assert ambiguous == []
    assert match is not None
    assert match["livebench_model_name"] == "o1"


def test_choose_livebench_match_rejects_fuzzy_false_positive() -> None:
    match, ambiguous = choose_livebench_match(
        "Nano Banana 2 (Gemini 3.1 Flash Image Preview)",
        [
            {"livebench_model_name": "gemini-2.0-flash", "livebench_normalized_name": "gemini 2 0 flash"},
        ],
        openrouter_slug="google/gemini-3.1-flash-image-preview-20260226",
        variant_label="Standard",
    )

    assert match is None
    assert ambiguous == []


def test_build_canonical_registry_matches_aa_exact_alias_when_reasoning_mode_labels_differ() -> None:
    rows, diagnostics = build_canonical_registry(
        openrouter_models=[
            {
                "openrouter_slug": "openai/gpt-5.4",
                "display_name": "GPT-5.4",
                "normalized_name": "gpt 5 4",
                "provider": "openai",
                "reasoning_mode": "standard",
                "variant_label": "Standard",
            }
        ],
        aa_models=[
            {
                "aa_source_key": "openai::gpt-5-4",
                "aa_model_slug": "gpt-5-4",
                "aa_creator_slug": "openai",
                "aa_display_name": "GPT-5.4 (xhigh)",
                "display_name": "GPT-5.4 (xhigh)",
                "normalized_name": "gpt 5 4 xhigh",
                "provider": "openai",
                "reasoning_mode": "reasoning",
            },
            {
                "aa_source_key": "openai::gpt-5-4-non-reasoning",
                "aa_model_slug": "gpt-5-4-non-reasoning",
                "aa_creator_slug": "openai",
                "aa_display_name": "GPT-5.4 (Non-reasoning)",
                "display_name": "GPT-5.4 (Non-reasoning)",
                "normalized_name": "gpt 5 4 nonreasoning",
                "provider": "openai",
                "reasoning_mode": "non_reasoning",
            },
        ],
        vals_models=[],
        livebench_models=[],
        manual_rows=[],
    )

    assert rows[0]["aa_model_slug"] == "gpt-5-4"
    assert rows[0]["has_aa"] is True
    assert any(item["source_key"] == "openai::gpt-5-4-non-reasoning" for item in diagnostics)


def test_build_canonical_registry_prefers_non_reasoning_opus_for_standard_variant() -> None:
    rows, diagnostics = build_canonical_registry(
        openrouter_models=[
            {
                "openrouter_slug": "anthropic/claude-4.6-opus",
                "display_name": "Claude Opus 4.6",
                "normalized_name": "claude opus 4 6",
                "provider": "anthropic",
                "reasoning_mode": "standard",
                "variant_label": "Standard",
            }
        ],
        aa_models=[
            {
                "aa_source_key": "anthropic::claude-opus-4-6",
                "aa_model_slug": "claude-opus-4-6",
                "aa_creator_slug": "anthropic",
                "aa_display_name": "Claude Opus 4.6 (Non-reasoning, High Effort)",
                "display_name": "Claude Opus 4.6 (Non-reasoning, High Effort)",
                "normalized_name": "claude opus 4 6 nonreasoning high effort",
                "provider": "anthropic",
                "reasoning_mode": "non_reasoning",
            },
            {
                "aa_source_key": "anthropic::claude-opus-4-6-adaptive",
                "aa_model_slug": "claude-opus-4-6-adaptive",
                "aa_creator_slug": "anthropic",
                "aa_display_name": "Claude Opus 4.6 (Adaptive Reasoning, Max Effort)",
                "display_name": "Claude Opus 4.6 (Adaptive Reasoning, Max Effort)",
                "normalized_name": "claude opus 4 6 adaptive reasoning max effort",
                "provider": "anthropic",
                "reasoning_mode": "reasoning",
            },
        ],
        vals_models=[],
        livebench_models=[],
        manual_rows=[],
    )

    assert rows[0]["aa_model_slug"] == "claude-opus-4-6"
    assert rows[0]["has_aa"] is True
    assert any(item["source_key"] == "anthropic::claude-opus-4-6-adaptive" for item in diagnostics)
