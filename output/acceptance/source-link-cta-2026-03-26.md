# Acceptance: Source link CTA treatment

## Expected behavior

- External model-source links should read as actionable CTAs instead of passive badges.
- OpenRouter and Artificial Analysis links should visibly signal clickability on both desktop and mobile.

## Executed steps

1. Ran `pnpm --dir site lint`.
2. Ran `pnpm --dir site build`.
3. Served the built site locally with `pnpm --dir site exec vite preview --host 127.0.0.1 --port 4173`.
4. Opened the guide in a real browser with `playwright-cli`.
5. Queried the rendered DOM for the source links to confirm CTA text and accessibility labels.
6. Captured fresh desktop and mobile screenshots of the guide surface.
7. Checked the browser console for hidden errors.

## Evidence

- screenshot: `output/playwright/acceptance-20260326-source-links/guide-desktop.png`
- screenshot: `output/playwright/acceptance-20260326-source-links/guide-mobile.png`
- console: `output/playwright/acceptance-20260326-source-links/console.log`
- target URL: `http://127.0.0.1:4173/`
- fresh run id / artifact directory: `output/playwright/acceptance-20260326-source-links/`
- final reachable content proven: the winner-card source links render with explicit `Open` action text and remain visible in both viewports

## Result

- PASS
- viewport and section coverage checked: desktop winner surface, mobile winner surface
- final action or content completed: rendered source links inspected in the live built app
- observed behavior:
  - source links now render as stronger CTA chips instead of neutral badges
  - rendered link text includes explicit action treatment such as `OpenRouter Open` and `AA Open`
  - DOM labels expose `Open <source> in a new tab`
  - browser console was clean: `0` errors, `0` warnings

## Remaining risk

- This pass focused on the most visible source-link surfaces in the main guide flow. If you want, I can do one more polish pass on the shortlist and comparison panels specifically.
