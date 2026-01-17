import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { IndentController } from '../controllers';
import { createIndentSchema, issueIndentSchema } from '../validators';
import { authMiddleware, branchMiddleware, requirePermission } from '../middlewares';
import { Variables } from '../types';

const indentRoutes = new Hono<{ Variables: Variables }>();

indentRoutes.use('*', authMiddleware);

// Indent
indentRoutes.post(
    '/',
    branchMiddleware,
    requirePermission('INDENT.CREATE'),
    zValidator('json', createIndentSchema),
    zValidator('json', createIndentSchema),
    IndentController.create
);

indentRoutes.get(
    '/',
    requirePermission('INDENT.VIEW'), // Assuming permission
    IndentController.list
);

indentRoutes.patch(
    '/:id/approve',
    branchMiddleware,
    requirePermission('INDENT.APPROVE'), // Assuming permission
    IndentController.approve
);

// Issue
indentRoutes.post(
    '/issue',
    branchMiddleware,
    requirePermission('INDENT.ISSUE'),
    zValidator('json', issueIndentSchema),
    IndentController.issue
);

export default indentRoutes;
