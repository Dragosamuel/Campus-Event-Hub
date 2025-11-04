# Campus Event Hub - Role-Based Access Control Implementation

## Overview
This document describes the implemented role-based access control system for the Campus Event Hub application. The system ensures that users can only access features and perform actions appropriate to their role while allowing all users to browse public content.

## User Roles and Permissions

### 1. Guest (Unauthenticated User)
**Public browsing access only:**
- Browse events at `/events`
- View event details
- Access general information pages
- View all public pages (organizer, admin, student registration pages)
- **Cannot perform any actions** (create, edit, delete, register, export)

### 2. Student
**Event participation privileges:**
- All guest permissions
- Register for events at `/register/:eventId`
- Provide feedback on events at `/feedback/:eventId`
- View their registrations at `/student/registrations`
- Export their registrations to CSV at `/student/registrations/export`
- Access their profile at `/profile`

### 3. Organizer
**Event management privileges:**
- All guest permissions
- Create new events at `/organizer`
- Edit their own events at `/organizer/edit-event/:eventId`
- Delete their own events
- View their events at `/organizer/my-events`
- Access organizer dashboard at `/organizer`

### 4. Administrator (Admin)
**Full system access with all privileges:**
- All organizer privileges
- Edit/delete any event (not just their own)
- Manage all users and their roles
- View all system analytics and reports
- Access admin dashboard at `/admin`

## Implementation Details

### 1. Authentication Middleware
The authentication middleware allows all users to access view pages while properly handling authentication:

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // Instead of blocking access, we'll set user to null and continue
    req.user = null;
    return next();
  }
  
  userService.verifyToken(token)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(error => {
      // Even if token is invalid, we still allow access
      req.user = null;
      next();
    });
};
```

### 2. Role-Based Authorization Middleware
The role-based authorization middleware enforces proper access control for actions:

```javascript
const requireRole = (roles) => {
  return (req, res, next) => {
    // If user is not authenticated, treat as guest
    if (!req.user) {
      req.user = { role: 'guest' };
    }
    
    // For guest users, only allow access to routes that explicitly include 'guest'
    if (req.user.role === 'guest') {
      if (!roles.includes('guest')) {
        // For API routes, return JSON error
        if (req.path.startsWith('/api/')) {
          return res.status(401).json({ message: 'Authentication required' });
        }
        // For web routes, render error page
        return res.status(401).render('error', { 
          message: 'Authentication required to access this page',
          error: {}
        });
      }
      return next();
    }
    
    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      // For API routes, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      // For web routes, render error page
      return res.status(403).render('error', { 
        message: `Access denied. This action requires ${roles.join(' or ')} permissions.`,
        error: {}
      });
    }
    
    next();
  };
};
```

### 3. View Page Implementation
All view pages are accessible to guests as per project requirements:

```javascript
// Organizer pages (allow guest access to view page)
app.get('/organizer', (req, res) => {
  // Allow all users to view the page, but restrict actions to organizers and admins
  res.render('organizer', { user: req.user || { role: 'guest' } });
});

// Admin page (allow guest access to view page)
app.get('/admin', (req, res) => {
  // Allow all users to view the page, but restrict actions to admins
  res.render('admin', { user: req.user || { role: 'guest' } });
});

// Student pages (allow guest access to view page)
app.get('/student/registrations', async (req, res) => {
  try {
    // Allow all users to view the page, but show actual data only to students
    if (!req.user || req.user.role !== 'student') {
      return res.render('student-registrations', { 
        user: req.user || { role: 'guest' }, 
        registrations: [] 
      });
    }
    // ... rest of implementation for authenticated students
  } catch (error) {
    // ... error handling
  }
});
```

### 4. Action Route Implementation
All action routes properly enforce role-based access control:

```javascript
// Protected actions (enforce proper role-based access control)
app.post('/register', authenticateToken, requireRole(['student']), catchAsync(async (req, res) => {
  try {
    // Check if user is authenticated and has student role
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).render('error', { 
        message: 'Access denied. Event registration requires student permissions.',
        error: {}
      });
    }
    // ... rest of implementation for student registration
  } catch (error) {
    // ... error handling
  }
}));

