# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install          # install dependencies
npm run start        # run with ts-node (dev, no build needed)
npm run build        # compile TypeScript → dist/
npm run serve        # run compiled dist/index.js (server listens on :3099)
npm run test         # run all Jest tests
npx jest --testPathPatterns="<file>" # run a single test file
```

## Architecture

This is an Express + TypeScript server exposing membership management endpoints. The central goal is refactoring a legacy JS implementation into a modern TypeScript one.

### Entry point: `src/index.ts`
- Mounts `/memberships` → `src/modern/routes/membership.routes.ts`
- Mounts `/legacy/memberships` → `src/legacy/routes/membership.routes.js` (loaded via `require()` because it's CommonJS JS)
- Registers `src/error-handler.middleware.ts` as the global Express error handler (catches unhandled errors, returns `500 { error, message }`)

### Two parallel route stacks

| Path | File | Status |
|------|------|--------|
| `GET/POST /legacy/memberships` | `src/legacy/routes/membership.routes.js` | Reference implementation (JS, no types) |
| `GET/POST /memberships` | `src/modern/routes/membership.routes.ts` | Stub — `throw new Error('not implemented')` |

### Mock data (no database)

Both stacks read from in-memory JSON:
- `src/data/memberships.json` — array of Membership objects
- `src/data/membership-periods.json` — array of MembershipPeriod objects joined by `membershipId`

Mutations (POST) push to these in-memory arrays; data resets on server restart.

### Business logic in the legacy route

The POST handler encodes all validation and creation logic inline — no service layer exists yet. Key rules to preserve when refactoring:

- `name` and `recurringPrice` are mandatory; missing → `400 { message: "missingMandatoryFields" }`
- `recurringPrice < 0` → `400 { message: "negativeRecurringPrice" }`
- `recurringPrice > 100 && paymentMethod === 'cash'` → `400 { message: "cashPriceBelow100" }`
- `billingInterval` must be `'monthly'` or `'yearly'`; otherwise → `400 { message: "invalidBillingPeriods" }`
- Monthly: `billingPeriods > 12` → `billingPeriodsMoreThan12Months`; `< 6` → `billingPeriodsLessThan6Months`
- Yearly: `billingPeriods > 10` → `billingPeriodsMoreThan10Years`; `billingPeriods > 3 && ≤ 10` → `billingPeriodsLessThan3Years`
- `validFrom` defaults to `new Date()` if not provided; `validUntil` is computed from interval × periods
- Membership `state` is derived: `pending` (validFrom in future), `expired` (validUntil in past), otherwise `active`
- `userId` is hardcoded to `2000`
- Response: `201 { membership, membershipPeriods }`

**Known bug in legacy code (line 29):** `req.billingPeriods` should be `req.body.billingPeriods` — the monthly lower-bound check never fires. Replicate bug or fix intentionally.

### Testing

Jest is configured with `ts-jest`; test files must live under `src/` (configured via `roots`). Use `supertest` (already installed) for HTTP integration tests against the Express app.

### TypeScript config

`tsconfig.json` targets ES6/CommonJS with `allowJs: true` (so the legacy `.js` file is included in the TS project), `resolveJsonModule: true` (enables direct `import` of `.json` data files), and `strict: true`.
