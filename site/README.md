# Guide App

This directory contains the static React/Vite guide that reads the generated datasets under `site/public/data/latest`.

Common commands:

```bash
pnpm --dir site install
pnpm --dir site build
pnpm --dir site dev -- --host
```

The site should never fetch live source systems at runtime. Rebuild the datasets first with `make build` or `make refresh`, then rebuild the site.
