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

poRoutes.post(
    '/from-pool',
    branchMiddleware,
    requirePermission('PO.CREATE'),
    // Validator omitted for now, controller validates
    PurchaseOrderController.createFromPool
);

// List POs
poRoutes.get(
    '/',
    branchMiddleware, // Allow filtering by branch
    requirePermission('PO.VIEW'), // Ensure permission exists or use implicit
    PurchaseOrderController.list
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

poRoutes.patch(
    '/:id',
    branchMiddleware,
    requirePermission('PO.UPDATE'),
    PurchaseOrderController.update
);

poRoutes.patch(
    '/:id/cancel',
    branchMiddleware,
    requirePermission('PO.CANCEL'), // Assuming permission
    PurchaseOrderController.cancel
);

poRoutes.delete(
    '/:id',
    branchMiddleware,
    requirePermission('PO.DELETE'), // Assuming permission
    PurchaseOrderController.delete
);

export default poRoutes;
