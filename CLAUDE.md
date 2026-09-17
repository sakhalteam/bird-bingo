# bird-bingo — Interactive Sibley bird call bingo game

> Parent context: `../CLAUDE.md` has universal preferences and conventions. Keep it updated with anything universal you learn here.

## What this is
An interactive bird bingo game with real bird calls from Sibley's guide. Tap a bird card to hear its call (with optional voice intro), see detailed Cornell Lab-style info (habitat, diet, nesting, behavior, conservation, song variants). Educational and playful.

## Stack
- Vite + React 19 + TypeScript + Tailwind v4 (via `@tailwindcss/vite` plugin, NOT PostCSS)
- `base: '/bird-bingo/'` in vite.config.ts
- Deployed to sakhalteam.github.io/bird-bingo/

## Icons

`node scripts/make-icons.mjs` — a dependency-free PNG encoder (zlib + hand-rolled
CRC) that draws a glowing bird mid-call: cyan body, violet wing, amber beak, two
sound arcs. **Edit the script, never the PNGs.** The art is deliberately in the
same idiom as the sibling apps (adhdo, traction) — adhdo's near-black `#0a0a1a`,
soft-edged shapes, haloes falling off as the square of the distance — so the
three read as a set on a home screen. The cyan/violet pair is this app's own,
straight out of `.gradient-bg`. Everything is drawn inside the middle ~64% of
the canvas so the same art is safe as a `maskable` icon.

`index.html` also sets `apple-mobile-web-app-title` to "Bird Bingo" — without it
iOS labels the home-screen tile from `<title>` and truncates it to
"Bird Bingo – Sou…".

## Notable patterns
- Sophisticated audio queueing system (voice intro → bird call)
- 3D flip card animation on tap
- Accordion UI for detailed bird info
- Filter by male/female birds, loop calls
- Keyboard shortcuts
- Alphabet index rail (`src/AlphabetIndex.tsx`) — iOS-style section index bar,
  mobile only. Anchors the first card of each letter (`bird-letter-<deck>-<L>`)
  instead of inserting section headers, so the grid stays unbroken on desktop.

## Gotcha: the page scrolls inside `<body>`, not the window
`html, body, #root { height: 100% }` plus `overflow-x: hidden` makes **body**
the scroll container. So `window.scrollTo` / `window.scrollY` are no-ops, and
scroll events never reach `window` (they don't bubble). Use `scrollIntoView`
plus `scroll-margin-top`, and listen for scroll with `{ capture: true }`.
