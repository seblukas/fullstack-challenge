import express from 'express';
import request, { type Test } from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { errorHandler } from '../error-handler.middleware';
import FileSystemMembershipRepository from '../modern/persistance/FileSystemMembershipRepository';
import membershipRoutes from '../modern/routes/membership.routes';
import {
    cashPriceAbove100Request,
    expiredMembershipRequest,
    futureValidFromMembershipRequest,
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
} from './membershipRequests';
import membershipResponseFixture from './membershipResponse.json';

const MEMBERSHIPS_PATH = '/memberships';

function setUpExpressTestServer(): TestAgent<Test> {
    const app = express();
    app.use(express.json());
    app.use(MEMBERSHIPS_PATH, membershipRoutes);

    app.use(errorHandler);
    return request(app);
}

const server = setUpExpressTestServer();

describe('modern routes', () => {
    describe('get memberships', () => {
        it('returns the memberships together with their billing periods', async () => {
            const response = await server.get(MEMBERSHIPS_PATH);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(membershipResponseFixture);
        });

        it('never resolves billing periods for a membership', async () => {
            const response = await server.get(MEMBERSHIPS_PATH);

            /*
            membership-periods.json stores the foreign key under `membership`,
            but the route filters on `p.membershipId`, so periods are always [].
            This seems to be a bug, put for now I wanted to stick to the assignment and replicate exact behavior.
             */
            for (const row of response.body) {
                expect(row.periods).toEqual([]);
            }
        });
    });

    describe('create membership', () => {
        it('creates a monthly membership together with its billing periods', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(validMonthlyMembershipRequest);

            expect(response.status).toBe(201);
            expect(response.body.membership).toMatchObject({
                name: validMonthlyMembershipRequest.name,
                recurringPrice: validMonthlyMembershipRequest.recurringPrice,
                paymentMethod: validMonthlyMembershipRequest.paymentMethod,
                billingInterval: validMonthlyMembershipRequest.billingInterval,
                billingPeriods: validMonthlyMembershipRequest.billingPeriods,
                user: 2000,
                state: 'active',
            });

            const { membership, membershipPeriods } = response.body;
            expect(membershipPeriods).toHaveLength(
                validMonthlyMembershipRequest.billingPeriods,
            );
            for (const period of membershipPeriods) {
                expect(period.membershipId).toBe(membership.id);
                expect(period.state).toBe('planned');
            }
        });

        it('creates a yearly membership together with its billing periods', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(validYearlyMembershipRequest);

            expect(response.status).toBe(201);
            expect(response.body.membership).toMatchObject({
                name: validYearlyMembershipRequest.name,
                billingInterval: validYearlyMembershipRequest.billingInterval,
                billingPeriods: validYearlyMembershipRequest.billingPeriods,
                state: 'active',
            });
            expect(response.body.membershipPeriods).toHaveLength(
                validYearlyMembershipRequest.billingPeriods,
            );
        });

        it('defaults validFrom to the current time when not provided', async () => {
            const before = Date.now();
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(validMonthlyMembershipRequest);
            const after = Date.now();

            const validFrom = new Date(
                response.body.membership.validFrom,
            ).getTime();
            expect(validFrom).toBeGreaterThanOrEqual(before);
            expect(validFrom).toBeLessThanOrEqual(after);
        });

        it('derives a pending state when validFrom is in the future', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(futureValidFromMembershipRequest());

            expect(response.status).toBe(201);
            expect(response.body.membership.state).toBe('pending');
        });

        it('derives an expired state when validUntil is in the past', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(expiredMembershipRequest());

            expect(response.status).toBe(201);
            expect(response.body.membership.state).toBe('expired');
        });

        it('rejects a request missing the mandatory name field', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(missingNameRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'missingMandatoryFields',
            });
        });

        it('rejects a request missing the mandatory recurringPrice field', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(missingRecurringPriceRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'missingMandatoryFields',
            });
        });

        it('rejects a negative recurringPrice', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(negativeRecurringPriceRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'negativeRecurringPrice',
            });
        });

        it('treats an explicit recurringPrice of 0 as a missing field (known bug, preserved from legacy)', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(zeroRecurringPriceRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'missingMandatoryFields',
            });
        });

        it('rejects a cash payment method with a recurringPrice above 100', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(cashPriceAbove100Request);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ message: 'cashPriceBelow100' });
        });

        it('rejects a billingInterval that is neither monthly nor yearly', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(invalidBillingIntervalRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ message: 'invalidBillingPeriods' });
        });

        it('rejects more than 12 monthly billing periods', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(monthlyTooManyBillingPeriodsRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'billingPeriodsMoreThan12Months',
            });
        });

        it('does not reject fewer than 6 monthly billing periods (known bug)', async () => {
            /*
            The route validates `req.billingPeriods` instead of `req.body.billingPeriods`
            for the monthly lower bound, so this check never fires. Replicating that
            behavior here rather than the intended validation.
             */
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(monthlyTooFewBillingPeriodsRequest);

            expect(response.status).toBe(201);
        });

        it('rejects more than 10 yearly billing periods', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(yearlyTooManyBillingPeriodsRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'billingPeriodsMoreThan10Years',
            });
        });

        it('rejects yearly billing periods greater than 3 and up to 10', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(yearlyBetween3And10BillingPeriodsRequest);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'billingPeriodsLessThan3Years',
            });
        });

        it('accepts zero billingPeriods and returns no membership periods (known gap, no lower bound enforced)', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(zeroBillingPeriodsRequest);

            expect(response.status).toBe(201);
            expect(response.body.membershipPeriods).toEqual([]);
        });

        it('accepts a negative billingPeriods and returns no membership periods (known gap, no lower bound enforced)', async () => {
            const response = await server
                .post(MEMBERSHIPS_PATH)
                .send(negativeBillingPeriodsRequest);

            expect(response.status).toBe(201);
            expect(response.body.membershipPeriods).toEqual([]);
        });

        describe('unexpected errors', () => {
            afterEach(() => {
                jest.restoreAllMocks();
            });

            it('reports an unexpected, non-ControllerError as a 400 instead of reaching the global error handler (known bug, see review finding #5)', async () => {
                /*
                The route's catch block always responds with 400, regardless of the
                thrown error's type or statusCode, so it never delegates to `next(err)`
                and the global `errorHandler` (which would return 500) is unreachable
                from here. This test documents that gap rather than the desired
                behavior; once finding #5 is fixed, it should assert a 500 instead.
                 */
                jest.spyOn(
                    FileSystemMembershipRepository.prototype,
                    'saveMembership',
                ).mockRejectedValue(new TypeError('unexpected failure'));

                const response = await server
                    .post(MEMBERSHIPS_PATH)
                    .send(validMonthlyMembershipRequest);

                expect(response.status).toBe(400);
                expect(response.body).toEqual({
                    message: 'unexpected failure',
                });
            });
        });
    });
});
