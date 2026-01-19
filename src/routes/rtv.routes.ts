import { Hono } from 'hono';
import { RTVController } from '../controllers/rtv.controller';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

const rtvRoutes = new Hono<{ Variables: Variables }>();

rtvRoutes.use('*', authMiddleware, branchMiddleware);

rtvRoutes.post('/', RTVController.create);
rtvRoutes.get('/', RTVController.list);

export default rtvRoutes;
