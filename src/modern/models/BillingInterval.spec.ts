import BillingInterval from './BillingInterval';

describe('BillingInterval.advance', () => {
    it('advances a monthly interval by count months', () => {
        const interval = new BillingInterval('monthly');

        const result = interval.advance(new Date('2026-04-15'), 3);

        expect(result).toEqual(new Date('2026-07-15'));
    });

    it('advances a yearly interval by count * 12 months', () => {
        const interval = new BillingInterval('yearly');

        const result = interval.advance(new Date('2026-01-15'), 2);

        expect(result).toEqual(new Date('2028-01-15'));
    });

    it('advances a weekly interval by count * 7 days', () => {
        const interval = new BillingInterval('weekly');

        const result = interval.advance(new Date('2026-01-01'), 2);

        expect(result).toEqual(new Date('2026-01-15'));
    });

    it('supports a single-step advance (count of 1)', () => {
        const interval = new BillingInterval('monthly');

        const result = interval.advance(new Date('2026-04-15'), 1);

        expect(result).toEqual(new Date('2026-05-15'));
    });

    it('leaves the date unchanged for an unrecognized interval', () => {
        const interval = new BillingInterval('daily');

        const result = interval.advance(new Date('2026-01-01'), 3);

        expect(result).toEqual(new Date('2026-01-01'));
    });

    it('does not mutate the date passed in', () => {
        const interval = new BillingInterval('monthly');
        const date = new Date('2026-04-15');

        interval.advance(date, 1);

        expect(date).toEqual(new Date('2026-04-15'));
    });

    it('returns a new Date instance rather than the input reference', () => {
        const interval = new BillingInterval('monthly');
        const date = new Date('2026-04-15');

        const result = interval.advance(date, 1);

        expect(result).not.toBe(date);
    });
});
