import { v4 as uuidv4 } from 'uuid';
import BillingInterval from './BillingInterval';
import type Membership from './Membership';

export default class BillingPeriod {
    readonly id: number;
    readonly uuid: string;
    readonly membershipId: number;
    readonly start: string;
    readonly end: string;
    readonly state: string;

    constructor(data: BillingPeriod) {
        this.id = data.id;
        this.uuid = data.uuid;
        this.membershipId = data.membershipId;
        this.start = data.start;
        this.end = data.end;
        this.state = data.state;
    }

    static createBillingPeriodsFromMembership(
        membership: Membership,
    ): BillingPeriod[] {
        const membershipPeriods = [];
        const billingInterval = new BillingInterval(membership.billingInterval);
        let periodStart = membership.validFrom as Date;
        for (let i = 0; i < membership.billingPeriods!; i++) {
            const validFrom = periodStart;
            const validUntil = billingInterval.advance(validFrom, 1);
            const period = {
                id: i + 1,
                uuid: uuidv4(),
                membershipId: membership.id,
                start: validFrom,
                end: validUntil,
                state: 'planned',
            };
            membershipPeriods.push(period);
            periodStart = validUntil;
        }

        return membershipPeriods as unknown as BillingPeriod[];
    }
}
