function toInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

const LOCAL_DEV_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/
];

function normalizeOrigin(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
}

function parseOriginList(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => normalizeOrigin(item))
    .filter((item) => item && item !== '*');
}

function isDevLoopbackOrigin(origin) {
  return LOCAL_DEV_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function buildCorsConfig({ rawOrigins, nodeEnv }) {
  const configuredOrigins = Array.from(new Set(parseOriginList(rawOrigins)));
  const configuredOriginSet = new Set(configuredOrigins);
  const hasConfiguredOrigins = configuredOrigins.length > 0;
  const isProduction = nodeEnv === 'production';
  const allowAllOrigins = !hasConfiguredOrigins;
  const allowDevLoopback = !isProduction && hasConfiguredOrigins;
  const allowed = allowAllOrigins
    ? ['*']
    : isProduction
      ? configuredOrigins
      : [
          ...configuredOrigins,
          'http://localhost:<any-port>',
          'http://127.0.0.1:<any-port>'
        ];

  return {
    configuredOrigins,
    configuredOriginSet,
    allowAllOrigins,
    allowDevLoopback,
    allowed
  };
}

function isCorsOriginAllowed(origin, corsConfig) {
  if (!origin || corsConfig.allowAllOrigins) {
    return true;
  }

  if (corsConfig.configuredOriginSet.has(origin)) {
    return true;
  }

  if (corsConfig.allowDevLoopback && isDevLoopbackOrigin(origin)) {
    return true;
  }

  return false;
}

const nodeEnv = String(process.env.NODE_ENV || 'development').trim() || 'development';
const cors = buildCorsConfig({
  rawOrigins: process.env.CORS_ORIGIN,
  nodeEnv
});

const env = {
  nodeEnv,
  host: process.env.HOST || '0.0.0.0',
  port: toInt(process.env.PORT, 3000),
  jsonLimit: process.env.JSON_LIMIT || '512kb',
  cors,
  historyTeamEnabled: process.env.HISTORY_TEAM_ENABLED !== 'false', // Default true now
  draftRetentionDays: toInt(process.env.DRAFT_RETENTION_DAYS, 7),
  historyRetentionDays: toInt(process.env.HISTORY_RETENTION_DAYS, 30)
};

module.exports = {
  normalizeOrigin,
  isCorsOriginAllowed,
  env
};
