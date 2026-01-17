import { Context } from 'hono';
import { User, UserStatus, Role } from '../models'; // Added Role import
import { Variables } from '../types';

export class UserController {
    static async create(c: Context<{ Variables: Variables }>) {
        const user = c.get('user') as any; // Cast to any to access roleCode
        const body = await c.req.json();

        // RBAC Check: Restrict Role Creation for Non-SA
        if (user.roleCode !== 'SA') {
            const targetRole = await Role.findById(body.roleId);
            if (!targetRole) {
                return c.json({ status: 'error', message: 'Invalid Role ID' }, 400);
            }

            // Strict Constraint: BM can only create PE, SM, IR
            const allowedRoles = ['PE', 'SM', 'IR'];
            if (!allowedRoles.includes(targetRole.roleCode)) {
                return c.json({ status: 'error', message: 'You are not authorized to create users with this role.' }, 403);
            }
        }

        // Hashing
        const hashedPassword = await Bun.password.hash(body.password);

        // Branch Enforcement
        let targetBranchId = body.branchId;
        if (user.roleCode !== 'SA') {
            // Non-SA (BM) MUST use their own branch.
            if (body.branchId && body.branchId !== user.branchId?.toString()) {
                return c.json({ status: 'error', message: 'Cannot assign users to other branches.' }, 403);
            }
            targetBranchId = user.branchId;
        }

        const newUser = await User.create({
            ...body,
            branchId: targetBranchId, // Enforce Branch
            passwordHash: hashedPassword,
            tenantId: user.tenantId,
        });

        // Remove password from response
        const userJson = newUser.toJSON();

        return c.json({
            status: 'success',
            data: userJson,
        }, 201);
    }

    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user') as any;
        const { page = '1', limit = '10', status } = c.req.query();

        const query: any = { tenantId: user.tenantId };

        // strict Branch Filtering for Non-SA
        if (user.roleCode !== 'SA') {
            if (!user.branchId) {
                // If BM has no branchId, something is wrong with data, but safety check:
                return c.json({ status: 'error', message: 'User not assigned to a branch.' }, 403);
            }
            query.branchId = user.branchId;
        } else {
            // SA branch filtering
            const contextBranchId = c.get('branchId');
            if (contextBranchId) {
                query.branchId = contextBranchId;
            }
        }

        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ name: 1 }) // Default sort by name
                .populate('roleId', 'roleName roleCode')
                .populate('branchId', 'branchName'),
            User.countDocuments(query),
        ]);

        return c.json({
            status: 'success',
            data: users,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        });
    }

    static async get(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');

        const fetchedUser = await User.findOne({ _id: id, tenantId: user.tenantId })
            .populate('roleId', 'roleName roleCode')
            .populate('branchId', 'branchName');

        if (!fetchedUser) {
            return c.json({ status: 'error', message: 'User not found' }, 404);
        }

        return c.json({ status: 'success', data: fetchedUser });
    }

    static async update(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const body = await c.req.json();

        // If updating password, hash it
        if (body.password) {
            body.passwordHash = await Bun.password.hash(body.password);
            delete body.password;
        }

        const updatedUser = await User.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return c.json({ status: 'error', message: 'User not found' }, 404);
        }

        return c.json({ status: 'success', data: updatedUser });
    }

    static async delete(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');

        // Soft delete
        const deletedUser = await User.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: { status: UserStatus.INACTIVE } },
            { new: true }
        );

        if (!deletedUser) {
            return c.json({ status: 'error', message: 'User not found' }, 404);
        }

        return c.json({ status: 'success', message: 'User deactivated successfully' });
    }
}
