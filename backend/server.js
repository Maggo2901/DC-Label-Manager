const { createApp } = require('./app/createApp');
const { env } = require('./app/config/env');
const logger = require('./app/logger');
const db = require('./db');
const historyService = require('./history/history.service');

async function startServer() {
  const app = await createApp();
  const server = app.listen(env.port, env.host, () => {
    logger.info('DC Label Platform API running', {
      host: env.host,
      port: env.port,
      nodeEnv: env.nodeEnv
    });
  });

  server.on('error', (error) => {
    logger.error('Server runtime error', {
      message: error?.message,
      code: error?.code
    });
    gracefulShutdown(server, 1);
  });

  return server;
}

function gracefulShutdown(server, code = 0) {
  logger.info('Shutting down gracefully...');
  historyService.shutdown();
  server.close(() => {
    try { db.close(); } catch (_) {}
    logger.info('Server closed.');
    process.exit(code);
  });
  // Force exit after 5s if connections hang
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(code);
  }, 5000).unref();
}

startServer()
  .then((server) => {
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
  })
  .catch((error) => {
    logger.error('Failed to start server', {
      message: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  });
