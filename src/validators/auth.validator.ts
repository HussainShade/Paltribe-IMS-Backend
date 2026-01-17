import { z } from 'zod';

export const loginSchema = z.object({
    tenantId: z.string().min(1, 'Tenant ID is required'),
    email: z.string().email(),
    password: z.string().min(6),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1),
});
