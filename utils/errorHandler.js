const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'campus-event-hub-error-handler' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/warnings.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

// Error handling middleware
const handleErrors = (err, req, res, next) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  let errorResponse = {
    success: false,
    message: 'Internal Server Error',
    timestamp: new Date().toISOString()
  };

  let statusCode = 500;

  // Handle specific error types
  if (err instanceof AppError) {
    errorResponse.message = err.message;
    statusCode = err.statusCode;
  } else if (err.name === 'ValidationError') {
    errorResponse.message = err.message;
    statusCode = 400;
  } else if (err.name === 'CastError') {
    errorResponse.message = 'Invalid ID format';
    statusCode = 400;
  } else if (err.code === 11000) {
    errorResponse.message = 'Duplicate field value entered';
    statusCode = 400;
  } else if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Invalid token';
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Token expired';
    statusCode = 401;
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    errorResponse.message = 'Something went wrong';
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const handle404 = (req, res, next) => {
  const error = new NotFoundError(`Cannot find ${req.originalUrl} on this server`);
  next(error);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  handleErrors,
  catchAsync,
  handle404
};