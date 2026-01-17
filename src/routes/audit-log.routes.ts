import { Hono } from 'hono';
import { AuditLogController } from '../controllers';
import { authMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const auditLogRoutes = new Hono<{ Variables: Variables }>();

auditLogRoutes.use('*', authMiddleware);

// List Logs - SuperAdmin or permission based
// Using a specific permission 'AUDIT_LOG.VIEW' - we might need to seed this.
// Or just restrict to SA in controller (which I noted in controller comments).
// For now, let's assume we add this permission or just allow SA.
// Since 'requirePermission' checks role permissions, we need to ensure 'SA' has this.
// Assuming 'SA' has '*' or we add 'LOGS.VIEW'.
// Let's use 'LOGS.VIEW' as standard.
auditLogRoutes.get(
    '/',
    requirePermission('LOGS.VIEW'),
    AuditLogController.list
);

export default auditLogRoutes;
