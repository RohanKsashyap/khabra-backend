const requireRole = require('./roleMiddleware');

// Admin-only middleware
const adminOnly = requireRole('admin');

module.exports = adminOnly;
