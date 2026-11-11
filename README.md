# Plants vs Aliens 🌱👽

A lane-based garden-defence browser game (an original fan game in the style of classic tower defence), built with TypeScript, Vite and plain HTML5 canvas. All art is drawn procedurally in code.

**Play:** https://0903lokchan.github.io/plants-vs-aliens/

## Controls
- Click falling suns to collect them; click a plant card, then a lawn tile to plant.
- `1`–`5` pick a plant, `S` shovel, `P`/`Esc` pause, `M` mute, right-click to cancel.

## Dev
```
npm install
npm run dev     # local dev server
npm run build   # type-check + production build to dist/
```
`tests/playtest.mjs` and `tests/shot.mjs` are Playwright scripts (run against `npm run preview`).

## Deploy
`./deploy.sh` builds and force-pushes `dist/` to the `gh-pages` branch (GitHub Pages source). A GitHub Actions alternative is in `docs/github-pages-workflow.yml.example` (copy to `.github/workflows/` — pushing it needs a token with the `workflow` scope).
