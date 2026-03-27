# Vercel Build Hardening Proof

Date: 2026-03-26
Branch: `RAJ-54-repair-vals-and-livebench-enrichment-integrity`
Final commit: `df7d8be1a25443f272e39fb11fb47477f16cbb99`

## Original failure

- Failed Vercel deployment inspected: `dpl_9AYjvu9Form7C4kvou8oSsfTF9Qw`
- Root cause:
  - Vercel project was building from the repo root instead of `site`
  - remote Git builds used a brittle root-level install path and ignored the site lockfile
  - GitHub automation still carried a deprecated Node 20 action runtime and a broken production smoke check path

## Fixes applied

- Vercel project settings updated to:
  - `rootDirectory = site`
  - `installCommand = pnpm install --frozen-lockfile`
  - `buildCommand = VITE_BASE_PATH=/ pnpm build`
  - `outputDirectory = dist`
- Moved repo-local Vercel config to [site/vercel.json](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/site/vercel.json) and removed the obsolete root config.
- Pinned the site package manager in [site/package.json](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/site/package.json).
- Upgraded GitHub Actions majors in [ci.yml](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/.github/workflows/ci.yml) and [daily-refresh.yml](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/.github/workflows/daily-refresh.yml) to Node 24-compatible versions.
- Replaced `Infisical/secrets-action@v1.0.15` with native GitHub OIDC plus Infisical API fetch logic in [daily-refresh.yml](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/.github/workflows/daily-refresh.yml).
- Added masking before exporting fetched secrets to `GITHUB_ENV`.
- Switched the deploy smoke check to the public production alias because direct deployment URLs are protected by Vercel SSO.
- Updated [README.md](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/README.md) and [docs/operations.md](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/operations.md).

## Proof

- Git-triggered Vercel preview for final commit: `dpl_BqEzns3mYVsE4q5TyYA4fCnMKd6A`
  - URL: `https://openrouter-model-workbook-maintainer-v2-b7q9yof53.vercel.app`
  - Status: `READY`
- Final production deploy from workflow: `dpl_BnjtwvGQEUDYSzX3krZJDxpp7Nb7`
  - URL: `https://openrouter-model-workbook-maintainer-v2-lpitgliw6.vercel.app`
  - Alias: `https://openrouter-model-workbook-maintaine.vercel.app`
  - Status: `READY`
- Final CI run on final commit: `23614466819`
  - Result: `success`
- Final Daily Refresh run on final commit: `23614469844`
  - Result: `success`

## Verification details

- `vercel inspect` on the final preview and production deployments returned `status ● Ready`.
- `curl --fail --silent --show-error https://openrouter-model-workbook-maintaine.vercel.app` succeeded.
- The production alias HTML still contains `<div id="root"></div>`.
- Final `Daily Refresh` logs show:
  - native Infisical fetch step ran successfully
  - no `Node.js 20 actions are deprecated` annotation
  - no `Run Infisical/secrets-action` step
  - fetched secret values were masked in later step environment dumps

## Outcome

Pass.

The exact previously failing Vercel Git-build path now succeeds, the push-driven CI path succeeds, and the branch-scoped deploy workflow succeeds on the final hardened configuration without the old Node 20 action warning.
