import { Context } from 'hono';
import { IndentService, IssueService } from '../services';
import { Indent } from '../models';

export class IndentController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const indent = await IndentService.createIndent(data, user);
        return c.json({ status: 'success', data: indent }, 201);
    }

    static async approve(c: Context) {
        const user = c.get('user');
        const indentId = c.req.param('id');
        const indent = await IndentService.approveIndent(indentId, user);
        return c.json({ status: 'success', data: indent });
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

        return c.json({
            status: 'success',
            data: indents,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        });
    }

    static async issue(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const issue = await IssueService.createIssue(data, user);
        return c.json({ status: 'success', data: issue }, 201);
    }
}
