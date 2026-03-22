# Operations

## Local commands

```bash
make bootstrap
make doctor
make validate
make test
make build
make refresh
make serve-site
```

## Secrets

Required for live refresh:

- `AA_API_KEY`

Optional:

- `OPENROUTER_API_KEY`

For local runs, prefer `infisical run --env=prod -- make refresh` once this repo has been linked to the right project. For GitHub Actions, the workflow currently prefers repository secrets for `AA_API_KEY` and `OPENROUTER_API_KEY`, and can optionally fetch them from Infisical OIDC when the repository variables described in [docs/ops/secrets.md](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/ops/secrets.md) are configured.

## Generated artifacts

- `data/latest/*.json`
- `data/latest/*.parquet`
- `out/openrouter_model_pricing_performance.xlsx`
- `site/public/data/latest/*.json`
- `site/dist/`

## GitHub Actions

### CI

- validates Python and frontend code
- runs tests
- proves the site can build from generated datasets

### Daily refresh

- runs scheduled source refresh
- falls back to the checked-in datasets when Artificial Analysis returns a 429 during refresh
- rebuilds datasets and workbook
- rebuilds the site
- uploads workbook and dataset artifacts
- deploys the static guide to GitHub Pages
- uses repository secrets by default for runtime API keys, with optional Infisical OIDC support when the repo-specific identity wiring exists

## Manual preview deploy

- `vercel.json` points Vercel at the static site build in `site/dist`
- run `VITE_BASE_PATH=/ pnpm --dir site build`
- run `vercel deploy -y --scope <team>`
