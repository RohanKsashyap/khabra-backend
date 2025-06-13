const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  console.log('Auth middleware: Checking for token...'); // Debug log

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Auth middleware: Token found.', token); // Debug log
  }

  if (!token) {
    console.log('Auth middleware: No token found. Returning 401.'); // Debug log
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route (no token)',
    });
  }

  try {
    // Verify token
    console.log('Auth middleware: Verifying token with JWT_SECRET:', process.env.JWT_SECRET ? '*****' : 'UNDEFINED'); // Debug log, mask secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware: Token decoded:', decoded); // Debug log

    req.user = await User.findById(decoded.id);
    console.log('Auth middleware: User found:', req.user ? req.user.email : 'None'); // Debug log
    
    if (!req.user) {
      console.log('Auth middleware: User not found after token verification. Returning 401.'); // Debug log
      return res.status(401).json({
        success: false,
        message: 'User not found for token',
      });
    }
    
    next();
  } catch (err) {
    console.error('Auth middleware: Error during token verification or user lookup:', err); // IMPORTANT: Log the actual error
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route (token invalid or expired)',
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware: Checking user roles.'); // Debug log
    console.log('Authorize middleware: req.user:', req.user ? req.user.role : 'User object not available'); // Debug log
    if (!req.user) {
      console.log('Authorize middleware: req.user is undefined. Returning 401.'); // Debug log
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route (user not authenticated)',
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`Authorize middleware: User role ${req.user.role} not authorized for roles: ${roles.join(', ')}. Returning 403.`); // Debug log
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    console.log('Authorize middleware: User authorized. Proceeding.'); // Debug log
    next();
  };
}; 