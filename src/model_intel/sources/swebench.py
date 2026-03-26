from __future__ import annotations

from typing import Any

from ..fetch import CachedFetcher
from ..helpers import canonical_provider, normalized_name, parse_date, parse_float


SWE_BENCH_LEADERBOARD_JSON_URL = "https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json"
SWE_BENCH_LEADERBOARD_PAGE_URL = "https://www.swebench.com/verified.html"


def fetch_swebench_leaderboards(fetcher: CachedFetcher) -> list[dict[str, Any]]:
    payload = fetcher.get_json(
        SWE_BENCH_LEADERBOARD_JSON_URL,
        "swebench",
        "leaderboards",
    )
    rows = parse_swebench_leaderboards(payload)
    fetcher.write_snapshot_metadata(
        "swebench",
        {
            "source_url": SWE_BENCH_LEADERBOARD_JSON_URL,
            "parser_version": "2026-03-26-swebench-v1",
            "record_count": len(rows),
        },
    )
    return rows


def parse_swebench_leaderboards(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for board in payload.get("leaderboards", []):
        board_name = board.get("name")
        if board_name not in {"bash-only", "Verified"}:
            continue
        for item in board.get("results", []):
            model_tag = _tag_value(item.get("tags") or [], "Model:")
            org_tag = _tag_value(item.get("tags") or [], "Org:")
            rows.append(
                {
                    "swebench_board": board_name,
                    "swebench_model_name": item.get("name"),
                    "swebench_model_tag": model_tag,
                    "provider": canonical_provider(org_tag),
                    "normalized_name": normalized_name(model_tag or item.get("name")),
                    "swebench_resolved": parse_float(item.get("resolved")),
                    "swebench_date": parse_date(item.get("date")),
                    "swebench_model_url": item.get("site"),
                    "swebench_leaderboard_url": SWE_BENCH_LEADERBOARD_PAGE_URL,
                }
            )
    return rows


def _tag_value(tags: list[str], prefix: str) -> str | None:
    for tag in tags:
        if tag.startswith(prefix):
            return tag.removeprefix(prefix).strip()
    return None
