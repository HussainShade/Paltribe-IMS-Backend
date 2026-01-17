import { z } from 'zod';

export const createPOSchema = z.object({
    vendorId: z.string().min(1),
    deliveryDate: z.string().datetime().optional(),
    items: z.array(z.object({
        itemId: z.string().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().min(0),
        taxRate: z.number().min(0).max(100).default(0),
    })).min(1),
});

export const approvePOSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']), // Assuming REJECTED might be needed, but docs say APPROVED. Strict: APPROVED.
});
