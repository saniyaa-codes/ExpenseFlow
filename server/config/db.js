import mongoose from 'mongoose';
import dns from 'dns';

// Ensure SRV records for MongoDB Atlas resolve reliably on all network configurations
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  // If setting custom DNS fails, continue with system defaults
}

/**
 * Connect to MongoDB Atlas or Local MongoDB instance
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow';
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
