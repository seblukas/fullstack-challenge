import FileSystemBillingPeriodRepository from './FileSystemBillingPeriodRepository';

describe('FileSystemBillingPeriodRepository', () => {
    it('should return empty array because of bug', async () => {
        const repository = new FileSystemBillingPeriodRepository();

        const periods = await repository.getBillingPeriodsOfMembership(1);

        expect(periods).toEqual([]);
    });

    it('should return an empty array for non-existing membership id', async () => {
        const repository = new FileSystemBillingPeriodRepository();

        const periods = await repository.getBillingPeriodsOfMembership(999);

        expect(periods).toEqual([]);
    });
});
