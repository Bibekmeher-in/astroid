const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
    try {
        console.log('🔍 Attempting MongoDB connection...');
        console.log('📍 Connection host:', process.env.MONGODB_URI?.split('@')[1] || 'URI not found');

        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        return conn.connection;
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        console.error('📋 Error code:', error.code || 'N/A');
        console.error('🔗 Full error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
