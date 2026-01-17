import app from './app';
import { Config } from './config';
import { connectDB, disconnectDB } from './config/database';

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
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
