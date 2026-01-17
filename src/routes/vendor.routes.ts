import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { VendorController } from '../controllers';
import { createVendorSchema, updateVendorSchema } from '../validators';
import { authMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const vendorRoutes = new Hono<{ Variables: Variables }>();

vendorRoutes.use('*', authMiddleware);

vendorRoutes.post(
    '/',
    requirePermission('VENDOR.CREATE'),
    zValidator('json', createVendorSchema),
    VendorController.create
);

vendorRoutes.get(
    '/',
    requirePermission('VENDOR.VIEW'),
    VendorController.list
);

vendorRoutes.get(
    '/:id',
    requirePermission('VENDOR.VIEW'),
    VendorController.get
);

vendorRoutes.patch(
    '/:id',
    requirePermission('VENDOR.UPDATE'),
    zValidator('json', updateVendorSchema),
    VendorController.update
);

vendorRoutes.delete(
    '/:id',
    requirePermission('VENDOR.DELETE'),
    VendorController.delete
);

export default vendorRoutes;
