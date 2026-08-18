import {
    cashPriceAbove100Request,
    invalidBillingIntervalRequest,
    missingNameRequest,
    missingRecurringPriceRequest,
    monthlyTooFewBillingPeriodsRequest,
    monthlyTooManyBillingPeriodsRequest,
    negativeBillingPeriodsRequest,
    negativeRecurringPriceRequest,
    validMonthlyMembershipRequest,
    validYearlyMembershipRequest,
    yearlyBetween3And10BillingPeriodsRequest,
    yearlyTooManyBillingPeriodsRequest,
    zeroBillingPeriodsRequest,
    zeroRecurringPriceRequest,
} from '@/integration-tests/membershipRequests';
import ControllerError from '../../errors/ControllerError';
import MembershipRequestValidator from './MembershipRequestValidator';

describe('MembershipRequestValidator', () => {
    function createValidator(): MembershipRequestValidator {
        return new MembershipRequestValidator();
    }

    describe('valid requests', () => {
        it('accepts a valid monthly request', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...validMonthlyMembershipRequest,
                }),
            ).not.toThrow();
        });

        it('accepts a valid yearly request', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...validYearlyMembershipRequest,
                }),
            ).not.toThrow();
        });

        it('accepts exactly 3 yearly billing periods (boundary)', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...validYearlyMembershipRequest,
                    billingPeriods: 3,
                }),
            ).not.toThrow();
        });

        it('accepts a cash payment method with a recurringPrice of exactly 100 (boundary)', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...validMonthlyMembershipRequest,
                    paymentMethod: 'cash',
                    recurringPrice: 100,
                }),
            ).not.toThrow();
        });

        it('does not reject fewer than 6 monthly billing periods (known gap, not yet enforced)', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...monthlyTooFewBillingPeriodsRequest,
                }),
            ).not.toThrow();
        });

        it('does not reject zero billingPeriods (known gap, no lower bound enforced)', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...zeroBillingPeriodsRequest,
                }),
            ).not.toThrow();
        });

        it('does not reject a negative billingPeriods (known gap, no lower bound enforced)', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...negativeBillingPeriodsRequest,
                }),
            ).not.toThrow();
        });
    });

    describe('invalid requests', () => {
        it('rejects a request missing the mandatory name field', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...missingNameRequest,
                }),
            ).toThrow(new ControllerError(400, 'missingMandatoryFields'));
        });

        it('rejects a request missing the mandatory recurringPrice field', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...missingRecurringPriceRequest,
                }),
            ).toThrow(new ControllerError(400, 'missingMandatoryFields'));
        });

        it('rejects a negative recurringPrice', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...negativeRecurringPriceRequest,
                }),
            ).toThrow(new ControllerError(400, 'negativeRecurringPrice'));
        });

        it('treats an explicit recurringPrice of 0 as a missing field (known bug, preserved from legacy)', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...zeroRecurringPriceRequest,
                }),
            ).toThrow(new ControllerError(400, 'missingMandatoryFields'));
        });

        it('rejects a cash payment method with a recurringPrice above 100', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...cashPriceAbove100Request,
                }),
            ).toThrow(new ControllerError(400, 'cashPriceBelow100'));
        });

        it('rejects a billingInterval that is neither monthly nor yearly', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...invalidBillingIntervalRequest,
                }),
            ).toThrow(new ControllerError(400, 'invalidBillingPeriods'));
        });

        it('rejects more than 12 monthly billing periods', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...monthlyTooManyBillingPeriodsRequest,
                }),
            ).toThrow(
                new ControllerError(400, 'billingPeriodsMoreThan12Months'),
            );
        });

        it('rejects more than 10 yearly billing periods', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...yearlyTooManyBillingPeriodsRequest,
                }),
            ).toThrow(
                new ControllerError(400, 'billingPeriodsMoreThan10Years'),
            );
        });

        it('rejects yearly billing periods greater than 3 and up to 10', () => {
            const validator = createValidator();

            expect(() =>
                validator.validateCreateMembershipRequestBody({
                    ...yearlyBetween3And10BillingPeriodsRequest,
                }),
            ).toThrow(new ControllerError(400, 'billingPeriodsLessThan3Years'));
        });

        it('throws instances of ControllerError with a 400 status code', () => {
            const validator: MembershipRequestValidator = createValidator();

            try {
                validator.validateCreateMembershipRequestBody({
                    ...missingNameRequest,
                });
                fail('expected validateCreateMembershipRequest to throw');
            } catch (err) {
                expect(err).toBeInstanceOf(ControllerError);
                expect((err as ControllerError).statusCode).toBe(400);
            }
        });
    });
});
