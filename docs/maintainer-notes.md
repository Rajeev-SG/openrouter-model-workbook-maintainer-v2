# Maintainer Notes

## Important decisions

- Vals ingestion is bundle-based, not browser-driven.
- LiveBench is a strict enrichment layer, not the primary guide gate.
- The site reads generated JSON only.
- The workbook remains a first-class output rather than a side effect.

## Known fragile areas

- Artificial Analysis provider pages can 404 for some model slugs.
- OpenRouter canonical slugs can change to dated variants, so manual mappings may need refresh.
- LiveBench model names often use different naming conventions from OpenRouter and AA.
- LiveBench matching should stay conservative; exact, alias-exact, and slug-aware matches are fine, but fuzzy fallback is not.

## When adding a new model

1. check whether auto matching already discovers it
2. add a manual row only if needed
3. run `make refresh`
4. inspect coverage and exclusion sheets
5. update docs only if the workflow or policy changed
