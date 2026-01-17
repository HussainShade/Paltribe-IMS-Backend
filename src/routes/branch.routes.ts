import { Hono } from 'hono';
import { BranchController } from '../controllers';
import { requirePermission, authMiddleware } from '../middlewares';
import { zValidator } from '@hono/zod-validator';
import { updateBranchSchema } from '../validators';

const branchRoutes = new Hono();

branchRoutes.use('*', authMiddleware);

branchRoutes.get(
    '/',
    // No specific permission required mainly, but maybe "BRANCH.VIEW"?
    // "Select Workspace" needs it.
    // If I add `requirePermission('BRANCH.VIEW')`, I must ensure all roles have it?
    // Or just SA?
    // Requirement: "SuperAdmin is the only global role". BM sees only their branch.
    // I will add `requirePermission('BRANCH.VIEW')` and assign it to SA and BM (and others?)
    requirePermission('BRANCH.VIEW'),
    BranchController.list
);

branchRoutes.post(
    '/',
    requirePermission('BRANCH.CREATE'),
    BranchController.create
);

branchRoutes.patch(
    '/:id',
    requirePermission('BRANCH.UPDATE'),
    zValidator('json', updateBranchSchema),
    BranchController.update
);

export default branchRoutes;
