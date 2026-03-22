from __future__ import annotations

import argparse
from pathlib import Path

from .config import make_run_config
from .pipeline import run_pipeline


def main() -> int:
    parser = argparse.ArgumentParser(description="Build deterministic model intelligence datasets and workbook outputs.")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--cache-dir", type=Path, default=Path(".cache_model_workbook"))
    parser.add_argument("--workbook", type=Path, default=Path("out/openrouter_model_pricing_performance.xlsx"))
    parser.add_argument("--data-dir", type=Path, default=Path("data/latest"))
    parser.add_argument("--site-data-dir", type=Path, default=Path("site/public/data/latest"))
    parser.add_argument("--mapping-csv", type=Path, default=Path("config/model_map.csv"))
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()

    config = make_run_config(
        repo_root=args.repo_root.resolve(),
        cache_dir=(args.repo_root / args.cache_dir).resolve(),
        workbook_path=(args.repo_root / args.workbook).resolve(),
        data_dir=(args.repo_root / args.data_dir).resolve(),
        site_data_dir=(args.repo_root / args.site_data_dir).resolve(),
        mapping_csv=(args.repo_root / args.mapping_csv).resolve(),
    )
    run_pipeline(config, refresh=args.refresh)
    print(f"Workbook written to: {config.workbook_path}")
    print(f"Data outputs written to: {config.data_dir}")
    print(f"Site data written to: {config.site_data_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
