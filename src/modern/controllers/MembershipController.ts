import BillingPeriod from '../models/BillingPeriod';
import type Membership from '../models/Membership';
import type BillingPeriodRepository from '../persistance/BillingPeriodRepository';
import type MembershipRepository from '../persistance/MembershipRepository';
import CreateMembershipRequest from './requests/CreateMembershipRequest';
import type CreateMembershipRequestBody from './requests/CreateMembershipRequestBody';
import type { CreateMembershipResponseBody } from './responses/CreateMembershipResponseBody';
import type { ListAllMembershipsResponseBody } from './responses/ListAllMembershipsResponseBody';

export default class MembershipController {
    constructor(
        private readonly membershipRepository: MembershipRepository,
        private readonly billingPeriodRepository: BillingPeriodRepository,
    ) {}

    async getAllMemberships(): Promise<ListAllMembershipsResponseBody> {
        const memberships = await this.membershipRepository.getAllMemberships();
        return await Promise.all(
            memberships.map(async (membership) => {
                const billingPeriods =
                    await this.billingPeriodRepository.getBillingPeriodsOfMembership(
                        membership.id,
                    );
                return {
                    membership,
                    periods: billingPeriods,
                };
            }),
        );
    }

    async createMembership(
        body: CreateMembershipRequestBody,
    ): Promise<CreateMembershipResponseBody> {
        const request = new CreateMembershipRequest(body);
        request.validate();
        const membership = request.toMembership();
        const newMembership =
            await this.membershipRepository.saveMembership(membership);
        return {
            membership: newMembership,
            membershipPeriods:
                BillingPeriod.createBillingPeriodsFromMembership(newMembership),
        };
    }
}
