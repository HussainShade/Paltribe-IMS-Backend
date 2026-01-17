import { Context } from 'hono';
import { AuthService } from '../services';
import { setCookie } from 'hono/cookie';

export class AuthController {
    static async login(c: Context) {
        const { tenantId, email, password } = await c.req.json();
        const result = await AuthService.login(tenantId, email, password);

        setCookie(c, 'accessToken', result.tokens.accessToken, {
            httpOnly: true,
            secure: true, // Should be true in production
            sameSite: 'Strict',
            maxAge: 15 * 60, // 15 mins
        });

        setCookie(c, 'refreshToken', result.tokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return c.json({
            status: 'success',
            data: {
                user: result.user,
                permissions: result.permissions,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
            }
        });
    }

    static async refreshToken(c: Context) {
        const { refreshToken } = await c.req.json();
        const tokens = await AuthService.refreshAccessToken(refreshToken);

        setCookie(c, 'accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 15 * 60,
        });

        return c.json({
            status: 'success',
            data: {
                accessToken: tokens.accessToken // Optional to return it if client wants to store it too
            }
        });
    }
}
