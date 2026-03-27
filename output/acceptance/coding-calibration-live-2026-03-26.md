# Coding Calibration Live Proof

- URL: https://openrouter-model-workbook-maintaine.vercel.app
- Flow: load production default coding preset, inspect ranking order, and confirm the new coding-benchmark references are visible.
- Expected: Claude Opus 4.6 appears above GPT-5.1 in the coding ranking, and the UI references SWE-bench and Toolathlon.
- Observed: desktop and mobile both showed Claude Opus 4.6 before GPT-5.1. The winner area exposed `SWE-BENCH BASH` and `TOOLATHLON PASS@1`, and the Opus ranking snippet carried both `SWE-BENCH` and `TOOLATHLON` labels.
- Artifacts:
  - output/playwright/acceptance-20260326-coding-calibration-prod/desktop-full.png
  - output/playwright/acceptance-20260326-coding-calibration-prod/mobile-full.png
  - output/playwright/acceptance-20260326-coding-calibration-prod/results.json
  - output/playwright/acceptance-20260326-coding-calibration-prod/console.log
- Pass: yes
- Screenshot review: pass on desktop and mobile for the changed ranking and source-reference surfaces.
- Viewports inspected: 1440x2200 and 430x2200.
- Final content proven reachable: the default coding winner block and the ranked list section containing Claude Opus 4.6 and GPT-5.1.
