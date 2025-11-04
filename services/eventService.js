const { ObjectId } = require('mongodb');
const database = require('../utils/database');
const cache = require('../utils/cache');
const { AppError, DatabaseError } = require('../utils/errorHandler');
const { sendRegistrationConfirmation } = require('../utils/email');
const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'event-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/event-service.log' })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

class EventService {
  constructor() {
    this.eventsCollection = null;
    this.registrationsCollection = null;
    this.feedbackCollection = null;
  }

  async initialize() {
    try {
      this.eventsCollection = database.getCollection('events');
      this.registrationsCollection = database.getCollection('registrations');
      this.feedbackCollection = database.getCollection('feedback');
      logger.info('EventService initialized successfully');
    } catch (error) {
      logger.error('Error initializing EventService:', error);
      throw new DatabaseError('Failed to initialize EventService');
    }
  }

  // Get all events with optional filtering
  async getAllEvents(filters = {}) {
    try {
      // Try to get from cache first
      const cacheKey = `events_${JSON.stringify(filters)}`;
      let events = await cache.get(cacheKey);
      
      if (!events) {
        // If not in cache, fetch from database
        const query = {};
        
        // Apply filters if provided
        if (filters.dateFrom) {
          query.date = { $gte: filters.dateFrom };
        }
        
        if (filters.dateTo) {
          query.date = query.date || {};
          query.date.$lte = filters.dateTo;
        }
        
        if (filters.organizer) {
          query.organizer = filters.organizer;
        }
        
        if (filters.search) {
          query.$or = [
            { title: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } }
          ];
        }
        
        events = await this.eventsCollection.find(query).sort({ date: 1 }).toArray();
        
        // Ensure fee is a number
        events = events.map(event => ({
          ...event,
          fee: event.fee ? parseInt(event.fee) : 0
        }));
        
        // Cache the results for 1 hour
        await cache.set(cacheKey, events, 3600);
      }
      
      return events;
    } catch (error) {
      logger.error('Error fetching events:', error);
      throw new DatabaseError('Failed to fetch events');
    }
  }

  // Get event by ID
  async getEventById(eventId) {
    try {
      // Validate ObjectId
      if (!ObjectId.isValid(eventId)) {
        throw new AppError('Invalid event ID', 400);
      }
      
      // Try to get from cache first
      const cacheKey = `event_${eventId}`;
      let event = await cache.get(cacheKey);
      
      if (!event) {
        // If not in cache, fetch from database
        event = await this.eventsCollection.findOne({ _id: new ObjectId(eventId) });
        
        if (!event) {
          throw new AppError('Event not found', 404);
        }
        
        // No fee handling needed
        
        // Cache the result for 1 hour
        await cache.set(cacheKey, event, 3600);
      }
      
      return event;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching event:', error);
      throw new DatabaseError('Failed to fetch event');
    }
  }

  // Create a new event
  async createEvent(eventData) {
    try {
      const event = {
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await this.eventsCollection.insertOne(event);
      
      // Clear events cache
      await cache.flush();
      
      logger.info('Event created successfully', { eventId: result.insertedId });
      return { ...event, _id: result.insertedId };
    } catch (error) {
      logger.error('Error creating event:', error);
      throw new DatabaseError('Failed to create event');
    }
  }

  // Update an event
  async updateEvent(eventId, eventData) {
    try {
      // Validate ObjectId
      if (!ObjectId.isValid(eventId)) {
        throw new AppError('Invalid event ID', 400);
      }
      
      const result = await this.eventsCollection.updateOne(
        { _id: new ObjectId(eventId) },
        { 
          $set: { 
            ...eventData, 
            updatedAt: new Date() 
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        throw new AppError('Event not found', 404);
      }
      
      // Clear cache
      await cache.del(`event_${eventId}`);
      await cache.flush();
      
      logger.info('Event updated successfully', { eventId });
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating event:', error);
      throw new DatabaseError('Failed to update event');
    }
  }

  // Update registration payment status
  async updateRegistrationPaymentStatus(registrationId, paymentStatus, paymentMethod) {
    try {
      // Validate ObjectId
      if (!ObjectId.isValid(registrationId)) {
        throw new AppError('Invalid registration ID', 400);
      }
      
      const result = await this.registrationsCollection.updateOne(
        { _id: new ObjectId(registrationId) },
        { 
          $set: { 
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        throw new AppError('Registration not found', 404);
      }
      
      logger.info('Registration payment status updated successfully', { registrationId, paymentStatus });
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating registration payment status:', error);
      throw new DatabaseError('Failed to update registration payment status');
    }
  }

  // Delete an event
  async deleteEvent(eventId) {
    try {
      // Validate ObjectId
      if (!ObjectId.isValid(eventId)) {
        throw new AppError('Invalid event ID', 400);
      }
      
      const result = await this.eventsCollection.deleteOne({ _id: new ObjectId(eventId) });
      
      if (result.deletedCount === 0) {
        throw new AppError('Event not found', 404);
      }
      
      // Clear cache
      await cache.del(`event_${eventId}`);
      await cache.flush();
      
      logger.info('Event deleted successfully', { eventId });
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting event:', error);
      throw new DatabaseError('Failed to delete event');
    }
  }

  // Register for an event
  async registerForEvent(registrationData) {
    try {
      // Check if student has already registered for this event
      const existingRegistration = await this.registrationsCollection.findOne({
        eventId: registrationData.eventId,
        studentEmail: registrationData.studentEmail
      });
      
      if (existingRegistration) {
        throw new AppError('You have already registered for this event', 400);
      }
      
      const registration = {
        ...registrationData,
        registeredAt: new Date()
      };
      
      const result = await this.registrationsCollection.insertOne(registration);
      
      // Send registration confirmation email
      try {
        const event = await this.getEventById(registrationData.eventId);
        await sendRegistrationConfirmation(registrationData.studentEmail, event);
      } catch (emailError) {
        logger.error('Error sending registration confirmation email:', emailError);
      }
      
      logger.info('Event registration created', { 
        registrationId: result.insertedId,
        eventId: registrationData.eventId,
        studentEmail: registrationData.studentEmail,
        userType: registrationData.userType,
        paymentStatus: registration.paymentStatus
      });
      
      return { ...registration, _id: result.insertedId };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating event registration:', error);
      throw new DatabaseError('Failed to register for event');
    }
  }

  // Get event registrations
  async getEventRegistrations(eventId) {
    try {
      const registrations = await this.registrationsCollection.find({ 
        eventId: eventId 
      }).toArray();
      
      return registrations;
    } catch (error) {
      logger.error('Error fetching event registrations:', error);
      throw new DatabaseError('Failed to fetch event registrations');
    }
  }

  // Submit event feedback
  async submitFeedback(feedbackData) {
    try {
      const feedback = {
        ...feedbackData,
        submittedAt: new Date()
      };
      
      const result = await this.feedbackCollection.insertOne(feedback);
      
      logger.info('Event feedback submitted', { 
        feedbackId: result.insertedId,
        eventId: feedbackData.eventId,
        studentEmail: feedbackData.studentEmail
      });
      
      return { ...feedback, _id: result.insertedId };
    } catch (error) {
      logger.error('Error submitting event feedback:', error);
      throw new DatabaseError('Failed to submit feedback');
    }
  }

  // Get event feedback
  async getEventFeedback(eventId) {
    try {
      const feedback = await this.feedbackCollection.find({ 
        eventId: eventId 
      }).toArray();
      
      return feedback;
    } catch (error) {
      logger.error('Error fetching event feedback:', error);
      throw new DatabaseError('Failed to fetch event feedback');
    }
  }

  // Get event analytics
  async getEventAnalytics(eventId) {
    try {
      const [registrations, feedback] = await Promise.all([
        this.getEventRegistrations(eventId),
        this.getEventFeedback(eventId)
      ]);
      
      const totalRegistrations = registrations.length;
      const totalFeedback = feedback.length;
      
      // Calculate average rating
      let averageRating = 0;
      if (totalFeedback > 0) {
        const totalRating = feedback.reduce((sum, f) => sum + (f.rating || 0), 0);
        averageRating = totalRating / totalFeedback;
      }
      
      return {
        totalRegistrations,
        totalFeedback,
        averageRating,
        registrations,
        feedback
      };
    } catch (error) {
      logger.error('Error fetching event analytics:', error);
      throw new DatabaseError('Failed to fetch event analytics');
    }
  }
}

module.exports = new EventService();