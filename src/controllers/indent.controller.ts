import { Context } from 'hono';
import { IndentService, IssueService } from '../services';
import { Indent } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class IndentController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const branchId = c.get('branchId');
        const indent = await IndentService.createIndent(data, user, branchId);
        return c.json(new ApiResponse(201, indent, 'Indent created successfully'), 201);
    }

    static async approve(c: Context) {
        const user = c.get('user');
        const indentId = c.req.param('id');
        const indent = await IndentService.approveIndent(indentId, user);
        return c.json(new ApiResponse(200, indent, 'Indent approved successfully'));
    }

    static async reject(c: Context) {
        const user = c.get('user');
        const indentId = c.req.param('id');
        const indent = await IndentService.rejectIndent(indentId, user);
        return c.json(new ApiResponse(200, indent, 'Indent rejected successfully'));
    }

    static async cancel(c: Context) {
        const user = c.get('user');
        const indentId = c.req.param('id');
        const indent = await IndentService.cancelIndent(indentId, user);
        return c.json(new ApiResponse(200, indent, 'Indent cancelled successfully'));
    }

    static async list(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId');
        const { page = '1', limit = '10', status, startDate, endDate } = c.req.query();

        const query: any = { tenantId: user.tenantId };
        if (branchId) query.branchId = branchId;
        if (status) query.status = status;
        if (startDate && endDate) {
            query.indentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [indents, total] = await Promise.all([
            Indent.find(query)
                .sort({ indentDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('createdBy', 'firstName lastName'),
            Indent.countDocuments(query),
        ]);

        return c.json(new ApiResponse(200, {
            indents,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        }, 'Indents retrieved successfully'));
    }

    static async issue(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const branchId = c.get('branchId');
        const issue = await IssueService.createIssue(data, user, branchId);
        return c.json(new ApiResponse(201, issue, 'Issue created successfully'), 201);
    }

    static async getProcurementPool(c: Context) {
        const user = c.get('user');
        const { categoryId } = c.req.query();
        const items = await IndentService.getProcurementPool(user, { categoryId });
        return c.json(new ApiResponse(200, items, 'Procurement pool retrieved successfully'));
    }
}
