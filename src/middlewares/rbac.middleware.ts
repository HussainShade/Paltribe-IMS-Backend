import { Context, Next } from 'hono';
import { AppError } from '../utils/errors';
import { RbacService } from '../services/rbac.service';
import { UserPermissionOverride } from '../models';
import mongoose from 'mongoose';

export const requirePermission = (permissionCode: string) => {
    return async (c: Context, next: Next) => {
        const user = c.get('user');
        if (!user) {
            throw new AppError('User not authenticated', 401);
        }

        const branchId = c.get('branchId');
        // 1) Check per-user overrides first (scalable storage)
        if (branchId) {
            const override = await UserPermissionOverride.findOne({
                tenantId: user.tenantId,
                userId: new mongoose.Types.ObjectId(user._id || user.userId),
                branchId: new mongoose.Types.ObjectId(branchId),
                permissionCode,
            }).lean();

            if (override) {
                if (override.allowed) {
                    await next();
                    return;
                }
                throw new AppError(`Forbidden: Missing permission ${permissionCode}`, 403);
            }
        }

        // 2) Fall back to role defaults
        const hasPermission = await RbacService.hasPermission(user.roleId, permissionCode);
        if (!hasPermission) {
            throw new AppError(`Forbidden: Missing permission ${permissionCode}`, 403);
        }

        await next();
    };
};
