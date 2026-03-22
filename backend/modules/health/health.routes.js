const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../../db');
const router = express.Router();

router.get('/', (_req, res) => {
  const checks = { db: false, disk: false };

  // DB connectivity check
  try {
    const row = db.prepare('SELECT 1 AS ok').get();
    checks.db = row && row.ok === 1;
  } catch {
    checks.db = false;
  }

  // Disk write access check
  try {
    const storageDir = path.join(__dirname, '..', '..', 'storage');
    const probe = path.join(storageDir, '.healthcheck');
    fs.writeFileSync(probe, Date.now().toString());
    fs.unlinkSync(probe);
    checks.disk = true;
  } catch {
    checks.disk = false;
  }

  const passed = [checks.db, checks.disk].filter(Boolean).length;
  const status = passed === 2 ? 'healthy' : passed === 0 ? 'unhealthy' : 'degraded';
  const httpStatus = status === 'healthy' ? 200 : 503;

  res.status(httpStatus).json({
    success: status === 'healthy',
    service: 'dc-label-manager-api',
    status,
    checks,
  });
});

module.exports = router;
