import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';

export const inventoryQueue = new Queue('inventory-recalculation', {
    connection: redis,
});

export const inventoryWorker = new Worker('inventory-recalculation', async (job) => {
    console.log(`Processing inventory job ${job.id}:`, job.data);
    // Recalculation logic placeholder
}, {
    connection: redis,
});
