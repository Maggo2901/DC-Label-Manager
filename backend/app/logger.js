const pino = require('pino');

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino/file',
      options: { destination: 1 },
    },
  }),
});

/**
 * Thin wrapper preserving the existing call signature:
 *   logger.info(message, meta?)
 *   logger.warn(message, meta?)
 *   logger.error(message, meta?)
 *
 * Pino's native API expects (mergingObject, message) so we flip args.
 */
module.exports = {
  info(message, meta) {
    meta ? pinoLogger.info(meta, message) : pinoLogger.info(message);
  },
  warn(message, meta) {
    meta ? pinoLogger.warn(meta, message) : pinoLogger.warn(message);
  },
  error(message, meta) {
    meta ? pinoLogger.error(meta, message) : pinoLogger.error(message);
  },
};
