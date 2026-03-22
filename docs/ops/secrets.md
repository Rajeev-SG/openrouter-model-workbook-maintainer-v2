# Secrets

This repo currently supports two runtime secret paths:

- GitHub repository secrets for CI and scheduled refreshes
- Infisical for local runs and a future GitHub OIDC path once the repo-specific identity wiring is in place

## Runtime secrets

Required for live refreshes:

- `AA_API_KEY`

Optional:

- `OPENROUTER_API_KEY`

Store those values in the runtime system that is actually wired for the environment you are using:

- GitHub Actions today:
  - repository secret `AA_API_KEY`
  - optional repository secret `OPENROUTER_API_KEY`
- Local runs:
  - prefer Infisical once this repo is linked to the correct project and environment

Do not duplicate secret values into repository `.env.example` files beyond names-only documentation.

## Local usage

Run the refresh pipeline through Infisical when you need live source access and the repo has been linked to the right project:

```bash
infisical run --env=prod -- make refresh
```

If this repo uses a different Infisical project or environment than your machine default, initialize the repo first or pass the explicit project and environment flags that match your setup.

## GitHub Actions usage

The scheduled refresh workflow first checks for GitHub repository secrets. If `AA_API_KEY` is present there, it uses the GitHub-provided value directly.

If repository secrets are not present, the workflow can authenticate to Infisical at runtime with OIDC via `Infisical/secrets-action`.

Configure these GitHub repository variables if you want the OIDC path:

- `INFISICAL_IDENTITY_ID`
- `INFISICAL_PROJECT_SLUG`

Optional GitHub repository variables for the OIDC path:

- `INFISICAL_ENV_SLUG`
  Defaults to `prod`.
- `INFISICAL_DOMAIN`
  Defaults to `https://app.infisical.com`.

The OIDC path then fetches `AA_API_KEY` and `OPENROUTER_API_KEY` directly from Infisical for the job lifetime.
