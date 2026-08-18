import { v4 as uuidv4 } from 'uuid';
import BillingInterval from '../../models/BillingInterval';
import Membership from '../../models/Membership';
import { USER_ID } from '../constants/userId';
import type CreateMembershipRequestBody from './CreateMembershipRequestBody';
import MembershipRequestValidator from './validators/MembershipRequestValidator';

export default class CreateMembershipRequest {
    readonly body: CreateMembershipRequestBody;

    constructor(body: CreateMembershipRequestBody) {
        this.body = body;
    }

    validate(): void {
        const validator: MembershipRequestValidator =
            new MembershipRequestValidator();
        validator.validateCreateMembershipRequestBody(this.body);
    }

    toMembership(): Membership {
        const validFrom = this.getValidFrom();
        const validUntil = this.getValidUntil(validFrom);
        const state = this.getState(validFrom, validUntil);

        return new Membership({
            id: -1,
            uuid: uuidv4(),
            name: this.body.name!,
            state,
            validFrom: validFrom,
            validUntil: validUntil,
            user: USER_ID,
            paymentMethod: this.body.paymentMethod!,
            recurringPrice: this.body.recurringPrice!,
            billingPeriods: this.body.billingPeriods!,
            billingInterval: this.body.billingInterval!,
        });
    }

    private getValidFrom(): Date {
        return this.body.validFrom ? new Date(this.body.validFrom) : new Date();
    }

    private getValidUntil(validFrom: Date): Date {
        return new BillingInterval(this.body.billingInterval!).advance(
            validFrom,
            this.body.billingPeriods!,
        );
    }

    private getState(validFrom: Date, validUntil: Date): string {
        let state = 'active';
        const isMembershipStartingInFuture = validFrom > new Date();
        if (isMembershipStartingInFuture) {
            state = 'pending';
        }
        const hasMembershipEndedInPast = validUntil < new Date();
        if (hasMembershipEndedInPast) {
            state = 'expired';
        }
        return state;
    }
}
