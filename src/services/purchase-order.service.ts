import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Indent, IndentItem } from '../models';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { AuditLogService } from './audit-log.service';

export class PurchaseOrderService {
    static async createPO(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.create([{
                tenantId: user.tenantId,
                branchId: branchId,
                prNo: data.prNo || null,
                vendorId: data.vendorId || null,
                vendorName: data.vendorName || null,
                createdBy: user._id,
                deliveryDate: data.deliveryDate,
                status: data.status || PurchaseOrderStatus.PENDING,
                type: data.type || 'STANDARD',
                totalAmount: 0 // Will update
            }], { session });

            let totalAmount = 0;
            const itemsToCreate = data.items.map((item: any) => {
                const itemInfo = {
                    poId: po[0]._id,
                    itemId: item.itemId,
                    name: item.name, // Save snapshot of name
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    taxRate: item.taxRate || 0,
                    totalPrice: (item.quantity * item.unitCost) * (1 + (item.taxRate || 0) / 100),
                };
                totalAmount += itemInfo.totalPrice;
                return itemInfo;
            });

            await PurchaseOrderItem.insertMany(itemsToCreate, { session });

            // 4. Handle Indent Linking and isPoRaised status
            const indentItemIdMap = new Map();
            data.items.forEach((i: any) => {
                if (i.indentItemId) indentItemIdMap.set(i.indentItemId, Number(i.quantity));
            });

            if (indentItemIdMap.size > 0) {
                const indentItemIds = Array.from(indentItemIdMap.keys());
                const indentItems = await IndentItem.find({ _id: { $in: indentItemIds } }).populate('indentId').session(session);
                const indentIds = [...new Set(indentItems.map(ii => ii.indentId?._id))].filter(Boolean);

                if (indentIds.length > 0) {
                    const linkedIndents = await Indent.find({ _id: { $in: indentIds }, tenantId: user.tenantId }).session(session);

                    for (const ind of linkedIndents) {
                        if (ind.isPoRaised) {
                            throw new ApiError(400, `Purchase Order already raised for Indent #${ind._id.toString().slice(-6).toUpperCase()}`);
                        }
                    }

                    // Update IndentItems poQty and procurementStatus
                    const { ProcurementStatus } = await import('../models');
                    for (const ii of indentItems) {
                        const qtyToAdd = indentItemIdMap.get(ii._id.toString());
                        ii.poQty = (ii.poQty || 0) + qtyToAdd;
                        ii.procurementStatus = ProcurementStatus.IN_PO;
                        await ii.save({ session });
                    }

                    // Update Indents to isPoRaised = true
                    await Indent.updateMany(
                        { _id: { $in: indentIds } },
                        { $set: { isPoRaised: true } },
                        { session }
                    );
                }
            }

            po[0].totalAmount = totalAmount;
            await po[0].save({ session });

            await session.commitTransaction();
            return po[0];
        } catch (error) {
            console.error("CreatePO Error:", error); // Debug log
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async createPOFromIndentItems(data: { vendorId: string, indentItemIds: string[], deliveryDate?: Date }, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Fetch Indent Items
            const { IndentItem, Item, ProcurementStatus } = await import('../models');

            const indentItems = await IndentItem.find({
                _id: { $in: data.indentItemIds },
                procurementStatus: ProcurementStatus.PENDING
            }).populate('itemId').session(session);

            if (indentItems.length !== data.indentItemIds.length) {
                throw new ApiError(400, 'Some indent items not found or already in PO');
            }

            // Check if any indent already has PO raised
            const indentIds = [...new Set(indentItems.map((ii: any) => ii.indentId.toString()))];
            const linkedIndents = await Indent.find({ _id: { $in: indentIds } }).session(session);
            for (const ind of linkedIndents) {
                if (ind.isPoRaised) {
                    throw new ApiError(400, `Purchase Order already raised for Indent #${ind._id.toString().slice(-6).toUpperCase()}`);
                }
            }

            // 2. Create PO (DRAFT)
            const po = await PurchaseOrder.create([{
                tenantId: user.tenantId,
                branchId: branchId,
                vendorId: data.vendorId,
                createdBy: user._id,
                deliveryDate: data.deliveryDate,
                status: PurchaseOrderStatus.PENDING,
                type: 'STANDARD', // Indent items imply standard procurement
                totalAmount: 0
            }], { session });

            // 3. Create PO Items and Calculate Total
            let totalAmount = 0;
            const poItemsToCreate = indentItems.map((ii: any) => {
                const item = ii.itemId; // Populated
                const unitCost = item.unitCost || 0;
                const taxRate = item.taxRate || 0;
                const quantity = ii.pendingQty;
                const totalPrice = (quantity * unitCost) * (1 + taxRate / 100);

                totalAmount += totalPrice;

                return {
                    poId: po[0]._id,
                    indentItemId: ii._id,
                    itemId: item._id,
                    quantity: quantity,
                    unitCost: unitCost,
                    taxRate: taxRate,
                    totalPrice: totalPrice
                };
            });

            await PurchaseOrderItem.insertMany(poItemsToCreate, { session });

            // 4. Update Indent Items Status
            await IndentItem.updateMany(
                { _id: { $in: data.indentItemIds } },
                { $set: { procurementStatus: ProcurementStatus.IN_PO } },
                { session }
            );

            // 5. Update Indents to isPoRaised = true
            await Indent.updateMany(
                { _id: { $in: indentIds } },
                { $set: { isPoRaised: true } },
                { session }
            );

            // 6. Save PO Total
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

    static async updatePO(poId: string, data: any, user: any) {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId });
        if (!po) throw new ApiError(404, 'PO not found');
        if (po.status !== PurchaseOrderStatus.PENDING) throw new ApiError(400, 'Only PENDING POs can be updated');

        if (data.deliveryDate) po.deliveryDate = data.deliveryDate;
        if (data.vendorId) po.vendorId = data.vendorId;
        // Vendor change might invalidate items prices? Ignoring for now as per requirement complexity.

        await po.save();
        return po;
    }

