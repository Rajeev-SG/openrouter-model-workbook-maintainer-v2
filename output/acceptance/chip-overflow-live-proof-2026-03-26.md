# Chip Overflow Live Proof - 2026-03-26

## Target

- Public alias: `https://openrouter-model-workbook-maintaine.vercel.app`
- Production deployment: `https://openrouter-model-workbook-maintainer-v2-pe6r3fh8x.vercel.app`
- Deployment id: `dpl_5ke1JdbVjewdtUsPHMBYzoG5SsBZ`

## Regression under test

- Source-link CTA chips inside the `Strong alternatives` cards must stay inside their card boundaries.
- The desktop three-column alternatives layout must not allow `OpenRouter` chips to overlap adjacent cards.

## Observed behavior

- The live alias serves bundle `index-bPrf9skl.js`.
- On the live site at a desktop section width of `1128px`, no `chip-link` element in the `Strong alternatives` panel overflowed its containing card.
- Mobile section proof also rendered without chip overflow.
- Browser console for the proof run was clean: `Total messages: 0 (Errors: 0, Warnings: 0)`.

## Evidence

- Desktop section screenshot: [alternatives-desktop-live.png](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-chip-overflow-live/alternatives-desktop-live.png)
- Mobile section screenshot: [alternatives-mobile-live.png](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-chip-overflow-live/alternatives-mobile-live.png)
- Console log: [console.log](/Users/rajeev/Code/openrouter-model-workbook-maintainer-v2/output/playwright/acceptance-20260326-chip-overflow-live/console.log)

## Verdict

- PASS
