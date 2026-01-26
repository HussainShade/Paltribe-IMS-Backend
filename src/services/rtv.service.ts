import { RTV, GRN, GRNItem, InventoryStock, IRTV } from '../models';
import { InventoryService } from './inventory.service';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';

export class RTVService {
    static async createRTV(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Validate GRN (Once)
            const grn = await GRN.findOne({ _id: data.grnId, tenantId: user.tenantId }).session(session);
            if (!grn) throw new ApiError(404, 'GRN not found');

            const createdRTVs: IRTV[] = [];

            // Loop through items
            for (const item of data.items) {
                // ... validation ...
                // Note: repeating validation code is fine, but ensure variable names are correct.

                // 2. Validate Item in GRN
                const grnItem = await GRNItem.findOne({ grnId: grn._id, itemId: item.itemId }).session(session);
                if (!grnItem) throw new ApiError(400, `Item ${item.itemId} not found in this GRN`);

                // Check if already returned?
                const previousRTVs = await RTV.find({ grnId: grn._id, itemId: item.itemId }).session(session);
                const totalReturned = previousRTVs.reduce((sum, rtv) => sum + rtv.returnedQty, 0);

                if (totalReturned + item.returnedQty > grnItem.receivedQty) {
                    throw new ApiError(400, `Cannot return more than received quantity for item ${item.itemId}`);
                }

                // 3. Create RTV Document
                const rtvDocs = await RTV.create([{
                    tenantId: user.tenantId,
                    branchId: branchId,
                    grnId: data.grnId,
                    itemId: item.itemId,
                    returnedQty: item.returnedQty,
                    reason: item.reason,
                    processedBy: user._id
                }], { session });

                createdRTVs.push(rtvDocs[0]);

                // 4. Decrement Stock
                await InventoryService.decrementStock(
                    user.tenantId.toString(),
                    branchId,
                    grn.workAreaId.toString(),
                    item.itemId,
                    item.returnedQty,
                    session
                );
            }

            await session.commitTransaction();
            return createdRTVs;
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
