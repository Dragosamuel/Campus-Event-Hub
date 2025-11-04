# Campus Event Hub API

## Health Check

### `GET /health`

Returns the health status of the application.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "database": {
    "status": "connected",
    "timestamp": "2023-01-01T00:00:00.000Z"
  },
  "cache": {
    "status": "connected",
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
}
```

## Authentication

### `POST /api/auth/register`

Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student",
  "studentId": "STU123456" // Required for students
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "studentId": "STU123456",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### `POST /api/auth/login`

Login a user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "studentId": "STU123456",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

## Events

### `GET /api/event-details/:eventId`

Get event details by ID.

**Response:**
```json
{
  "id": "event_id",
  "title": "Event Title",
  "description": "Event Description",
  "date": "2023-12-31",
  "time": "14:00",
  "location": "Event Location",
  "organizer": "Organizer Name"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error