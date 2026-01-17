import Redis from 'ioredis';
import { Config } from './index';

export const redis = new Redis({
    host: Config.REDIS_HOST,
    port: Config.REDIS_PORT,
    maxRetriesPerRequest: null, // Required for BullMQ
});

redis.on('connect', () => console.log('✅ Redis Connected'));
redis.on('error', (err) => console.error('❌ Redis Error:', err));
