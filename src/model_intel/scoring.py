from __future__ import annotations

from typing import Any

from .helpers import mean, percentile_from_rank


SCORE_FIELDS = {
    "budget": ("value_cost_score", True),
    "coding": ("coding_strength_score", False),
    "latency": ("latency_score", False),
    "long_context": ("context_score", False),
    "reasoning": ("reasoning_strength_score", False),
    "value": ("overall_value_score", False),
}


def enrich_model_scores(rows: list[dict[str, Any]], profiles: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    _derive_metric_scores(rows)
    scenario_rows: list[dict[str, Any]] = []
    for profile_name, config in profiles["profiles"].items():
        weights = config["weights"]
        for row in rows:
            explanation = {}
            total = 0.0
            for factor, weight in weights.items():
                field_name, invert = SCORE_FIELDS[factor]
                value = row.get(field_name)
                contribution = 0.0 if value is None else value * weight
                explanation[factor] = {
                    "weight": weight,
                    "normalized_input": value,
                    "contribution": contribution,
                }
                total += contribution
            scenario_rows.append(
                {
                    "canonical_model_id": row["canonical_model_id"],
                    "scenario_profile": profile_name,
                    "scenario_label": config["label"],
                    "scenario_score": round(total, 4),
                    "explanation": explanation,
                }
            )
    return rows, scenario_rows


def _derive_metric_scores(rows: list[dict[str, Any]]) -> None:
    metrics = {
        "reasoning_strength_score": [row.get("aa_intelligence_index") for row in rows],
        "coding_strength_score": [row.get("aa_coding_index") for row in rows],
        "latency_score": [row.get("aa_median_tokens_per_second") for row in rows],
        "context_score": [row.get("openrouter_context_tokens") for row in rows],
        "value_cost_score": [row.get("openrouter_blended_price_per_million") for row in rows],
        "overall_value_score": [
            mean(
                [
                    percentile_from_rank(row.get("vals_index_rank"), row.get("vals_index_population")),
                    row.get("livebench_overall_score"),
                ]
            )
            for row in rows
        ],
    }
    normalized = {
        name: _normalize(values, invert=name == "value_cost_score")
        for name, values in metrics.items()
    }
    for index, row in enumerate(rows):
        for score_name, values in normalized.items():
            row[score_name] = values[index]


def _normalize(values: list[float | int | None], invert: bool = False) -> list[float | None]:
    present = [float(value) for value in values if value is not None]
    if not present:
        return [None for _ in values]
    minimum = min(present)
    maximum = max(present)
    if maximum == minimum:
        return [1.0 if value is not None else None for value in values]
    results = []
    for value in values:
        if value is None:
            results.append(None)
            continue
        normalized = (float(value) - minimum) / (maximum - minimum)
        results.append(1 - normalized if invert else normalized)
    return results
