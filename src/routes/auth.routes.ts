import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AuthController } from '../controllers';
import { loginSchema, refreshTokenSchema } from '../validators';

const authRoutes = new Hono();

authRoutes.post('/login', zValidator('json', loginSchema), AuthController.login);
authRoutes.post('/refresh', zValidator('json', refreshTokenSchema), AuthController.refreshToken);

export default authRoutes;
