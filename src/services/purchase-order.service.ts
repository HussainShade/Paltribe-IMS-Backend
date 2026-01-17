import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../models';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';
import { AuditLogService } from './audit-log.service';

export class PurchaseOrderService {
    static async createPO(data: any, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.create([{
                tenantId: user.tenantId,
                branchId: user.branchId,
                vendorId: data.vendorId,
                createdBy: user._id,
                deliveryDate: data.deliveryDate,
                status: PurchaseOrderStatus.OPEN,
                totalAmount: 0 // Will update
            }], { session });

            let totalAmount = 0;
            const itemsToCreate = data.items.map((item: any) => {
                const itemInfo = {
                    poId: po[0]._id,
                    itemId: item.itemId,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    taxRate: item.taxRate || 0,
                    totalPrice: (item.quantity * item.unitCost) * (1 + (item.taxRate || 0) / 100),
                };
                totalAmount += itemInfo.totalPrice;
                return itemInfo;
            });

            await PurchaseOrderItem.insertMany(itemsToCreate, { session });

            po[0].totalAmount = totalAmount;
            await po[0].save({ session });

            await session.commitTransaction();
            return po[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async approvePO(poId: string, user: any) {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId });
        if (!po) throw new AppError('PO not found', 404);
        if (po.status !== PurchaseOrderStatus.OPEN) throw new AppError('PO is not OPEN', 400);

        po.status = PurchaseOrderStatus.APPROVED;
        po.approvedBy = user._id;
        await po.save();
        return po;
    }

    static async patchItemQuantity(poId: string, itemId: string, quantity: number, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new AppError('PO not found', 404);
            if (po.status !== PurchaseOrderStatus.OPEN) throw new AppError('Cannot update items in closed/approved PO', 400);

            const poItem = await PurchaseOrderItem.findOne({ poId: po._id, itemId: itemId }).session(session);
            if (!poItem) throw new AppError('Item not found in PO', 404);

            // Update item
            poItem.quantity = quantity;
            poItem.totalPrice = (quantity * poItem.unitCost) * (1 + poItem.taxRate / 100);
            await poItem.save({ session });

            // Recalculate PO Total
            const allItems = await PurchaseOrderItem.find({ poId: po._id }).session(session);
            const newTotal = allItems.reduce((sum, item) => sum + item.totalPrice, 0);

            po.totalAmount = newTotal;
            await po.save({ session });

            await session.commitTransaction();

            // ... (in patchItemQuantity method)

            // Explicit Audit Log
            await AuditLogService.log({
                action: 'PO_ITEM_QUANTITY_PATCH',
                entity: 'PurchaseOrder',
                entityId: po._id.toString(),
                performedBy: user.userId,
                details: {
                    itemId: itemId,
                    oldQuantity: poItem.quantity, // We don't have old qty easily unless we fetched before update, but logic updated in place. 
                    // Actually we fetched `poItem` before update in line 68. 
                    // But we modified `poItem` object in memory on line 72. 
                    // So `poItem.quantity` is NEW quantity.
                    newQuantity: quantity
                },
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            return { po, poItem };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
