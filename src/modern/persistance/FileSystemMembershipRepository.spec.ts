import membershipsData from '../../data/memberships.json';
import Membership from '../models/Membership';
import FileSystemMembershipRepository from './FileSystemMembershipRepository';

describe('FileSystemMembershipRepository', () => {
    it('should return an array of memberships', async () => {
        const repository = new FileSystemMembershipRepository();

        const memberships = await repository.getAllMemberships();

        expect(memberships).toHaveLength(membershipsData.length);
        memberships.forEach((membership, index) => {
            expect(membership).toBeInstanceOf(Membership);
            expect(membership).toMatchObject(membershipsData[index]);
        });
    });

    it('should add membership when saving', async () => {
        const repository = new FileSystemMembershipRepository();
        const membershipsBefore = await repository.getAllMemberships();
        const countBefore = membershipsBefore.length;
        const membershipToSave = new Membership({
            id: 1,
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Platinum Plan',
            userId: 2000,
            recurringPrice: 150.0,
            validFrom: '2023-01-01',
            validUntil: '2023-12-31',
            state: 'active',
            assignedBy: 'Admin',
            paymentMethod: 'credit card',
            billingInterval: 'monthly',
            billingPeriods: 12,
        });

        await repository.saveMembership(membershipToSave);

        const membershipsAfter = await repository.getAllMemberships();
        const countAfter = membershipsAfter.length;
        expect(countAfter).toBeGreaterThan(countBefore);
    });

    it('should have new membership on last position when saving', async () => {
        const repository = new FileSystemMembershipRepository();
        const membershipToSave = new Membership({
            id: 100001,
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Platinum Plan',
            userId: 2000,
            recurringPrice: 150.0,
            validFrom: '2023-01-01',
            validUntil: '2023-12-31',
            state: 'active',
            assignedBy: 'Admin',
            paymentMethod: 'credit card',
            billingInterval: 'monthly',
            billingPeriods: 12,
        });

        const savedMembership =
            await repository.saveMembership(membershipToSave);

        const memberships = await repository.getAllMemberships();
        const lastMembership = memberships[memberships.length - 1];
        expect(lastMembership).toEqual(savedMembership);
    });

    it('should set id of saved membership', async () => {
        const repository = new FileSystemMembershipRepository();
        const countBefore = (await repository.getAllMemberships()).length;
        const membershipToSave = new Membership({
            id: 100001,
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Platinum Plan',
            userId: 2000,
            recurringPrice: 150.0,
            validFrom: '2023-01-01',
            validUntil: '2023-12-31',
            state: 'active',
            assignedBy: 'Admin',
            paymentMethod: 'credit card',
            billingInterval: 'monthly',
            billingPeriods: 12,
        });

        const savedMembership =
            await repository.saveMembership(membershipToSave);

        expect(savedMembership.id).toBe(countBefore + 1);
    });
});
