from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

from ..fetch import CachedFetcher
from ..helpers import canonical_provider, compact_text, normalized_name, parse_date, parse_float


TOOLATHLON_LEADERBOARD_URL = "https://toolathlon.xyz/docs/leaderboard"


def fetch_toolathlon_leaderboard(fetcher: CachedFetcher) -> list[dict[str, Any]]:
    html = fetcher.get_text(
        TOOLATHLON_LEADERBOARD_URL,
        "toolathlon",
        "leaderboard",
    )
    rows = parse_toolathlon_leaderboard(html)
    fetcher.write_snapshot_metadata(
        "toolathlon",
        {
            "source_url": TOOLATHLON_LEADERBOARD_URL,
            "parser_version": "2026-03-26-toolathlon-v1",
            "record_count": len(rows),
        },
    )
    return rows


def parse_toolathlon_leaderboard(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict[str, Any]] = []
    for row in soup.select("table.performance-table tbody tr"):
        cells = row.find_all("td")
        if len(cells) < 8:
            continue
        provider_label = compact_text((cells[0].find("svg").find("title").get_text(" ", strip=True) if cells[0].find("svg") and cells[0].find("title") else ""))  # type: ignore[union-attr]
        provider = canonical_provider(re.sub(r"\s+icon$", "", provider_label, flags=re.I))
        model_name = _extract_model_name(cells[0], provider_label)
        model_link = cells[0].find("a")
        rows.append(
            {
                "toolathlon_model_name": model_name,
                "provider": provider,
                "normalized_name": normalized_name(model_name),
                "toolathlon_model_url": model_link.get("href") if model_link else None,
                "toolathlon_leaderboard_url": TOOLATHLON_LEADERBOARD_URL,
                "toolathlon_model_type": compact_text(cells[1].get_text(" ", strip=True)),
                "toolathlon_agent": compact_text(cells[2].get_text(" ", strip=True)),
                "toolathlon_date": parse_date(cells[3].get_text(" ", strip=True)),
                "toolathlon_pass_at_1": _extract_score(cells[4].get_text(" ", strip=True)),
                "toolathlon_pass_at_3": _extract_score(cells[5].get_text(" ", strip=True)),
                "toolathlon_pass_power_3": _extract_score(cells[6].get_text(" ", strip=True)),
                "toolathlon_turns": _extract_score(cells[7].get_text(" ", strip=True)),
                "toolathlon_verified": bool(cells[0].select_one(".verified-badge")),
            }
        )
    return rows


def _extract_model_name(cell, provider_label: str) -> str:
    link = cell.find("a")
    if link:
        return compact_text(link.get_text(" ", strip=True))
    text = compact_text(cell.get_text(" ", strip=True))
    if provider_label and text.startswith(provider_label):
        text = text[len(provider_label) :].strip()
    return text.replace("✓", "").strip()


def _extract_score(value: str) -> float | None:
    if not value or value == "—":
        return None
    match = re.search(r"[\d.]+", value)
    return parse_float(match.group(0)) if match else None
