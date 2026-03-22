from model_intel.identity import choose_unique_match


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
