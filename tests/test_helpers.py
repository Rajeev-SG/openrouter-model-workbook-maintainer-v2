from model_intel.helpers import canonical_provider, normalized_name


def test_canonical_provider_maps_cross_source_aliases() -> None:
    assert canonical_provider("moonshotai") == "moonshot-ai"
    assert canonical_provider("meta-llama") == "meta"
    assert canonical_provider("qwen") == "alibaba"
    assert canonical_provider("mistralai") == "mistral"


def test_normalized_name_strips_leading_provider_prefix_and_dates() -> None:
    assert normalized_name("OpenAI GPT-4o-mini (2024-07-18)") == "gpt 4o mini"
    assert normalized_name("Moonshot AI Kimi K2 Thinking") == "kimi k2 thinking"
    assert normalized_name("Meta Llama 4 Maverick") == "llama 4 maverick"
