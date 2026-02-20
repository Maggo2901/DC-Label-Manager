const express = require('express');
const { convertTimestamp } = require('./time.service');
const { sendSuccess, sendError } = require('../../../app/http/response');

const router = express.Router();

router.post('/convert', (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const result = convertTimestamp({
      timestamp: payload.timestamp,
      sourceTz: payload.source_tz || payload.sourceTz || 'UTC',
      targetTz: payload.target_tz || payload.targetTz || 'Europe/Berlin'
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, 400, 'TIME_CONVERT_FAILED', error.message || 'Time conversion failed');
  }
});

module.exports = router;
