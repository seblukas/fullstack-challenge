import ControllerError from '../../errors/ControllerError';
import type CreateMembershipRequestBody from '../CreateMembershipRequestBody';
import type ValidatedCreateMembershipRequestBody from './ValidatedCreateMembershipRequestBody';

export default class MembershipRequestValidator {
    validateCreateMembershipRequestBody(
        body: CreateMembershipRequestBody,
    ): asserts body is ValidatedCreateMembershipRequestBody {
        this.validateMandatoryFieldsAreSet(body);
        this.validateRecurringPriceIsNotNegative(body);
        this.validateCashPaymentPricingRequirements(body);

        const hasMonthlyBillingInterval = body.billingInterval! === 'monthly';
        const hasYearlyBillingInterval = body.billingInterval! === 'yearly';
        const hasInvalidBillingInterval =
            !hasMonthlyBillingInterval && !hasYearlyBillingInterval;

        if (hasInvalidBillingInterval) {
            throw new ControllerError(400, 'invalidBillingPeriods');
        }

        if (hasMonthlyBillingInterval) {
            this.validateMonthlyBillingMembership(body);
        }

        if (hasYearlyBillingInterval) {
            this.validateYearlyBillingMembership(body);
        }
    }

    private validateYearlyBillingMembership(body: CreateMembershipRequestBody) {
        if (body.billingPeriods! > 10) {
            throw new ControllerError(400, 'billingPeriodsMoreThan10Years');
        }

        /* TODO: Check if we want to change logic or error message. The check contradicts the error message.
           This is in legacy code as well, but what is the intended behavior?
        */
        if (body.billingPeriods! > 3) {
            throw new ControllerError(400, 'billingPeriodsLessThan3Years');
        }
    }

    private validateMonthlyBillingMembership(
        body: CreateMembershipRequestBody,
    ) {
        if (body.billingPeriods! > 12) {
            throw new ControllerError(400, 'billingPeriodsMoreThan12Months');
        }
    }

    private validateMandatoryFieldsAreSet(
        body: CreateMembershipRequestBody,
    ): asserts body is ValidatedCreateMembershipRequestBody {
        const isMissingMandatoryFields = !body.name || !body.recurringPrice;
        if (isMissingMandatoryFields) {
            throw new ControllerError(400, 'missingMandatoryFields');
        }
    }

    private validateRecurringPriceIsNotNegative(
        body: ValidatedCreateMembershipRequestBody,
    ) {
        if (body.recurringPrice < 0) {
            throw new ControllerError(400, 'negativeRecurringPrice');
        }
    }

    private validateCashPaymentPricingRequirements(
        body: ValidatedCreateMembershipRequestBody,
    ) {
        const isCashPayment = body.paymentMethod === 'cash';
        const isPriceAboveLowerBoundLimit = body.recurringPrice > 100;
        const isRecurringPricingAboveLimitForCashPayment =
            isPriceAboveLowerBoundLimit && isCashPayment;
        if (isRecurringPricingAboveLimitForCashPayment) {
            throw new ControllerError(400, 'cashPriceBelow100');
        }
    }
}
