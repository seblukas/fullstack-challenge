import express, { type Request, type Response } from 'express';
import MembershipController from '../controllers/MembershipController';
import type CreateMembershipRequestBody from '../controllers/requests/CreateMembershipRequestBody';
import type BillingPeriodRepository from '../persistance/BillingPeriodRepository';
import FileSystemBillingPeriodRepository from '../persistance/FileSystemBillingPeriodRepository';
import FileSystemMembershipRepository from '../persistance/FileSystemMembershipRepository';
import type MembershipRepository from '../persistance/MembershipRepository';

const router = express.Router();
const membershipRepository: MembershipRepository =
    new FileSystemMembershipRepository();
const billingPeriodRepository: BillingPeriodRepository =
    new FileSystemBillingPeriodRepository();
const membershipController = new MembershipController(
    membershipRepository,
    billingPeriodRepository,
);

router.get('/', async (_: Request, res: Response) => {
    try {
        const response = await membershipController.getAllMemberships();
        res.status(200).json(response);
    } catch (err) {
        res.status(400).json({ message: (err as Error).message });
    }
});

router.post(
    '/',
    async (
        req: Request<{}, {}, CreateMembershipRequestBody>,
        res: Response,
    ) => {
        try {
            const response = await membershipController.createMembership(
                req.body,
            );
            res.status(201).json(response);
        } catch (err) {
            res.status(400).json({ message: (err as Error).message });
        }
    },
);

export default router;
