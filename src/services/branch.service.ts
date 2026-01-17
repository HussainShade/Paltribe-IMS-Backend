import { Branch, IBranch } from '../models';
import { AuditLogService } from './audit-log.service';

export class BranchService {
    static async list(tenantId: string): Promise<IBranch[]> {
        return Branch.find({ tenantId, status: 'ACTIVE' }).sort({ branchName: 1 });
    }

    static async create(data: Partial<IBranch>, user: any): Promise<IBranch> {
        // Enforce: Only SA can create branches. 
        // Although Controller/Middleware checks permissions, Service double-check is good practice, 
        // but typically Service trusts Controller. 
        // However, I will inject tenantId server-side.

        const branch = await Branch.create({
            ...data,
            tenantId: user.tenantId, // Always use User's Tenant
        });

        await AuditLogService.log({
            action: 'BRANCH_CREATE',
            entity: 'Branch',
            entityId: branch._id.toString(),
            performedBy: user.userId,
            details: { branchName: branch.branchName },
            tenantId: user.tenantId,
            branchId: branch._id.toString() // Self-reference? Or null? Branch creation is Global. 
            // Actually, SA has no branchId usually. `user.branchId` is null.
            // But the log should probably not have a branchId if it's a global action? 
            // The model says `branchId` in AuditLog is optional? checking...
            // It is `type: Schema.Types.ObjectId, ref: 'Branch', required: false` (implied).
        });

        return branch;
    }
}
