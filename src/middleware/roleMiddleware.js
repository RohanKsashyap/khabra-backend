function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || (Array.isArray(role) ? !role.includes(req.user.role) : req.user.role !== role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = requireRole; 