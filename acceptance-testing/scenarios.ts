/**
 * Scenarios exercised against both the legacy (`/legacy/memberships`) and
 * modern (`/memberships`) route stacks.
 *
 * Derived from the validation/creation rules documented in CLAUDE.md and
 * read directly out of `src/legacy/routes/membership.routes.js`. Each
 * scenario is a sequence of one or more steps run against BOTH stacks, in
 * order, sharing the same running app instances for the whole script — this
 * lets multi-step scenarios (write, write, read, write, read...) verify that
 * the two independent in-memory stores (legacy's module-level array vs. the
 * modern FileSystemMembershipRepository) grow and report state identically.
 *
 * `ctx` is a small per-scenario bag of state so a later step can assert
 * against something an earlier step observed (e.g. "the list grew by one").
 */

export type Ctx = Record<string, unknown>;

export interface Step {
    description: string;
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
    /** Expected HTTP status on BOTH stacks. If omitted, only cross-stack equality is checked. */
    expectedStatus?: number;
    /**
     * Extra scenario-specific assertions beyond status/body-diff equality,
     * e.g. checking a list grew by the expected amount. Return an array of
     * human-readable violation messages (empty array = all good).
     */
    extraCheck?: (ctx: Ctx, legacyBody: any, modernBody: any) => string[];
}

export interface Scenario {
    name: string;
    description: string;
    steps: Step[];
}

// ---- reusable request bodies -------------------------------------------

const validMonthly = {
    name: 'Silver Plan',
    recurringPrice: 50,
    paymentMethod: 'credit card',
    billingInterval: 'monthly',
    billingPeriods: 6,
};

const validYearly = {
    name: 'Bronze Plan',
    recurringPrice: 80,
    paymentMethod: 'credit card',
    billingInterval: 'yearly',
    billingPeriods: 2,
};

function isoYearsFromNow(years: number): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString();
}

