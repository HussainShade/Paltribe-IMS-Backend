import { Context } from 'hono';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, c: Context) => {
    console.error(err);

    if (err instanceof AppError) {
        return c.json({
            status: err.status,
            message: err.message,
        }, err.statusCode as any);
    }

    if (err instanceof ZodError) {
        return c.json({
            status: 'fail',
            message: 'Validation Error',
            errors: err.issues
        }, 400);
    }

    return c.json({
        status: 'error',
        message: 'Internal Server Error',
    }, 500);
};
