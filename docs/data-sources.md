# Data Sources

## OpenRouter

Use:

- model discovery
- pricing
- context window
- release metadata from pricing pages

Primary inputs:

- `https://openrouter.ai/api/v1/models`
- `https://openrouter.ai/{slug}/pricing`

## Artificial Analysis

Use:

- intelligence index
- coding index
- math index
- benchmark sub-scores from the public model payload:
  GPQA, HLE, MMLU-Pro, LiveCodeBench, SciCode, TerminalBench Hard, IFBench, TAU2, LCR,
  AIME, AIME 2025, and Math-500
- speed and latency metrics including TTFT and time-to-first-answer
- AA input, output, and blended pricing
- provider-level enrichment where available

Primary inputs:

- `https://artificialanalysis.ai/api/v2/data/llms/models`
- provider pages under `https://artificialanalysis.ai/models/{slug}/providers`

## Vals

Use:

- Vals Index accuracy, latency, and cost
- per-benchmark rankings
- model metadata such as context and reasoning effort

Primary input strategy:

- fetch `https://www.vals.ai/models`
- discover the current hashed `ModelTable` and `constants` bundles
- parse the cached local JS bundle with Node to extract the shipped registry and benchmark payloads

This replaced the earlier browser-click discovery path because the bundle is faster, more deterministic, and closer to a machine-readable source.

## LiveBench

Use:

- overall score
- category and task detail

Primary input:

- official Hugging Face parquet published by the LiveBench project

## Source manifest

Each fetch family records:

- source URL
- fetch timestamp
- parser version
- record count
- artifact name where relevant
