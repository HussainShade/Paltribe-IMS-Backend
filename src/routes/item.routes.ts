import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ItemController } from '../controllers';
import { createItemSchema, updateItemSchema } from '../validators';
import { authMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const itemRoutes = new Hono<{ Variables: Variables }>();

itemRoutes.use('*', authMiddleware);

itemRoutes.post(
    '/',
    requirePermission('ITEM.CREATE'),
    zValidator('json', createItemSchema),
    ItemController.create
);

itemRoutes.get(
    '/',
    requirePermission('ITEM.VIEW'),
    ItemController.list
);

itemRoutes.get(
    '/:id',
    requirePermission('ITEM.VIEW'),
    ItemController.get
);

itemRoutes.patch(
    '/:id',
    requirePermission('ITEM.UPDATE'),
    zValidator('json', updateItemSchema),
    ItemController.update
);

itemRoutes.delete(
    '/:id',
    requirePermission('ITEM.DELETE'),
    ItemController.delete
);

export default itemRoutes;
