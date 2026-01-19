import { Context } from 'hono';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { ZodError } from 'zod';
import { StatusCode } from 'hono/utils/http-status';

export const errorHandler = (err: Error, c: Context) => {
    // console.error(err); // Optional logging

    if (err instanceof ApiError) {
        return c.json(
            new ApiResponse(
                err.statusCode,
                null,
                err.message
            ),
            err.statusCode as any
        );
    }

    if (err instanceof ZodError) {
        const validationErrors = err.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }));

        return c.json(
            new ApiResponse(
                400,
                { errors: validationErrors },
                'Validation Error'
            ),
            400
        );
    }

    // Default Interal Server Error
    return c.json(
        new ApiResponse(
            500 as StatusCode,
            null,
            'Internal Server Error'
        ),
        500
    );
};
