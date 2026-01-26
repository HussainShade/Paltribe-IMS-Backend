import { Context } from 'hono';
import mongoose from 'mongoose';
import { Variables } from '../types';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { UserPermissionOverride } from '../models';

export class UserPermissionOverrideController {
  /**
   * Get overrides for a user, optionally filtered by branchId.
   * GET /users/:id/permission-overrides?branchId=...
   */
  static async listForUser(c: Context<{ Variables: Variables }>) {
    const authUser = c.get('user') as any;
    const userId = c.req.param('id');
    const { branchId } = c.req.query();

    const query: any = {
      tenantId: authUser.tenantId,
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (branchId) {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const overrides = await UserPermissionOverride.find(query).lean();

    return c.json(
      new ApiResponse(
        200,
        {
          overrides,
        },
        'User permission overrides retrieved'
      )
    );
  }

  /**
   * Upsert overrides for a user (optionally for a single branch).
   * POST /users/:id/permission-overrides
   *
   * Body:
   * {
   *   branchId?: string,
   *   overrides?: Record<string, boolean>, // for single branch
   *   overridesByBranch?: Record<string, Record<string, boolean>> // multi-branch
   * }
   */
  static async upsertForUser(c: Context<{ Variables: Variables }>) {
    const authUser = c.get('user') as any;
    const userId = c.req.param('id');
    const body = await c.req.json();

    const tenantId = authUser.tenantId;
    const userObjId = new mongoose.Types.ObjectId(userId);

    const ops: Array<ReturnType<typeof UserPermissionOverride.bulkWrite>[0]> = [];

    const addBranchOverrides = (branchIdStr: string, overrides: Record<string, boolean>) => {
      const branchObjId = new mongoose.Types.ObjectId(branchIdStr);
      for (const [permissionCode, allowed] of Object.entries(overrides || {})) {
        ops.push({
          updateOne: {
            filter: { tenantId, userId: userObjId, branchId: branchObjId, permissionCode },
            update: { $set: { allowed: !!allowed } },
            upsert: true,
          },
        } as any);
      }
    };

    if (body.overridesByBranch && typeof body.overridesByBranch === 'object') {
      for (const [branchIdStr, overrides] of Object.entries(body.overridesByBranch as Record<string, Record<string, boolean>>)) {
        addBranchOverrides(branchIdStr, overrides);
      }
    } else if (body.branchId && body.overrides && typeof body.overrides === 'object') {
      addBranchOverrides(body.branchId, body.overrides);
    } else {
      throw new ApiError(400, 'Invalid payload. Provide overridesByBranch or (branchId + overrides).');
    }

    if (ops.length === 0) {
      return c.json(new ApiResponse(200, { updated: 0 }, 'No overrides to upsert'));
    }

    const result = await UserPermissionOverride.bulkWrite(ops, { ordered: false });

    return c.json(
      new ApiResponse(
        200,
        {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount,
        },
        'User permission overrides saved'
      )
    );
  }

  /**
   * Delete overrides for a user.
   * DELETE /users/:id/permission-overrides
   * Body:
   * { branchId?: string, permissionCodes?: string[] }
   */
  static async deleteForUser(c: Context<{ Variables: Variables }>) {
    const authUser = c.get('user') as any;
    const userId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));

    const query: any = {
      tenantId: authUser.tenantId,
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (body.branchId) {
      query.branchId = new mongoose.Types.ObjectId(body.branchId);
    }
    if (Array.isArray(body.permissionCodes) && body.permissionCodes.length > 0) {
      query.permissionCode = { $in: body.permissionCodes };
    }

    const res = await UserPermissionOverride.deleteMany(query);
    return c.json(new ApiResponse(200, { deleted: res.deletedCount }, 'User permission overrides deleted'));
  }
}

