import { Context } from 'hono';
import { Role, RolePermission, Permission, RoleCode } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import mongoose from 'mongoose';

export class RoleController {
    static async list(c: Context) {
        const roles = await Role.find({});
        return c.json(new ApiResponse(200, roles, 'Roles retrieved successfully'));
    }

    static async get(c: Context) {
        const id = c.req.param('id');
        const role = await Role.findById(id);

        if (!role) {
            throw new ApiError(404, 'Role not found');
        }

        // Convert string ID to ObjectId for query (Mongoose should handle this, but being explicit)
        const rolePermissions = await RolePermission.find({ roleId: id }).populate('permissionId');
        const permissions = rolePermissions.map((rp: any) => {
            // Ensure permissionId is populated (could be ObjectId or populated object)
            if (rp.permissionId && typeof rp.permissionId === 'object') {
                return rp.permissionId;
            }
            return null;
        }).filter(Boolean); // Remove any null values

        // Debug log
        console.log(`[RoleController] Role ${id} (${role.roleCode}) has ${permissions.length} permissions`);

        return c.json(new ApiResponse(200, {
            ...role.toJSON(),
            permissions,
        }, 'Role retrieved successfully'));
    }

    static async updatePermissions(c: Context) {
        const id = c.req.param('id');
        const { permissionIds } = await c.req.json();

        // Ensure role exists
        const role = await Role.findById(id);
        if (!role) {
            throw new ApiError(404, 'Role not found');
        }

        // Validate Permissions
        const validPermissions = await Permission.find({ _id: { $in: permissionIds } });
        if (validPermissions.length !== permissionIds.length) {
            throw new ApiError(400, 'One or more invalid permission IDs provided');
        }

        // Transaction to ensure atomicity
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Delete existing permissions for this role
            await RolePermission.deleteMany({ roleId: id }, { session });

            // Insert new permissions
            const newRolePermissions = permissionIds.map((permId: string) => ({
                roleId: id,
                permissionId: permId,
            }));

            await RolePermission.insertMany(newRolePermissions, { session });

            await session.commitTransaction();
            session.endSession();

            return c.json(new ApiResponse(200, null, 'Permissions updated successfully'));
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
}
