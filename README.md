# Subscription Tracker

Keeps track of everything that bills you on a repeat — streaming services, music
production tools, meal boxes, supplements — plus the payment plans that stop on
their own after a set number of charges.

Runs entirely in the browser. There is no backend and no account; your data
lives in your browser's local storage, and you can export it to a JSON file at
any time.

## What it tracks

Each subscription records the **company**, a **category**, the **amount** and
**billing frequency**, the **date billing started**, and the **account or card
it's charged to**. From that it works out everything time-dependent for you:

- **Next charge date**, with anything inside a week highlighted.
- **Normalized cost** — a weekly meal box and an annual plan are both shown as a
  monthly and yearly figure, so totals are comparable.
- **Monthly and yearly spend**, broken down by category.
- **What's due in the next 30 days.**

### Pausing

Pause a subscription and it stops accruing charges immediately; it drops out of
your monthly spend but stays on the list. Resuming picks the schedule back up
where it left off:

- Payments already made are never undone by a pause.
- The unused part of the period you'd already paid for is credited back, so
  pausing three days after a charge doesn't throw that month away.
- On a fixed-term plan, paused time never burns a payment — pause a 12-payment
  plan at 5 of 12 and it resumes at 5 of 12.

### Payment plans that end

Set a subscription to **end after a set number of payments** and it tracks the
count for you: a progress bar, the amount still owed, and the date of the final
charge. When the last payment lands, the plan marks itself paid off and stops
counting toward your monthly spend — nothing has to run on a schedule for that
to happen, since it's derived from the date every time you open the app.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build
npm test           # run the billing test suite
npm run typecheck  # tsc, no emit
```

To run a single test file or a single case:

```bash
npx vitest run src/lib/billing.test.ts
npx vitest run -t "never lets a pause undo a completed payment"
```

## Your data

Everything is stored under the `subscription-tracker:data` key in local storage,
which means it's tied to one browser on one device. **Settings → Export JSON**
writes a backup you can keep or import into another browser. Clearing site data
clears your subscriptions, so export first.
