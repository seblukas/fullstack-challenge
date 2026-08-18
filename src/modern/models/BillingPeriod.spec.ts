import BillingPeriod from './BillingPeriod';
import Membership from './Membership';

describe('BillingPeriod.createBillingPeriodsFromMembership', () => {
    function createMembership(overrides: Partial<Membership> = {}): Membership {
        return new Membership({
            id: 1,
            uuid: 'membership-uuid',
            name: 'Silver Plan',
            recurringPrice: 50,
            validFrom: new Date('2026-01-01'),
            validUntil: new Date('2026-07-01'),
            state: 'active',
            paymentMethod: 'credit card',
            billingInterval: 'monthly',
            billingPeriods: 6,
            ...overrides,
        } as Membership);
    }

    it('creates one billing period per billingPeriods count', () => {
        const membership = createMembership({ billingPeriods: 6 });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        expect(periods).toHaveLength(6);
    });

    it('returns an empty array when billingPeriods is 0', () => {
        const membership = createMembership({ billingPeriods: 0 });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        expect(periods).toEqual([]);
    });

    it('assigns sequential ids starting at 1', () => {
        const membership = createMembership({ billingPeriods: 3 });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        expect(periods.map((p) => p.id)).toEqual([1, 2, 3]);
    });

    it('assigns a unique uuid to each period', () => {
        const membership = createMembership({ billingPeriods: 3 });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        const uuids = periods.map((p) => p.uuid);
        expect(new Set(uuids).size).toBe(3);
        uuids.forEach((uuid) => {
            expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
        });
    });

    it('sets every period state to planned', () => {
        const membership = createMembership({ billingPeriods: 2 });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        periods.forEach((p) => {
            expect(p.state).toBe('planned');
        });
    });

    it('advances monthly periods by one month each, chained end-to-start', () => {
        // Kept within Apr-Jun to avoid crossing a DST boundary, which would
        // shift the wall-clock UTC offset and break the exact Date equality checks.
        const membership = createMembership({
            billingInterval: 'monthly',
            billingPeriods: 3,
            validFrom: new Date('2026-04-15'),
        });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        expect(periods[0].start).toEqual(new Date('2026-04-15'));
        expect(periods[0].end).toEqual(new Date('2026-05-15'));
        expect(periods[1].start).toEqual(new Date('2026-05-15'));
        expect(periods[1].end).toEqual(new Date('2026-06-15'));
        expect(periods[2].start).toEqual(new Date('2026-06-15'));
        expect(periods[2].end).toEqual(new Date('2026-07-15'));
    });

    it('advances yearly periods by twelve months each', () => {
        const membership = createMembership({
            billingInterval: 'yearly',
            billingPeriods: 2,
            validFrom: new Date('2026-01-15'),
        });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        expect(periods[0].start).toEqual(new Date('2026-01-15'));
        expect(periods[0].end).toEqual(new Date('2027-01-15'));
        expect(periods[1].start).toEqual(new Date('2027-01-15'));
        expect(periods[1].end).toEqual(new Date('2028-01-15'));
    });

    it('advances weekly periods by seven days each', () => {
        const membership = createMembership({
            billingInterval: 'weekly',
            billingPeriods: 2,
            validFrom: new Date('2026-01-01'),
        });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        expect(periods[0].start).toEqual(new Date('2026-01-01'));
        expect(periods[0].end).toEqual(new Date('2026-01-08'));
        expect(periods[1].start).toEqual(new Date('2026-01-08'));
        expect(periods[1].end).toEqual(new Date('2026-01-15'));
    });

    it('leaves end equal to start for an unrecognized billingInterval (unhandled case)', () => {
        const membership = createMembership({
            billingInterval: 'daily',
            billingPeriods: 1,
            validFrom: new Date('2026-01-01'),
        });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        expect(periods[0].start).toEqual(new Date('2026-01-01'));
        expect(periods[0].end).toEqual(new Date('2026-01-01'));
    });

    it('stamps every period with the source membership id as membershipId', () => {
        const membership = createMembership({ id: 42, billingPeriods: 2 });

        const periods =
            BillingPeriod.createBillingPeriodsFromMembership(membership);

        periods.forEach((p) => {
            expect(p.membershipId).toBe(42);
        });
    });
});
