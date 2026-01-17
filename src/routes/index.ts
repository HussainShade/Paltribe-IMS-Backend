import { Hono } from 'hono';
import authRoutes from './auth.routes';
import poRoutes from './purchase-order.routes';
import grnRoutes from './grn.routes';
import indentRoutes from './indent.routes';
import inventoryRoutes from './inventory.routes';
import userRoutes from './user.routes';
import vendorRoutes from './vendor.routes';
import auditLogRoutes from './audit-log.routes';
import itemRoutes from './item.routes';
import branchRoutes from './branch.routes';
import { errorHandler } from '../middlewares/error.middleware';

const api = new Hono();

api.route('/auth', authRoutes);
api.route('/purchase-orders', poRoutes);
api.route('/grn', grnRoutes);
api.route('/indents', indentRoutes);
api.route('/audit-logs', auditLogRoutes);
api.route('/branches', branchRoutes);
api.route('/users', userRoutes);
api.route('/vendors', vendorRoutes);
api.route('/items', itemRoutes);

api.onError(errorHandler);

export default api;
