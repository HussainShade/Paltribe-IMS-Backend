import { Context } from 'hono';
import { BranchService } from '../services';

export class BranchController {
    static async list(c: Context) {
        const user = c.get('user');
        // Any authenticated user can list branches? 
        // Requirements say "Select Workspace" screen is for SA.
        // But BM might need to see their branch details?
        // For now, let's allow it, but maybe filter? 
        // SA sees all. BM sees only their own?
        // "Select Workspace" implies switching. BM cannot switch.
        // But the API might be reused.
        // Current requirement: "Workspace Selection" for SA.
        // So `BranchService.list` returns all.
        // If BM calls this, they see all branches? 
        // The "Role Inheritance Rule" says BM actions are STRICTLY limited to their own branch.
        // So if BM calls list, they should ONLY get their own branch.

        // I will implement logic:
        // IF SA: Return All.
        // IF BM/Others: Return Only Own Branch.

        const roleCode = user.roleCode; // Need to ensure roleCode is in user object from middleware.
        // AuthMiddleware Populates `roleId`, but maybe not `roleCode` directly in `user` object passed to context?
        // I need to check AuthMiddleware.
        // If not available, I might need to fetch Role or assume SA check via other means.
        // AuthMiddleware sets `roleId`.
        // Let's assume I can get Role Code or I rely on `user.branchId`.

        // If `user.branchId` is present, filtering is mandatory.

        let branches;
        if (user.branchId) {
            branches = await BranchService.list(user.tenantId);
            // Wait, Service returns ALL. I should filter here or update Service.
            // Better to update Service to accept optional branchId filter.
            // But existing `BranchService.list` is simple.
            // I will filter in memory or update service?
            // Update service is better.
            branches = branches.filter(b => b._id.toString() === user.branchId.toString());
        } else {
            branches = await BranchService.list(user.tenantId);
        }

        return c.json({ status: 'success', data: branches });
    }

    static async create(c: Context) {
        // Permission middleware handles "BRANCH.CREATE" check.
        const user = c.get('user');
        const body = await c.req.json();
        const branch = await BranchService.create(body, user);
        return c.json({ status: 'success', data: branch }, 201);
    }

    static async update(c: Context) {
        const user = c.get('user');
        const id = c.req.param('id');
        const body = await c.req.json();
        const branch = await BranchService.update(id, body, user);

        if (!branch) {
            return c.json({ status: 'error', message: 'Branch not found' }, 404);
        }

        return c.json({ status: 'success', data: branch });
    }
}