    static async cancelPO(poId: string, user: any) {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId });
        if (!po) throw new ApiError(404, 'PO not found');
        if (po.status !== PurchaseOrderStatus.PENDING) throw new ApiError(400, 'Only PENDING POs can be cancelled');

        po.status = PurchaseOrderStatus.CANCELLED;
        await po.save();
        return po;
    }

    static async deletePO(poId: string, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');

            if (po.status !== PurchaseOrderStatus.PENDING) {
                throw new ApiError(400, 'Cannot delete APPROVED or CLOSED POs');
            }

            await PurchaseOrderItem.deleteMany({ poId: po._id }, { session });
            await PurchaseOrder.deleteOne({ _id: po._id }, { session });

            await session.commitTransaction();
            return { message: 'PO deleted successfully' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async approvePO(poId: string, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');
            if (po.status !== PurchaseOrderStatus.PENDING && (po.status as string) !== 'OPEN') throw new ApiError(400, `PO is not PENDING (Current: ${po.status})`);

            po.status = PurchaseOrderStatus.APPROVED;
            po.approvedBy = user._id;
            await po.save({ session });

            // Auto-GRN logic removed. GRN is manually created in separate module.

            await session.commitTransaction();
            return po;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async revertPO(poId: string, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');

            // Allow reverting only if APPROVED
            if (po.status !== PurchaseOrderStatus.APPROVED) {
                throw new ApiError(400, `PO can strictly only be reverted from APPROVED status. Current status: ${po.status}`);
            }

            po.status = PurchaseOrderStatus.PENDING;
            po.approvedBy = undefined; // Clear approval
            await po.save({ session });

            await AuditLogService.log({
                action: 'PO_REVERT_TO_PENDING',
                entity: 'PurchaseOrder',
                entityId: po._id.toString(),
                performedBy: user.userId,
                details: {
                    reason: 'User requested revert to PENDING'
                },
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            await session.commitTransaction();
            return po;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async patchItemQuantity(poId: string, itemId: string, quantity: number, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId }).session(session);
            if (!po) throw new ApiError(404, 'PO not found');
            if (po.status !== PurchaseOrderStatus.PENDING) throw new ApiError(400, 'Cannot update items in closed/approved PO');

            const poItem = await PurchaseOrderItem.findOne({ poId: po._id, itemId: itemId }).session(session);
            if (!poItem) throw new ApiError(404, 'Item not found in PO');

            const oldQuantity = poItem.quantity;

            // Update item
            poItem.quantity = quantity;
            poItem.totalPrice = (quantity * poItem.unitCost) * (1 + poItem.taxRate / 100);
            await poItem.save({ session });

            // Recalculate PO Total
            const allItems = await PurchaseOrderItem.find({ poId: po._id }).session(session);
            const newTotal = allItems.reduce((sum, item) => sum + item.totalPrice, 0);

            po.totalAmount = newTotal;
            await po.save({ session });

            // Explicit Audit Log handled in controller or here? Service shouldn't depend on Controller logic but can log.
            // But Controller in previous code did logging. Keeping it consistent?
            // Actually previous code had AuditLogService import but commented out usage or structure was weird.
            // Let's rely on Controller to call AuditLog for simple actions, or Service.
            // Service is better encapsulation.

            // Explicit Audit Log
            await AuditLogService.log({
                action: 'PO_ITEM_QUANTITY_PATCH',
                entity: 'PurchaseOrder',
                entityId: po._id.toString(),
                performedBy: user.userId,
                details: {
                    itemId: itemId,
                    oldQuantity: oldQuantity,
                    newQuantity: quantity
                },
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            await session.commitTransaction();
            return { po, poItem };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    static async getPOById(poId: string, user: any) {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: user.tenantId })
            .populate('vendorId', 'vendorName')
            .populate('branchId', 'branchName')
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name');

        if (!po) throw new ApiError(404, 'PO not found');

        const items = await PurchaseOrderItem.find({ poId: po._id }).populate('itemId', 'name code unit inventoryUom');

        return { ...po.toJSON(), items };
    }
}
