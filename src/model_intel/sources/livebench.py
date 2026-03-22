from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from ..fetch import CachedFetcher
from ..helpers import canonical_provider, normalized_name, write_json


LIVEBENCH_PARQUET_URL = (
    "https://huggingface.co/datasets/livebench/model_judgment/resolve/main/data/leaderboard-00000-of-00001.parquet"
)


def fetch_livebench_scores(fetcher: CachedFetcher) -> list[dict[str, Any]]:
    parquet_path = fetcher.download_file(
        LIVEBENCH_PARQUET_URL,
        "livebench",
        "model_judgment_leaderboard",
        "parquet",
    )
    fetcher.write_snapshot_metadata(
        "livebench",
        {
            "source_url": LIVEBENCH_PARQUET_URL,
            "parser_version": "2026-03-22-livebench-v1",
            "artifact": str(parquet_path.name),
        },
    )
    return _aggregate_livebench(parquet_path)


def _aggregate_livebench(parquet_path: Path) -> list[dict[str, Any]]:
    frame = pd.read_parquet(parquet_path)
    required = {"model", "score", "task", "category"}
    missing = required - set(frame.columns)
    if missing:
        raise RuntimeError(f"LiveBench parquet schema drifted; missing columns: {sorted(missing)}")
    frame = frame[list(required)].copy()
    frame["score"] = frame["score"] * 100
    frame["model"] = frame["model"].astype(str)
    task_means = (
        frame.groupby(["model", "task"], as_index=False)["score"]
        .mean()
        .rename(columns={"score": "task_score"})
    )
    category_means = (
        frame.groupby(["model", "category"], as_index=False)["score"]
        .mean()
        .rename(columns={"score": "category_score"})
    )
    overall_means = (
        frame.groupby("model", as_index=False)["score"]
        .mean()
        .rename(columns={"score": "livebench_overall_score"})
    )
    rows: list[dict[str, Any]] = []
    for overall in overall_means.to_dict(orient="records"):
        model_name = overall["model"]
        category_rows = category_means[category_means["model"] == model_name].to_dict(orient="records")
        task_rows = task_means[task_means["model"] == model_name].to_dict(orient="records")
        provider = canonical_provider(model_name.split("/", 1)[0]) if "/" in model_name else None
        rows.append(
            {
                "livebench_model_name": model_name,
                "display_name": model_name,
                "provider": provider or "unknown",
                "livebench_normalized_name": normalized_name(model_name),
                "livebench_overall_score": float(overall["livebench_overall_score"]),
                "livebench_categories": {
                    item["category"]: float(item["category_score"]) for item in category_rows
                },
                "livebench_tasks": {
                    item["task"]: float(item["task_score"]) for item in task_rows
                },
            }
        )
    return rows
