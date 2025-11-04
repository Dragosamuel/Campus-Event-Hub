const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const database = require('../utils/database');
const { AppError, DatabaseError } = require('../utils/errorHandler');
const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/user-service.log' })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Secret key for JWT (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'campus_event_hub_secret_key';
const SALT_ROUNDS = 10;

class UserService {
  constructor() {
    this.usersCollection = null;
  }

  async initialize() {
    try {
      this.usersCollection = database.getCollection('users');
      logger.info('UserService initialized successfully');
    } catch (error) {
      logger.error('Error initializing UserService:', error);
      throw new DatabaseError('Failed to initialize UserService');
    }
  }

  // Register a new user
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.usersCollection.findOne({ 
        email: userData.email 
      });
      
      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      
      // Create user object
      const user = {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || 'student',
        studentId: userData.role === 'student' ? userData.studentId : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert user into database
      const result = await this.usersCollection.insertOne(user);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      logger.info('User registered successfully', { userId: result.insertedId, email: user.email });
      
      return { ...userWithoutPassword, _id: result.insertedId };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error registering user:', error);
      throw new DatabaseError('Failed to register user');
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const user = await this.usersCollection.findOne({ email });
      
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }
      
      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      logger.info('User logged in successfully', { userId: user._id, email: user.email });
      
      return {
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error logging in user:', error);
      throw new DatabaseError('Failed to login user');
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      // Validate ObjectId
      if (!ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID', 400);
      }
      
      const user = await this.usersCollection.findOne({ 
        _id: new ObjectId(userId) 
      });
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching user:', error);
      throw new DatabaseError('Failed to fetch user');
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const user = await this.usersCollection.findOne({ email });
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching user by email:', error);
      throw new DatabaseError('Failed to fetch user');
    }
  }

  // Update user
  async updateUser(userId, userData) {
    try {
      // Validate ObjectId
      if (!ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID', 400);
      }
      
      // Remove password from update data if present
      const { password, ...updateData } = userData;
      updateData.updatedAt = new Date();
      
      const result = await this.usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        throw new AppError('User not found', 404);
      }
      
      logger.info('User updated successfully', { userId });
      
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating user:', error);
      throw new DatabaseError('Failed to update user');
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      // Validate ObjectId
      if (!ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID', 400);
      }
      
      const result = await this.usersCollection.deleteOne({ 
        _id: new ObjectId(userId) 
      });
      
      if (result.deletedCount === 0) {
        throw new AppError('User not found', 404);
      }
      
      logger.info('User deleted successfully', { userId });
      
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting user:', error);
      throw new DatabaseError('Failed to delete user');
    }
  }

  // Get all users with optional filtering
  async getAllUsers(filters = {}) {
    try {
      const query = {};
      
      // Apply filters if provided
      if (filters.role) {
        query.role = filters.role;
      }
      
      const users = await this.usersCollection.find(query).toArray();
      
      // Remove passwords from response
      return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw new DatabaseError('Failed to fetch users');
    }
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

module.exports = new UserService();