import type Membership from '../models/Membership';

export default interface MembershipRepository {
    getAllMemberships(): Promise<Membership[]>;

    saveMembership(membership: Membership): Promise<Membership>;
}
