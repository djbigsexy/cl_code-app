# CLAUDE.md

This file gives guidance to Claude Code (and other AI assistants) when working in this repository.

## What this project is

A **subscription tracker**: a single-page web app for recurring charges (streaming, music
production tools, meal delivery, supplements) and for fixed-term payment plans that end after a
set number of charges. It supports pausing a subscription and resuming it later.

There is **no backend**. All state lives in the browser's local storage under the
`subscription-tracker:data` key, with JSON export/import as the backup path. Don't add a server,
database, or auth layer unless the user asks for one.

## Stack

- **React 19** + **TypeScript** (strict, plus `noUncheckedIndexedAccess` and `noUnusedLocals`)
- **Vite 6** for dev/build, **Vitest 3** for tests
- Hand-written CSS in `src/index.css` — no UI or styling library. Theming is CSS custom properties
  on `:root` with a `prefers-color-scheme: dark` override; both themes must stay legible.

## Commands

```bash
npm install
npm run dev        # dev server on :5173
npm run build      # tsc -b && vite build
npm run preview    # serve dist/ on :4173
npm test           # vitest run
npm run typecheck  # tsc -b --noEmit
```

Run a single test file or case:

```bash
npx vitest run src/lib/billing.test.ts
npx vitest run -t "never lets a pause undo a completed payment"
```

## Layout

```
src/
  types.ts              Subscription / Category / Account / AppData
  useAppData.ts         Single owner of app state; mirrors to localStorage
  App.tsx               Layout, filtering, sorting, modal wiring
  lib/
    dates.ts            UTC calendar-day math (YYYY-MM-DD strings)
    billing.ts          Schedule derivation, pause/resume/cancel  ← the core
    billing.test.ts     Tests for the above
    storage.ts          Load/save/normalize, default categories
    money.ts            Currency formatting
  components/           Summary, SubscriptionCard, SubscriptionForm, Settings, Modal
```

## Domain rules that matter

These are the non-obvious invariants. Breaking one is a real bug, and `billing.test.ts` covers
each — run the tests after touching `lib/billing.ts`.

- **Time-dependent state is derived, never stored.** `getSchedule()` recomputes status, payment
  counts, and the next charge date from the current date on every call. A plan finishing its last
  payment reports itself `completed` with nothing scheduled to run. Don't cache these onto the
  record.
- **Dates are calendar days in UTC**, held as `YYYY-MM-DD` strings. Never build a local `Date` from
  user input — a user west of UTC will see charges land a day early. Use the helpers in `dates.ts`.
- **Month arithmetic clamps the day and always steps from the anchor.** Jan 31 + 1 month is Feb 28;
  Jan 31 + 2 months is Mar 31, *not* Feb 28 + 1 month. Stepping iteratively compounds the clamp and
  silently drifts the billing day, so always compute `anchor + n * cycle`.
- **A pause must never move the paid count backwards.** `billingAnchor` marks the start of the
  *current* billing run only; charges from earlier runs are banked in `paymentsCarried`, and
  `paymentsMade` is the sum. Shifting the anchor alone would un-make past payments.
- **Resuming credits back unused paid time.** `pauseCycleDaysRemaining` records how much of the
  paid-for period was left when pausing; resuming schedules the next charge that far out. Pausing
  right after a charge must not forfeit the period just bought.
- **Paused, canceled, and completed subscriptions are excluded from spend totals**, and their
  counts freeze at the date they stopped rather than drifting upward.
- **Totals never mix currencies.** Amounts are grouped and reported per currency; do not invent an
  exchange rate.

## Conventions

- Two-space indent, single quotes, semicolons — match the surrounding files.
- Keep pure logic in `lib/` and test it there. Components stay presentational; state changes go
  through the `actions` object in `useAppData.ts`.
- Comments explain *why*, not *what* — the existing ones flag reasoning that isn't obvious from
  the code (clamping, freezing, currency grouping). Match that density; don't narrate.
- `normalize()` in `storage.ts` is the trust boundary for anything parsed from JSON. New fields on
  `Subscription` need a default there, or old exports will break on import.

## Git workflow

- **Do not commit directly to `main`.** Work on a feature branch.
- The container is ephemeral — commit and push anything worth keeping before the session ends.
- Push with upstream tracking: `git push -u origin <branch-name>`; retry transient network failures
  with backoff (2s, 4s, 8s, 16s).
- **Do not open a pull request unless explicitly asked.**

## Guidance for AI assistants

- **Keep this file truthful.** If you change the stack, commands, or the domain rules above, update
  this file in the same change.
- **Verify before documenting.** Read the actual config and source rather than assuming.
- Run `npm test` and `npm run build` before committing; both are fast.
