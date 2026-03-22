from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Iterable

import yaml
from dateutil import parser as dtparser


PROVIDER_ALIASES = {
    "ai21": "ai21",
    "ai21 labs": "ai21",
    "alibaba": "alibaba",
    "allenai": "allen-institute-for-ai",
    "allen institute for ai": "allen-institute-for-ai",
    "amazon": "amazon",
    "anthropic": "anthropic",
    "cohere": "cohere",
    "cohere for ai": "cohere",
    "deepseek": "deepseek",
    "google": "google",
    "ibm": "ibm",
    "ibm granite": "ibm",
    "kimi": "moonshot-ai",
    "liquid": "liquid-ai",
    "liquid ai": "liquid-ai",
    "meta": "meta",
    "meta llama": "meta",
    "minimax": "minimax",
    "mistral": "mistral",
    "mistralai": "mistral",
    "moonshot": "moonshot-ai",
    "moonshot ai": "moonshot-ai",
    "moonshotai": "moonshot-ai",
    "nvidia": "nvidia",
    "nousresearch": "nous-research",
    "nous research": "nous-research",
    "openai": "openai",
    "qwen": "alibaba",
    "technology innovation institute": "tii",
    "tii": "tii",
    "tii uae": "tii",
    "x ai": "xai",
    "x-ai": "xai",
    "xai": "xai",
    "xiaomi": "xiaomi",
    "z ai": "z-ai",
    "z.ai": "z-ai",
    "zai": "z-ai",
}

REASONING_VARIANTS = {
    "high reasoning": "reasoning",
    "non thinking": "non_reasoning",
    "non-reasoning": "non_reasoning",
    "nonreasoning": "non_reasoning",
    "nonthinking": "non_reasoning",
    "reasoning": "reasoning",
    "thinking": "reasoning",
    "xhigh": "reasoning",
}

STOP_TOKENS = {
    "ai",
    "inc",
    "labs",
    "latest",
}

MATCH_DROP_TOKENS = {
    "base",
    "custom",
    "free",
    "high",
    "low",
    "medium",
    "miniimal",
    "minimal",
    "preview",
    "tools",
}

LEADING_PROVIDER_PREFIXES = (
    ("openai",),
    ("google",),
    ("anthropic",),
    ("meta",),
    ("moonshot", "ai"),
    ("moonshotai",),
    ("moonshot",),
    ("xai",),
    ("alibaba",),
    ("minimax",),
    ("xiaomi",),
    ("nvidia",),
    ("bytedance", "seed"),
    ("bytedance",),
    ("liquid", "ai"),
    ("liquidai",),
    ("liquid",),
    ("amazon",),
    ("cohere",),
    ("z", "ai"),
    ("zai",),
)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-").lower()


def load_yaml(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(payload, indent=2, sort_keys=False), encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "").replace("$", "")
    try:
        return float(Decimal(text))
    except (InvalidOperation, ValueError):
        return None


def parse_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    text = str(value).strip().replace(",", "").lower()
    multiplier = 1
    if text.endswith("k"):
        multiplier = 1_000
        text = text[:-1]
    elif text.endswith("m"):
        multiplier = 1_000_000
        text = text[:-1]
    try:
        return int(float(text) * multiplier)
    except ValueError:
        return None


def parse_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return dtparser.parse(value, fuzzy=True).date().isoformat()
    except Exception:
        return None


def compact_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def canonical_provider(raw: str | None) -> str | None:
    if not raw:
        return None
    key = compact_text(raw).lower().replace("/", " ").replace("_", " ").replace("-", " ")
    return PROVIDER_ALIASES.get(key, slugify(key))


def detect_reasoning_mode(*values: str | None) -> str:
    text = " ".join(value or "" for value in values).lower()
    for token, mode in REASONING_VARIANTS.items():
        if token in text:
            return mode
    return "standard"


def strip_dates(value: str) -> str:
    value = re.sub(r"\b20\d{2}[-/]\d{2}[-/]\d{2}\b", " ", value)
    value = re.sub(r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b", " ", value)
    value = re.sub(r"\((?:\d{1,2}/\d{2,4}|[0-9]{2}/[0-9]{4}|[0-9]{4})\)", " ", value)
    return value


def normalized_name(value: str | None) -> str:
    if not value:
        return ""
    value = strip_dates(value.lower())
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = value.replace("non thinking", "nonthinking")
    value = value.replace("non reasoning", "nonreasoning")
    value = value.replace("high reasoning", "reasoning")
    tokens = [token for token in value.split() if token and token not in STOP_TOKENS]
    for prefix in LEADING_PROVIDER_PREFIXES:
        if tokens[: len(prefix)] == list(prefix):
            candidate = tokens[len(prefix) :]
            if len(candidate) >= 2:
                tokens = candidate
            break
    return " ".join(tokens)


def match_normalized_name(value: str | None) -> str:
    base = normalized_name(value)
    if not base:
        return ""
    tokens = [token for token in base.split() if token not in MATCH_DROP_TOKENS]
    normalized = " ".join(tokens)
    normalized = normalized.replace("chatgpt", "chat")
    normalized = re.sub(r"\b([a-z]+)\s+3\s+1\s+(pro|flash)\b", r"\1 3 \2", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def coalesce(*values: Any) -> Any:
    for value in values:
        if value not in (None, "", [], {}):
            return value
    return None


def percentile_from_rank(rank: int | None, population: int | None) -> float | None:
    if rank is None or population is None or population <= 1:
        return None
    return 1 - ((rank - 1) / (population - 1))


def mean(values: Iterable[float | None]) -> float | None:
    present = [value for value in values if value is not None]
    if not present:
        return None
    return sum(present) / len(present)
