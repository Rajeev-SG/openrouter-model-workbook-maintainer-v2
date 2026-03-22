from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path
from typing import Any

from rapidfuzz import fuzz

from .helpers import canonical_provider, detect_reasoning_mode, normalized_name, slugify


def load_manual_links(path: Path) -> list[dict[str, Any]]:
    rows = []
    if not path.exists():
        return rows
    with path.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(row)
    return rows


def make_manual_canonical_id(row: dict[str, str]) -> str:
    variant = row.get("aa_variant") or row.get("vals_variant") or row.get("family")
    return slugify(f"{row['family']}::{variant}")


def score_match(anchor_name: str, candidate_name: str) -> int:
    return int(fuzz.token_set_ratio(anchor_name, candidate_name))


def choose_unique_match(anchor_name: str, candidates: list[dict[str, Any]], name_key: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    if not candidates:
        return None, []
    anchor_normalized = normalized_name(anchor_name)
    exact_matches = [
        candidate
        for candidate in candidates
        if normalized_name(candidate.get(name_key, "")) == anchor_normalized
    ]
    if len(exact_matches) == 1:
        return exact_matches[0], []
    if len(exact_matches) > 1:
        return None, exact_matches[:3]
    scored = sorted(
        (
            {
                "candidate": candidate,
                "score": score_match(anchor_name, candidate.get(name_key, "")),
            }
            for candidate in candidates
        ),
        key=lambda item: item["score"],
        reverse=True,
    )
    top = scored[0]
    second = scored[1] if len(scored) > 1 else None
    if top["score"] < 92:
        return None, [item["candidate"] for item in scored[:3]]
    if second and second["score"] >= top["score"] - 3:
        return None, [item["candidate"] for item in scored[:3]]
    return top["candidate"], []


def choose_exact_unique_match(anchor_name: str, candidates: list[dict[str, Any]], name_key: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    if not candidates:
        return None, []
    anchor_normalized = normalized_name(anchor_name)
    exact_matches = [
        candidate
        for candidate in candidates
        if normalized_name(candidate.get(name_key, "")) == anchor_normalized
    ]
    if len(exact_matches) == 1:
        return exact_matches[0], []
    if len(exact_matches) > 1:
        return None, exact_matches[:3]
    return None, []


def build_canonical_registry(
    openrouter_models: list[dict[str, Any]],
    aa_models: list[dict[str, Any]],
    vals_models: list[dict[str, Any]],
    livebench_models: list[dict[str, Any]],
    manual_rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rows: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []
    consumed = {
        "openrouter": set(),
        "aa": set(),
        "vals": set(),
        "livebench": set(),
    }

    openrouter_by_slug = {item["openrouter_slug"]: item for item in openrouter_models}
    aa_by_slug = {(item["aa_creator_slug"], item["aa_model_slug"]): item for item in aa_models}
    vals_by_url = {item["vals_model_url"]: item for item in vals_models}
    livebench_by_name = {normalized_name(item["livebench_model_name"]): item for item in livebench_models}

    for manual in manual_rows:
        canonical_id = make_manual_canonical_id(manual)
        provider = canonical_provider(manual.get("openrouter_slug", "").split("/")[0] or manual.get("aa_creator_slug"))
        aa_model = aa_by_slug.get((manual.get("aa_creator_slug") or None, manual.get("aa_model_slug") or ""))
        if aa_model is None and manual.get("aa_model_slug"):
            aa_model = next(
                (item for item in aa_models if item["aa_model_slug"] == manual["aa_model_slug"]),
                None,
            )
        vals_model = vals_by_url.get(manual.get("vals_model_url") or "")
        openrouter_model = openrouter_by_slug.get(manual.get("openrouter_slug") or "")
        if openrouter_model is None:
            openrouter_candidates = [
                item for item in openrouter_models if item["provider"] == provider
            ]
            openrouter_model, _ = choose_unique_match(
                manual.get("family", ""),
                openrouter_candidates,
                "display_name",
            )
        livebench_model = None
        manual_names = [
            manual.get("family", ""),
            manual.get("aa_variant", ""),
            manual.get("vals_variant", ""),
        ]
        manual_norm = normalized_name(" ".join(manual_names))
        if manual_norm in livebench_by_name:
            livebench_model = livebench_by_name[manual_norm]
        else:
            match, _ = choose_unique_match(
                manual_norm,
                livebench_models,
                "livebench_normalized_name",
            )
            livebench_model = match

        row = {
            "canonical_model_id": canonical_id,
            "canonical_family": manual["family"],
            "canonical_variant": manual.get("aa_variant") or manual.get("vals_variant") or "Standard",
            "provider": provider,
            "reasoning_mode": detect_reasoning_mode(
                manual.get("aa_variant"),
                manual.get("vals_variant"),
                manual.get("family"),
            ),
            "match_strategy": "manual",
            "normalization_notes": manual.get("notes") or "",
            "openrouter_slug": openrouter_model["openrouter_slug"] if openrouter_model else (manual.get("openrouter_slug") or None),
            "aa_model_slug": manual.get("aa_model_slug") or None,
            "vals_model_url": manual.get("vals_model_url") or None,
            "livebench_model_name": livebench_model["livebench_model_name"] if livebench_model else None,
        }
        row.update(_coverage_flags(openrouter_model, aa_model, vals_model, livebench_model))
        rows.append(row)
        if openrouter_model:
            consumed["openrouter"].add(openrouter_model["openrouter_slug"])
        if aa_model:
            consumed["aa"].add(aa_model["aa_source_key"])
        if vals_model:
            consumed["vals"].add(vals_model["vals_model_url"])
        if livebench_model:
            consumed["livebench"].add(livebench_model["livebench_model_name"])

    aa_by_provider: dict[str, list[dict[str, Any]]] = defaultdict(list)
    vals_by_provider: dict[str, list[dict[str, Any]]] = defaultdict(list)
    livebench_by_provider: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in aa_models:
        aa_by_provider[item["provider"]].append(item)
    for item in vals_models:
        vals_by_provider[item["provider"]].append(item)
    for item in livebench_models:
        livebench_by_provider[item["provider"]].append(item)

    for openrouter_model in openrouter_models:
        if openrouter_model["openrouter_slug"] in consumed["openrouter"]:
            continue
        anchor_name = openrouter_model["normalized_name"]
        provider = openrouter_model["provider"]
        reasoning_mode = openrouter_model["reasoning_mode"]

        aa_candidates = [
            candidate
            for candidate in aa_by_provider.get(provider, [])
            if candidate["reasoning_mode"] == reasoning_mode
            and candidate["aa_source_key"] not in consumed["aa"]
        ]
        vals_candidates = [
            candidate
            for candidate in vals_by_provider.get(provider, [])
            if candidate["reasoning_mode"] == reasoning_mode
            and candidate["vals_model_url"] not in consumed["vals"]
        ]
        livebench_candidates = [
            candidate
            for candidate in livebench_by_provider.get(provider, [])
            if candidate["livebench_model_name"] not in consumed["livebench"]
        ]
        if not livebench_candidates:
            livebench_candidates = [
                candidate
                for candidate in livebench_models
                if candidate["livebench_model_name"] not in consumed["livebench"]
            ]
        aa_match, aa_ambiguous = choose_unique_match(anchor_name, aa_candidates, "normalized_name")
        vals_match, vals_ambiguous = choose_unique_match(anchor_name, vals_candidates, "normalized_name")
        livebench_match, livebench_ambiguous = choose_unique_match(anchor_name, livebench_candidates, "livebench_normalized_name")

        if aa_match is None and not aa_ambiguous:
            aa_match, aa_ambiguous = choose_exact_unique_match(
                anchor_name,
                [
                    candidate
                    for candidate in aa_models
                    if candidate["reasoning_mode"] == reasoning_mode
                    and candidate["aa_source_key"] not in consumed["aa"]
                ],
                "normalized_name",
            )
        if vals_match is None and not vals_ambiguous:
            vals_match, vals_ambiguous = choose_exact_unique_match(
                anchor_name,
                [
                    candidate
                    for candidate in vals_models
                    if candidate["reasoning_mode"] == reasoning_mode
                    and candidate["vals_model_url"] not in consumed["vals"]
                ],
                "normalized_name",
            )
        if livebench_match is None and not livebench_ambiguous:
            livebench_match, livebench_ambiguous = choose_exact_unique_match(
                anchor_name,
                [
                    candidate
                    for candidate in livebench_models
                    if candidate["livebench_model_name"] not in consumed["livebench"]
                ],
                "livebench_normalized_name",
            )

        row = {
            "canonical_model_id": slugify(openrouter_model["openrouter_slug"]),
            "canonical_family": openrouter_model["display_name"],
            "canonical_variant": openrouter_model["variant_label"],
            "provider": provider,
            "reasoning_mode": reasoning_mode,
            "match_strategy": "auto",
            "normalization_notes": "",
            "openrouter_slug": openrouter_model["openrouter_slug"],
            "aa_model_slug": aa_match["aa_model_slug"] if aa_match else None,
            "vals_model_url": vals_match["vals_model_url"] if vals_match else None,
            "livebench_model_name": livebench_match["livebench_model_name"] if livebench_match else None,
        }
        row.update(_coverage_flags(openrouter_model, aa_match, vals_match, livebench_match))
        rows.append(row)
        consumed["openrouter"].add(openrouter_model["openrouter_slug"])
        if aa_match:
            consumed["aa"].add(aa_match["aa_source_key"])
        if vals_match:
            consumed["vals"].add(vals_match["vals_model_url"])
        if livebench_match:
            consumed["livebench"].add(livebench_match["livebench_model_name"])

        if aa_ambiguous or vals_ambiguous or livebench_ambiguous:
            diagnostics.append(
                {
                    "canonical_model_id": row["canonical_model_id"],
                    "type": "ambiguous-auto-match",
                    "openrouter_slug": openrouter_model["openrouter_slug"],
                    "aa_candidates": [item["aa_model_slug"] for item in aa_ambiguous],
                    "vals_candidates": [item["vals_model_url"] for item in vals_ambiguous],
                    "livebench_candidates": [item["livebench_model_name"] for item in livebench_ambiguous],
                }
            )

    for source_name, source_rows in (
        ("aa", aa_models),
        ("vals", vals_models),
        ("livebench", livebench_models),
    ):
        for item in source_rows:
            if source_name == "aa":
                key = item["aa_source_key"]
            elif source_name == "vals":
                key = item["vals_model_url"]
            else:
                key = item["livebench_model_name"]
            if key in consumed[source_name]:
                continue
            diagnostics.append(
                {
                    "type": f"unmatched-{source_name}",
                    "source_key": key,
                    "provider": item["provider"],
                    "display_name": item.get("display_name") or item.get("livebench_model_name"),
                }
            )

    return rows, diagnostics


def _coverage_flags(
    openrouter_model: dict[str, Any] | None,
    aa_model: dict[str, Any] | None,
    vals_model: dict[str, Any] | None,
    livebench_model: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "has_openrouter": bool(openrouter_model),
        "has_aa": bool(aa_model),
        "has_vals": bool(vals_model),
        "has_livebench": bool(livebench_model),
    }
