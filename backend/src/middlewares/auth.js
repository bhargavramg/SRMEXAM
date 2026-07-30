const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired token.'));
    }
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // SUPER_ADMIN can bypass everything
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Access denied. Insufficient permissions.'));
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };
