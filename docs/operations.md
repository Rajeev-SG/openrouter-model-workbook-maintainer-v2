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

Infisical is the source of truth for both keys. For local runs, prefer `infisical run --env=prod -- make refresh`. For GitHub Actions, configure the Infisical OIDC repository variables described in [docs/ops/secrets.md](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/ops/secrets.md).

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
- rebuilds datasets and workbook
- rebuilds the site
- uploads workbook and dataset artifacts
- deploys the static guide to GitHub Pages
- fetches runtime secrets from Infisical with OIDC instead of storing them as long-lived GitHub Actions secrets

## Manual preview deploy

- `vercel.json` points Vercel at the static site build in `site/dist`
- run `VITE_BASE_PATH=/ pnpm --dir site build`
- run `vercel deploy -y --scope <team>`
