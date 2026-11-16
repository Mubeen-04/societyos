import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }
    let uri = ENV.MONGO_URI;

    if (!uri) {
      console.log('⚡ No MONGO_URI provided in environment. Initializing high-performance embedded MongoDB...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      console.log(`✅ Embedded MongoDB initialized at: ${uri}`);
    }

    await mongoose.connect(uri);
    console.log(`🚀 MongoDB connected successfully [Database: ${mongoose.connection.name}]`);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting DB:', err.message);
  }
};
