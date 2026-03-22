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

## Manual preview deploy

- `vercel.json` points Vercel at the static site build in `site/dist`
- run `VITE_BASE_PATH=/ pnpm --dir site build`
- run `vercel deploy -y --scope <team>`
