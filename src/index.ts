import app from './app';
import { Config } from './config';
import { connectDB, disconnectDB } from './config/database';
import { redis } from './config/redis';

const startServer = async () => {
  await connectDB();

  const server = Bun.serve({
    port: Config.PORT,
    fetch: app.fetch,
  });

  console.log(`🚀 Server running on port ${Config.PORT}`);

  const shutdown = async () => {
    console.log('🛑 Shutting down...');
    server.stop();
    await disconnectDB();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
