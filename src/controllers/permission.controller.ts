import { Context } from 'hono';
import { Permission } from '../models';
import { ApiResponse } from '../utils/ApiResponse';

export class PermissionController {
    static async list(c: Context) {
        const permissions = await Permission.find({}).sort({ moduleName: 1, permissionCode: 1 });
        return c.json(new ApiResponse(200, permissions, 'Permissions retrieved successfully'));
    }
}
