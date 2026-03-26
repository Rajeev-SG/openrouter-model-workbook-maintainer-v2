# Scoring Calibration Live Proof

- Target URL: https://openrouter-model-workbook-maintaine.vercel.app
- Expected preset winners checked on production:
  - Coding -> GPT-5.4
  - Reasoning -> Gemini 3.1 Pro Preview
  - Budget -> MiMo-V2-Flash
  - Latency -> Mercury 2
  - Context -> Grok 4.1 Fast
- Observed behavior: each preset card and the active winner panel switched to the expected live winner on desktop; the active winner panel also switched correctly on mobile.
- CTA check: the source-link row in the active winner panel did not expose the old `Open` text affordance.
- Screenshot review: passed for desktop and mobile in the top decision-making section.
- Console review: clean.

## Evidence

- Desktop full: output/playwright/acceptance-20260326-scoring-calibration-live/desktop-full.png
- Desktop top section: output/playwright/acceptance-20260326-scoring-calibration-live/desktop-top.png
- Mobile full: output/playwright/acceptance-20260326-scoring-calibration-live/mobile-full.png
- Results JSON: output/playwright/acceptance-20260326-scoring-calibration-live/results.json
- Console log: output/playwright/acceptance-20260326-scoring-calibration-live/console.log

## Verdict

Pass. The live production alias reflects the recalibrated scoring and updated preset copy.
