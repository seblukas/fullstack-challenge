import type BillingPeriod from '../../models/BillingPeriod';
import type Membership from '../../models/Membership';

export type CreateMembershipResponseBody = {
    membership: Membership;
    membershipPeriods: BillingPeriod[];
};
