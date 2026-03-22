# Methodology

## Identity model

Each canonical row carries:

- `canonical_model_id`
- `canonical_family`
- `canonical_variant`
- `provider`
- `reasoning_mode`
- source-specific IDs and URLs
- normalization notes

## Cohort tiers

### Guide cohort

Requires:

- OpenRouter pricing and context
- a matched Artificial Analysis record

The live guide is intentionally inclusive: if a model is on OpenRouter and has an Artificial Analysis row, it belongs in the app even if some AA sub-metrics or enrichment sources are missing.

The normalized datasets still preserve the full current Artificial Analysis payload when present, including:

- AA pricing
- AA throughput and latency
- AA provider-route recommendations
- AA benchmark sub-scores such as GPQA, HLE, LiveCodeBench, SciCode, TerminalBench Hard, and related public evaluations

### Strict cohort

Requires everything in the guide cohort plus:

- Vals accuracy, latency, and cost metrics

### Enrichment flags

- `vals_enriched`
  The model has matched Vals data.
- `livebench_enriched`
  The model has matched LiveBench data.

## Recommendation scoring

Scenario scores are transparent weighted blends over normalized inputs for:

- coding
- reasoning
- latency
- budget
- long context
- overall value

Weights live in [config/scenarios/default_profiles.yaml](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/config/scenarios/default_profiles.yaml).

## Missing data policy

- missing values remain null
- ambiguous joins become diagnostics
- enrichment flags do not silently downgrade guide cohort provenance

## Why LiveBench is not the primary gate

The current LiveBench public model universe is materially narrower than the combined OpenRouter + AA universe. Treating it as an enrichment layer keeps recommendations useful while still making stricter coverage visible and auditable.
