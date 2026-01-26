import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { IndentController } from '../controllers';
import { createIndentSchema, issueIndentSchema } from '../validators';
import { authMiddleware, branchMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const indentRoutes = new Hono<{ Variables: Variables }>();

indentRoutes.use('*', authMiddleware);

// Indent
indentRoutes.post(
    '/',
    branchMiddleware,
    requirePermission('INDENT.CREATE'),
    zValidator('json', createIndentSchema),
    IndentController.create
);

indentRoutes.get(
    '/:id',
    requirePermission('INDENT.VIEW'),
    IndentController.get
);

indentRoutes.get(
    '/',
    requirePermission('INDENT.VIEW'),
    IndentController.list
);

indentRoutes.get(
    '/procurement-pool',
    branchMiddleware,
    requirePermission('INDENT.VIEW'), // Or specialized permission?
    IndentController.getProcurementPool
);

indentRoutes.patch(
    '/:id/approve',
    branchMiddleware,
    requirePermission('INDENT.APPROVE'), // Assuming permission
    IndentController.approve
);

indentRoutes.patch(
    '/:id/reject',
    branchMiddleware,
    requirePermission('INDENT.REJECT'), // Assuming permission
    IndentController.reject
);

indentRoutes.patch(
    '/:id/cancel',
    branchMiddleware,
    requirePermission('INDENT.CANCEL'), // Assuming permission
    IndentController.cancel
);

// Indent Item Management
indentRoutes.patch(
    '/items/:itemId',
    branchMiddleware,
    requirePermission('INDENT.UPDATE'), // Assuming permission or fallback
    IndentController.updateItem
);

indentRoutes.delete(
    '/items/:itemId',
    branchMiddleware,
    requirePermission('INDENT.UPDATE'), // Assuming permission
    IndentController.deleteItem
);

indentRoutes.post(
    '/:id/issue-stock',
    branchMiddleware,
    requirePermission('INDENT.ISSUE'),
    IndentController.issueStock
);

export default indentRoutes;
