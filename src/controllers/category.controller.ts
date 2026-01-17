import { Context } from 'hono';
import { CategoryService } from '../services';

export class CategoryController {
    static async create(c: Context) {
        const user = c.get('user');

        // Ensure user has a branch (BM/SA scenarios needed clarity, but user rules say "limited to their branch")
        // If SA creates, they might need to select a branch, but for now assuming execution context has branchId or SA is restricted/handled?
        // User request: "created by SA & BM limited to their branch".
        // If SA has no branchId in context, this might fail or be global? 
        // Based on logic, we demand branchId.

        if (!user.branchId && user.roleCode !== 'SA') {
            return c.json({ status: 'error', message: 'Branch context required' }, 400);
        }

        let branchId = user.branchId;
        if (user.roleCode === 'SA') {
            const requestedBranch = c.req.header('x-branch-id');
            if (requestedBranch) {
                branchId = requestedBranch;
            } else {
                // If SA doesn't provide branch (Global Category? Or Default?)
                // If categories MUST be branch specific:
                // return c.json({ status: 'error', message: 'Branch context required for SA' }, 400);

                // Assuming Categories CAN be global (null branchId) if created by SA without context?
                // Or maybe SA is creating for a specific branch.
                // Re-reading user request: "Category should be linked to Branch ID"
                // So let's enforce it if we want strict scoping, or allow null for "Global".
                // I'll allow null for SA (Global) but prefer x-branch-id.
                // Actually, let's inject it into body so Service uses it.
            }
        }

        // Service Create expects data + user. 
        // We should probably override/ensure branchId is passed to Service/Model.
        const body = await c.req.json();

        // Explicitly set branchId in data passed to service
        const data = { ...body, branchId: branchId };

        const category = await CategoryService.create(data, user);
        return c.json({ status: 'success', data: category }, 201);
    }

    static async list(c: Context) {
        const user = c.get('user');
        // Filter by branch
        // SA sees filtered if branch selected, or maybe all?
        // "limited to their branch" implies strict scoping.

        let branchId = user.branchId;
        if (user.roleCode === 'SA' && !branchId) {
            branchId = c.req.header('x-branch-id');
        }

        const categories = await CategoryService.list(user.tenantId, branchId);
        return c.json({ status: 'success', data: categories });
    }
}
