/**
 * Request Metadata Extraction
 * Extracts session, identity, and client info from Express requests.
 */

/**
 * Extract common request metadata used for history/audit logging.
 * @param {Object} req - Express request object
 * @returns {{ sessionId: string, displayName: string|null, ip: string, userAgent: string }}
 */
function extractRequestMeta(req) {
  const sessionId = req.headers['x-session-id'] || 'unknown';

  // Decode URI-encoded display name sent by the frontend
  let displayName = null;
  const rawDisplayName = req.headers['x-display-name'];
  if (rawDisplayName) {
    try {
      displayName = decodeURIComponent(rawDisplayName);
    } catch {
      displayName = rawDisplayName;
    }
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  return { sessionId, displayName, ip, userAgent };
}

module.exports = {
  extractRequestMeta
};
