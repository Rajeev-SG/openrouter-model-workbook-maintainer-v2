# Identity And Mapping

## Purpose

The identity layer keeps source-specific slugs separate from the canonical guide row.

## Mapping sources

- explicit rows in [config/model_map.csv](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/config/model_map.csv)
- controlled fuzzy matching for unmatched candidates
- diagnostics for ambiguous or unmatched rows

## Match strategy

1. explicit manual links win
2. exact normalized matches are preferred
3. high-confidence fuzzy matches are allowed only when unique
4. ambiguous matches fail into diagnostics

## Manual mapping guidance

Add manual rows when:

- a provider renamed a slug
- a reasoning or non-reasoning split is important
- fuzzy matching stays ambiguous
- you need a durable hand-curated cross-source link

## Diagnostics

Examples:

- `ambiguous-auto-match`
- `unmatched-aa`
- `unmatched-vals`
- `unmatched-livebench`

These are exported to `mapping_diagnostics.json` and the workbook audit sheets.
