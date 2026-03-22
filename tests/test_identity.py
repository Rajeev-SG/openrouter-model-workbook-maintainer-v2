from model_intel.identity import choose_unique_match


def test_choose_unique_match_prefers_exact_normalized_name() -> None:
    candidates = [
        {"display_name": "DeepSeek V3.2 Exp"},
        {"display_name": "DeepSeek V3.2"},
        {"display_name": "DeepSeek V3.2 Speciale"},
    ]

    match, ambiguous = choose_unique_match("DeepSeek V3.2", candidates, "display_name")

    assert match == {"display_name": "DeepSeek V3.2"}
    assert ambiguous == []


def test_choose_unique_match_reports_exact_ambiguity() -> None:
    candidates = [
        {"display_name": "GPT-5.4 Mini"},
        {"display_name": "GPT 5.4 Mini"},
    ]

    match, ambiguous = choose_unique_match("GPT 5.4 Mini", candidates, "display_name")

    assert match is None
    assert ambiguous == candidates
