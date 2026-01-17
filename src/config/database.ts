import mongoose from 'mongoose';
import { Config } from './index';

export const connectDB = async () => {
    try {
        await mongoose.connect(Config.MONGODB_URI, {
            // Options like useNewUrlParser, useUnifiedTopology are no longer needed in Mongoose 6+
        });
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    await mongoose.disconnect();
    console.log('✅ MongoDB Disconnected');
};
