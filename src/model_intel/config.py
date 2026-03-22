from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .helpers import load_yaml


@dataclass(slots=True)
class RunConfig:
    repo_root: Path
    cache_dir: Path
    workbook_path: Path
    data_dir: Path
    site_data_dir: Path
    mapping_csv: Path
    cohort_rules_path: Path
    scenario_profiles_path: Path


def make_run_config(
    repo_root: Path,
    cache_dir: Path,
    workbook_path: Path,
    data_dir: Path,
    site_data_dir: Path,
    mapping_csv: Path,
) -> RunConfig:
    return RunConfig(
        repo_root=repo_root,
        cache_dir=cache_dir,
        workbook_path=workbook_path,
        data_dir=data_dir,
        site_data_dir=site_data_dir,
        mapping_csv=mapping_csv,
        cohort_rules_path=repo_root / "config" / "cohort_rules.yaml",
        scenario_profiles_path=repo_root / "config" / "scenarios" / "default_profiles.yaml",
    )


def load_cohort_rules(path: Path) -> dict:
    return load_yaml(path)


def load_scenario_profiles(path: Path) -> dict:
    return load_yaml(path)
