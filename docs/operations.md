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

For local runs, prefer `infisical run --env=prod -- make refresh` once this repo has been linked to the right project.
For GitHub Actions, the workflow fetches runtime secrets from Infisical via OIDC. `AA_API_KEY` and `VERCEL_TOKEN` are required in Infisical `prod`, and `OPENROUTER_API_KEY` remains optional.

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
- uses Node 24-compatible GitHub Actions majors so GitHub's runtime transition does not strand the workflow on deprecated action runtimes

### Daily refresh

- runs scheduled source refresh
- falls back to the checked-in datasets when Artificial Analysis returns a 429 during refresh
- rebuilds datasets and workbook
- rebuilds the site
- uploads workbook and dataset artifacts
- deploys the static guide to Vercel
- pins the Vercel CLI version instead of using `latest`
- uses Node 24-compatible GitHub Actions majors for checkout, toolchain setup, and artifact upload
- exchanges the GitHub OIDC token with Infisical directly and fetches secrets via the Infisical API, avoiding the deprecated Node 20 Infisical action runtime
- verifies the resulting production deployment with `vercel inspect` plus a `curl` smoke check against the public production alias because direct deployment URLs are protected by Vercel SSO
- uses Infisical OIDC for runtime API keys and a dedicated Vercel access token for deploys

## Manual Vercel deploy

- the Vercel project root directory is `site`, so remote Git builds use the app lockfile directly
- [site/vercel.json](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/site/vercel.json) matches that shape and expects a `dist` output from the site root
- run `VITE_BASE_PATH=/ pnpm --dir site build`
- run `vercel build --prod -y --scope <team>` to generate `.vercel/output`
- run `vercel deploy --prebuilt --prod -y --scope <team>`
