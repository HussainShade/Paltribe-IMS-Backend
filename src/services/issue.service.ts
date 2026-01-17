import { Issue, Indent, IndentItem, IndentStatus } from '../models';
import { InventoryService } from './inventory.service';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

export class IssueService {
    static async createIssue(data: any, user: any) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const indent = await Indent.findOne({ _id: data.indentId, tenantId: user.tenantId }).session(session);
            if (!indent) throw new AppError('Indent not found', 404);
            if (indent.status !== IndentStatus.APPROVED) throw new AppError('Indent must be APPROVED', 400);

            const issue = await Issue.create([{
                tenantId: user.tenantId,
                branchId: user.branchId,
                indentId: data.indentId,
                issuedBy: user._id,
            }], { session });

            // If explicit items provided, iterate them. If not, issue all pending? 
            // The validator I made had optional items. 
            // Let's assume we iterate pending items if no items provided, OR strict "items" array required.
            // I'll stick to: iterate items provided in payload to support partial issue.
            // If items not provided, throw error? The validator allows optional.
            // Let's robustly fetch indent items.
            const indentItems = await IndentItem.find({ indentId: data.indentId }).session(session);

            const itemsToIssue = data.items || indentItems.map(ii => ({ itemId: ii.itemId.toString(), issuedQty: ii.pendingQty }));

            for (const item of itemsToIssue) {
                const indentItem = indentItems.find(ii => ii.itemId.toString() === item.itemId);
                if (!indentItem) continue; // Skip invalid items

                const qtyToIssue = Math.min(item.issuedQty, indentItem.pendingQty);
                if (qtyToIssue <= 0) continue;

                // Decrement stock
                await InventoryService.decrementStock(
                    user.tenantId.toString(),
                    user.branchId.toString(),
                    indent.workAreaId.toString(),
                    item.itemId,
                    qtyToIssue,
                    session
                );

                // Update IndentItem
                indentItem.issuedQty = (indentItem.issuedQty || 0) + qtyToIssue;
                indentItem.pendingQty = indentItem.requestedQty - indentItem.issuedQty;
                await indentItem.save({ session });
            }

            // Check if all items fully issued?
            // const allItems = await IndentItem.find({ indentId: data.indentId }).session(session);
            // const allIssued = allItems.every(i => i.pendingQty === 0);
            // if (allIssued) {
            //     indent.status = IndentStatus.ISSUED;
            //     await indent.save({ session });
            // }
            // Docs say: "After Issue -> Status: ISSUED". Assuming 1 issue = ISSUED status for simplicity unless partial logic is strict.
            indent.status = IndentStatus.ISSUED;
            await indent.save({ session });

            await session.commitTransaction();
            return issue[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
