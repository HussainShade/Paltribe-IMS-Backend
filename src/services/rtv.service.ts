import { RTV, GRN, GRNItem, InventoryStock } from '../models';
import { InventoryService } from './inventory.service';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';

export class RTVService {
    static async createRTV(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Validate GRN
            const grn = await GRN.findOne({ _id: data.grnId, tenantId: user.tenantId }).session(session);
            if (!grn) throw new ApiError(404, 'GRN not found');

            // 2. Validate Item in GRN
            // We need to check if the item was actually received in this GRN and quantity matches
            // However, GRNItem model stores item details.
            // But wait, GRNItem is separate collection.
            // Let's find the GRN Item record.

            // Note: RTV Model assumes single item per RTV record based on schema?
            // "itemId", "returnedQty". Yes, simplistic RTV model.

            const grnItem = await GRNItem.findOne({ grnId: grn._id, itemId: data.itemId }).session(session);
            if (!grnItem) throw new ApiError(400, 'Item not found in this GRN');

            // Check if already returned?
            // Need to sum up previous RTVs for this GRN Item to ensure we don't return more than received.
            const previousRTVs = await RTV.find({ grnId: grn._id, itemId: data.itemId }).session(session);
            const totalReturned = previousRTVs.reduce((sum, rtv) => sum + rtv.returnedQty, 0);

            if (totalReturned + data.returnedQty > grnItem.receivedQty) {
                throw new ApiError(400, `Cannot return more than received quantity. Received: ${grnItem.receivedQty}, Already Returned: ${totalReturned}`);
            }

            // 3. Create RTV
            const rtv = await RTV.create([{
                tenantId: user.tenantId,
                branchId: branchId,
                grnId: data.grnId,
                itemId: data.itemId,
                returnedQty: data.returnedQty,
                processedBy: user._id
            }], { session });

            // 4. Decrement Stock
            // We need to know which WorkArea the GRN put the stock into.
            // GRN model: "workAreaId"
            await InventoryService.decrementStock(
                user.tenantId.toString(),
                branchId,
                grn.workAreaId.toString(),
                data.itemId,
                data.returnedQty,
                session
            );

            await session.commitTransaction();
            return rtv[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async list(tenantId: string, filters: any) {
        const query: any = { tenantId };
        if (filters.branchId) query.branchId = filters.branchId;
        if (filters.grnId) query.grnId = filters.grnId;
        if (filters.vendorId) {
            // RTV doesn't have direct vendorId, it's on GRN -> PO -> Vendor
            // This is complex for a simple list.
            // We might need aggregation or fetch GRNs first.
            // For now, let's stick to simple filters.
            // If advanced filter needed, we'll do aggregation.
        }

        return await RTV.find(query)
            .populate('itemId', 'itemName itemCode')
            .populate('grnId', 'vendorInvoiceNo')
            .populate('processedBy', 'firstName lastName')
            .sort({ createdAt: -1 });
    }
}
