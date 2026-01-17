import { Context } from 'hono';
import { GRNService } from '../services';
import { GRN } from '../models';

export class GRNController {
    static async create(c: Context) {
        const user = c.get('user');
        const data = await c.req.json();
        const grn = await GRNService.createGRN(data, user);
        return c.json({ status: 'success', data: grn }, 201);
    }

    static async list(c: Context) {
        const user = c.get('user');
        const branchId = c.get('branchId');
        const { page = '1', limit = '10', startDate, endDate, vendorInvoiceNo } = c.req.query();

        const query: any = { tenantId: user.tenantId };
        if (branchId) query.branchId = branchId;
        if (vendorInvoiceNo) query.vendorInvoiceNo = { $regex: vendorInvoiceNo, $options: 'i' };
        if (startDate && endDate) {
            query.goodsReceivedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [grns, total] = await Promise.all([
            GRN.find(query)
                .sort({ goodsReceivedDate: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            GRN.countDocuments(query),
        ]);

        return c.json({
            status: 'success',
            data: grns,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        });
    }
}
