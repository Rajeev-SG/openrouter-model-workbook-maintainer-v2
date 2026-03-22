# OpenRouter / Artificial Analysis / Vals workbook maintainer

This repo regenerates an XLSX workbook that combines:
- **OpenRouter** model metadata and pricing
- **Artificial Analysis** model and provider metrics
- **Vals AI** model-guide metrics and benchmark rankings

The workbook generator is `regenerate_model_workbook.py`.

## What this repo is for

Use this when you want a repeatable way to maintain and expand a workbook like:
- `Overview`
- `Pricing_OpenRouter`
- `ArtificialAnalysis`
- `ValsAI`
- `Vals_Benchmarks`
- `Sources_Notes`

The generator intentionally mixes APIs and HTML scraping because the three source systems do not expose all desired fields through one clean shared API surface.

## Repo layout

```text
.
├── AGENT_TASK.md
├── Makefile
├── README.md
├── regenerate_model_workbook.py
├── requirements.txt
├── config/
│   └── model_map.csv
├── scripts/
│   ├── bootstrap.sh
│   ├── run_build.sh
│   └── run_refresh.sh
├── .env.example
└── out/
```

## What each input source is used for

- **OpenRouter**: model universe, slugs, context window, pricing
- **Artificial Analysis API**: model-level intelligence / speed / pricing fields
- **Artificial Analysis provider pages**: provider-level breakout fields such as cheapest provider, fastest provider, provider latency, provider tokens/sec
- **Vals AI public model pages**: accuracy, latency, cost, context, default provider, benchmark rank rows

## First run

1. Unzip the repo.
2. Open a terminal in the repo root.
3. Run:

```bash
make bootstrap
```

4. Edit `.env` and set at least:

```bash
AA_API_KEY=your_key_here
```

`OPENROUTER_API_KEY` is supported but optional.

5. Refresh the workbook:

```bash
make refresh
```

Your workbook will be written to:

```text
out/openrouter_model_pricing_performance.xlsx
```

## Daily commands

Build using cached source snapshots where possible:

```bash
make build
```

Refresh remote data and rebuild:

```bash
make refresh
```

Run syntax checks:

```bash
make validate
```

Print environment and path status:

```bash
make doctor
```

Package the repo for handoff:

```bash
make zip
```

## How to add or expand models

Edit `config/model_map.csv`.

Each logical model family should map:
- one OpenRouter slug and page URL
- zero or more Artificial Analysis variants
- zero or more Vals variants

The workbook is most reliable when you explicitly map variants instead of trying to infer cross-source equivalence from names alone.

### Mapping columns

- `family`
- `openrouter_slug`
- `openrouter_page_url`
- `notes`
- `aa_variant`
- `aa_model_slug`
- `aa_creator_slug`
- `aa_provider_url`
- `aa_intelligence_url`
- `aa_preferred`
- `vals_variant`
- `vals_model_url`
- `vals_preferred`

## Determinism / reproducibility

The generator is designed to be reproducible **if you keep the cache directory and mapping file stable**.

Mechanisms:
- raw remote responses are cached under `.cache_model_workbook/`
- rerunning without `--refresh` reuses the cached source payloads
- the workbook structure and formulas are generated from code
- cross-source joins are controlled by `config/model_map.csv`

For the most deterministic workflow:
1. run `make refresh`
2. commit `config/model_map.csv`
3. optionally preserve a timestamped snapshot of `.cache_model_workbook/`
4. rerun `make build` for identical-source rebuilds

## Operational notes

- If a source page layout changes, the scraper portion may need a parser adjustment.
- If a model exists on OpenRouter but not yet in Artificial Analysis or Vals, leave the missing side blank rather than inventing a join.
- Do not silently merge reasoning and non-reasoning variants.
- Keep the workbook formulas in place rather than replacing them with hardcoded values.

## Troubleshooting

### `AA_API_KEY` missing
Set it in `.env` and rerun `make refresh`.

### Workbook builds but some fields are blank
This usually means one of:
- no mapping exists for that variant
- the public page layout changed
- the source site no longer exposes the field in the same way

Check:
- `config/model_map.csv`
- the cached raw source file in `.cache_model_workbook/`
- the `Sources_Notes` sheet in the workbook

### I want a bigger model list
Add rows to `config/model_map.csv`, then rerun:

```bash
make refresh
```

## Agent handoff

If you are giving this to Claude Code or Codex, point it at `AGENT_TASK.md` first.
