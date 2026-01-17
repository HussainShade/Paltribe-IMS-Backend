import { Context } from 'hono';
import { Item, ItemStatus } from '../models';
import { Variables } from '../types';

export class ItemController {
    static async create(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const body = await c.req.json();

        const item = await Item.create({
            ...body,
            tenantId: user.tenantId,
        });

        return c.json({
            status: 'success',
            data: item,
        }, 201);
    }

    static async list(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const { page = '1', limit = '10', search, categoryId } = c.req.query();

        const query: any = { tenantId: user.tenantId };

        // Determine Branch Context
        let branchId: any = user.branchId;
        if (user.roleCode === 'SA' && !branchId) {
            branchId = c.req.header('x-branch-id');
        }

        // Filter by Branch (via Categories)
        if (branchId) {
            // Find all categories for this branch
            const { Category } = await import('../models');
            const categories = await Category.find({ tenantId: user.tenantId, branchId }).select('_id');
            const categoryIds = categories.map(cat => cat._id);

            // If specific category requested, ensure it belongs to this branch
            if (categoryId) {
                if (!categoryIds.some(id => id.toString() === categoryId)) {
                    // The requested category is not in this branch -> return empty
                    return c.json({
                        status: 'success',
                        data: [],
                        meta: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
                    });
                }
                query.categoryId = categoryId;
            } else {
                // Filter items by these categories
                if (categoryIds.length > 0) {
                    query.categoryId = { $in: categoryIds };
                } else {
                    // No categories in branch -> No items
                    return c.json({
                        status: 'success',
                        data: [],
                        meta: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
                    });
                }
            }
        } else {
            // No Branch Context (SA Global View): Allow filtering by specific category if provided
            if (categoryId) query.categoryId = categoryId;
        }

        if (search) {
            query.$or = [
                { itemName: { $regex: search, $options: 'i' } },
                { itemCode: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            Item.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ itemName: 1 })
                .populate('categoryId', 'name'),
            Item.countDocuments(query),
        ]);

        return c.json({
            status: 'success',
            data: items,
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

        const item = await Item.findOne({ _id: id, tenantId: user.tenantId }).populate('categoryId', 'name');

        if (!item) {
            return c.json({ status: 'error', message: 'Item not found' }, 404);
        }

        return c.json({ status: 'success', data: item });
    }

    static async update(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const body = await c.req.json();

        const updatedItem = await Item.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return c.json({ status: 'error', message: 'Item not found' }, 404);
        }

        return c.json({ status: 'success', data: updatedItem });
    }

    static async delete(c: Context<{ Variables: Variables }>) {
        const user = c.get('user');
        const id = c.req.param('id');

        // Soft delete
        const deletedItem = await Item.findOneAndUpdate(
            { _id: id, tenantId: user.tenantId },
            { $set: { status: ItemStatus.INACTIVE } },
            { new: true }
        );

        if (!deletedItem) {
            return c.json({ status: 'error', message: 'Item not found' }, 404);
        }

        return c.json({ status: 'success', message: 'Item deactivated successfully' });
    }
}
