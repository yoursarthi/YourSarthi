'use strict';

const { createLogger } = require('./logger');
const { isProduction } = require('../config');

const log = createLogger('errorHandler');

/**
 * Central Express error-handling middleware.
 * Must be registered AFTER all routes (4-argument signature).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    log.error(`${req.method} ${req.originalUrl} → ${status}`, err.stack || err);
  } else {
    log.warn(`${req.method} ${req.originalUrl} → ${status}: ${message}`);
  }

  res.status(status).json({
    ok: false,
    error: message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