export const scenarios: Scenario[] = [
    {
        name: 'initial-state',
        description:
            'Baseline GET before any writes happen, straight off the seeded JSON fixtures.',
        steps: [
            {
                description:
                    'GET /memberships returns the seeded fixtures with (buggy) empty periods',
                method: 'GET',
                expectedStatus: 200,
            },
        ],
    },

    // ---- validation rules (single request, expect matching rejection) ----
    {
        name: 'missing-name',
        description: 'name is mandatory',
        steps: [
            {
                description: 'POST without name',
                method: 'POST',
                body: {
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'missing-recurring-price',
        description: 'recurringPrice is mandatory',
        steps: [
            {
                description: 'POST without recurringPrice',
                method: 'POST',
                body: {
                    name: 'Silver Plan',
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'recurring-price-zero-falsy-bug',
        description:
            'recurringPrice: 0 is falsy, so `!body.recurringPrice` misfires as "missing" — documents a known quirk both stacks must replicate.',
        steps: [
            {
                description: 'POST with recurringPrice 0',
                method: 'POST',
                body: {
                    name: 'Free Plan',
                    recurringPrice: 0,
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'negative-recurring-price',
        description: 'recurringPrice < 0 is rejected',
        steps: [
            {
                description: 'POST with recurringPrice -10',
                method: 'POST',
                body: {
                    name: 'Silver Plan',
                    recurringPrice: -10,
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'cash-price-above-100',
        description: 'cash payments cannot exceed 100',
        steps: [
            {
                description: 'POST cash payment with recurringPrice 150',
                method: 'POST',
                body: {
                    name: 'Platinum Plan',
                    recurringPrice: 150,
                    paymentMethod: 'cash',
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'cash-price-exactly-100-boundary',
        description:
            'boundary: recurringPrice === 100 with cash is allowed (rule is strictly > 100)',
        steps: [
            {
                description: 'POST cash payment with recurringPrice 100',
                method: 'POST',
                body: {
                    name: 'Platinum Plan',
                    recurringPrice: 100,
                    paymentMethod: 'cash',
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'invalid-billing-interval',
        description: 'billingInterval must be monthly or yearly',
        steps: [
            {
                description: 'POST with billingInterval "daily"',
                method: 'POST',
                body: {
                    name: 'Silver Plan',
                    recurringPrice: 50,
                    billingInterval: 'daily',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'weekly-billing-interval-rejected',
        description:
            'billingInterval "weekly" is rejected by validation on both stacks — even though both the legacy route and the modern BillingPeriod model contain dead code that computes weekly validUntil/period math, that code is unreachable because only "monthly"/"yearly" pass validation.',
        steps: [
            {
                description: 'POST a weekly membership',
                method: 'POST',
                body: {
                    name: 'Weekly Plan',
                    recurringPrice: 50,
                    billingInterval: 'weekly',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'monthly-too-many-periods',
        description: 'monthly billingPeriods > 12 rejected',
        steps: [
            {
                description: 'POST monthly with 13 billingPeriods',
                method: 'POST',
                body: {
                    name: 'Silver Plan',
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 13,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'monthly-exactly-12-boundary',
        description: 'boundary: monthly billingPeriods === 12 is allowed',
        steps: [
            {
                description: 'POST monthly with 12 billingPeriods',
                method: 'POST',
                body: {
                    name: 'Silver Plan',
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 12,
                },
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'monthly-below-6-known-bug',
        description:
            'Known bug: the lower-bound check reads req.billingPeriods (undefined) instead of req.body.billingPeriods, so it never fires — 1 period is (incorrectly) accepted.',
        steps: [
            {
                description: 'POST monthly with 1 billingPeriod',
                method: 'POST',
                body: {
                    name: 'Silver Plan',
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 1,
                },
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'yearly-too-many-periods',
        description: 'yearly billingPeriods > 10 rejected',
        steps: [
            {
                description: 'POST yearly with 11 billingPeriods',
                method: 'POST',
                body: {
                    name: 'Gold Plan',
                    recurringPrice: 80,
                    billingInterval: 'yearly',
                    billingPeriods: 11,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'yearly-exactly-10-boundary',
        description:
            'boundary: yearly billingPeriods === 10 still falls into the ">3" branch, so it is rejected as billingPeriodsLessThan3Years.',
        steps: [
            {
                description: 'POST yearly with 10 billingPeriods',
                method: 'POST',
                body: {
                    name: 'Gold Plan',
                    recurringPrice: 80,
                    billingInterval: 'yearly',
                    billingPeriods: 10,
                },
                expectedStatus: 400,
            },
        ],
    },
    {
        name: 'yearly-exactly-3-boundary',
        description:
            'boundary: yearly billingPeriods === 3 is allowed (rule is strictly > 3)',
        steps: [
            {
                description: 'POST yearly with 3 billingPeriods',
                method: 'POST',
                body: {
                    name: 'Gold Plan',
                    recurringPrice: 80,
                    billingInterval: 'yearly',
                    billingPeriods: 3,
                },
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'yearly-4-periods-rejected',
        description:
            'yearly billingPeriods just above the 3-year boundary is rejected',
        steps: [
            {
                description: 'POST yearly with 4 billingPeriods',
                method: 'POST',
                body: {
                    name: 'Gold Plan',
                    recurringPrice: 80,
                    billingInterval: 'yearly',
                    billingPeriods: 4,
                },
                expectedStatus: 400,
            },
        ],
    },

    // ---- happy paths & derived state ----
    {
        name: 'valid-monthly-membership',
        description:
            'Happy path monthly membership, defaulted validFrom -> state active',
        steps: [
            {
                description: 'POST valid monthly membership',
                method: 'POST',
                body: validMonthly,
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'valid-yearly-membership',
        description: 'Happy path yearly membership',
        steps: [
            {
                description: 'POST valid yearly membership',
                method: 'POST',
                body: validYearly,
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'omitted-payment-method',
        description:
            'paymentMethod omitted entirely (undefined, dropped by JSON serialization on both sides)',
        steps: [
            {
                description: 'POST without paymentMethod',
                method: 'POST',
                body: {
                    name: 'No Payment Method Plan',
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'future-valid-from-pending-state',
        description:
            'validFrom one year in the future -> state should be derived as pending',
        steps: [
            {
                description: 'POST with validFrom one year in the future',
                method: 'POST',
                body: {
                    name: 'Future Plan',
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                    validFrom: isoYearsFromNow(1),
                },
                expectedStatus: 201,
            },
        ],
    },
    {
        name: 'past-valid-from-expired-state',
        description:
            'validFrom two years in the past with a short monthly term -> state should be derived as expired',
        steps: [
            {
                description: 'POST with validFrom two years in the past',
                method: 'POST',
                body: {
                    name: 'Expired Plan',
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                    validFrom: isoYearsFromNow(-2),
                },
                expectedStatus: 201,
            },
        ],
    },

    // ---- multi-step / stateful combinations ----
    {
        name: 'combo-write-write-read-write-read',
        description:
            'Interleaves writes and reads to verify the two independent in-memory stores grow in lockstep (same ids, same counts) when driven with an identical sequence.',
        steps: [
            {
                description: '(1) GET baseline list, remember its length',
                method: 'GET',
                expectedStatus: 200,
                extraCheck: (ctx, legacyBody) => {
                    ctx.baselineCount = legacyBody.length;
                    return [];
                },
            },
            {
                description: '(2) POST valid monthly membership',
                method: 'POST',
                body: validMonthly,
                expectedStatus: 201,
                extraCheck: (ctx, legacyBody, modernBody) => {
                    ctx.firstCreatedId = legacyBody.membership.id;
                    return legacyBody.membership.id === modernBody.membership.id
                        ? []
                        : [
                              `expected legacy and modern created ids to match, got legacy=${legacyBody.membership.id} modern=${modernBody.membership.id}`,
                          ];
                },
            },
            {
                description: '(3) POST valid yearly membership',
                method: 'POST',
                body: validYearly,
                expectedStatus: 201,
                extraCheck: (ctx, legacyBody, modernBody) => {
                    ctx.secondCreatedId = legacyBody.membership.id;
                    const violations: string[] = [];
                    if (legacyBody.membership.id !== modernBody.membership.id) {
                        violations.push(
                            `expected legacy and modern created ids to match, got legacy=${legacyBody.membership.id} modern=${modernBody.membership.id}`,
                        );
                    }
                    if (
                        legacyBody.membership.id !==
                        (ctx.firstCreatedId as number) + 1
                    ) {
                        violations.push(
                            'expected the second created id to be one greater than the first',
                        );
                    }
                    return violations;
                },
            },
            {
                description:
                    '(4) GET list, expect it grew by exactly 2 on both stacks',
                method: 'GET',
                expectedStatus: 200,
                extraCheck: (ctx, legacyBody, modernBody) => {
                    const expected = (ctx.baselineCount as number) + 2;
                    const violations: string[] = [];
                    if (legacyBody.length !== expected) {
                        violations.push(
                            `expected legacy list length ${expected}, got ${legacyBody.length}`,
                        );
                    }
                    if (modernBody.length !== expected) {
                        violations.push(
                            `expected modern list length ${expected}, got ${modernBody.length}`,
                        );
                    }
                    return violations;
                },
            },
            {
                description: '(5) POST a third valid monthly membership',
                method: 'POST',
                body: { ...validMonthly, name: 'Silver Plan (second)' },
                expectedStatus: 201,
                extraCheck: (ctx, legacyBody, modernBody) => {
                    return legacyBody.membership.id === modernBody.membership.id
                        ? []
                        : [
                              `expected legacy and modern created ids to match, got legacy=${legacyBody.membership.id} modern=${modernBody.membership.id}`,
                          ];
                },
            },
            {
                description:
                    '(6) GET list, expect it grew by exactly 3 on both stacks',
                method: 'GET',
                expectedStatus: 200,
                extraCheck: (ctx, legacyBody, modernBody) => {
                    const expected = (ctx.baselineCount as number) + 3;
                    const violations: string[] = [];
                    if (legacyBody.length !== expected) {
                        violations.push(
                            `expected legacy list length ${expected}, got ${legacyBody.length}`,
                        );
                    }
                    if (modernBody.length !== expected) {
                        violations.push(
                            `expected modern list length ${expected}, got ${modernBody.length}`,
                        );
                    }
                    return violations;
                },
            },
        ],
    },
    {
        name: 'combo-rejected-write-does-not-mutate-state',
        description:
            'A failed validation must not create a membership on either stack.',
        steps: [
            {
                description: '(1) GET baseline list, remember its length',
                method: 'GET',
                expectedStatus: 200,
                extraCheck: (ctx, legacyBody) => {
                    ctx.baselineCount = legacyBody.length;
                    return [];
                },
            },
            {
                description:
                    '(2) POST an invalid membership (missing name) — expect rejection, no mutation',
                method: 'POST',
                body: {
                    recurringPrice: 50,
                    billingInterval: 'monthly',
                    billingPeriods: 6,
                },
                expectedStatus: 400,
            },
            {
                description:
                    '(3) GET list again, expect the SAME length as the baseline',
                method: 'GET',
                expectedStatus: 200,
                extraCheck: (ctx, legacyBody, modernBody) => {
                    const expected = ctx.baselineCount as number;
                    const violations: string[] = [];
                    if (legacyBody.length !== expected) {
                        violations.push(
                            `expected legacy list length to stay at ${expected} after a rejected write, got ${legacyBody.length}`,
                        );
                    }
                    if (modernBody.length !== expected) {
                        violations.push(
                            `expected modern list length to stay at ${expected} after a rejected write, got ${modernBody.length}`,
                        );
                    }
                    return violations;
                },
            },
            {
                description:
                    '(4) POST a valid membership to confirm writes still work after a rejection',
                method: 'POST',
                body: {
                    ...validMonthly,
                    name: 'Silver Plan (after rejection)',
                },
                expectedStatus: 201,
            },
            {
                description:
                    '(5) GET list, expect it grew by exactly 1 relative to the baseline',
                method: 'GET',
                expectedStatus: 200,
                extraCheck: (ctx, legacyBody, modernBody) => {
                    const expected = (ctx.baselineCount as number) + 1;
                    const violations: string[] = [];
                    if (legacyBody.length !== expected) {
                        violations.push(
                            `expected legacy list length ${expected}, got ${legacyBody.length}`,
                        );
                    }
                    if (modernBody.length !== expected) {
                        violations.push(
                            `expected modern list length ${expected}, got ${modernBody.length}`,
                        );
                    }
                    return violations;
                },
            },
        ],
    },
];
