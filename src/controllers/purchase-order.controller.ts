import { Context } from 'hono';
import { PurchaseOrderService } from '../services';

export class PurchaseOrderController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json(); // Validated by middleware

        // Ensure SA provides context or inject it? PO creation usually requires branchId in body
        // But Service.createPO likely handles it.

        const po = await PurchaseOrderService.createPO(data, user);
        return c.json({ status: 'success', data: po }, 201);
    }

    static async list(c: Context) {
        const user = c.get('user');
        const { page = '1', limit = '10', status } = c.req.query();

        const query: any = { tenantId: user.tenantId };

        // Branch Filtering
        let branchId = user.branchId;
        if (user.roleCode === 'SA' && !branchId) {
            branchId = c.req.header('x-branch-id');
        }

        if (branchId) {
            query.branchId = branchId;
        }
        // If SA and no branchId, show all? Yes ("Global View").

        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const { PurchaseOrder } = await import('../models'); // Dynamic import model

        const [pos, total] = await Promise.all([
            PurchaseOrder.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .populate('vendorId', 'vendorName')
                .populate('branchId', 'branchName')
                .populate('createdBy', 'name'),
            PurchaseOrder.countDocuments(query)
        ]);

        return c.json({
            status: 'success',
            data: pos,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        });
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