// Organizer actions
app.post('/organizer/create-event', authenticateToken, requireRole(['organizer', 'admin']), catchAsync(async (req, res) => {
  try {
    // Check if user is authenticated and has organizer or admin role
    if (!req.user || (req.user.role !== 'organizer' && req.user.role !== 'admin')) {
      return res.status(403).render('error', { 
        message: 'Access denied. Event creation requires organizer or admin permissions.',
        error: {}
      });
    }
    // ... rest of implementation for event creation
  } catch (error) {
    // ... error handling
  }
}));
```

## Route Permissions Matrix

| Route | Method | Required Roles | Description |
|-------|--------|----------------|-------------|
| `/` | GET | guest, student, organizer, admin | Homepage with featured events |
| `/dashboard` | GET | guest, student, organizer, admin | User dashboard |
| `/events` | GET | guest, student, organizer, admin | Browse all events |
| `/register/:eventId` | GET | guest, student, organizer, admin | Event registration form (view only) |
| `/register` | POST | student | Submit event registration |
| `/feedback/:eventId` | GET | guest, student, organizer, admin | Event feedback form (view only) |
| `/feedback` | POST | student | Submit event feedback |
| `/organizer` | GET | guest, organizer, admin | Organizer dashboard (view only) |
| `/organizer/create-event` | POST | organizer, admin | Create new event |
| `/organizer/my-events` | GET | guest, organizer, admin | View organizer's events (view only) |
| `/organizer/edit-event/:eventId` | GET | organizer, admin | Edit event form |
| `/organizer/update-event/:eventId` | POST | organizer, admin | Update event details |
| `/organizer/delete-event/:eventId` | POST | organizer, admin | Delete event |
| `/student/registrations` | GET | guest, student | View student's registrations (view only) |
| `/student/registrations/export` | GET | student | Export registrations to CSV |
| `/admin` | GET | guest, admin | Admin dashboard (view only) |
| `/profile` | GET | guest, student, organizer, admin | User profile (view only) |
| `/auth/login` | GET | guest | Login page |
| `/auth/register` | GET | guest | Registration page |

## Security Features

### 1. Ownership Verification
- Organizers can only edit/delete their own events
- Admins can edit/delete any event
- Ownership is verified by comparing `event.organizer` with `req.user.email`

### 2. Proper HTTP Status Codes
- 401 Unauthorized for unauthenticated access to protected actions
- 403 Forbidden for unauthorized role access
- 200 OK for successful operations

### 3. Clear Error Messages
- Users receive specific error messages indicating what permissions they need
- Different error messages for unauthenticated vs unauthorized access

## User Experience

### 1. Public Page Access
All view pages are accessible to guests as required by the project specification:
- Guests can browse all pages without authentication
- Pages show appropriate content based on authentication status
- Actions are properly restricted based on role

### 2. Role-Specific Content
- Authenticated users see personalized content
- Guests see generic content with calls to action
- Proper navigation based on user role

### 3. Graceful Error Handling
- User-friendly error pages for access violations
- Clear redirection for authenticated users
- Helpful messages for authentication requirements

## Testing and Validation

### 1. Role-Based Testing
Each role has been tested for:
- Proper access to view pages
- Proper restriction of action routes
- Correct error messages
- Ownership verification for organizers

### 2. Edge Cases
- Guest users cannot perform actions
- Authenticated users cannot access other roles' restricted actions
- Ownership verification works correctly for organizers and admins

### 3. User Experience
- Navigation is intuitive and role-appropriate
- Error messages are user-friendly
- Redirection works correctly for all scenarios

## Future Enhancements

### 1. Advanced Role Management
- Role inheritance system
- Custom role creation
- Granular permission controls

### 2. Enhanced Security
- Two-factor authentication
- Session timeout warnings
- Activity logging

### 3. Improved User Experience
- Role-specific dashboards
- Personalized recommendations
- Advanced filtering and search