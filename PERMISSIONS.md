# Campus Event Hub - Role-Based Permissions

## User Roles and Permissions

### Administrator (admin)
**Full system access with all privileges:**
- Create, edit, and delete any event
- Manage all users and their roles
- View all system analytics and reports
- Access admin dashboard at `/admin`

### Organizer
**Event management privileges:**
- Create new events at `/organizer`
- Edit their own events at `/organizer/edit-event/:eventId`
- Delete their own events
- View their events at `/organizer/my-events`
- Access organizer dashboard at `/organizer`

### Student
**Event participation privileges:**
- Browse all events at `/events`
- Register for events at `/register/:eventId`
- Provide feedback on events at `/feedback/:eventId`
- View their registrations at `/student/registrations`
- Export their registrations to CSV

### Guest (Unauthenticated User)
**Limited public access:**
- Browse events at `/events`
- View event details
- Access general information pages
- Cannot perform any actions (create, edit, delete, register)

## Route Permissions Matrix

| Route | Method | Required Roles | Description |
|-------|--------|----------------|-------------|
| `/` | GET | guest, student, organizer, admin | Homepage with featured events |
| `/dashboard` | GET | guest, student, organizer, admin | User dashboard |
| `/events` | GET | guest, student, organizer, admin | Browse all events |
| `/register/:eventId` | GET | guest, student, organizer, admin | Event registration form |
| `/register` | POST | student | Submit event registration |
| `/feedback/:eventId` | GET | guest, student, organizer, admin | Event feedback form |
| `/feedback` | POST | student | Submit event feedback |
| `/organizer` | GET | guest, organizer, admin | Organizer dashboard and event creation |
| `/organizer/create-event` | POST | organizer, admin | Create new event |
| `/organizer/my-events` | GET | guest, organizer, admin | View organizer's events |
| `/organizer/edit-event/:eventId` | GET | organizer, admin | Edit event form |
| `/organizer/update-event/:eventId` | POST | organizer, admin | Update event details |
| `/organizer/delete-event/:eventId` | POST | organizer, admin | Delete event |
| `/student/registrations` | GET | guest, student | View student's registrations |
| `/student/registrations/export` | GET | student | Export registrations to CSV |
| `/admin` | GET | guest, admin | Admin dashboard |
| `/profile` | GET | guest, student, organizer, admin | User profile |
| `/auth/login` | GET | guest | Login page |
| `/auth/register` | GET | guest | Registration page |
| `/api/auth/login` | POST | guest | API login endpoint |
| `/api/auth/register` | POST | guest | API registration endpoint |
| `/api/auth/me` | GET | student, organizer, admin | Get current user info |

## Security Implementation

### Authentication
- JWT tokens for session management
- Tokens expire after 24 hours
- Tokens are stored in localStorage
- Guest users have limited access without authentication

### Authorization
- Role-based access control using middleware
- Route-specific permission checks
- Ownership verification for edit/delete operations
- Proper HTTP status codes for unauthorized access

### Data Protection
- Passwords hashed with bcrypt
- Input validation and sanitization
- Secure JWT signing with secret key
- Role information embedded in JWT payload

## Email Notifications

### Students Receive:
- Registration confirmation emails
- Event update notifications
- Event cancellation notifications

### Email Triggers:
- When a student registers for an event
- When an organizer updates an event (students registered receive notification)
- When an organizer deletes an event (students registered receive notification)

## Implementation Details

### Middleware
1. `authenticateToken` - Verifies JWT tokens and sets `req.user`
2. `requireRole` - Checks if user has required role(s)

### Route Protection
- Routes use middleware chaining: `authenticateToken, requireRole(['role1', 'role2'])`
- View routes allow guests but restrict actions
- API routes return JSON errors for unauthorized access
- Web routes render error pages for unauthorized access

### Ownership Verification
- Organizers can only edit/delete their own events
- Admins can edit/delete any event
- Ownership checked by comparing `event.organizer` with `req.user.email`
- Admins bypass ownership checks

## User Experience

### Login Flow
1. User visits login page
2. Enters credentials and submits
3. Server validates credentials and generates JWT
4. Client stores token and user data in localStorage
5. User redirected based on role:
   - Admin → `/admin`
   - Organizer → `/organizer`
   - Student → `/`

### Already Logged In
- Logged-in users visiting login/register pages are redirected
- Appropriate dashboards shown based on role

### Session Management
- Tokens automatically expire after 24 hours
- Users can manually logout to clear session
- Session data stored in localStorage

## Error Handling

### Unauthorized Access
- Guests attempting restricted actions get appropriate error messages
- Users attempting actions outside their role get clear error messages
- Ownership violations result in 403 Forbidden responses

### Technical Errors
- Database errors logged and handled gracefully
- Email delivery failures logged but don't break core functionality
- User-facing error messages are user-friendly