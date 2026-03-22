# Model Intelligence Maintainer

This repo builds and maintains two outputs from cached, auditable source data:

- a deterministic model intelligence dataset plus workbook
- a static interactive guide for answering "what model should I use?"

The project expands the original workbook maintainer into a daily-refreshable pipeline with:

- a `master registry` for all discovered candidates
- a `guide cohort` for all models with matched OpenRouter + Artificial Analysis coverage
- a `strict cohort` flag for the smaller OpenRouter + AA + Vals subset
- explicit `vals_enriched` and `livebench_enriched` flags
- the full currently exposed Artificial Analysis metric family carried into normalized outputs
- explicit source manifests, mapping diagnostics, and exclusion reasons

## What it uses

- OpenRouter for routed model metadata and pricing
- Artificial Analysis for model performance and provider data
- Vals for application-style quality, latency, and cost signals
- LiveBench for public benchmark enrichment

## Outputs

- `data/latest/*.json`
  Deterministic machine-readable datasets for the guide and workbook.
- `data/latest/*.parquet`
  Columnar exports for list-shaped datasets.
- `out/openrouter_model_pricing_performance.xlsx`
  The workbook with cohort, coverage, benchmark, recommendation, and diagnostics sheets.
- `site/dist/`
  Static build of the guide.

## Quickstart

```bash
make bootstrap
make refresh
make serve-site
```

`make bootstrap` installs and pins an `uv`-managed Python `3.13` environment because the workbook pipeline depends on wheels that are not consistently available on Python `3.14` yet.

## Common commands

```bash
make bootstrap
make doctor
make validate
make test
make build
make refresh
make refresh-from-cache
make build-site
make serve-site
make build-all
```

## Cohort policy

The repo intentionally maintains two model universes:

1. `Master registry`
   All discovered candidates across the source systems, including partial coverage and ambiguous backlog entries.
2. `Guide cohort`
   Models with matched OpenRouter + Artificial Analysis coverage. This is the live guide universe.

Vals and LiveBench are tracked as enrichment layers:

- `cohort_eligible=true`
  Matched OpenRouter + AA coverage for the live guide.
- `strict_cohort_eligible=true`
  Guide rows that also have Vals coverage for the stricter application-quality subset.
- `vals_enriched=true`
  The row has Vals coverage and can expose application-style benchmark signals.
- `livebench_enriched=true`
  The row has LiveBench coverage and can expose category and task benchmark signals.

This prevents the live guide from hiding useful OpenRouter + AA models just because a secondary benchmark source has gaps, while still preserving explicit provenance and stricter benchmark subsets.

The current cohort rules live in [config/cohort_rules.yaml](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/config/cohort_rules.yaml).

## Repo structure

```text
.
├── config/
│   ├── cohort_rules.yaml
│   ├── model_map.csv
│   └── scenarios/default_profiles.yaml
├── data/latest/
├── docs/
├── site/
├── src/model_intel/
├── tests/
├── Makefile
├── pyproject.toml
└── regenerate_model_workbook.py
```

## Daily automation

Two GitHub Actions workflows are included:

- `ci.yml`
  Fast repo validation on pushes and pull requests.
- `daily-refresh.yml`
  Scheduled refresh, static-site deployment, and artifact upload.

The daily workflow needs:

- `AA_API_KEY`

Optional:

- `OPENROUTER_API_KEY`

## Deployment

The static guide is set up for GitHub Pages-style hosting via the `VITE_BASE_PATH` env var. The daily workflow deploys `site/dist` as a Pages artifact after a successful refresh.

For manual preview deployments, the repo now includes [vercel.json](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/vercel.json), which tells Vercel to build and publish the static guide from `site/dist` instead of trying to treat the ETL repo root as a Python web app.

## Docs

- [PRD](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/prd.md)
- [Task Breakdown](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/task-breakdown.md)
- [Methodology](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/methodology.md)
- [Data Sources](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/data-sources.md)
- [Identity And Mapping](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/identity-and-mapping.md)
- [Operations](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/operations.md)
- [Troubleshooting](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/troubleshooting.md)
- [Maintainer Notes](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/maintainer-notes.md)

## Notes

- Raw source payloads are cached under `.cache_model_workbook/`.
- Rebuilds are deterministic from cache when source files and config remain unchanged.
- The guide reads generated datasets only. It does not scrape live sources at runtime.
- Missing values are preserved. Ambiguous joins fail into diagnostics instead of being silently invented.
