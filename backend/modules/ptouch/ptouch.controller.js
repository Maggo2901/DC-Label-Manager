const { streamTapePdf } = require('./ptouch.service');
const historyService = require('../../history/history.service');
const { extractRequestMeta } = require('../../app/shared/requestMeta');

function generateTapePdf(req, res, next) {
  try {
    const payload = req.body || {};
    const { sessionId, displayName, ip, userAgent } = extractRequestMeta(req);

    streamTapePdf(res, payload, {
      onComplete(result) {
        try {
          const jobId = historyService.createJob(
            sessionId,
            'ptouch',
            'tape',
            {
              tapeWidth: result.tapeWidth,
              labels: payload.labels || [],
              duplicateCount: payload.duplicateCount || 1,
            },
            result.count,
            displayName,
            `P-Touch ${result.tapeWidth}mm`,
            ip,
            userAgent
          );
          historyService.updateProgress(jobId, result.count, true);
          historyService.logEvent(sessionId, displayName, 'print_created', jobId, ip, userAgent);
          historyService.logEvent(sessionId, displayName, 'print_completed', jobId, ip, userAgent);
        } catch (err) {
          console.error('[PTouch] History recording failed:', err);
        }
      },
    });
  } catch (error) {
    if (!res.headersSent) next(error);
  }
}

module.exports = { generateTapePdf };
