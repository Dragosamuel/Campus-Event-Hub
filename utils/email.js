const nodemailer = require('nodemailer');
const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'email-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/email-service.log' })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Create a transporter object using the default SMTP transport
// In production, you would use a real email service like Gmail, SendGrid, etc.
let transporter;

// Initialize email service
function initializeEmailService() {
  try {
    // For development, we'll use Ethereal.email which is a fake SMTP service for testing
    // In production, you would configure with real SMTP settings
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true' || false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'test@example.com',
        pass: process.env.EMAIL_PASS || 'password'
      }
    });

    logger.info('Email service initialized successfully');
  } catch (error) {
    logger.error('Error initializing email service:', error);
  }
}

// Send email notification
async function sendEmailNotification(to, subject, htmlContent) {
  try {
    // Verify transporter configuration
    if (!transporter) {
      logger.warn('Email transporter not initialized');
      return;
    }

    // Verify connection configuration
    await transporter.verify();
    
    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Campus Event Hub" <no-reply@campuseventhub.com>',
      to: to,
      subject: subject,
      html: htmlContent
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { messageId: info.messageId, to: to });
    
    // In development, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

// Send event update notification to all registered students
async function sendEventUpdateNotification(event, students, updateType) {
  try {
    if (!students || students.length === 0) {
      logger.info('No students to notify for event update');
      return;
    }

    // Create email content based on update type
    let subject, htmlContent;
    
    switch (updateType) {
      case 'updated':
        subject = `Event Updated: ${event.title}`;
        htmlContent = `
          <h2>Event Updated</h2>
          <p>The event "${event.title}" has been updated with new information:</p>
          <ul>
            <li><strong>Title:</strong> ${event.title}</li>
            <li><strong>Date:</strong> ${event.date}</li>
            <li><strong>Time:</strong> ${event.time}</li>
            <li><strong>Location:</strong> ${event.location}</li>
          </ul>
          <p>Please check the event page for more details.</p>
          <p>Thank you for your interest in campus events!</p>
        `;
        break;
        
      case 'deleted':
        subject = `Event Cancelled: ${event.title}`;
        htmlContent = `
          <h2>Event Cancelled</h2>
          <p>We regret to inform you that the event "${event.title}" has been cancelled.</p>
          <p>We apologize for any inconvenience this may cause.</p>
          <p>Thank you for your understanding.</p>
        `;
        break;
        
      default:
        subject = `Event Notification: ${event.title}`;
        htmlContent = `
          <h2>Event Notification</h2>
          <p>There has been an update to the event "${event.title}".</p>
          <p>Please check the event page for more details.</p>
        `;
    }

    // Send email to each student
    const emailPromises = students.map(student => {
      return sendEmailNotification(
        student.email,
        subject,
        htmlContent
      );
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);
    logger.info(`Event ${updateType} notifications sent to ${students.length} students`);
  } catch (error) {
    logger.error(`Error sending event ${updateType} notifications:`, error);
    throw error;
  }
}

// Send registration confirmation email
async function sendRegistrationConfirmation(studentEmail, event) {
  try {
    const subject = `Registration Confirmed: ${event.title}`;
    const htmlContent = `
      <h2>Registration Confirmed</h2>
      <p>Thank you for registering for the event "${event.title}".</p>
      <ul>
        <li><strong>Event:</strong> ${event.title}</li>
        <li><strong>Date:</strong> ${event.date}</li>
        <li><strong>Time:</strong> ${event.time}</li>
        <li><strong>Location:</strong> ${event.location}</li>
      </ul>
      <p>We look forward to seeing you at the event!</p>
    `;

    await sendEmailNotification(studentEmail, subject, htmlContent);
    logger.info('Registration confirmation email sent', { studentEmail, eventId: event._id });
  } catch (error) {
    logger.error('Error sending registration confirmation email:', error);
    throw error;
  }
}

// Send event reminder email to all registered students
async function sendEventReminder(event, students) {
  try {
    if (!students || students.length === 0) {
      logger.info('No students to remind for event');
      return;
    }

    const subject = `Reminder: ${event.title} is coming up soon!`;
    const eventDate = new Date(`${event.date}T${event.time}`);
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const htmlContent = `
      <h2>Event Reminder</h2>
      <p>This is a friendly reminder that you've registered for the event "${event.title}".</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Event Details</h3>
        <ul>
          <li><strong>Event:</strong> ${event.title}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${event.time}</li>
          <li><strong>Location:</strong> ${event.location}</li>
        </ul>
      </div>
      <p>We look forward to seeing you at the event!</p>
      <p>Best regards,<br>Campus Event Hub Team</p>
    `;

    // Send email to each student
    const emailPromises = students.map(student => {
      return sendEmailNotification(
        student.studentEmail || student.email,
        subject,
        htmlContent
      );
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);
    logger.info(`Event reminder emails sent to ${students.length} students for event ${event.title}`);
  } catch (error) {
    logger.error('Error sending event reminder emails:', error);
    throw error;
  }
}

module.exports = {
  initializeEmailService,
  sendEmailNotification,
  sendEventUpdateNotification,
  sendRegistrationConfirmation,
  sendEventReminder
};