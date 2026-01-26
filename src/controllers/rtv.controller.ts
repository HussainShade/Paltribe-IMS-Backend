import { Context } from 'hono';
import { RTVService } from '../services/rtv.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { Variables } from '../types';

export class RTVController {
    static async create(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const data = await c.req.json();

        // Basic validation for multi-item RTV
        if (!data.grnId || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
            throw new ApiError(400, 'Invalid RTV data: items array required');
        }

        const branchId = c.get('branchId');
        const rtv = await RTVService.createRTV(data, user, branchId);
        return c.json(new ApiResponse(201, rtv, 'RTV processed successfully'), 201);
    }

    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const { branchId, grnId } = c.req.query();

        const filters: any = {};

        // Branch Logic: SA can filter, BM is fixed
        if (user.roleCode === 'SA') {
            const headerBranch = c.req.header('x-branch-id');
            if (headerBranch) filters.branchId = headerBranch;
            if (branchId) filters.branchId = branchId;
        } else {
            filters.branchId = user.branchId?.toString();
        }

        if (grnId) filters.grnId = grnId;

        const rtvs = await RTVService.list(user.tenantId.toString(), filters);
        return c.json(new ApiResponse(200, { rtvs }, 'RTVs retrieved successfully'));
    }
}
