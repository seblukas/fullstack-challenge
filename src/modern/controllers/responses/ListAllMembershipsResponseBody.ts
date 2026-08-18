import type BillingPeriod from '../../models/BillingPeriod';
import type Membership from '../../models/Membership';

export type ListAllMembershipsResponseBody = {
    membership: Membership;
    periods: BillingPeriod[];
}[];
