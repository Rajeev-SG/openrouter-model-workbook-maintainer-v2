# Acceptance: Vals and LiveBench integrity

## Expected behavior

- `vals_enriched` should count only rows with current Vals benchmark metrics, not metadata-only Vals links.
- LiveBench rows should attach only to conservative exact or slug-aware matches.
- Previously wrong joins should disappear from the guide data and the generated site.

## Executed steps

1. Refreshed the Vals and LiveBench source caches into `.cache_model_workbook`.
2. Ran `make validate`, `make test`, and `make build`.
3. Served the built site with `pnpm --dir site exec vite preview --host 127.0.0.1 --port 4173`.
4. Opened the guide in a real browser with `playwright-cli`.
5. Captured desktop and mobile screenshots.
6. Queried `data/latest/master_registry.json` from the live page to confirm the corrected counts and row-level joins.
7. Checked the browser console for hidden errors.

## Evidence

- screenshot: `output/playwright/acceptance-20260326-vals-livebench/guide-home.png`
- screenshot: `output/playwright/acceptance-20260326-vals-livebench/guide-mobile.png`
- console: `output/playwright/acceptance-20260326-vals-livebench/console.log`
- target URL: `http://127.0.0.1:4173/`
- fresh run id / artifact directory: `output/playwright/acceptance-20260326-vals-livebench/`
- final reachable content proven: the built guide loaded, showed the corrected enrichment counts, and served the regenerated `master_registry.json`

## Result

- PASS
- viewport and section coverage checked: desktop full-page guide hero and shortlist, mobile full-page guide hero and shortlist
- final action or content completed: loaded the live guide and verified the generated JSON behind it
- observed behavior:
  - homepage counts show `8` Vals-enriched rows and `37` LiveBench-enriched rows
  - `google/gemini-3.1-flash-image-preview-20260226` no longer carries the incorrect `gemini-2.0-flash` LiveBench join
  - `google/gemini-2.0-flash-001` now owns `gemini-2.0-flash`
  - `deepseek/deepseek-v3.2-20251201` rows no longer claim `deepseek-v3`
  - `deepseek/deepseek-chat-v3` now owns `deepseek-v3`
  - `openai/o1-pro` no longer claims `o1`
  - `openai/o1-2024-12-17` now owns `o1`
  - `openai/gpt-4o-2024-11-20` now owns `gpt-4o-2024-11-20`
  - `anthropic/claude-3-7-sonnet-20250219` now owns `claude-3-7-sonnet-20250219-base`
  - browser console was clean: `0` errors, `0` warnings

## Remaining risk

- OpenRouter and Artificial Analysis data in this rebuild still come from the local cache because this turn only refreshed Vals and LiveBench. A full `make refresh` with current credentials would refresh every source end to end.
