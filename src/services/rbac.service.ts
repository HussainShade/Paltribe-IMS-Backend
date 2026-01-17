import { RolePermission, Permission } from '../models';
import mongoose from 'mongoose';

export class RbacService {
    static async getPermissionsByRole(roleId: mongoose.Types.ObjectId): Promise<string[]> {
        const rolePermissions = await RolePermission.find({ roleId }).populate('permissionId');
        return rolePermissions.map((rp) => (rp.permissionId as any).permissionCode);
    }

    static async hasPermission(role: mongoose.Types.ObjectId | any, permissionCode: string): Promise<boolean> {
        if (!role) return false;

        // Handle if role is populated object or just ID
        const roleId = role._id || role;
        const permissions = await this.getPermissionsByRole(roleId);
        return permissions.includes(permissionCode);
    }
}
