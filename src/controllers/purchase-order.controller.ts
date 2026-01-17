import { Context } from 'hono';
import { PurchaseOrderService } from '../services';

export class PurchaseOrderController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json(); // Validated by middleware
        const po = await PurchaseOrderService.createPO(data, user);
        return c.json({ status: 'success', data: po }, 201);
    }

    static async approve(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const po = await PurchaseOrderService.approvePO(poId, user);
        return c.json({ status: 'success', data: po });
    }

    static async patchItemQuantity(c: Context) {
        const user = c.get('user');
        const poId = c.req.param('id');
        const itemId = c.req.param('itemId');
        const { quantity } = await c.req.json();

        if (quantity === undefined || quantity <= 0) {
            return c.json({ status: 'error', message: 'Valid quantity required' }, 400);
        }

        const result = await PurchaseOrderService.patchItemQuantity(poId, itemId, quantity, user);

        // Log Audit
        const { AuditLogService } = await import('../services/audit-log.service');
        await AuditLogService.log({
            action: 'PATCH_PO_ITEM_QUANTITY',
            entity: 'PurchaseOrder',
            entityId: poId,
            performedBy: user._id,
            details: { itemId, quantity },
            tenantId: user.tenantId,
            branchId: user.branchId
        });

        return c.json({ status: 'success', data: result });
    }
}
