# PRD

## Goal

Turn the original workbook maintainer into a production-grade model intelligence project with:

- deterministic data outputs
- workbook-first analysis
- a static interactive guide
- daily refresh automation

## Core outputs

1. `Master registry`
   All discovered candidates from OpenRouter, Artificial Analysis, Vals, and LiveBench.
2. `Guide cohort`
   Models with strong recommendation-grade coverage from OpenRouter, AA, and Vals.
3. `Strict cohort`
   Guide cohort rows that are also LiveBench-enriched.
4. `Workbook vNext`
   Analysis and audit sheets for pricing, coverage, benchmarks, recommendations, and source manifests.
5. `Interactive guide`
   Static site built from generated datasets only.

## Success criteria

- one-command cached rebuild
- one-command live refresh
- transparent provenance and exclusion diagnostics
- versioned cohort rules and recommendation weights
- daily automation that fails clearly when sources drift

## Non-goals

- live runtime scraping in the frontend
- hidden heuristic joins
- silently backfilling missing metrics
