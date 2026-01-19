import { Hono } from 'hono';
import { WorkAreaController } from '../controllers';
import { requirePermission, authMiddleware } from '../middlewares';

const workAreaRoutes = new Hono();

workAreaRoutes.use('*', authMiddleware);

workAreaRoutes.post(
    '/',
    requirePermission('WORK_AREA.CREATE'), // Ensure this permission exists in DB or Enums
    WorkAreaController.create
);

workAreaRoutes.get(
    '/',
    requirePermission('WORK_AREA.VIEW'),
    WorkAreaController.list
);

workAreaRoutes.get(
    '/:id',
    requirePermission('WORK_AREA.VIEW'),
    WorkAreaController.getById
);

workAreaRoutes.put(
    '/:id',
    requirePermission('WORK_AREA.UPDATE'),
    WorkAreaController.update
);

workAreaRoutes.delete(
    '/:id',
    requirePermission('WORK_AREA.DELETE'),
    WorkAreaController.delete
);

export default workAreaRoutes;
