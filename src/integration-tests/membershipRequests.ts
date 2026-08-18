export const validMonthlyMembershipRequest = {
    name: 'Silver Plan',
    recurringPrice: 50,
    paymentMethod: 'credit card',
    billingInterval: 'monthly',
    billingPeriods: 6,
};

export const validYearlyMembershipRequest = {
    name: 'Bronze Plan',
    recurringPrice: 80,
    paymentMethod: 'credit card',
    billingInterval: 'yearly',
    billingPeriods: 2,
};

export const missingNameRequest = {
    recurringPrice: 50,
    billingInterval: 'monthly',
    billingPeriods: 6,
};

export const missingRecurringPriceRequest = {
    name: 'Silver Plan',
    billingInterval: 'monthly',
    billingPeriods: 6,
};

export const negativeRecurringPriceRequest = {
    name: 'Silver Plan',
    recurringPrice: -10,
    billingInterval: 'monthly',
    billingPeriods: 6,
};

export const cashPriceAbove100Request = {
    name: 'Platinum Plan',
    recurringPrice: 150,
    paymentMethod: 'cash',
    billingInterval: 'monthly',
    billingPeriods: 6,
};

export const invalidBillingIntervalRequest = {
    name: 'Silver Plan',
    recurringPrice: 50,
    billingInterval: 'weekly',
    billingPeriods: 6,
};

export const monthlyTooManyBillingPeriodsRequest = {
    name: 'Silver Plan',
    recurringPrice: 50,
    billingInterval: 'monthly',
    billingPeriods: 13,
};

// Fewer than 6 monthly billing periods. Per the legacy route's known bug
// (reads `req.billingPeriods` instead of `req.body.billingPeriods`) this
// lower-bound check never fires, so this request is expected to succeed.
export const monthlyTooFewBillingPeriodsRequest = {
    name: 'Silver Plan',
    recurringPrice: 50,
    billingInterval: 'monthly',
    billingPeriods: 3,
};

export const yearlyTooManyBillingPeriodsRequest = {
    name: 'Gold Plan',
    recurringPrice: 80,
    billingInterval: 'yearly',
    billingPeriods: 11,
};

export const yearlyBetween3And10BillingPeriodsRequest = {
    name: 'Gold Plan',
    recurringPrice: 80,
    billingInterval: 'yearly',
    billingPeriods: 5,
};

export const zeroRecurringPriceRequest = {
    name: 'Silver Plan',
    recurringPrice: 0,
    billingInterval: 'monthly',
    billingPeriods: 6,
};

export const zeroBillingPeriodsRequest = {
    name: 'Silver Plan',
    recurringPrice: 50,
    billingInterval: 'monthly',
    billingPeriods: 0,
};

export const negativeBillingPeriodsRequest = {
    name: 'Silver Plan',
    recurringPrice: 50,
    billingInterval: 'monthly',
    billingPeriods: -2,
};

export function futureValidFromMembershipRequest() {
    const validFrom = new Date();
    validFrom.setFullYear(validFrom.getFullYear() + 1);
    return {
        name: 'Future Plan',
        recurringPrice: 50,
        billingInterval: 'monthly',
        billingPeriods: 6,
        validFrom: validFrom.toISOString(),
    };
}

export function expiredMembershipRequest() {
    const validFrom = new Date();
    validFrom.setFullYear(validFrom.getFullYear() - 2);
    return {
        name: 'Expired Plan',
        recurringPrice: 50,
        billingInterval: 'monthly',
        billingPeriods: 6,
        validFrom: validFrom.toISOString(),
    };
}
