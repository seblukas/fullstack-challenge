export default interface CreateMembershipRequestBody {
    name?: string;
    recurringPrice?: number;
    paymentMethod?: string | null;
    billingInterval?: string;
    billingPeriods?: number;
    validFrom?: string;
}
