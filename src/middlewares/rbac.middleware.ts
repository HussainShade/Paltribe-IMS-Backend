import { Context, Next } from 'hono';
import { AppError } from '../utils/errors';
import { RbacService } from '../services/rbac.service';

export const requirePermission = (permissionCode: string) => {
    return async (c: Context, next: Next) => {
        const user = c.get('user');
        if (!user) {
            throw new AppError('User not authenticated', 401);
        }

        const hasPermission = await RbacService.hasPermission(user.roleId, permissionCode);
        if (!hasPermission) {
            throw new AppError(`Forbidden: Missing permission ${permissionCode}`, 403);
        }

        await next();
    };
};
