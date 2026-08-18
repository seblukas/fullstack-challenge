import type BillingPeriod from '../models/BillingPeriod';

export default interface BillingPeriodRepository {
    getBillingPeriodsOfMembership(
        membershipId: number,
    ): Promise<BillingPeriod[]>;
}
