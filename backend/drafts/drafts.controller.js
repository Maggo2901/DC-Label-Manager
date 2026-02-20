const db = require('../db');
const { BadRequestError } = require('../app/http/errors');

exports.saveDraft = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  const { mode, connections, payload } = req.body;

  if (!sessionId) {
    return next(new BadRequestError('Missing x-session-id header', 'MISSING_SESSION_ID'));
  }
  if (!mode) {
    return next(new BadRequestError('Missing mode', 'MISSING_MODE'));
  }

  // Determine payload to save
  let dataToSave;
  if (payload) {
      dataToSave = payload;
  } else if (connections) {
      // Legacy support or direct lists
      dataToSave = { connections };
  } else {
      return next(new BadRequestError('Missing payload or connections', 'MISSING_PAYLOAD'));
  }

  try {
    // Ensure session exists
    const sessionStmt = db.prepare('INSERT OR IGNORE INTO sessions (id) VALUES (?)');
    sessionStmt.run(sessionId);

    // Upsert draft
    const stmt = db.prepare(`
      INSERT INTO draft_connections (session_id, mode, payload, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(session_id, mode) DO UPDATE SET
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(sessionId, mode, JSON.stringify(dataToSave));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.loadDraft = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  const mode = req.query.mode;

  if (!sessionId) {
    return next(new BadRequestError('Missing x-session-id header', 'MISSING_SESSION_ID'));
  }
  if (!mode) {
    return next(new BadRequestError('Missing mode query param', 'MISSING_MODE_PARAM'));
  }

  try {
    const stmt = db.prepare('SELECT payload FROM draft_connections WHERE session_id = ? AND mode = ?');
    const row = stmt.get(sessionId, mode);

    if (row) {
      let data = JSON.parse(row.payload);
      // Normalize legacy array format to object
      if (Array.isArray(data)) {
          data = { connections: data, config: null };
      }
      res.json(data); // Returns { connections: [], config: {} }
    } else {
      res.json({ connections: [], config: null });
    }
  } catch (err) {
    next(err);
  }
};
