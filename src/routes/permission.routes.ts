import { Hono } from 'hono';
import { PermissionController } from '../controllers/permission.controller';

const permissionRoutes = new Hono();

permissionRoutes.get('/', PermissionController.list);

export { permissionRoutes };
