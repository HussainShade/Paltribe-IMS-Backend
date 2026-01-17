import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PurchaseOrderController } from '../controllers';
import { createPOSchema, approvePOSchema } from '../validators';
import { authMiddleware, branchMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const poRoutes = new Hono<{ Variables: Variables }>();

// All routes require auth
poRoutes.use('*', authMiddleware);

poRoutes.post(
    '/',
    branchMiddleware,
    requirePermission('PO.CREATE'),
    zValidator('json', createPOSchema),
    PurchaseOrderController.create
);

poRoutes.patch(
    '/:id/approve',
    branchMiddleware,
    zValidator('json', approvePOSchema),
    PurchaseOrderController.approve
);

poRoutes.patch(
    '/:id/items/:itemId',
    branchMiddleware,
    requirePermission('PO.UPDATE'), // Assuming permission
    PurchaseOrderController.patchItemQuantity
);

export default poRoutes;
