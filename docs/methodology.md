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
  The model has matched Vals benchmark metrics, not just a metadata-only Vals row.
- `livebench_enriched`
  The model has a conservative LiveBench benchmark match that survived exact or slug-aware disambiguation.

## Recommendation scoring

Scenario scores are transparent weighted blends over normalized inputs for:

- coding
- reasoning
- latency
- budget
- long context

Weights live in [config/scenarios/default_profiles.yaml](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/config/scenarios/default_profiles.yaml).

Each preset can also carry hard eligibility filters. Those are used to prevent logically bad recommendations even when a model scores well on one dimension. Examples:

- budget picks can require a real price cap plus minimum capability and speed floors
- long-context picks can require both large context and usable throughput
- coding picks can exclude premium-priced models that fail the "value coding" brief

In the site UI, preset selection controls the winner and recommendation narrative. The browse-table filters are a separate exploration surface and do not change the preset winner.

## Missing data policy

- missing values remain null
- ambiguous joins become diagnostics
- enrichment flags do not silently downgrade guide cohort provenance

## Why LiveBench is not the primary gate

The current LiveBench public model universe is materially narrower than the combined OpenRouter + AA universe. Treating it as an enrichment layer keeps recommendations useful while still making stricter coverage visible and auditable.
