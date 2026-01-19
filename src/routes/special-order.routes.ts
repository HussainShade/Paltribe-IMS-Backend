import { Hono } from 'hono';
import { SpecialOrderController } from '../controllers/special-order.controller';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

const soRoutes = new Hono<{ Variables: Variables }>();

soRoutes.use('*', authMiddleware, branchMiddleware);

soRoutes.post('/', SpecialOrderController.create);
soRoutes.get('/', SpecialOrderController.list);
soRoutes.patch('/:id/approve', SpecialOrderController.approve);
soRoutes.patch('/:id/close', SpecialOrderController.close);

export default soRoutes;
