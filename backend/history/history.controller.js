const historyService = require('./history.service');
const { streamLabelPdf } = require('../app/services/labelEngine/pipeline');
const { env } = require('../app/config/env');
const { BadRequestError, NotFoundError, AppError } = require('../app/http/errors');
const { extractRequestMeta } = require('../app/shared/requestMeta');
const { resolveTemplate } = require('../app/shared/templateResolver');

exports.listHistory = (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        throw new BadRequestError('Missing session ID', 'MISSING_SESSION_ID');
    }
    const history = historyService.getHistory(sessionId);
    res.json({ history });
  } catch (err) {
    next(err);
  }
};

exports.listTeamHistory = (req, res, next) => {
  try {
    if (!env.historyTeamEnabled) {
        // Return clear signal that it's disabled, or just empty
        return res.json({ history: [], disabled: true });
    }
    const history = historyService.getTeamHistory();
    res.json({ history });
  } catch (err) {
    next(err);
  }
};

exports.getJob = (req, res, next) => {
  try {
    const job = historyService.getJob(req.params.id);
    if (!job) {
      throw new NotFoundError('Job not found', 'JOB_NOT_FOUND');
    }
    res.json({ job });
  } catch (err) {
    next(err);
  }
};

exports.resumeJob = (req, res, next) => {
  try {
    const jobId = req.params.id;
    const { resume_from } = req.body;
    
    const job = historyService.getJob(jobId);
    if (!job) {
      throw new NotFoundError('Job not found', 'JOB_NOT_FOUND');
    }

    const startIndex = Number(resume_from) || 0;
    const allRows = job.payload.rows || [];
    
    if (startIndex >= allRows.length) {
       throw new BadRequestError('Resume index out of bounds', 'INVALID_RESUME_INDEX');
    }

    // Slice rows for resume
    const rowsToPrint = allRows.slice(startIndex);
    
    // Resolve Template for Reprint/Resume via centralized resolver
    const moduleType = job.module_key || 'cable';
    const tid = job.payload.templateId || (job.payload.config && job.payload.config.templateId) || null;
    const template = resolveTemplate({
      templateId: tid,
      moduleType,
      layoutKey: job.payload.layout || null
    });

    const filename = `resume-job-${jobId}-${startIndex + 1}.pdf`;

    // Capture metadata for logging
    const { sessionId, displayName, ip, userAgent } = extractRequestMeta(req);

    streamLabelPdf(res, rowsToPrint, template, filename, next, {
      onComplete: () => {
        historyService.updateProgress(jobId, allRows.length, true);
        historyService.logEvent(sessionId, displayName, 'print_resumed', jobId, ip, userAgent);
      }
    });

  } catch (err) {
     if (!res.headersSent) {
        next(err);
     } else {
        console.error('Resume job error after headers sent:', err);
     }
  }
};
