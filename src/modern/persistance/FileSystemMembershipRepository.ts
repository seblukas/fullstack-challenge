import membershipsData from '../../data/memberships.json';
import Membership from '../models/Membership';
import type MembershipRepository from './MembershipRepository';

export default class FileSystemMembershipRepository
    implements MembershipRepository
{
    private readonly memberships: Membership[] = [];

    constructor() {
        this.memberships = membershipsData.map((data) => new Membership(data));
    }

    getAllMemberships(): Promise<Membership[]> {
        return Promise.resolve(this.memberships);
    }

    saveMembership(membership: Membership): Promise<Membership> {
        const newId = this.memberships.length + 1;
        membership.id = newId;
        this.memberships.push(membership);

        return Promise.resolve(membership);
    }
}
