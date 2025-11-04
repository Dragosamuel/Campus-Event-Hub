const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Parser } = require('json2csv');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const cron = require('node-cron');
require('dotenv').config();

// Import utilities
const database = require('./utils/database');
const cache = require('./utils/cache');
const emailService = require('./utils/email');
const { handleErrors, handle404, catchAsync } = require('./utils/errorHandler');
const eventService = require('./services/eventService');
const userService = require('./services/userService');

// Import routes
// const authRoutes = require('./routes/authRoutes'); // Removed authentication routes

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(bodyParser.json());

// Add browser caching headers for static assets
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
  maxAge: '1d',
  etag: true
}));

app.use('/js', express.static(path.join(__dirname, 'public/js'), {
  maxAge: '1d',
  etag: true
}));

app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '1d',
  etag: true
}));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await database.disconnect();
  await cache.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await database.disconnect();
  await cache.disconnect();
  process.exit(0);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const cacheHealth = await cache.healthCheck();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      cache: cacheHealth
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Initialize services
async function initializeServices() {
  try {
    await database.connect();
    
    // Try to connect to cache, but don't fail if it's not available
    try {
      await cache.connect();
      console.log('Cache connected successfully');
    } catch (cacheError) {
      console.log('Cache not available, continuing without caching');
    }
    
    // Initialize email service
    emailService.initializeEmailService();
    
    await eventService.initialize();
    await userService.initialize();
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
    process.exit(1);
  }
}

// Make db available to routers
app.use((req, res, next) => {
  req.app.locals.db = database.db;
  next();
});

// Simplified middleware for guest users
const guestMiddleware = (req, res, next) => {
  req.user = { role: 'guest' };
  next();
};

