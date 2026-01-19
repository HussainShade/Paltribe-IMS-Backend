import { Context } from 'hono';
import { SpecialOrderService } from '../services/special-order.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { Variables } from '../types';

export class SpecialOrderController {
    static async create(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const data = await c.req.json();

        const branchId = c.get('branchId'); // Validated by middleware if required context

        const so = await SpecialOrderService.create(data, user, branchId);
        return c.json(new ApiResponse(201, so, 'Special Order created successfully'), 201);
    }

    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const { branchId, status, startDate, endDate } = c.req.query();

        const filters: any = { status, startDate, endDate };

        if (user.roleCode === 'SA') {
            const headerBranch = c.req.header('x-branch-id');
            if (headerBranch) filters.branchId = headerBranch;
            if (branchId) filters.branchId = branchId;
        } else {
            filters.branchId = user.branchId?.toString();
        }

        const sos = await SpecialOrderService.list(user.tenantId, filters);
        return c.json(new ApiResponse(200, sos, 'Special Orders retrieved successfully'));
    }

    static async approve(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const so = await SpecialOrderService.approve(id, user);
        return c.json(new ApiResponse(200, so, 'Special Order approved successfully'));
    }

    static async close(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const so = await SpecialOrderService.close(id, user);
        return c.json(new ApiResponse(200, so, 'Special Order closed successfully'));
    }
}
