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
- Artificial Analysis intelligence and speed metrics
- Vals accuracy, latency, and cost metrics

### Strict cohort

Requires everything in the guide cohort plus:

- LiveBench overall coverage

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
- strict cohort flags do not silently downgrade guide cohort provenance

## Why LiveBench is not the primary gate

The current LiveBench public model universe is materially narrower than the combined OpenRouter + AA + Vals universe. Treating it as a strict enrichment layer keeps recommendations useful while still making strict coverage visible and auditable.
