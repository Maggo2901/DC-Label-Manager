const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env, normalizeOrigin, isCorsOriginAllowed } = require('./config/env');
const { registerModules } = require('../modules');
const { notFoundHandler } = require('./http/notFoundHandler');
const { errorHandler } = require('./http/errorHandler');

function createCorsOptions() {
  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (isCorsOriginAllowed(normalizedOrigin, env.cors)) {
        return callback(null, true);
      }

      const corsError = new Error(`CORS origin blocked: ${normalizedOrigin || 'unknown origin'}`);
      corsError.code = 'CORS_BLOCKED';
      corsError.origin = normalizedOrigin || origin;
      corsError.allowed = env.cors.allowed;
      return callback(corsError);
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-display-name'],
    exposedHeaders: ['Content-Disposition', 'x-session-id']
  };
}

async function createApp() {
  const app = express();

  // Initialize Label Engine (Registry & Defaults) BEFORE routes
  const { initLabelEngine } = require('./services/labelEngine/init');
  await initLabelEngine();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: env.jsonLimit }));

  registerModules(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp
};
