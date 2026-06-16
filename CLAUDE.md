# CLAUDE.md

This file gives guidance to Claude Code (and other AI assistants) when working in this repository.

## What this project is

**GI Balance** is a client-side web app for keeping a meal's glycemic response in check. You enter (search and select) a food, and the app suggests **pairing partners** — foods rich in protein, fat, or fiber, or with a low glycemic load — that blunt the blood-sugar spike of the food you chose. It also rates how "balanced" the resulting meal is.

The app is a single-page React app with **no backend**: all food data and all logic run in the browser.

### Domain concepts (important for correctness)

- **Glycemic Index (GI):** 0–100 ranking of how fast a food's carbohydrate raises blood glucose. Ignores portion size.
- **Glycemic Load (GL):** `GI × carbsPerServing / 100`. This reflects the actual impact of a real serving and is what the app reasons about. Single-food thresholds: ≤10 low, 11–19 medium, ≥20 high.
- **Blunting nutrients:** protein, fat, and fiber slow gastric emptying and flatten the glucose curve. The pairing engine recommends partners that add these or that are themselves low-GL.

This is general wellness guidance, **not medical advice** — keep the in-app disclaimer intact and don't present outputs as clinical.

## Tech stack

- **React 18** + **TypeScript** (strict mode), bundled with **Vite 6**.
- **Vitest** for unit tests.
- **ESLint 9** (flat config) for linting.
- No backend, router, or state library — intentionally minimal.

## Commands

Run from the repository root:

| Task | Command |
| --- | --- |
| Install deps | `npm install` |
| Dev server (hot reload) | `npm run dev` |
| Type-check + production build | `npm run build` |
| Preview the production build | `npm run preview` |
| Run all tests once | `npm test` |
| Run tests in watch mode | `npm run test:watch` |
| Run a single test file | `npx vitest run src/engine/pairing.test.ts` |
| Lint | `npm run lint` |

## Project layout

```
index.html              Vite entry HTML
vite.config.ts          Vite + Vitest config
tsconfig.json           TypeScript config (strict)
eslint.config.js        ESLint flat config
src/
  main.tsx              React entry point
  App.tsx               UI: food search, selection, and pairing results
  styles.css            All styling (single stylesheet, CSS variables)
  data/
    types.ts            Food + FoodCategory domain types
    seedFoods.ts        Curated in-memory food catalogue (GI + macros)
    foodSource.ts       FoodSource abstraction; LocalFoodSource over the seed data
  engine/
    glycemic.ts         GL math, meal totals, blunting ratio, balance rating/score
    glycemic.test.ts    Tests for the glycemic math
    pairing.ts          suggestPartners() — ranks balancing partners for a food
    pairing.test.ts     Tests for the pairing engine
```

## Architecture & conventions

- **Engine is pure and UI-agnostic.** Everything in `src/engine/` is pure functions over `Food` objects with no React or DOM dependencies. This keeps the logic unit-testable and is where new scoring/pairing behavior belongs. The UI only calls into the engine; it does not embed glycemic math.
- **Data access goes through `FoodSource`.** `src/data/foodSource.ts` defines the `FoodSource` interface; the app depends on that interface, not on the seed array directly. The current implementation (`LocalFoodSource`) is backed by `seedFoods.ts`.
- **The seed dataset is approximate.** GI and macro values in `seedFoods.ts` are representative published averages for proving out the engine, not clinical data. Carb-free foods (meats, oils) use `gi: 0`. When adding foods, follow the existing field shape and keep one reference serving per entry.
- **Tests accompany engine changes.** Any change to scoring, the balance rating, or the pairing algorithm should update or add tests in the matching `*.test.ts` file. Tests assert on *relationships* (e.g. "every suggestion improves on the food alone", "results are ranked descending") rather than brittle exact scores, so the heuristic can be tuned without churn — keep that style.
- **TypeScript is strict** with `noUnusedLocals`/`noUnusedParameters` on; the build fails on unused symbols. Prefer `import type` for type-only imports.

## Extending it

- **More foods:** add entries to `src/data/seedFoods.ts`.
- **A real food database (planned):** the intended next step is to back `FoodSource` with an external dataset such as **USDA FoodData Central**. Implement a new class against the `FoodSource` interface; a remote source will likely need async-capable methods, so widen the interface to return promises and update the (few) call sites in `App.tsx`. The engine needs no changes.
- **Portion control:** servings are currently fixed per food. Supporting variable portions means scaling `carbsPerServing` (and the other macros) by a quantity multiplier before calling the engine.

## Git workflow

This repo is developed through Claude Code's remote (ephemeral) execution environment.

- **Do not commit directly to `main`.** Work on a feature branch.
- The container is reclaimed after the session — **commit and push** anything worth keeping.
- Push with upstream tracking: `git push -u origin <branch-name>`; retry transient network failures with exponential backoff.
- **Do not open a pull request unless explicitly asked.**

## Keeping this file current

When you change the stack, commands, directory layout, or conventions, update this file in the same change. Verify commands actually run before documenting them. An out-of-date CLAUDE.md is worse than a short one.
