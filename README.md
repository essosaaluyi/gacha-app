# Gacha Battle App

A web-based gacha battle game with a slot/pachislot-style presentation. Players pull cards, watch dramatic reveals, arrange their battle deck, and fight through animated battle rounds to earn rewards.

The core flow: **start → gacha pull → card reveal/flip → battle deck order → battle opening → battle rounds → results/rewards**.

## Tech Stack

- [Next.js](https://nextjs.org) with React — app shell and UI
- [PixiJS](https://pixijs.com) — canvas battle layers and effects
- [Supabase](https://supabase.com) — backend
- CSS/React overlays with lazy image/video inserts for dramatic effects

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run sync:game-config` | Sync game config from `game-config/game-config.xlsx` |

## Game Configuration

Game numbers (card pool, rarity probabilities, enemies, rewards, and more) are managed in a spreadsheet at `game-config/game-config.xlsx`. After editing it, run `npm run sync:game-config` to regenerate `lib/game-config/generated.ts`.

## Key Documentation

- `PROJECT_BIBLE.md` — the main product source of truth
- `AGENTS.md` — instructions for AI coding assistants
- `CLAUDE.md` — project handoff and current work state
