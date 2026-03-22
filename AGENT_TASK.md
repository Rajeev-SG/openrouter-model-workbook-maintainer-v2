# Agent task: maintain the model intelligence pipeline

You are operating inside a repo that maintains:

- a deterministic model registry and workbook
- a static interactive guide
- daily refresh and deploy automation

## First reads

1. [README.md](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/README.md)
2. [config/cohort_rules.yaml](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/config/cohort_rules.yaml)
3. [config/model_map.csv](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/config/model_map.csv)
4. [docs/methodology.md](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/methodology.md)
5. [docs/identity-and-mapping.md](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/docs/identity-and-mapping.md)

## Main workflow

```bash
make bootstrap
make doctor
make validate
make test
make build
```

If credentials are available:

```bash
make refresh
```

## Guardrails

- Do not invent cross-source joins.
- Keep reasoning and non-reasoning variants explicit.
- Preserve raw source cache files when debugging parser drift.
- Keep cohort policy and scenario weights in versioned config.
- If a source goes sparse or stale, prefer clear diagnostics and cohort exclusion over silent coercion.
- Update docs when the workflow, inclusion rules, or source assumptions change.

## Key outputs

- `data/latest/`
- `out/openrouter_model_pricing_performance.xlsx`
- `site/public/data/latest/`
- `site/dist/`

## Acceptance bar

- `make validate` passes
- `make test` passes
- `make build` passes from cache
- `make refresh` passes when credentials are present
- workbook and guide both reflect the latest generated datasets
- docs stay aligned with the actual pipeline and cohort logic
