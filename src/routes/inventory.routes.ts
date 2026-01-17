import { Hono } from 'hono';
import { InventoryStock } from '../models';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

const inventoryRoutes = new Hono<{ Variables: Variables }>();

inventoryRoutes.use('*', authMiddleware, branchMiddleware);

inventoryRoutes.get('/', async (c) => {
    const user = c.get('user');
    // Simple list stock
    const stock = await InventoryStock.find({
        tenantId: user.tenantId,
        branchId: user.branchId
    }).populate('itemId', 'itemName itemCode');

    return c.json({ status: 'success', data: stock });
});

export default inventoryRoutes;
