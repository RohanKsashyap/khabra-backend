const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth middleware: Token received:', token);
    }

    if (!token) {
      console.log('Auth middleware: No token found');
      return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Auth middleware: Decoded token:', decoded);
      
      const user = await User.findById(decoded.id).select('-password');
      console.log('Auth middleware: Found user:', {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
      
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware: Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized to access this route' });
    }
  } catch (error) {
    console.error('Auth middleware: General error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.admin = (req, res, next) => {
  console.log('Admin middleware: Checking user role:', req.user?.role);
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware: User role:', req.user?.role, 'Allowed roles:', roles);
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
}; 