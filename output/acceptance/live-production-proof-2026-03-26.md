# Live Production Proof - 2026-03-26

## Target

- Public alias: `https://openrouter-model-workbook-maintaine.vercel.app`
- Production deployment: `https://openrouter-model-workbook-maintainer-v2-m9v03pbus.vercel.app`
- Deployment id: `dpl_Fohwvfc8gFCfHfeJ13VZhkLq88g3`

## Expected behavior

- The live site should no longer show stale `Vals missing` or `LiveBench missing` copy.
- External source links should read like explicit CTAs with `Open` visible in the chip.
- The public datasets served by the site should include the repaired enrichment counts.

## Observed behavior

- The live alias serves bundle `index-kISpXy8O.js`, which is the post-fix frontend build.
- Live DOM inspection on the public alias confirms all of the following text is present:
  - `VALS NOT MATCHED`
  - `LIVEBENCH NOT MATCHED`
  - `OPENROUTER OPEN`
  - `AA OPEN`
- Live JSON inspection on `data/latest/master_registry.json` confirms:
  - `vals_enriched = 8`
  - `livebench_enriched = 37`
- Browser console for the proof run was clean: `Total messages: 0 (Errors: 0, Warnings: 0)`.

## Evidence

- Desktop screenshot: [live-desktop-final.png](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-live-prod/live-desktop-final.png)
- Mobile screenshot: [live-mobile-final.png](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-live-prod/live-mobile-final.png)
- Console log: [console.log](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-live-prod/console.log)

## Notes

- `not matched` is now the live production copy for sources that do not currently map for the active winner.
- Some top recommendations still legitimately have no Vals or LiveBench match. That is a real coverage state, not a stale deploy.

## Verdict

- PASS
