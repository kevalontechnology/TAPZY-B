const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/tapzy_crm';
    try {
      const conn = await mongoose.connect(connStr, {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`[Database] MongoDB Connected to local/URI instance: ${conn.connection.host}`);
    } catch (err) {
      console.log('[Database] Primary MongoDB connection failed. Starting in-memory MongoServer fallback...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memUri = mongoServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`[Database] Connected to In-Memory MongoServer at: ${conn.connection.host}`);
    }

    const { autoSeedIfEmpty } = require('../utils/autoSeed');
    await autoSeedIfEmpty();
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
