# KBC Mirror

Personalization the customer can read, correct and veto.

Built solo in the Tectonic Hackathon round 1 (Sep 30 2026, 18:00 to 23:00) for the KBC challenge. Node 22 or newer.

## What it is

Every bank runs detectors. KBC's Kate already covers 140+ situations. Mirror is what happens after the detector.

- The customer sees every inference the bank holds about them, with the confidence and the signals behind it.
- They answer: **yes**, **not quite** (with a correction), or **no**.
- Nudges only go out on inferences the customer confirmed, or is very likely to agree with, inside a contact budget the customer sets ("at most 2 a week, in the evening"). Held nudges say why they were held.
- Every answer is a label. On the scale panel, one round of answers from 2,000 synthetic customers re-weights the rules for all of them: precision goes from 72% to 80% with no loss of recall.

## Why this is not another detector

Kate already detects. Mirror changes who owns the inference. The customer sees it, answers it and sets the contact budget, so nothing ships without an explicit yes, and every answer is a label that re-weights the rules for all 2.3 million customers. Detection is the input; correction at scale is the product.

## Run it

```
npm install
npm run dev        # http://localhost:3000
npm run check      # 3 tests (needs Node 22, uses --experimental-strip-types)
```

No environment variables needed. `SESSION_SECRET` is optional (see `.env.example`); without it a random secret is generated at boot and sessions reset on restart.

## Architecture

Persona signals -> `lib/rules.ts` (6 rules, confidence from strong and weak signals, times a per-rule weight) -> `lib/ledger.ts` (decisions and budget turn inferences into a queue and a held list) -> `app/api/*` (session, ownership, validation, rate limit) -> `app/mirror`. `lib/scale.ts` reruns the rules over 2,000 generated customers and re-weights from their vetoes. `lib/session.ts` is an HMAC-signed, httpOnly cookie. State lives in memory (`lib/store.ts`).

## What is simulated

Personas, signals, the population and the customers' reactions are synthetic and seeded (`lib/data.ts`, `lib/scale.ts`: a false inference is vetoed 70% of the time, a true one confirmed 60%). The re-weighting is `weight = 1 - 0.8 * vetoRate`, not a trained model. The 72% to 80% number is the output of that seed. It shows the mechanism, not a KBC result.

## How to verify

```
npm run check
# inference order for Lien, ownership check, precision uplift on the population

curl -i localhost:3000/api/ledger                                   # 401, not signed in
curl -c cj -H 'content-type: application/json' -H 'origin: http://localhost:3000' -d '{"persona":"lien"}' localhost:3000/api/login
curl -i -b cj -H 'content-type: application/json' -H 'origin: http://localhost:3000' -d '{"inferenceId":"tom:MORTGAGE_END","decision":"vetoed"}' localhost:3000/api/decision   # 404, not yours
curl -i -b cj -H 'content-type: application/json' -H 'origin: http://localhost:3000' -d '{"perWeek":99,"window":"nights"}' localhost:3000/api/budget   # 400
```

## Roles and access rules

One role: customer. A customer signs in as one of three synthetic personas.

- Every data route calls `currentUser()` first and returns 401 without a valid session.
- A customer can only read their own ledger and only decide on inferences whose id belongs to them (`ownsInference`), otherwise 404.
- The scale endpoint returns aggregates over a synthetic population, never another customer's data.
- Mutating routes accept JSON only, require an Origin header that matches the Host, and are rate limited per IP (in memory, trusted only behind a proxy that sets `x-forwarded-for`).
- Inputs are validated by hand: persona id whitelist, decision whitelist, note max 200 chars, budget 0 to 7 with a window whitelist.
- Security headers and a CSP are set in `next.config.ts`. `'unsafe-inline'` stays in `script-src` because Next's hydration needs it without a nonce setup. No secrets in the repo.

## Unfinished

- State is in memory and resets on restart. A real version stores decisions on the customer record.
- The "why" line is a template. Next step is a language model writing it from the same evidence, so it stays checkable.
- Sign-in is a persona picker. A real version sits behind KBC's existing authentication.
