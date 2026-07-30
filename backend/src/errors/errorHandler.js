const { AppError } = require('./AppError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  if (err.statusCode === 500) {
    logger.error(`[500] ${err.message}`, { stack: err.stack, url: req.originalUrl });
  } else {
    logger.warn(`[${err.statusCode}] ${err.message}`);
  }

  // Zod Validation Error handling
  if (err.name === 'ZodError') {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation Error',
      errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  // Prisma Errors
  if (err.code && err.code.startsWith('P')) {
    let message = 'Database Error';
    if (err.code === 'P2002') message = 'Duplicate field value entered';
    if (err.code === 'P2025') message = 'Record not found';
    return res.status(400).json({
      status: 'fail',
      message
    });
  }

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  }
};

module.exports = errorHandler;
