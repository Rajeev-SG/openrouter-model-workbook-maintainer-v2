# Secrets

This repo uses Infisical as the runtime secret source for both local refreshes and the scheduled GitHub Actions refresh workflow.

## Runtime secrets

Required in Infisical `prod`:

- `AA_API_KEY`
- `VERCEL_REFRESH_TOKEN`

Optional in Infisical `prod`:

- `OPENROUTER_API_KEY`

Do not duplicate secret values into repository `.env.example` files beyond names-only documentation.

## Local usage

Run the refresh pipeline through Infisical when you need live source access:

```bash
infisical run --env=prod -- make refresh
```

If this repo uses a different Infisical project or environment than your machine default, initialize the repo first or pass the explicit project and environment flags that match your setup.

## GitHub Actions usage

The scheduled refresh workflow authenticates to Infisical with GitHub OIDC via `Infisical/secrets-action`.

Configure these GitHub repository variables:

- `INFISICAL_IDENTITY_ID`
- `INFISICAL_PROJECT_SLUG`

Optional GitHub repository variables:

- `INFISICAL_ENV_SLUG`
  Defaults to `prod`.
- `INFISICAL_DOMAIN`
  Defaults to `https://app.infisical.com`.

The workflow then fetches `AA_API_KEY`, optional `OPENROUTER_API_KEY`, and `VERCEL_REFRESH_TOKEN` directly from Infisical for the job lifetime.

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are deployment identifiers, not secrets. They stay in workflow configuration rather than Infisical.

## Vercel deploy auth

The scheduled workflow no longer relies on a long-lived `VERCEL_TOKEN` access token.

Instead, it writes a temporary Vercel CLI auth directory on the runner and lets the Vercel CLI exchange `VERCEL_REFRESH_TOKEN` for a fresh access token at runtime. This matches how the local Vercel CLI keeps a session alive.

If the deploy step starts failing with an auth error again, refresh `VERCEL_REFRESH_TOKEN` in Infisical from the current local Vercel CLI session at:

- `~/Library/Application Support/com.vercel.cli/auth.json`

Use the `refreshToken` field from that file, not the short-lived `token` field.
