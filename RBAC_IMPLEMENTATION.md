# Role-Based Access Control (RBAC) Implementation

## Overview
This document details the implementation of Role-Based Access Control (RBAC) in the Campus Event Hub application. The system ensures that users can only access features and perform actions appropriate to their role while allowing all users to browse public content.

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

### Authentication Middleware
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
  
  jwt.verify(token, process.env.JWT_SECRET || 'campus_event_hub_secret_key', (err, user) => {
    if (err) {
      // Even if token is invalid, we still allow access
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  });
};
```

### Role-Based Authorization Middleware
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

### View Page Implementation
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
```

### Action Route Implementation
All action routes properly enforce role-based access control using the middleware:

```javascript
// Protected actions (enforce proper role-based access control)
app.post('/register', authenticateToken, requireRole(['student']), catchAsync(async (req, res) => {
  // Implementation for student registration
}));

// Organizer actions
app.post('/organizer/create-event', authenticateToken, requireRole(['organizer', 'admin']), catchAsync(async (req, res) => {
  // Implementation for event creation
}));
```

## Ownership Verification
Organizers can only edit/delete their own events, while admins can edit/delete any event:

```javascript
// Verify the event belongs to this organizer (or user is admin)
if (req.user.role !== 'admin' && event.organizer !== req.user.email) {
  return res.status(403).render('error', { 
    message: 'Access denied. You can only edit your own events.',
    error: {}
  });
}
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

1. **Proper HTTP Status Codes**
   - 401 Unauthorized for unauthenticated access to protected actions
   - 403 Forbidden for unauthorized role access
   - 200 OK for successful operations

2. **Clear Error Messages**
   - Users receive specific error messages indicating what permissions they need
   - Different error messages for unauthenticated vs unauthorized access

3. **Ownership Verification**
   - Organizers can only edit/delete their own events
   - Admins can edit/delete any event
   - Ownership is verified by comparing `event.organizer` with `req.user.email`

## User Experience

1. **Public Page Access**
   - All view pages are accessible to guests as required by the project specification
   - Pages show appropriate content based on authentication status
   - Actions are properly restricted based on role

2. **Role-Specific Content**
   - Authenticated users see personalized content
   - Guests see generic content with calls to action
   - Proper navigation based on user role

3. **Graceful Error Handling**
   - User-friendly error pages for access violations
   - Clear redirection for authenticated users
   - Helpful messages for authentication requirements

## Testing and Validation

The RBAC system has been tested for:
- Proper access to view pages for all user roles
- Proper restriction of action routes based on roles
- Correct error messages for unauthorized access
- Ownership verification for organizers and admins
- Guest user access to public content without actions

## Future Enhancements

1. **Advanced Role Management**
   - Role inheritance system
   - Custom role creation
   - Granular permission controls

2. **Enhanced Security**
   - Two-factor authentication
   - Session timeout warnings
   - Activity logging

3. **Improved User Experience**
   - Role-specific dashboards
   - Personalized recommendations
   - Advanced filtering and search