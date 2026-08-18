import billingPeriodsData from '../../data/membership-periods.json';
import BillingPeriod from '../models/BillingPeriod';
import type BillingPeriodRepository from './BillingPeriodRepository';

export default class FileSystemBillingPeriodRepository
    implements BillingPeriodRepository
{
    private readonly billingPeriods: BillingPeriod[] = [];

    constructor() {
        // membership-periods.json stores the foreign key under `membership`, not
        // `membershipId`, so every loaded period ends up with membershipId
        // undefined. This mismatch is inherited from the legacy fixture data and
        // is why getBillingPeriodsOfMembership below never finds a match - kept
        // as-is to replicate legacy behavior.
        this.billingPeriods = (
            billingPeriodsData as unknown as BillingPeriod[]
        ).map((data) => new BillingPeriod(data));
    }

    getBillingPeriodsOfMembership(
        membershipId: number,
    ): Promise<BillingPeriod[]> {
        const billingPeriods = this.billingPeriods.filter(
            (period) => period.membershipId === membershipId,
        );
        return Promise.resolve(billingPeriods);
    }
}
