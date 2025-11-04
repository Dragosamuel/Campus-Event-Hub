const { MongoClient } = require('mongodb');
const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'campus-event-hub' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

class DatabaseManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.collections = {};
    this.isConnected = false;
  }

  async connect() {
    try {
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      
      // Configure connection pool options
      const options = {
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 5,  // Minimum number of connections in the pool
        serverSelectionTimeoutMS: 5000, // Timeout for server selection
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
        retryWrites: true,
        retryReads: true
      };

      this.client = new MongoClient(uri, options);
      
      // Connect to MongoDB
      await this.client.connect();
      this.db = this.client.db('CampusEventHub');
      
      // Initialize collections
      this.collections.students = this.db.collection('students');
      this.collections.organizers = this.db.collection('organizers');
      this.collections.events = this.db.collection('events');
      this.collections.registrations = this.db.collection('registrations');
      this.collections.feedback = this.db.collection('feedback');
      this.collections.notifications = this.db.collection('notifications');
      this.collections.users = this.db.collection('users');
      
      // Create indexes for frequently queried fields
      await this.createIndexes();
      
      this.isConnected = true;
      
      logger.info('Connected to MongoDB successfully');
      
      // Handle connection events
      this.client.on('connectionReady', () => {
        logger.info('MongoDB connection is ready');
      });
      
      this.client.on('connectionClosed', () => {
        logger.warn('MongoDB connection closed');
        this.isConnected = false;
      });
      
      // Handle errors
      this.client.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });
      
      return this.db;
    } catch (error) {
      logger.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }
  
  async createIndexes() {
    try {
      // Create indexes for frequently queried fields
      await this.collections.users.createIndex({ email: 1 }, { unique: true });
      await this.collections.events.createIndex({ date: 1 });
      await this.collections.events.createIndex({ organizer: 1 });
      await this.collections.registrations.createIndex({ studentEmail: 1 });
      await this.collections.registrations.createIndex({ eventId: 1 });
      await this.collections.feedback.createIndex({ eventId: 1 });
      
      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating database indexes:', error);
    }
  }
  
  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
    }
  }
  
  getCollection(name) {
    return this.collections[name];
  }
  
  isConnected() {
    return this.isConnected;
  }
  
  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', error: 'Not connected to database' };
      }
      
      // Ping the database
      await this.db.command({ ping: 1 });
      return { status: 'connected', timestamp: new Date() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = new DatabaseManager();