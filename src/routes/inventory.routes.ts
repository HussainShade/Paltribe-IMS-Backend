import { Hono } from 'hono';
import { InventoryStock } from '../models';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

import { InventoryController } from '../controllers/inventory.controller';

const inventoryRoutes = new Hono<{ Variables: Variables }>();

inventoryRoutes.use('*', authMiddleware, branchMiddleware);

inventoryRoutes.get('/', InventoryController.list);
inventoryRoutes.post('/adjust', InventoryController.adjust);

export default inventoryRoutes;
