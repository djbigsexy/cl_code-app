# GI Balance

A small client-side web app for keeping a meal's glycemic response balanced.
Search for a food, and the app suggests **pairing partners** — protein, fat,
fiber, or low-glycemic-load foods — that blunt the blood-sugar spike, and rates
how balanced the combined meal is.

> General wellness guidance only — not medical advice. Individual blood-sugar
> responses vary.

## Quick start

```bash
npm install
npm run dev      # start the dev server
```

Then open the printed local URL.

## Scripts

- `npm run dev` — dev server with hot reload
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm test` — run the unit tests
- `npm run lint` — lint the project

## How it works

The app reasons about **glycemic load** (`GI × carbs ÷ 100`), not glycemic index
alone, and accounts for the protein/fat/fiber that flatten the glucose curve.
The pairing logic lives in `src/engine/` as pure, tested functions; food data is
served through a `FoodSource` abstraction (`src/data/`) currently backed by a
curated in-memory list, with room to plug in a larger database (e.g. USDA
FoodData Central) later.

See [CLAUDE.md](./CLAUDE.md) for architecture and development details.
