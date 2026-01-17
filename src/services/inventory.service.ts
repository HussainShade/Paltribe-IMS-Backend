import { InventoryStock } from '../models';
import mongoose from 'mongoose';

export class InventoryService {
    static async incrementStock(
        tenantId: string,
        branchId: string,
        workAreaId: string,
        itemId: string,
        quantity: number,
        session?: mongoose.ClientSession
    ) {
        return await InventoryStock.findOneAndUpdate(
            { tenantId, branchId, workAreaId, itemId },
            { $inc: { quantityInStock: quantity } },
            { upsert: true, new: true, session }
        );
    }

    static async decrementStock(
        tenantId: string,
        branchId: string,
        workAreaId: string,
        itemId: string,
        quantity: number,
        session?: mongoose.ClientSession
    ) {
        const stock = await InventoryStock.findOne({ tenantId, branchId, workAreaId, itemId }).session(session || null);

        if (!stock || stock.quantityInStock < quantity) {
            throw new Error(`Insufficient stock for item ${itemId}`);
        }

        stock.quantityInStock -= quantity;
        await stock.save({ session });
        return stock;
    }
}
