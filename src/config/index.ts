
export const Config = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ims_backend',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
    JWT_SECRET: process.env.JWT_SECRET || 'changeme',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'changeme_refresh',
    NODE_ENV: process.env.NODE_ENV || 'development',
};
