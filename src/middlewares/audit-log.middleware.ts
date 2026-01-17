import { Context, Next } from 'hono';
import { AuditLogService } from '../services/audit-log.service';

export const auditLogMiddleware = async (c: Context, next: Next) => {
    // Only log state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
        const user = c.get('user');

        // We need to capture the response status to only log successful operations
        // Hono doesn't have a simple "response hook" that runs AFTER response is sent in the same way express does for logging logic *after* handling.
        // But we can await next() and check c.res.status (if set) or just assume success if no error thrown.

        // Capture relevant info before
        const method = c.req.method;
        const path = c.req.path;

        // Clone body - careful with large bodies, maybe redact sensitive fields like password
        let body: any = {};
        try {
            // Cloning payload for logging. 
            // Note: c.req.json() can only be read once. If we read it here, subsequent handlers will fail.
            // Hono's `c.req.json()` reads the stream.
            // Solution: We should NOT read body here if standard handlers need it.
            // Alternatively, AuditLogService can be called explicitly in controllers.
            // BUT, for a generic middleware, strictly we'd need to peek or re-stream.
            // Simplified approach for "Middleware": Log the "Intent" (Path/Method).
            // Better approach: Rely on Controllers to call AuditLogService for detailed business logic logging,
            // OR use this middleware just for "Access/Activity" logging without body.

            // However, the prompt asked for "Audit Logs" which implies detailed tracking. 
            // A safe middle ground is logging the URL and User.
        } catch (e) {
            // ignore
        }

        await next();

        // After next() completes (successfully)
        if (user) {
            // Basic activity logging
            await AuditLogService.log({
                action: `${method} ${path}`,
                entity: 'System', // Generic
                performedBy: user._id,
                tenantId: user.tenantId,
                branchId: c.get('branchId') || user.branchId, // Capture effective branch
                details: {
                    method,
                    path,
                    statusCode: c.res.status, // might be undefined if not yet set? Hono flow is tricky.
                }
            });
        }
    } else {
        await next();
    }
};

// NOTE: For better granularity (e.g. "Create Vendor"), we should explicitly call AuditLogService in controllers.
// This middleware acts as a fallback "Safety Net" or "Access Log".
// I will implement explicit calls in PO/Indent/etc. as well for better "Entity" tracking.
