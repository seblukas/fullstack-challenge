export default class Membership {
    id: number;
    uuid: string;
    name: string;
    userId?: number | undefined;
    user?: number | undefined;
    recurringPrice: number;
    validFrom: string | Date;
    validUntil: string | Date;
    state: string;
    assignedBy?: string | undefined;
    paymentMethod: string | null;
    billingInterval: string;
    billingPeriods: number;

    constructor(data: Membership) {
        this.id = data.id;
        this.uuid = data.uuid;
        this.name = data.name;
        this.userId = data.userId;
        this.recurringPrice = data.recurringPrice;
        this.validFrom = data.validFrom;
        this.validUntil = data.validUntil;
        this.state = data.state;
        this.assignedBy = data.assignedBy;
        this.paymentMethod = data.paymentMethod;
        this.billingInterval = data.billingInterval;
        this.billingPeriods = data.billingPeriods;
        this.user = data.user;
    }
}
