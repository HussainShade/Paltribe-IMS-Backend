import { Indent, IndentItem, IndentStatus } from '../models';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';

export class IndentService {
    static async createIndent(data: any, user: any, branchId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const indent = await Indent.create([{
                tenantId: user.tenantId,
                branchId: branchId,
                workAreaId: data.workAreaId,
                createdBy: user._id,
                remarks: data.remarks,
                entryType: data.entryType || 'OPEN',
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
        if (!indent) throw new ApiError(404, 'Indent not found');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Indent is not OPEN');

        indent.status = IndentStatus.APPROVED;
        await indent.save();
        return indent;
    }

    static async rejectIndent(indentId: string, user: any) {
        const indent = await Indent.findOne({ _id: indentId, tenantId: user.tenantId });
        if (!indent) throw new ApiError(404, 'Indent not found');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Only OPEN indents can be rejected');

        indent.status = IndentStatus.REJECTED;
        await indent.save();
        return indent;
    }

    static async cancelIndent(indentId: string, user: any) {
        const indent = await Indent.findOne({ _id: indentId, tenantId: user.tenantId });
        if (!indent) throw new ApiError(404, 'Indent not found');
        if (indent.status !== IndentStatus.OPEN) throw new ApiError(400, 'Only OPEN indents can be cancelled');

        indent.status = IndentStatus.CANCELLED;
        await indent.save();
        return indent;
    }
}
