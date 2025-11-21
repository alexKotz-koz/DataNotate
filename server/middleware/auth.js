const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
};

const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userRole = req.user?.role;
  if (userRole === 'admin' || allowedRoles.includes(userRole)) {
    return next();
  }

  return res.status(403).json({ error: 'Insufficient permissions' });
};

module.exports = {
  requireAuth,
  requireRoles,
};
