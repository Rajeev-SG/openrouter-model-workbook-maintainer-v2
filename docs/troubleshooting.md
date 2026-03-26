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
- whether `INFISICAL_IDENTITY_ID` and `INFISICAL_PROJECT_SLUG` GitHub repository variables are configured
- whether the Infisical machine identity trusts this repository and workflow context
- whether `AA_API_KEY` exists in the Infisical environment the workflow requests
- whether `VERCEL_REFRESH_TOKEN` exists in the Infisical `prod` environment
- whether a source schema changed

If the workflow fails on `429 Client Error` from Artificial Analysis, the GitHub Actions path should fall back to `make rebuild-from-data`. If that fallback also fails, verify the checked-in dataset JSON files still exist under `data/latest/`.

If the workflow fails on Vercel auth, refresh the `VERCEL_REFRESH_TOKEN` secret from the local Vercel CLI session in `~/Library/Application Support/com.vercel.cli/auth.json`. Use the `refreshToken` value, not the short-lived `token`.
