import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UserController } from '../controllers';
import { createUserSchema, updateUserSchema } from '../validators';
import { authMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const userRoutes = new Hono<{ Variables: Variables }>();

userRoutes.use('*', authMiddleware);

userRoutes.post(
    '/',
    requirePermission('USER.CREATE'),
    zValidator('json', createUserSchema),
    UserController.create
);

userRoutes.get(
    '/',
    requirePermission('USER.VIEW'),
    UserController.list
);

userRoutes.get(
    '/:id',
    requirePermission('USER.VIEW'),
    UserController.get
);

userRoutes.patch(
    '/:id',
    requirePermission('USER.UPDATE'),
    zValidator('json', updateUserSchema),
    UserController.update
);

userRoutes.delete(
    '/:id',
    requirePermission('USER.DELETE'),
    UserController.delete
);

export default userRoutes;
