const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'campus-event-hub-cache' },
  transports: [
    new winston.transports.File({ filename: 'logs/cache-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/cache-combined.log' })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Simple in-memory cache implementation
class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, expiration = 3600) {
    try {
      // Remove existing timer if any
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      // Store the value
      this.cache.set(key, value);

      // Set expiration timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, expiration * 1000);

      this.timers.set(key, timer);

      return true;
    } catch (error) {
      logger.error('Error setting cache value:', error);
      return false;
    }
  }

  get(key) {
    try {
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }
      return null;
    } catch (error) {
      logger.error('Error getting cache value:', error);
      return null;
    }
  }

  del(key) {
    try {
      // Clear timer if exists
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }

      // Delete from cache
      return this.cache.delete(key);
    } catch (error) {
      logger.error('Error deleting cache value:', error);
      return false;
    }
  }

  flush() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      this.timers.clear();

      // Clear cache
      this.cache.clear();
      return true;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  size() {
    return this.cache.size;
  }
}

// CacheManager that uses in-memory cache instead of Redis
class CacheManager {
  constructor() {
    this.client = new InMemoryCache();
    this.isConnected = true;
  }

  async connect() {
    try {
      logger.info('Using in-memory cache instead of Redis');
      this.isConnected = true;
    } catch (error) {
      logger.error('Error initializing in-memory cache:', error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    try {
      this.client.flush();
      this.isConnected = false;
      logger.info('Disconnected from in-memory cache');
    } catch (error) {
      logger.error('Error disconnecting from in-memory cache:', error);
    }
  }

  async set(key, value, expiration = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('Cache not connected, skipping cache set');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      const result = this.client.set(key, serializedValue, expiration);
      return result;
    } catch (error) {
      logger.error('Error setting cache value:', error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Cache not connected, skipping cache get');
        return null;
      }

      const value = this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Error getting cache value:', error);
      return null;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Cache not connected, skipping cache delete');
        return false;
      }

      const result = this.client.del(key);
      return result;
    } catch (error) {
      logger.error('Error deleting cache value:', error);
      return false;
    }
  }

  async flush() {
    try {
      if (!this.isConnected) {
        logger.warn('Cache not connected, skipping cache flush');
        return false;
      }

      const result = this.client.flush();
      return result;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', error: 'Not connected to cache' };
      }

      return { 
        status: 'connected', 
        type: 'in-memory',
        size: this.client.size(),
        timestamp: new Date() 
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = new CacheManager();