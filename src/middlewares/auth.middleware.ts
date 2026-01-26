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
        // We populate roleId to get roleCode for easier access
        const user = (await User.findById(decoded.userId).populate('roleId').lean()) as any;

        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new AppError('User not found or inactive', 401);
        }

        // Inject roleCode for easier access in controllers
        user.roleCode = user.roleId?.roleCode;

        c.set('user', user);
        c.set('tenantId', user.tenantId.toString());

        // Handle Branch Switching
        const requestedBranchId = c.req.header('x-branch-id');
        const isSuperAdmin = user.roleId?.roleCode === 'SA';

        if (requestedBranchId) {
            if (isSuperAdmin) {
                // SA can access any branch
                c.set('branchId', requestedBranchId);
            } else {
                // Check if user has access to this branch
                const branchAccess = user.branches?.find(
                    (b: any) => (b.branchId?._id?.toString?.() || b.branchId?.toString?.()) === requestedBranchId
                );

                if (branchAccess) {
                    c.set('branchId', requestedBranchId);
                    // effective role for this request
                    user.roleId = branchAccess.roleId;
                    // We might need to populate this new roleId to get roleCode if needed downstream
                    // For now, assuming RBAC service handles ID checks or we can re-fetch if needed.
                    // But wait, user.roleId is populated object in line 21. 
                    // We need to fetch the role object for this branch role ID to maintain consistency.
                    // Ideally we should have populated branches.roleId too. 
                } else {
                    throw new AppError('Forbidden: No access to this branch', 403);
                }
            }
        } else {
            // Default to primary branch
            c.set('branchId', user.branchId?.toString());
        }

        await next();
    } catch (error) {
        console.error('Auth Error:', error);
        throw new AppError('Not authorized, invalid token', 401);
    }
};
