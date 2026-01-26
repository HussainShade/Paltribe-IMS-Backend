import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { GRNController } from '../controllers';
import { createGRNSchema } from '../validators';
import { authMiddleware, branchMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const grnRoutes = new Hono<{ Variables: Variables }>();

grnRoutes.use('*', authMiddleware);

grnRoutes.post(
    '/',
    branchMiddleware,
    requirePermission('GRN.CREATE'), // Assuming permission code
    zValidator('json', createGRNSchema),
    GRNController.create
);

grnRoutes.get(
    '/',
    requirePermission('GRN.VIEW'), // Assuming permission
    GRNController.list
);

grnRoutes.get(
    '/:id',
    requirePermission('GRN.VIEW'),
    GRNController.getById
);

export default grnRoutes;
