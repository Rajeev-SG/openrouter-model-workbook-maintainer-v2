#!/usr/bin/env python3
"""Compatibility wrapper for the vNext model intelligence pipeline."""

from __future__ import annotations

import argparse
from pathlib import Path

from model_intel.config import make_run_config
from model_intel.pipeline import run_pipeline


def main() -> int:
    parser = argparse.ArgumentParser(description="Regenerate the model intelligence workbook and datasets.")
    parser.add_argument("--out", type=Path, default=Path("out/openrouter_model_pricing_performance.xlsx"))
    parser.add_argument("--cache-dir", type=Path, default=Path(".cache_model_workbook"))
    parser.add_argument("--mapping-csv", type=Path, default=Path("config/model_map.csv"))
    parser.add_argument("--data-dir", type=Path, default=Path("data/latest"))
    parser.add_argument("--site-data-dir", type=Path, default=Path("site/public/data/latest"))
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()

    repo_root = Path.cwd()
    config = make_run_config(
        repo_root=repo_root,
        cache_dir=(repo_root / args.cache_dir).resolve(),
        workbook_path=(repo_root / args.out).resolve(),
        data_dir=(repo_root / args.data_dir).resolve(),
        site_data_dir=(repo_root / args.site_data_dir).resolve(),
        mapping_csv=(repo_root / args.mapping_csv).resolve(),
    )
    run_pipeline(config, refresh=args.refresh)
    print(f"Wrote workbook to: {config.workbook_path}")
    print(f"Wrote datasets to: {config.data_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
