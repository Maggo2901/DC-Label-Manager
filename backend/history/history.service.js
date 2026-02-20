const db = require('../db');
const { env } = require('../app/config/env');

exports.createJob = (sessionId, moduleKey, mode, payload, totalLabels, displayName = null, title = null, ip = null, userAgent = null) => {
  const stmt = db.prepare(`
    INSERT INTO print_jobs (session_id, module_key, mode, payload, total_labels, printed_until, display_name, title, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `);
  const info = stmt.run(sessionId, moduleKey, mode, JSON.stringify(payload), totalLabels, displayName, title, ip, userAgent);
  return info.lastInsertRowid;
};

exports.updateProgress = (jobId, printedUntil, completed = false) => {
  const completedAt = completed ? new Date().toISOString() : null;
  if (completed) {
      const stmt = db.prepare('UPDATE print_jobs SET printed_until = ?, completed_at = ? WHERE id = ?');
      stmt.run(printedUntil, completedAt, jobId);
  } else {
      const stmt = db.prepare('UPDATE print_jobs SET printed_until = ? WHERE id = ?');
      stmt.run(printedUntil, jobId);
  }
};

exports.logEvent = (sessionId, displayName, action, referenceId, ip, userAgent) => {
    try {
        const stmt = db.prepare(`
            INSERT INTO audit_logs (session_id, display_name, action, reference_id, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(sessionId, displayName, action, referenceId, ip, userAgent);
    } catch (e) {
        console.error("Failed to log audit event", e);
    }
};

// "My History" - scoped to session
exports.getHistory = (sessionId, limit = 50) => {
  const stmt = db.prepare(`
    SELECT id, session_id, module_key, mode, total_labels, printed_until, created_at, completed_at, display_name, title, ip_address, user_agent
    FROM print_jobs 
    WHERE session_id = ?
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  return stmt.all(sessionId, limit);
};

// "Team History" - global, if enabled
exports.getTeamHistory = (limit = 100) => {
  if (!env.historyTeamEnabled) return [];
  
  const stmt = db.prepare(`
    SELECT id, session_id, module_key, mode, total_labels, printed_until, created_at, completed_at, display_name, title, ip_address, user_agent
    FROM print_jobs 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  return stmt.all(limit);
};

exports.getJob = (id) => {
  const stmt = db.prepare('SELECT * FROM print_jobs WHERE id = ?');
  const job = stmt.get(id);
  if (job) {
    job.payload = JSON.parse(job.payload);
  }
  return job;
};

// OPTIONAL: Cleanup old records
exports.cleanup = () => {
    try {
        if (env.draftRetentionDays > 0) {
            db.prepare(`DELETE FROM draft_connections WHERE updated_at < datetime('now', '-' || ? || ' days')`).run(String(env.draftRetentionDays));
        }
        if (env.historyRetentionDays > 0) {
            const days = String(env.historyRetentionDays);
            db.prepare(`DELETE FROM print_jobs WHERE created_at < datetime('now', '-' || ? || ' days')`).run(days);
            db.prepare(`DELETE FROM audit_logs WHERE created_at < datetime('now', '-' || ? || ' days')`).run(days);
        }
    } catch (e) {
        console.error("Cleanup failed", e);
    }
};

// Run cleanup on startup
let _cleanupTimeout = setTimeout(exports.cleanup, 5000);
let _cleanupInterval = setInterval(exports.cleanup, 6 * 60 * 60 * 1000); // Every 6 hours

exports.shutdown = () => {
    clearTimeout(_cleanupTimeout);
    clearInterval(_cleanupInterval);
    _cleanupTimeout = null;
    _cleanupInterval = null;
};
