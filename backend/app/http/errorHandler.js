const { sendError } = require('./response');
const { env } = require('../config/env');
const logger = require('../logger');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  // Handle Custom App Errors
  if (error.isAppError || error.name === 'AppError' || error.statusCode) {
      return sendError(res, error.statusCode || 500, error.code || 'INTERNAL_ERROR', error.message, error.issues);
  }

  // Handle Validation Errors (legacy fallback if not catching AppError name)
  if (error.name === 'ValidationError') {
      return sendError(res, 422, 'VALIDATION_FAILED', error.message, error.issues);
  }

  if (error?.code === 'CORS_BLOCKED' || String(error?.message || '').includes('CORS')) {
    const origin = error?.origin || req.get('origin') || 'unknown';
    const allowed = Array.isArray(error?.allowed) ? error.allowed : env.cors.allowed;

    return sendError(res, 403, 'CORS_BLOCKED', 'Origin not allowed', {
      origin,
      allowed
    });
  }

  // Unexpected Errors
  logger.error('Unhandled error', {
    message: error?.message,
    stack: error?.stack,
    path: req.originalUrl,
    method: req.method
  });

  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}

module.exports = {
  errorHandler
};
