import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { cors } from 'hono/cors';

// import checkRoutes from './routes/check.routes'; // Does not exist? Removed.
import api from './routes';
import { auditLogMiddleware } from './middlewares';

const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use('*', auditLogMiddleware);

app.route('/api/v1', api);

app.get('/health', (c) => c.json({ status: 'ok', uptime: process.uptime() }));

export default app;
