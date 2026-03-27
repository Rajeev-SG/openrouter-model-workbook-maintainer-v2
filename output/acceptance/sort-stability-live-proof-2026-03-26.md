# Sort Stability Live Proof - 2026-03-26

## Target

- Public alias: `https://openrouter-model-workbook-maintaine.vercel.app`
- Production deployment: `https://openrouter-model-workbook-maintainer-v2-k0ywkqksv.vercel.app`
- Deployment id: `dpl_CY4Ef6M8Re6owd7XJCUExj8e2WdV`

## Regression under test

- Sorting the browse table must not change the winner card.
- Sorting the browse table must not change the right-hand benchmark coverage chips.
- The benchmark coverage chips should reflect dataset-level availability, not the currently sorted row order.

## Observed behavior

- The live alias serves bundle `index-ChKPA6L6.js`.
- Before clicking `Speed`, the winner was `Gemini 3.1 Pro Preview` and the coverage chips were:
  - `Vals matched`
  - `LiveBench matched`
- After clicking `Speed`, the winner remained `Gemini 3.1 Pro Preview` and the coverage chips remained:
  - `Vals matched`
  - `LiveBench matched`
- Browser console for the proof run was clean: `Total messages: 0 (Errors: 0, Warnings: 0)`.

## Evidence

- Desktop screenshot after sort: [sort-stability-desktop.png](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-sort-stability-live/sort-stability-desktop.png)
- Mobile screenshot: [sort-stability-mobile.png](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-sort-stability-live/sort-stability-mobile.png)
- Console log: [console.log](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-sort-stability-live/console.log)

## Verdict

- PASS
