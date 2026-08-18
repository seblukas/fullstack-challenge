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
} from '@/integration-tests/membershipRequests';
import BillingPeriod from '../models/BillingPeriod';
import Membership from '../models/Membership';
import type BillingPeriodRepository from '../persistance/BillingPeriodRepository';
import FileSystemMembershipRepository from '../persistance/FileSystemMembershipRepository';
import type MembershipRepository from '../persistance/MembershipRepository';
import ControllerError from './errors/ControllerError';
import MembershipController from './MembershipController';

describe('MembershipController', () => {
    const membership1 = new Membership({
        id: 1,
        uuid: 'membership-uuid-1',
        name: 'Gold',
        userId: 2000,
        recurringPrice: 10,
        validFrom: '2023-01-01',
        validUntil: '2023-12-31',
        state: 'active',
        assignedBy: 'admin',
        paymentMethod: 'card',
        billingInterval: 'monthly',
        billingPeriods: 12,
    });

    const membership2 = new Membership({
        id: 2,
        uuid: 'membership-uuid-2',
        name: 'Silver',
        userId: 2000,
        recurringPrice: 5,
        validFrom: '2023-01-01',
        validUntil: '2023-12-31',
        state: 'active',
        assignedBy: 'admin',
        paymentMethod: 'card',
        billingInterval: 'monthly',
        billingPeriods: 12,
    });

    const period1 = new BillingPeriod({
        id: 1,
        uuid: 'period-uuid-1',
        membershipId: 1,
        start: '2023-01-01',
        end: '2023-01-31',
        state: 'issued',
    });

    const period2 = new BillingPeriod({
        id: 2,
        uuid: 'period-uuid-2',
        membershipId: 2,
        start: '2023-01-01',
        end: '2023-01-31',
        state: 'issued',
    });

    function createMocks() {
        const membershipRepository: jest.Mocked<MembershipRepository> = {
            getAllMemberships: jest.fn(),
            saveMembership: jest.fn(),
        };
        const billingPeriodRepository: jest.Mocked<BillingPeriodRepository> = {
            getBillingPeriodsOfMembership: jest.fn(),
        };
        return { membershipRepository, billingPeriodRepository };
    }

    it('should combine each membership with its billing periods', async () => {
        const { membershipRepository, billingPeriodRepository } = createMocks();
        membershipRepository.getAllMemberships.mockResolvedValue([
            membership1,
            membership2,
        ]);
        billingPeriodRepository.getBillingPeriodsOfMembership.mockImplementation(
            (membershipId: number) => {
                if (membershipId === membership1.id)
                    return Promise.resolve([period1]);
                if (membershipId === membership2.id)
                    return Promise.resolve([period2]);
                return Promise.resolve([]);
            },
        );
        const controller = new MembershipController(
            membershipRepository,
            billingPeriodRepository,
        );

        const result = await controller.getAllMemberships();

        expect(result).toEqual([
            { membership: membership1, periods: [period1] },
            { membership: membership2, periods: [period2] },
        ]);
        expect(
            billingPeriodRepository.getBillingPeriodsOfMembership,
        ).toHaveBeenCalledWith(membership1.id);
        expect(
            billingPeriodRepository.getBillingPeriodsOfMembership,
        ).toHaveBeenCalledWith(membership2.id);
    });

    it('should return an empty periods array when a membership has no billing periods', async () => {
        const { membershipRepository, billingPeriodRepository } = createMocks();
        membershipRepository.getAllMemberships.mockResolvedValue([membership1]);
        billingPeriodRepository.getBillingPeriodsOfMembership.mockResolvedValue(
            [],
        );
        const controller = new MembershipController(
            membershipRepository,
            billingPeriodRepository,
        );

        const result = await controller.getAllMemberships();

        expect(result).toEqual([{ membership: membership1, periods: [] }]);
    });

    it('should return an empty array when there are no memberships', async () => {
        const { membershipRepository, billingPeriodRepository } = createMocks();
        membershipRepository.getAllMemberships.mockResolvedValue([]);

        const controller = new MembershipController(
            membershipRepository,
            billingPeriodRepository,
        );

        const result = await controller.getAllMemberships();

        expect(result).toEqual([]);
        expect(
            billingPeriodRepository.getBillingPeriodsOfMembership,
        ).not.toHaveBeenCalled();
    });

    describe('createMembership', () => {
        function createController() {
            const { membershipRepository, billingPeriodRepository } =
                createMocks();
            return new MembershipController(
                membershipRepository,
                billingPeriodRepository,
            );
        }

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('validation', () => {
            it('rejects a request missing the mandatory name field', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(missingNameRequest),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'missingMandatoryFields',
                });
            });

            it('rejects a request missing the mandatory recurringPrice field', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(missingRecurringPriceRequest),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'missingMandatoryFields',
                });
            });

            it('rejects a negative recurringPrice', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(negativeRecurringPriceRequest),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'negativeRecurringPrice',
                });
            });

            it('rejects a cash payment method with a recurringPrice above 100', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(cashPriceAbove100Request),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'cashPriceBelow100',
                });
            });

            it('rejects a billingInterval that is neither monthly nor yearly', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(invalidBillingIntervalRequest),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'invalidBillingPeriods',
                });
            });

            it('rejects more than 12 monthly billing periods', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(
                        monthlyTooManyBillingPeriodsRequest,
                    ),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'billingPeriodsMoreThan12Months',
                });
            });

            it('does not reject fewer than 6 monthly billing periods (known gap, not yet enforced)', async () => {
                const { membershipRepository, billingPeriodRepository } =
                    createMocks();
                membershipRepository.saveMembership = jest
                    .fn()
                    .mockResolvedValue({ id: 1 });
                const controller = new MembershipController(
                    membershipRepository,
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    monthlyTooFewBillingPeriodsRequest,
                );

                expect(result.membership).toBeDefined();
            });

            it('rejects more than 10 yearly billing periods', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(
                        yearlyTooManyBillingPeriodsRequest,
                    ),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'billingPeriodsMoreThan10Years',
                });
            });

            it('rejects yearly billing periods greater than 3 and up to 10', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(
                        yearlyBetween3And10BillingPeriodsRequest,
                    ),
                ).rejects.toMatchObject({
                    statusCode: 400,
                    message: 'billingPeriodsLessThan3Years',
                });
            });

            it('throws instances of ControllerError', async () => {
                const controller = createController();

                await expect(
                    controller.createMembership(missingNameRequest),
                ).rejects.toBeInstanceOf(ControllerError);
            });
        });

        describe('membership creation', () => {
            it('creates a monthly membership carrying over the request fields', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    validMonthlyMembershipRequest,
                );

                expect(result.membership).toMatchObject({
                    name: validMonthlyMembershipRequest.name,
                    recurringPrice:
                        validMonthlyMembershipRequest.recurringPrice,
                    paymentMethod: validMonthlyMembershipRequest.paymentMethod,
                    billingInterval:
                        validMonthlyMembershipRequest.billingInterval,
                    billingPeriods:
                        validMonthlyMembershipRequest.billingPeriods,
                    user: 2000,
                    state: 'active',
                });
                expect(result.membership.uuid).toEqual(expect.any(String));
            });

            it('creates a yearly membership carrying over the request fields', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    validYearlyMembershipRequest,
                );

                expect(result.membership).toMatchObject({
                    name: validYearlyMembershipRequest.name,
                    billingInterval:
                        validYearlyMembershipRequest.billingInterval,
                    billingPeriods: validYearlyMembershipRequest.billingPeriods,
                    state: 'active',
                });
            });

            it('defaults validFrom to the current time when not provided', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const before = Date.now();
                const result = await controller.createMembership(
                    validMonthlyMembershipRequest,
                );
                const after = Date.now();

                const validFrom = new Date(
                    result.membership.validFrom,
                ).getTime();
                expect(validFrom).toBeGreaterThanOrEqual(before);
                expect(validFrom).toBeLessThanOrEqual(after);
            });

            it('derives a pending state when validFrom is in the future', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    futureValidFromMembershipRequest(),
                );

                expect(result.membership.state).toBe('pending');
            });

            it('derives an expired state when validUntil is in the past', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    expiredMembershipRequest(),
                );

                expect(result.membership.state).toBe('expired');
            });
        });

        describe('billing periods creation', () => {
            it('creates one sequential billing period per monthly billing period', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );
                const start = new Date('2024-01-15T00:00:00.000Z');
                jest.useFakeTimers().setSystemTime(start);

                const result = await controller.createMembership({
                    ...validMonthlyMembershipRequest,
                    billingPeriods: 3,
                });

                const period0End = new Date(start);
                period0End.setMonth(start.getMonth() + 1);
                const period1End = new Date(period0End);
                period1End.setMonth(period0End.getMonth() + 1);
                const period2End = new Date(period1End);
                period2End.setMonth(period1End.getMonth() + 1);

                expect(result.membershipPeriods).toHaveLength(3);
                expect(result.membershipPeriods[0].start).toEqual(start);
                expect(result.membershipPeriods[0].end).toEqual(period0End);
                expect(result.membershipPeriods[1].start).toEqual(period0End);
                expect(result.membershipPeriods[1].end).toEqual(period1End);
                expect(result.membershipPeriods[2].start).toEqual(period1End);
                expect(result.membershipPeriods[2].end).toEqual(period2End);
            });

            it('creates one sequential billing period per yearly billing period', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );
                const start = new Date('2024-01-15T00:00:00.000Z');
                jest.useFakeTimers().setSystemTime(start);

                const result = await controller.createMembership({
                    ...validYearlyMembershipRequest,
                    billingPeriods: 2,
                });

                const period0End = new Date(start);
                period0End.setMonth(start.getMonth() + 12);
                const period1End = new Date(period0End);
                period1End.setMonth(period0End.getMonth() + 12);

                expect(result.membershipPeriods).toHaveLength(2);
                expect(result.membershipPeriods[0].start).toEqual(start);
                expect(result.membershipPeriods[0].end).toEqual(period0End);
                expect(result.membershipPeriods[1].start).toEqual(period0End);
                expect(result.membershipPeriods[1].end).toEqual(period1End);
            });

            it('produces no billing periods for zero billingPeriods (known gap, not rejected by validation)', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    zeroBillingPeriodsRequest,
                );

                expect(result.membershipPeriods).toEqual([]);
            });

            it('produces no billing periods for a negative billingPeriods (known gap, not rejected by validation)', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    negativeBillingPeriodsRequest,
                );

                expect(result.membershipPeriods).toEqual([]);
            });

            it('marks every generated billing period as planned and linked to the membership', async () => {
                const { billingPeriodRepository } = createMocks();
                const controller = new MembershipController(
                    new FileSystemMembershipRepository(),
                    billingPeriodRepository,
                );

                const result = await controller.createMembership(
                    validMonthlyMembershipRequest,
                );

                for (const period of result.membershipPeriods) {
                    expect(period.membershipId).toBe(result.membership.id);
                    expect(period.state).toBe('planned');
                    expect(period.uuid).toEqual(expect.any(String));
                }
            });
        });
    });
});