// Routes (making all view pages publicly accessible)
app.get('/', catchAsync(async (req, res) => {
  try {
    // Get events with caching
    const events = await eventService.getAllEvents();
    
    res.render('index', { events: events, user: { role: 'guest' } });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error fetching events',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

app.get('/dashboard', catchAsync(async (req, res) => {
  try {
    // Get events with caching
    const events = await eventService.getAllEvents();
    
    res.render('dashboard', { events: events, user: { role: 'guest' } });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error fetching dashboard data',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

app.get('/events', catchAsync(async (req, res) => {
  try {
    // Get query parameters for filtering
    const filters = {};
    
    if (req.query.search) {
      filters.search = req.query.search;
    }
    
    if (req.query.organizer) {
      filters.organizer = req.query.organizer;
    }
    
    // Get events with caching
    const events = await eventService.getAllEvents(filters);
    
    res.render('events', { events: events, user: { role: 'guest' } });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error fetching events',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

// Registration and feedback pages (publicly accessible)
app.get('/register/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  res.render('event-register', { eventId, user: { role: 'guest' } });
});

app.get('/feedback/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  res.render('feedback', { eventId, user: { role: 'guest' } });
});

// Organizer pages (publicly accessible with actual data)
app.get('/organizer', (req, res) => {
  res.render('organizer', { user: { role: 'guest' } });
});

// Admin page (publicly accessible with actual data)
app.get('/admin', async (req, res) => {
  try {
    // Get statistics
    const eventsCount = await database.getCollection('events').countDocuments();
    const registrationsCount = await database.getCollection('registrations').countDocuments();
    const feedbackCount = await database.getCollection('feedback').countDocuments();
    
    // Get recent events
    const events = await database.getCollection('events').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    // Get recent registrations
    const registrations = await database.getCollection('registrations').find({}).sort({ registeredAt: -1 }).limit(10).toArray();
    
    // Get event details for registrations
    const eventIds = registrations.map(reg => reg.eventId);
    const eventDetails = await database.getCollection('events').find({
      _id: { $in: eventIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const eventsMap = {};
    eventDetails.forEach(event => {
      eventsMap[event._id.toString()] = event;
    });
    
    // Add event details to registrations
    const registrationsWithEvents = registrations.map(reg => ({
      ...reg,
      event: eventsMap[reg.eventId] || null
    }));
    
    // Ensure fee is properly handled for events
    const eventsWithFee = events.map(event => ({
      ...event,
      fee: event.fee ? parseInt(event.fee) : 0
    }));
    
    // Get data for charts
    // Events per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    
    const eventsByMonth = await database.getCollection('events').aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
          _id: { 
            year: { $year: "$createdAt" }, 
            month: { $month: "$createdAt" } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]).toArray();
    
    // Format events by month data
    const eventsPerMonth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const found = eventsByMonth.find(item => 
        item._id.year === year && item._id.month === month
      );
      
      eventsPerMonth.push({
        month: date.toLocaleString('default', { month: 'short' }),
        count: found ? found.count : 0
      });
    }
    
    // Registrations trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const registrationsByDay = await database.getCollection('registrations').aggregate([
      { $match: { registeredAt: { $gte: sevenDaysAgo } } },
      { $group: {
          _id: { 
            year: { $year: "$registeredAt" }, 
            month: { $month: "$registeredAt" },
            day: { $dayOfMonth: "$registeredAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]).toArray();
    
    // Format registrations trend data
    const registrationsTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      const found = registrationsByDay.find(item => 
        item._id.year === year && item._id.month === month && item._id.day === day
      );
      
      registrationsTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: found ? found.count : 0
      });
    }
    
    // Get recent activity (last 5 activities)
    const recentEvents = await database.getCollection('events').find({}).sort({ createdAt: -1 }).limit(3).toArray();
    const recentRegistrations = await database.getCollection('registrations').find({}).sort({ registeredAt: -1 }).limit(3).toArray();
    const recentFeedback = await database.getCollection('feedback').find({}).sort({ submittedAt: -1 }).limit(3).toArray();
    
    // Combine and sort recent activities
    const recentActivities = [
      ...recentEvents.map(event => ({
        type: 'event',
        title: `New event: ${event.title}`,
        timestamp: event.createdAt,
        details: `${event.location} on ${new Date(event.date).toLocaleDateString()}`
      })),
      ...recentRegistrations.map(reg => ({
        type: 'registration',
        title: `New registration`,
        timestamp: reg.registeredAt,
        details: `For ${eventsMap[reg.eventId] ? eventsMap[reg.eventId].title : 'Unknown Event'}`
      })),
      ...recentFeedback.map(fb => ({
        type: 'feedback',
        title: `New feedback received`,
        timestamp: fb.submittedAt,
        details: `Rating: ${fb.rating}/5 stars`
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    
    res.render('admin', { 
      user: { role: 'guest', name: 'Drago Samuel' },
      stats: {
        events: eventsCount,
        registrations: registrationsCount,
        feedback: feedbackCount
      },
      events: eventsWithFee,
      registrations: registrationsWithEvents,
      charts: {
        eventsPerMonth: eventsPerMonth,
        registrationsTrend: registrationsTrend
      },
      recentActivities: recentActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error fetching admin data',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Student pages (publicly accessible with actual data)
app.get('/student/registrations', async (req, res) => {
  try {
    // Check if cancellation was successful
    const cancelled = req.query.cancelled === 'true';
    
    // Get all registrations
    const registrations = await database.getCollection('registrations').find({}).toArray();
    
    // Get event details for each registration
    const eventIds = registrations.map(reg => reg.eventId);
    const events = await database.getCollection('events').find({
      _id: { $in: eventIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const eventsMap = {};
    events.forEach(event => {
      eventsMap[event._id.toString()] = event;
    });
    
    // Combine registration and event data
    const registrationDetails = registrations.map(reg => ({
      ...reg,
      event: eventsMap[reg.eventId] || null
    }));
    
    res.render('student-registrations', { 
      user: { role: 'guest' }, 
      registrations: registrationDetails,
      cancelled: cancelled
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error fetching registrations',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Organizer events page (publicly accessible with actual data)
app.get('/organizer/my-events', async (req, res) => {
    try {
        // Get all events
        const events = await database.getCollection('events').find({}).toArray();
        
        // Get registration counts for each event
        const eventIds = events.map(event => event._id);
        const registrationCounts = await database.getCollection('registrations').aggregate([
            { $match: { eventId: { $in: eventIds.map(id => id.toString()) } } },
            { $group: { _id: "$eventId", count: { $sum: 1 } } }
        ]).toArray();
        
        const registrationCountMap = {};
        registrationCounts.forEach(reg => {
            registrationCountMap[reg._id] = reg.count;
        });
        
        // Add registration counts
        const eventsWithCounts = events.map(event => ({
            ...event,
            registrationCount: registrationCountMap[event._id.toString()] || 0
        }));
        
        res.render('organizer-events', { 
            user: { role: 'guest' }, 
            events: eventsWithCounts 
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { 
            message: 'Error fetching events',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Profile page (publicly accessible)
app.get('/profile', (req, res) => {
  res.render('profile', { user: { role: 'guest' } });
});

// Settings page (publicly accessible)
app.get('/settings', (req, res) => {
  res.render('settings', { user: { role: 'guest' } });
});

// Add this new route to view registered students for a specific event
app.get('/organizer/event/:eventId/registrations', catchAsync(async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Get event details
        const event = await eventService.getEventById(eventId);
        
        // Get registrations for this event
        const registrations = await eventService.getEventRegistrations(eventId);
        
        res.render('event-registrations', { 
            user: { role: 'guest' }, 
            event: event,
            registrations: registrations
        });
    } catch (error) {
        console.error(error);
        if (error.message === 'Event not found') {
            return res.status(404).render('error', { 
                message: 'Event not found',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
        res.status(500).render('error', { 
            message: 'Error fetching event registrations',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}));

// Add this new route to export registered students for a specific event
app.get('/organizer/event/:eventId/registrations/export', catchAsync(async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Get event details
        const event = await eventService.getEventById(eventId);
        
        // Get registrations for this event
        const registrations = await eventService.getEventRegistrations(eventId);
        
        // Define CSV fields
        const fields = [
            'Student Name',
            'Email',
            'Student ID',
            'Registration Date'
        ];
        
        // Prepare data for CSV export
        const exportData = registrations.map(reg => ({
            'Student Name': reg.studentName || '',
            'Email': reg.studentEmail || '',
            'Student ID': reg.studentId || '',
            'Registration Date': reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : ''
        }));
        
        // Generate CSV
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(exportData);
        
        // Set headers for file download
        res.header('Content-Type', 'text/csv');
        res.attachment(`event_${eventId}_registrations.csv`);
        res.status(200).send(csv);
    } catch (error) {
        console.error('Error exporting event registrations:', error);
        if (error.message === 'Event not found') {
            return res.status(404).render('error', { 
                message: 'Event not found',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
        res.status(500).render('error', { 
            message: 'Error exporting event registrations: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}));

// Export registered students for a specific event to Excel
app.get('/organizer/event/:eventId/registrations/export/excel', catchAsync(async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Get event details
        const event = await eventService.getEventById(eventId);
        
        // Get registrations for this event
        const registrations = await eventService.getEventRegistrations(eventId);
        
        // Prepare data for Excel export
        const exportData = registrations.map(reg => ({
            'Student Name': reg.studentName || '',
            'Email': reg.studentEmail || '',
            'Student ID': reg.studentId || '',
            'Registration Date': reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : ''
        }));
        
        // Add event details as first row
        const eventData = [{
            'Event Name': event.title,
            'Date': `${event.date} at ${event.time}`,
            'Location': event.location,
            'Organizer': event.organizer,
            '': '', // Empty cell for spacing
            '': '', // Empty cell for spacing
            '': ''  // Empty cell for spacing
        }];
        
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(eventData.concat(['']), { skipHeader: true });
        XLSX.utils.sheet_add_json(worksheet, exportData, { origin: -1 });
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
        
        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Set headers for file download
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_Registrations.xlsx`);
        res.status(200).send(buffer);
    } catch (error) {
        console.error('Error exporting event registrations to Excel:', error);
        if (error.message === 'Event not found') {
            return res.status(404).render('error', { 
                message: 'Event not found',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
        res.status(500).render('error', { 
            message: 'Error exporting event registrations to Excel: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}));

// Export registered students for a specific event to PDF
app.get('/organizer/event/:eventId/registrations/export/pdf', catchAsync(async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Get event details
        const event = await eventService.getEventById(eventId);
        
        // Get registrations for this event
        const registrations = await eventService.getEventRegistrations(eventId);
        
        // Create a PDF document
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_Registrations.pdf"`);
        
        // Pipe the PDF to the response
        doc.pipe(res);
        
        // Add event details
        doc.fontSize(18).text('Event Registrations', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(14).text(`Event: ${event.title}`);
        doc.fontSize(12).text(`Date: ${event.date} at ${event.time}`);
        doc.text(`Location: ${event.location}`);
        doc.text(`Organizer: ${event.organizer}`);
        doc.moveDown();
        
        // Draw a line
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown();
        
        // Add registration table
        if (registrations.length > 0) {
            // Table headers
            const tableTop = doc.y;
            const rowHeight = 20;
            const colWidths = [150, 150, 100, 100];
            
            // Header row
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text('Student Name', 50, tableTop);
            doc.text('Email', 200, tableTop);
            doc.text('Student ID', 350, tableTop);
            doc.text('Registration Date', 450, tableTop);
            
            // Data rows
            doc.font('Helvetica');
            registrations.forEach((reg, i) => {
                const y = tableTop + rowHeight * (i + 1);
                doc.text(reg.studentName || '', 50, y);
                doc.text(reg.studentEmail || '', 200, y);
                doc.text(reg.studentId || '', 350, y);
                doc.text(reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : '', 450, y);
            });
        } else {
            doc.fontSize(12).text('No registrations found for this event.');
        }
        
        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error('Error exporting event registrations to PDF:', error);
        if (error.message === 'Event not found') {
            return res.status(404).render('error', { 
                message: 'Event not found',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
        res.status(500).render('error', { 
            message: 'Error exporting event registrations to PDF: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}));

// Auth routes - removed authentication functionality
app.get('/auth/login', (req, res) => {
  res.redirect('/');
});

app.get('/auth/register', (req, res) => {
  res.redirect('/');
});

// Spreadsheet export - publicly accessible but shows empty data
app.get('/student/registrations/export', async (req, res) => {
  try {
    // Get all registrations
    const registrations = await database.getCollection('registrations').find({}).toArray();
    
    // Get event details for each registration
    const eventIds = registrations.map(reg => reg.eventId);
    const events = await database.getCollection('events').find({
      _id: { $in: eventIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const eventsMap = {};
    events.forEach(event => {
      eventsMap[event._id.toString()] = event;
    });
    
    // Define CSV fields
    const fields = [
      'Event Name',
      'Date',
      'Location',
      'Organiser',
      'Registered On',
      'Student Name'
    ];
    
    // Prepare data for CSV export
    const exportData = registrations.map(reg => {
      const event = eventsMap[reg.eventId] || null;
      return {
        'Event Name': event ? event.title : 'Unknown Event',
        'Date': event ? `${event.date} at ${event.time}` : 'N/A',
        'Location': event ? event.location : 'N/A',
        'Organiser': event ? event.organizer : 'N/A',
        'Registered On': reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : '',
        'Student Name': reg.studentName || ''
      };
    });
    
    // Generate CSV
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(exportData);
    
    // Set headers for file download
    res.header('Content-Type', 'text/csv');
    res.attachment('registrations.csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error exporting registrations',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Edit event page - publicly accessible
app.get('/organizer/edit-event/:eventId', catchAsync(async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    // Get event details
    const event = await eventService.getEventById(eventId);
    
    res.render('edit-event', { user: { role: 'guest' }, event });
  } catch (error) {
    console.error(error);
    if (error.message === 'Event not found') {
      return res.status(404).render('edit-event', { user: { role: 'guest' } });
    }
    res.status(500).render('error', { 
      message: 'Error fetching event',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

// Update event - publicly accessible
app.post('/organizer/update-event/:eventId', catchAsync(async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { title, description, date, time, location } = req.body;
    
    // Update event using service
    await eventService.updateEvent(eventId, {
      title,
      description,
      date,
      time,
      location,
      updatedAt: new Date()
    });
    
    res.redirect('/organizer/my-events');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error updating event',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

// Delete event - publicly accessible
app.post('/organizer/delete-event/:eventId', catchAsync(async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    // Delete event using service
    await eventService.deleteEvent(eventId);
    
    // Delete associated registrations
    await database.getCollection('registrations').deleteMany({ eventId: eventId });
    
    // Delete associated feedback
    await database.getCollection('feedback').deleteMany({ eventId: eventId });
    
    res.redirect('/organizer/my-events');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error deleting event',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

// Add this new route to get event details by ID
app.get('/api/event-details/:eventId', catchAsync(async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Get event details
        const event = await eventService.getEventById(eventId);
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json({
            id: event._id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            organizer: event.organizer
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching event details' });
    }
}));

// Registration - publicly accessible
app.post('/register', catchAsync(async (req, res) => {
  try {
    const { name, email, studentId, eventId } = req.body;
    
    // Get event details to check if event date has passed
    const event = await eventService.getEventById(eventId);
    
    // Check if event date has passed
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for comparison
    
    if (eventDate < today) {
      return res.status(400).render('error', { 
        message: 'Cannot register for past events',
        error: { message: `The event "${event.title}" date has already passed. Registration is no longer available for this event.` }
      });
    }
    
    // Register for event using service
    await eventService.registerForEvent({
      studentEmail: email,
      eventId: eventId,
      studentName: name,
      studentId: studentId,
      registeredAt: new Date()
    });
    
    // Redirect to a success page or back to events with a success message
    res.redirect('/events?registered=true');
  } catch (error) {
    console.error(error);
    // Handle duplicate registration error
    if (error.message === 'You have already registered for this event') {
      return res.status(400).render('error', { 
        message: 'Duplicate Registration',
        error: { message: 'You have already registered for this event. Each student can only register once for each event.' }
      });
    }
    res.status(500).render('error', { 
      message: 'Error registering for event',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

// Feedback - publicly accessible
app.post('/feedback', catchAsync(async (req, res) => {
  try {
    const { name, email, eventId, rating, comment } = req.body;
    
    // Submit feedback using service
    await eventService.submitFeedback({
      studentName: name,
      studentEmail: email,
      eventId: eventId,
      rating: parseInt(rating),
      comment: comment
    });
    
    res.redirect('/events');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error submitting feedback',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

// Create event - publicly accessible
app.post('/organizer/create-event', catchAsync(async (req, res) => {
  try {
    const { title, description, date, time, location, organizer } = req.body;
    
    // Create event using service
    await eventService.createEvent({
      title,
      description,
      date,
      time,
      location,
      organizer: organizer || 'guest@example.com',
      createdBy: 'guest@example.com'
    });
    
    res.redirect('/organizer');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error creating event',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));

// Add this new route to cancel event registration
app.post('/student/cancel-registration/:registrationId', catchAsync(async (req, res) => {
    try {
        const registrationId = req.params.registrationId;
        
        // Validate ObjectId
        if (!ObjectId.isValid(registrationId)) {
            return res.status(400).render('error', { 
                message: 'Invalid registration ID',
                error: process.env.NODE_ENV === 'development' ? new Error('Invalid registration ID') : {}
            });
        }
        
        // Delete the registration
        const result = await database.getCollection('registrations').deleteOne({ 
            _id: new ObjectId(registrationId) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).render('error', { 
                message: 'Registration not found',
                error: process.env.NODE_ENV === 'development' ? new Error('Registration not found') : {}
            });
        }
        
        // Redirect back to student registrations page with success message
        res.redirect('/student/registrations?cancelled=true');
    } catch (error) {
        console.error('Error cancelling registration:', error);
        res.status(500).render('error', { 
            message: 'Error cancelling registration',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}));

// 404 handler
app.use(handle404);

// Error handling middleware
app.use(handleErrors);

// Schedule event reminders (runs every day at 9:00 AM)
cron.schedule('0 9 * * *', async () => {
  console.log('Checking for upcoming events to send reminders...');
  try {
    // Get all events happening in the next 2 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    // Format dates as YYYY-MM-DD for MongoDB query
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];
    
    // Find events happening tomorrow or the day after
    const events = await database.getCollection('events').find({
      date: { $in: [tomorrowStr, dayAfterTomorrowStr] }
    }).toArray();
    
    console.log(`Found ${events.length} upcoming events`);
    
    // For each event, send reminders to registered students
    for (const event of events) {
      try {
        // Get all registered students for this event
        const registrations = await database.getCollection('registrations').find({
          eventId: event._id.toString()
        }).toArray();
        
        console.log(`Found ${registrations.length} registrations for event ${event.title}`);
        
        // Send reminders if there are registrations
        if (registrations.length > 0) {
          await emailService.sendEventReminder(event, registrations);
          console.log(`Reminders sent for event: ${event.title}`);
        }
      } catch (error) {
        console.error(`Error sending reminders for event ${event.title}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in event reminder scheduler:', error);
  }
});

// Initialize services and start server
initializeServices().then(() => {
  app.listen(port, () => {
    console.log(`Campus Event Hub server running at http://localhost:${port}`);
    console.log('Event reminder scheduler is running daily at 9:00 AM');
  });
});