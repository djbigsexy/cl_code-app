# Subscription Tracker

Keeps track of everything that bills you on a repeat — streaming services, music
production tools, meal boxes, supplements — plus the payment plans that stop on
their own after a set number of charges.

Installs to your phone's home screen, and two people can share one list: add a
subscription on your phone and it shows up on your partner's within seconds.

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

## Running it locally

```bash
npm install
npm run dev      # http://localhost:5173
```

With no further setup the app works entirely in your browser: no account, no
network, data in local storage. Everything below is about turning on sync.

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

## Setting up sync and sharing

Sync is optional and off until you add credentials. It uses
[Supabase](https://supabase.com) (free tier is far more than enough for two
people).

**1. Create the project.** Sign up at supabase.com and create a project. Note
the database password somewhere safe — you won't need it for this app, but
Supabase will ask you to set one.

**2. Create the tables.** In the project, open **SQL Editor → New query**, paste
the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
It creates the tables, the security rules, and the sharing functions. It's safe
to run more than once.

**3. Copy your keys.** Go to **Project Settings → API** and copy the *Project
URL* and the *anon public* key. Then:

```bash
cp .env.example .env
```

and fill in the two values. Restart `npm run dev`.

> The anon key is designed to be public and is safe in a browser build. What
> actually protects your data is the row-level security in `schema.sql`: every
> query is filtered to households you're a member of, so the key alone gets an
> outsider nothing.

**4. Turn off email confirmation (optional but recommended).** In
**Authentication → Sign In / Providers → Email**, switch off *Confirm email*.
For a two-person app it saves a round trip through the inbox, and Supabase's
built-in email sender is rate-limited and prone to landing in spam. Leave it on
if you'd rather verify addresses.

> Don't create users by inserting into `auth.users` by hand. GoTrue expects
> columns the app-facing schema doesn't show (its token fields must be empty
> strings rather than NULL, and it wants a matching `auth.identities` row), and
> a hand-made row makes sign-in fail with a 500 "Database error querying
> schema". Sign up through the app, or use the Auth → Users panel.

**5. Sign up and share.** Open the app, click **Sign in to sync**, create an
account, and choose **Start a new one**. You'll get an invite code under
**Settings → Sharing**. Your partner creates their own account on their own
device, chooses **Join an existing one**, and enters that code. You're now both
looking at the same list.

If you'd been using the app before signing in, it offers to copy your existing
subscriptions into the shared list the first time.

## Putting it on your phone

The app is a PWA, so it installs to the home screen without an app store. It
needs to be served over HTTPS first — a `localhost` dev server won't install.

**Deploying via GitHub Pages** (included): push to `main` and
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
publishes it. Before the first run:

1. **Settings → Pages → Source:** *GitHub Actions*.
2. **Settings → Secrets and variables → Actions**, add two repository secrets:
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without them the deploy
   still works — you just get the local-only version, with no sign-in.

Any static host works equally well (Netlify, Vercel, Cloudflare Pages); the
build output is a plain `dist/` folder.

**Installing it, once it's live:**

- **iPhone/iPad:** open the URL in Safari → Share → *Add to Home Screen*. (It
  must be Safari; Chrome on iOS can't install PWAs.)
- **Android:** open in Chrome → menu → *Install app*.
- **Desktop:** an install icon appears in the address bar in Chrome or Edge.

It then opens fullscreen with its own icon. The app shell is cached, so it
launches offline and shows your last-synced data with an **Offline** badge;
changes need a connection to reach the other person.

## Your data

**Signed in:** subscriptions live in your Supabase project, shared with everyone
in your household, and survive clearing your browser.

**Signed out, or with no credentials configured:** everything stays in this
browser under the `subscription-tracker:data` local storage key, and clearing
site data clears it.

Either way, **Settings → Export JSON** writes a backup file, and Import reads
one back. It's worth keeping an occasional export regardless.
