import { z } from 'zod';

export const createGRNSchema = z.object({
    poId: z.string().optional(),
    soId: z.string().optional(),
    vendorInvoiceNo: z.string().min(1),
    workAreaId: z.string().min(1),
    items: z.array(z.object({
        itemId: z.string().min(1),
        receivedQty: z.number().positive(),
        unitCost: z.number().min(0),
        taxAmount: z.number().min(0).default(0),
    })).min(1),
}).refine((data) => (data.poId && !data.soId) || (!data.poId && data.soId), {
    message: 'Must provide either poId or soId, but not both',
});

export const createRTVSchema = z.object({
    grnId: z.string().min(1),
    itemId: z.string().min(1),
    returnedQty: z.number().positive(),
});
