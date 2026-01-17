import { Indent, IndentItem, IndentStatus } from '../models';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

export class IndentService {
    static async createIndent(data: any, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const indent = await Indent.create([{
                tenantId: user.tenantId,
                branchId: user.branchId,
                workAreaId: data.workAreaId,
                createdBy: user._id,
                status: IndentStatus.OPEN,
            }], { session });

            const itemsToCreate = data.items.map((item: any) => ({
                indentId: indent[0]._id,
                itemId: item.itemId,
                requestedQty: item.requestedQty,
                issuedQty: 0,
                pendingQty: item.requestedQty
            }));

            await IndentItem.insertMany(itemsToCreate, { session });

            await session.commitTransaction();
            return indent[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async approveIndent(indentId: string, user: any) {
        const indent = await Indent.findOne({ _id: indentId, tenantId: user.tenantId });
        if (!indent) throw new AppError('Indent not found', 404);
        if (indent.status !== IndentStatus.OPEN) throw new AppError('Indent is not OPEN', 400);

        indent.status = IndentStatus.APPROVED;
        await indent.save();
        return indent;
    }
}
