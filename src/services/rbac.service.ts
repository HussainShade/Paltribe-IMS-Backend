import { RolePermission, Permission } from '../models';
import mongoose from 'mongoose';

export class RbacService {
    static async getPermissionsByRole(roleId: mongoose.Types.ObjectId): Promise<string[]> {
        const rolePermissions = await RolePermission.find({ roleId }).populate('permissionId');
        return rolePermissions.map((rp) => (rp.permissionId as any).permissionCode);
    }

    static async hasPermission(roleId: mongoose.Types.ObjectId, permissionCode: string): Promise<boolean> {
        const permissions = await this.getPermissionsByRole(roleId);
        return permissions.includes(permissionCode);
    }
}
