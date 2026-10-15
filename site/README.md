# zed2cli landing page

The marketing page for zed2cli. It is a Next.js static export built on the
Paper and Ink broadsheet design system, and it deploys to GitHub Pages.

Live page: https://6yte96.github.io/zed2cli/

## How it works

All page content lives in `project.config.ts`. The components in `src/`
render that config. To change copy, numbers, links, or the model table,
edit `project.config.ts` only.

## Run it

```bash
npm install
npm run dev
```

The dev server serves the site under the base path `/zed2cli`, so open
http://localhost:3000/zed2cli.

## Build

```bash
npm run build
```

This writes the static export to `out/`.

## Deploy

`.github/workflows/pages.yml` builds `site/` and publishes `out/` to GitHub
Pages on every push to main that touches `site/`. The workflow sets
`NEXT_PUBLIC_BASE_PATH=/zed2cli` and enables Pages on the first run.

## Notes

- `next.config.ts` sets `basePath` to `/zed2cli` for the project page URL.
  Set `NEXT_PUBLIC_BASE_PATH=""` for a custom domain at the root.
- `GUIDE.md` documents the design tokens and component classes.
- `CONTENT_RULES.md` documents the writing rules used for the copy.
