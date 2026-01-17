import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';

export const reportQueue = new Queue('report-generation', {
    connection: redis,
});

export const reportWorker = new Worker('report-generation', async (job) => {
    console.log(`Processing report job ${job.id}:`, job.data);
    // Report generation logic
}, {
    connection: redis,
});
