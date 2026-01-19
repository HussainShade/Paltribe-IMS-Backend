import { Context } from 'hono';
import { InventoryStock, PurchaseOrder, Indent, Item, ItemStatus } from '../models'; // Import necessary models
import { Variables } from '../types';
import { ApiResponse } from '../utils/ApiResponse';

export class DashboardController {
    static async getStats(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const branchId = user.roleCode === 'SA' ? c.req.header('x-branch-id') : user.branchId;

        const query: any = { tenantId: user.tenantId };
        // If branchId is present, apply filter. For SA global view (no branchId), query matches all.
        const branchQuery: any = { tenantId: user.tenantId };
        if (branchId) {
            branchQuery.branchId = branchId;
        }

        // 1. Total Stock Value
        // Calculate: Sum(InventoryStock.quantity * Item.unitCost)
        // Need aggregation
        const stockValueAggregation = [
            { $match: branchQuery },
            {
                $lookup: {
                    from: 'items',
                    localField: 'itemId',
                    foreignField: '_id',
                    as: 'itemDetails'
                }
            },
            { $unwind: '$itemDetails' },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ['$quantityInStock', '$itemDetails.unitCost'] } }
                }
            }
        ];

        const stockValueResult = await InventoryStock.aggregate(stockValueAggregation);
        const totalStockValue = stockValueResult.length > 0 ? stockValueResult[0].totalValue : 0;

        // 2. Low Stock Alerts
        // Count Items where quantity < 10 (hardcoded for now, or per item minStock if exists)
        // Assuming global minStock = 10 for demo
        const lowStockCount = await InventoryStock.countDocuments({
            ...branchQuery,
            quantityInStock: { $lt: 10 }
        });

        // 3. Pending Purchase Orders
        // SA sees all or filtered by branch. BM sees only their branch.
        const poQuery: any = { tenantId: user.tenantId, status: 'PENDING' };
        if (branchId) poQuery.branchId = branchId;
        const pendingPO = await PurchaseOrder.countDocuments(poQuery);

        // 4. Pending Indents
        const indentQuery: any = { tenantId: user.tenantId, status: 'PENDING' };
        if (branchId) indentQuery.branchId = branchId;
        const pendingIndent = await Indent.countDocuments(indentQuery);

        // 5. Total Active Items
        const totalItems = await Item.countDocuments({ tenantId: user.tenantId, status: ItemStatus.ACTIVE });

        return c.json(new ApiResponse(200, {
            totalStockValue,
            lowStockCount,
            pendingPO,
            pendingIndent,
            totalItems
        }, 'Dashboard stats retrieved successfully'));
    }
}
