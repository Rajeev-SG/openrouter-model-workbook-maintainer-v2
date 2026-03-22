# Agent task: maintain and expand the model workbook

You are operating inside a small repo that regenerates an XLSX workbook comparing models across OpenRouter, Artificial Analysis, and Vals AI.

## Objective

Maintain this repo so that it can reliably regenerate the workbook and expand to additional models when requested.

## Your immediate workflow

1. Read `README.md`.
2. Read `config/model_map.csv`.
3. Read `regenerate_model_workbook.py`.
4. Run:

```bash
make bootstrap
make doctor
make validate
```

5. If environment variables are populated, run:

```bash
make refresh
```

6. Inspect the resulting workbook and the `Sources_Notes` sheet for parser warnings or missing fields.

## Rules

- Prefer official source pages and documented APIs.
- Do not invent joins across sources.
- Do not silently collapse reasoning and non-reasoning variants.
- Keep `config/model_map.csv` explicit and versioned.
- Preserve cached raw source files when debugging parser drift.
- If a scraper breaks, fix the parser and explain what changed on the source page.
- If you add models, update the README where necessary.

## When asked to add models

For each requested model family:
- confirm the current OpenRouter slug and page URL
- identify the relevant Artificial Analysis model slug(s) and provider page(s)
- identify the relevant Vals model page(s)
- append rows to `config/model_map.csv`
- run `make refresh`
- inspect the workbook for blanks, parser failures, or inconsistent variants

## Acceptance criteria

- `make validate` passes
- `make refresh` completes when credentials are present
- workbook is generated under `out/`
- mapping changes are explicit in `config/model_map.csv`
- README stays aligned with how the repo actually works
