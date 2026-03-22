# Secrets

This repo uses Infisical as the source of truth for runtime secrets.

## Runtime secrets

Required for live refreshes:

- `AA_API_KEY`

Optional:

- `OPENROUTER_API_KEY`

Store those values in the Infisical project and environment used by this repo. Do not duplicate them into repository `.env.example` files beyond names-only documentation, and do not keep them as long-lived GitHub Actions secrets.

## Local usage

Run the refresh pipeline through Infisical when you need live source access:

```bash
infisical run --env=prod -- make refresh
```

If this repo uses a different Infisical project or environment than your machine default, initialize the repo first or pass the explicit project and environment flags that match your setup.

## GitHub Actions usage

The scheduled refresh workflow authenticates to Infisical at runtime with OIDC via `Infisical/secrets-action`.

Configure these GitHub repository variables:

- `INFISICAL_IDENTITY_ID`
- `INFISICAL_PROJECT_SLUG`

Optional GitHub repository variables:

- `INFISICAL_ENV_SLUG`
  Defaults to `prod`.
- `INFISICAL_DOMAIN`
  Defaults to `https://app.infisical.com`.

The workflow then fetches `AA_API_KEY` and `OPENROUTER_API_KEY` directly from Infisical for the job lifetime.
