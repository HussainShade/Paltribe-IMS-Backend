
import { Context } from 'hono';
import { WorkAreaService } from '../services';
import { WorkArea, Branch } from '../models';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export class WorkAreaController {
    static async create(c: Context) {
        try {
            const user = c.get('user');
            const body = await c.req.json();
            const { name, branchIds, status } = body;

            if (!name || !branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
                throw new ApiError(400, 'Name and at least one Branch ID are required');
            }

            // Validate branch IDs
            const count = await Branch.countDocuments({ _id: { $in: branchIds }, tenantId: user.tenantId });
            if (count !== branchIds.length) {
                throw new ApiError(400, 'One or more invalid Branch IDs');
            }

            const workArea = await WorkArea.create({
                tenantId: user.tenantId,
                branchIds,
                name,
                status
            });

            return c.json(new ApiResponse(201, workArea, 'Work Area created successfully'), 201);
        } catch (error: any) {
            console.error('Create WorkArea Error:', error);
            if (error instanceof ApiError) {
                return c.json(new ApiResponse(error.statusCode, null, error.message), error.statusCode as any);
            }
            return c.json(new ApiResponse(500, null, 'Internal server error'), 500);
        }
    }

    static async list(c: Context) {
        try {
            const user = c.get('user');
            const { branchId, status } = c.req.query();

            // If user has branchId (e.g., BM), restrict or use it as default filter? 
            // Requirement: "different branch counld have different workarea".
            // If BM, they should arguably only see WorkAreas for their branch.
            // If SA, they can filter by branchId.

            const filters: any = { status };

            // If user is restricted to a branch (e.g. BM), force the filter.
            // But typically filtering is done via Query Param for SA.
            // If the user has a branchId, we could enforce it.
            // However, WorkArea has `branchIds` array. 
            // If I am a BM of Branch A, I should see WorkAreas that *include* Branch A.

            if (user.branchId) {
                filters.branchId = user.branchId;
            } else if (branchId) {
                filters.branchId = branchId;
            }

            const workAreas = await WorkAreaService.list(user.tenantId, filters);

            return c.json(new ApiResponse(200, workAreas, 'Work Areas retrieved successfully'));
        } catch (error: any) {
            console.error('Get WorkAreas Error:', error);
            if (error instanceof ApiError) {
                return c.json(new ApiResponse(error.statusCode, null, error.message), error.statusCode as any);
            }
            return c.json(new ApiResponse(500, null, 'Internal server error'), 500);
        }
    }

    static async getById(c: Context) {
        try {
            const user = c.get('user');
            const id = c.req.param('id');

            const workArea = await WorkAreaService.getById(id, user.tenantId);

            if (!workArea) {
                throw new ApiError(404, 'Work Area not found');
            }

            return c.json(new ApiResponse(200, workArea, 'Work Area retrieved successfully'));
        } catch (error: any) {
            console.error('Get WorkArea By ID Error:', error);
            if (error instanceof ApiError) {
                return c.json(new ApiResponse(error.statusCode, null, error.message), error.statusCode as any);
            }
            return c.json(new ApiResponse(500, null, 'Internal server error'), 500);
        }
    }

    static async update(c: Context) {
        try {
            const user = c.get('user');
            const id = c.req.param('id');
            const body = await c.req.json();

            const workArea = await WorkAreaService.update(id, body, user);

            if (!workArea) {
                return c.json({ success: false, message: 'Work Area not found' }, 404);
            }

            return c.json({ success: true, message: 'Work Area updated successfully', data: workArea });
        } catch (error) {
            console.error('Update WorkArea Error:', error);
            return c.json({ success: false, message: 'Internal server error', error }, 500);
        }
    }

    static async delete(c: Context) {
        try {
            const user = c.get('user');
            const id = c.req.param('id');

            const workArea = await WorkAreaService.delete(id, user);

            if (!workArea) {
                return c.json({ success: false, message: 'Work Area not found' }, 404);
            }

            return c.json({ success: true, message: 'Work Area deleted successfully' });
        } catch (error) {
            console.error('Delete WorkArea Error:', error);
            return c.json({ success: false, message: 'Internal server error', error }, 500);
        }
    }
}
