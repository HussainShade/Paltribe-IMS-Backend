import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CategoryController } from '../controllers';
import { createCategorySchema } from '../validators';
import { requirePermission, authMiddleware } from '../middlewares';

const categoryRoutes = new Hono();

categoryRoutes.use('*', authMiddleware);

categoryRoutes.post(
    '/',
    requirePermission('CATEGORY.CREATE'),
    zValidator('json', createCategorySchema),
    CategoryController.create
);

categoryRoutes.get(
    '/',
    requirePermission('CATEGORY.VIEW'),
    CategoryController.list
);

export default categoryRoutes;
