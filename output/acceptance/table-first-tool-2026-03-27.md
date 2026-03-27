# Acceptance: table-first model finder

## Expected behavior

- The page opens as a compact guide with small preset buttons and the comparison table visible immediately on desktop.
- Preset buttons do not show ranking copy; they smooth-scroll to the relevant model row in the table.
- The table is the primary tool surface and uses the requested columns:
  compare, model, cost, speed, context, AA overall intelligence rating, and Terminal-Bench@2.0 leaderboard rating.
- Table metrics link out to source pages with visible external-link affordances.
- Row-level source chips still expose OpenRouter, AA, Vals, and other available sources.

## Executed steps

1. Built the site with `pnpm --dir site build`.
2. Started the app locally with `pnpm --dir site dev --host 127.0.0.1 --port 4173`.
3. Captured a desktop viewport at `1440x1200`.
4. Verified the desktop first view shows the compact preset rail directly above the comparison table.
5. Measured the `Mercury 2` row before using the `Latency` preset:
   - row top `9382`
   - row bottom `9517`
   - viewport height `1600`
   - `inView=false`
6. Clicked the `Latency` preset button.
7. Re-measured the `Mercury 2` row after the click:
   - row top `733`
   - row bottom `868`
   - viewport height `1600`
   - `inView=true`
   - page scroll position `8649`
8. Captured a focused desktop screenshot after the jump.
9. Captured mobile screenshots at `390x844` for both the top section and the card/table area.
10. Reviewed console and network output from the proof run.

## Evidence

- desktop top screenshot: `output/playwright/table-first-20260327/desktop-top.png`
- desktop full screenshot: `output/playwright/table-first-20260327/desktop-full.png`
- desktop jump-target screenshot: `output/playwright/table-first-20260327/desktop-after-latency-jump.png`
- desktop snapshot: `output/playwright/table-first-20260327/desktop-snapshot.md`
- mobile top screenshot: `output/playwright/table-first-20260327/mobile-top.png`
- mobile table/cards screenshot: `output/playwright/table-first-20260327/mobile-table.png`
- mobile full screenshot: `output/playwright/table-first-20260327/mobile-full.png`
- mobile snapshot: `output/playwright/table-first-20260327/mobile-snapshot.md`
- console capture: `.playwright-cli/console-2026-03-27T22-25-38-431Z.log`
- network capture: `.playwright-cli/network-2026-03-27T22-25-38-455Z.log`
- final reachable content proven: the `Latency` preset scrolls the user to the `Mercury 2` model row and lands that row inside the visible viewport

## Result

- PASS
- viewport and section coverage checked: desktop top-of-page, desktop target row after preset jump, mobile top-of-page, mobile table/cards section
- final action or content completed: preset jump reached the intended row in the comparison table
- visual review: passed on desktop and mobile for the changed surface; the table-first structure is clear, the preset buttons are materially shorter, and the source-link arrows are visible in the table metrics
- console review: no errors or warnings; only the standard React DevTools info message appeared during local dev
- network review: guide datasets loaded successfully with HTTP `200`

## Remaining risk

- Mobile still prioritizes the compact header and presets before the cards section, so the comparison surface is not in the very first mobile viewport. The cards remain reachable quickly and the desktop requirement of seeing the table immediately is satisfied.
