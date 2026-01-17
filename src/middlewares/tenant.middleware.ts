import { Context, Next } from 'hono';
import { AppError } from '../utils/errors';

export const tenantMiddleware = async (c: Context, next: Next) => {
    const tenantId = c.get('tenantId');
    if (!tenantId) {
        throw new AppError('Tenant context missing', 400);
    }
    await next();
};

export const branchMiddleware = async (c: Context, next: Next) => {
    const branchId = c.get('branchId');
    if (!branchId) {
        // Some users (like SA) might not have a branch? 
        // The rules say: "branchId: ObjectId (indexed, nullable if applicable)".
        // If the route requires a branch, this middleware is used.
        throw new AppError('Branch context required for this operation', 400);
    }
    await next();
};
