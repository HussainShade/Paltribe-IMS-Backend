import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { Config } from '../config';
import { AppError } from '../utils/errors';
import { User, UserStatus } from '../models';

export const authMiddleware = async (c: Context, next: Next) => {
    const token = getCookie(c, 'accessToken') || c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        throw new AppError('Not authorized, no token', 401);
    }

    try {
        const decoded = jwt.verify(token, Config.JWT_SECRET) as any;

        // Optimistic check: we rely on token, but could fetch user to be sure status is still active.
        // For high security, we fetch user.
        const user = (await User.findById(decoded.userId).populate('roleId').lean()) as any;

        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new AppError('User not found or inactive', 401);
        }

        // Inject roleCode for easier access in controllers
        user.roleCode = user.roleId?.roleCode;

        c.set('user', user);
        c.set('tenantId', user.tenantId.toString());

        // Handle Branch Switching for SuperAdmin (SA)
        const role = user.roleId as any; // populated
        if (role && role.roleCode === 'SA') {
            const requestedBranchId = c.req.header('x-branch-id');
            if (requestedBranchId) {
                // TODO: Verify if the branch exists and belongs to the tenant? 
                // For now, trust the ID but ensure it's a valid MongoID format if needed.
                c.set('branchId', requestedBranchId);
            } else {
                // If no branch requested, SA might see "All" or "Default"? 
                // Or undefined, meaning global view?
                // The requirement says "select branch and view all APIs according to branch"
                // So if undefined, maybe they see nothing or global?
                // Keep it undefined if not passed.
                c.set('branchId', undefined);
            }
        } else {
            // Regular user: enforce their branch
            c.set('branchId', user.branchId?.toString());
        }

        await next();
    } catch (error) {
        console.error('Auth Error:', error);
        throw new AppError('Not authorized, invalid token', 401);
    }
};
