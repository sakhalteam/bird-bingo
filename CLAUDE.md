# bird-bingo — Interactive Sibley bird call bingo game

> Parent context: `../CLAUDE.md` has universal preferences and conventions. Keep it updated with anything universal you learn here.

## What this is
An interactive bird bingo game with real bird calls from Sibley's guide. Tap a bird card to hear its call (with optional voice intro), see detailed Cornell Lab-style info (habitat, diet, nesting, behavior, conservation, song variants). Educational and playful.

## Stack
- Vite + React 18 + TypeScript + Tailwind v3
- `base: '/bird-bingo/'` in vite.config.ts
- Deployed to sakhalteam.github.io/bird-bingo/

## Notable patterns
- Sophisticated audio queueing system (voice intro → bird call)
- 3D flip card animation on tap
- Accordion UI for detailed bird info
- Filter by male/female birds, loop calls
- Keyboard shortcuts
