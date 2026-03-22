# Task Breakdown

## Delivery slices

1. Source ingestion and cache discipline
2. Canonical identity and mapping diagnostics
3. Cohort policy and scoring engine
4. Workbook vNext
5. Interactive guide
6. Validation, docs, and automation
7. Deployment and handoff

## Current implementation notes

- Vals now uses the shipped client bundle rather than click-driven discovery.
- LiveBench is ingested from the Hugging Face parquet published by the official project.
- OpenRouter and AA enrichments degrade gracefully when optional provider pages are unavailable.
- Cohort policy is two-tier so sparse LiveBench coverage does not zero out the whole guide.
