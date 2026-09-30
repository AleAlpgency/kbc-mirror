# KBC Mirror

Personalization the customer can read, correct and veto.

Built solo in the Tectonic Hackathon round 1 (Sep 30 2026, 18:00 to 23:00) for the KBC challenge.

## What it is

Every bank runs detectors: "this customer is moving", "this customer's income went up". KBC's Kate already covers 140+ such situations. Mirror is what happens after the detector.

- The customer sees every inference the bank holds about them, with the confidence and the signals behind it.
- They answer: **yes**, **not quite** (with a correction), or **no**.
- Nudges only go out on inferences the customer confirmed, or is very likely to agree with, inside a contact budget the customer sets ("at most 2 a week, in the evening").
- Every answer is a label. On the scale panel, one round of answers from 2,000 synthetic customers re-weights the rules for all of them: precision goes from 72% to 80% with no loss of recall. That is the flywheel at 2.3 million customers: the bank's understanding of its customers is trained by the customers.

## Run it

```
npm install
npm run dev        # http://localhost:3000
npm run check      # 3 tests: inference order, ownership, precision uplift
```

No environment variables needed. `SESSION_SECRET` is optional (see `.env.example`); without it a random secret is generated at boot and sessions reset on restart.

## How it works

- `lib/data.ts` synthetic personas and a seeded population generator. No real data anywhere.
- `lib/rules.ts` six situation rules. Confidence comes from strong and weak signals, times a per-rule weight.
- `lib/ledger.ts` builds the customer's ledger, the nudge queue and the held list from their decisions and budget.
- `lib/scale.ts` the flywheel simulation: fire, collect answers, re-weight, fire again.
- `app/api/*` route handlers. `lib/session.ts` HMAC-signed, httpOnly session cookie.

## Roles and access rules

There is one role: customer. A customer signs in as one of three synthetic personas.

- Every data route calls `currentUser()` first and returns 401 without a valid session.
- A customer can only read their own ledger and only decide on inferences whose id belongs to them (`ownsInference`), otherwise 404.
- The scale endpoint returns aggregates over a synthetic population, never another customer's data.
- Mutating routes accept JSON only, check the Origin header against the Host, and are rate limited per IP.
- Inputs are validated by hand: persona id whitelist, decision whitelist, note max 200 chars, budget 0 to 7 with a window whitelist.
- Security headers and a CSP are set in `next.config.ts`. No secrets in the repo.

## Unfinished

- State is in memory and resets on restart. A real version stores decisions on the customer record.
- The "why" line is a template. Next step is a language model writing it from the evidence, with the same evidence shown so it stays checkable.
- Sign-in is a persona picker. A real version sits behind KBC's existing authentication.
- The scale numbers are a simulation on synthetic data. They show the mechanism, not a measured KBC result.
