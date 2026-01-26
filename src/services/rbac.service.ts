import { RolePermission, Permission } from '../models';
import mongoose from 'mongoose';

export class RbacService {
    static async getPermissionsByRole(roleId: mongoose.Types.ObjectId): Promise<string[]> {
        const rolePermissions = await RolePermission.find({ roleId }).populate('permissionId');
        return rolePermissions.map((rp) => (rp.permissionId as any).permissionCode);
    }

    static async hasPermission(role: mongoose.Types.ObjectId | any, permissionCode: string, overrides?: Map<string, boolean> | Record<string, boolean>): Promise<boolean> {
        if (!role) return false;

        // 1. Check for overrides first
        if (overrides) {
            const hasOverride = (overrides instanceof Map) ? overrides.has(permissionCode) : (permissionCode in overrides);
            if (hasOverride) {
                return (overrides instanceof Map) ? overrides.get(permissionCode) === true : (overrides as any)[permissionCode] === true;
            }
        }

        // Handle if role is populated object or just ID
        const roleId = role._id || role;

        // Check for SA bypass if role object is available
        if (role.roleCode === 'SA') return true;

        const permissions = await this.getPermissionsByRole(roleId);
        return permissions.includes(permissionCode);
    }
}
