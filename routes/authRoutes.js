const express = require('express');
const userService = require('../services/userService');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Login route
router.post('/login', catchAsync(async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }
        
        // Attempt to login
        const result = await userService.login(email, password);
        
        res.status(200).json(result);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ 
                message: error.message 
            });
        }
        res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
}));

// Register route
router.post('/register', catchAsync(async (req, res) => {
    try {
        const { name, email, password, role, studentId } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                message: 'Name, email, and password are required' 
            });
        }
        
        // Validate role
        const validRoles = ['student', 'organizer'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role. Must be student or organizer' 
            });
        }
        
        // Validate student ID for students
        if (role === 'student' && !studentId) {
            return res.status(400).json({ 
                message: 'Student ID is required for student accounts' 
            });
        }
        
        // Prepare user data
        const userData = {
            name,
            email,
            password,
            role: role || 'student',
            studentId: role === 'student' ? studentId : undefined
        };
        
        // Attempt to register
        const user = await userService.register(userData);
        
        res.status(201).json({ 
            message: 'User registered successfully',
            user 
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ 
                message: error.message 
            });
        }
        res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
}));

// Middleware to verify JWT token
const authenticateToken = catchAsync(async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            message: 'Access token required' 
        });
    }
    
    try {
        const decoded = await userService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ 
            message: 'Invalid or expired token' 
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, catchAsync(async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);
        res.status(200).json({ user });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ 
                message: error.message 
            });
        }
        res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
}));

module.exports = router;