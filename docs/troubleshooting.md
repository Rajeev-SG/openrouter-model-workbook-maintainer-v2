# Troubleshooting

## `make bootstrap` fails on Python `3.14`

Use the repo default:

- `.python-version` is pinned to `3.13`
- `make bootstrap` installs and uses `uv`-managed Python `3.13`

## Vals source broke

Check:

- `vals_site/models.html`
- `vals_site/model_table_bundle.js`
- `vals_site/constants_bundle.js`

If the bundle names changed, update the regex discovery logic in [src/model_intel/sources/vals.py](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/src/model_intel/sources/vals.py).

## Guide cohort is too small

Inspect:

- `data/latest/mapping_diagnostics.json`
- `data/latest/master_registry.json`
- workbook sheets `Coverage` and `Exclusion_Backlog`

Common causes:

- stale manual slugs
- provider alias or normalized-name drift between sources
- missing Artificial Analysis matches
- missing Vals enrichment for stricter subsets
- sparse LiveBench coverage
- ambiguous variant joins

## Workbook build fails on nested values

Nested dict and list fields are stringified before being written to Excel. If a new nested field breaks the workbook, update the serialization logic in [src/model_intel/workbook/builder.py](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/src/model_intel/workbook/builder.py).

## Daily refresh failed in GitHub Actions

Check:

- workflow logs
- source manifest output
- whether `AA_API_KEY` is configured
- whether a source schema changed
