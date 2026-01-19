import { Context } from 'hono';
import { User } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class ProfileController {
    static async getMe(c: Context) {
        const user = c.get('user');
        // user from context might be lean object or doc.
        // If from auth middleware (lean), it has _id. 
        // If virtuals not applied on lean, userId is missing.
        const userId = user._id || user.userId;

        const fullUser = await User.findById(userId)
            .populate('roleId', 'roleName roleCode')
            .populate('branchId', 'branchName')
            .populate('tenantId', 'tenantName');

        return c.json(new ApiResponse(200, fullUser, 'Profile details fetched'));
    }

    static async changePassword(c: Context) {
        const user = c.get('user');
        const { currentPassword, newPassword } = await c.req.json();

        if (!currentPassword || !newPassword) {
            throw new ApiError(400, 'Current and new password are required');
        }

        const userId = user._id || user.userId;
        const dbUser = await User.findById(userId).select('+passwordHash');
        if (!dbUser) {
            throw new ApiError(404, 'User not found');
        }

        // Verify current password
        const isValid = await Bun.password.verify(currentPassword, dbUser.passwordHash);
        if (!isValid) {
            throw new ApiError(401, 'Incorrect current password');
        }

        // Hash new password
        dbUser.passwordHash = await Bun.password.hash(newPassword);
        await dbUser.save();

        return c.json(new ApiResponse(200, null, 'Password updated successfully'));
    }
}
