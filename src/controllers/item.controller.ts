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
        if (search) {
            query.$or = [
                { itemName: { $regex: search, $options: 'i' } },
                { itemCode: { $regex: search, $options: 'i' } },
            ];
        }
        if (categoryId) query.categoryId = categoryId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            Item.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ itemName: 1 }),
            // .populate('categoryId', 'name') // Assuming Category model exists? Just IDs for now as per model definition
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

        const item = await Item.findOne({ _id: id, tenantId: user.tenantId });

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
