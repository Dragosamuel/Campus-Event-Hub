# Campus Event Hub - Startup Guide

## System Requirements
- Node.js v14 or higher
- MongoDB v4.4 or higher
- npm or yarn package manager

## Installation Steps

### 1. Clone or Download the Repository
```
git clone <repository-url>
cd campus-event-hub
```

### 2. Install Dependencies
```
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory with the following variables:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/CampusEventHub
JWT_SECRET=your_jwt_secret_here
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```
mongod
```

### 5. Run the Application
For production:
```
npm start
```

For development (with auto-restart):
```
npm run dev
```

## Default Access Credentials

### Student Account
- Email: student@example.com
- Password: student123

### Organizer Account
- Email: organizer@example.com
- Password: organizer123

### Admin Account
- Email: admin@example.com
- Password: admin123

## Accessing the Application
Once the server is running, open your browser and navigate to:
```
http://localhost:3001
```

## Key Pages and Routes

### Public Pages (No Login Required)
- Home: `/`
- Events List: `/events`
- Dashboard: `/dashboard`
- Login: `/auth/login`
- Register: `/auth/register`

### Student Pages
- My Registrations: `/student/registrations`
- Event Registration: `/register/:eventId`
- Feedback Form: `/feedback/:eventId`

### Organizer Pages
- Create Event: `/organizer`
- My Events: `/organizer/my-events`

### Admin Pages
- Admin Panel: `/admin`

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the PORT in `.env` file to another available port

2. **MongoDB connection error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in `.env` file

3. **Missing dependencies**
   - Run `npm install` again

4. **Permission errors**
   - Ensure you have write permissions in the project directory

### Logging
The application logs to:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- `logs/event-service.log` - Event service logs
- `logs/user-service.log` - User service logs

## Features Overview

### Responsive Design
The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

### Role-Based Access Control
- **Students** can browse events, register, and provide feedback
- **Organizers** can create events and manage their events
- **Admins** have full system access

### Modern UI Components
- Smooth animations and transitions
- Card-based layouts
- Interactive forms with validation
- Notifications and alerts
- Modals and tooltips

### Performance Optimizations
- Database connection pooling
- Caching for frequently accessed data
- Efficient queries
- Minified CSS and JavaScript

## Customization

### Styling
- Modify `public/css/style.css` for global styles
- Each page has inline styles that can be customized

### JavaScript
- Modify `public/js/main.js` for global JavaScript functionality
- Page-specific scripts are included in the EJS templates

### Templates
- All EJS templates are in the `views/` directory
- Header and footer are in separate files for consistency

## Security Features

### Authentication
- JWT tokens for session management
- BCrypt password hashing
- Token expiration (24 hours)

### Authorization
- Role-based access control
- Route protection for sensitive operations
- Input validation and sanitization

### Data Protection
- Environment variables for sensitive data
- Secure password storage
- Protected API endpoints

## Support
For issues or questions, please:
1. Check the logs in the `logs/` directory
2. Review the documentation in README.md
3. Open an issue on the GitHub repository