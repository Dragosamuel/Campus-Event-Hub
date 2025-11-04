const userService = require('../services/userService');

// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
    // Check for token in Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (token) {
        try {
            // Verify token
            const decoded = await userService.verifyToken(token);
            req.user = decoded;
            res.locals.user = decoded;
        } catch (error) {
            // Token is invalid, but we don't want to block access since app is publicly accessible
            req.user = { role: 'guest' };
            res.locals.user = { role: 'guest' };
        }
    } else {
        // No token, treat as guest
        req.user = { role: 'guest' };
        res.locals.user = { role: 'guest' };
    }
    
    next();
};

module.exports = { isAuthenticated };