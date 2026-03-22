const { listCableLayouts, validateCablePayload, buildCableRows } = require('./cable.service');
const { ValidationError, BadRequestError, NotFoundError, ConflictError } = require('../../app/http/errors');
const { sendError, sendSuccess } = require('../../app/http/response');
const logger = require('../../app/logger');
const { getLayout } = require('../../app/services/labelEngine/registry');
const historyService = require('../../history/history.service');
const { streamLabelPdf } = require('../../app/services/labelEngine/pipeline');
const { extractRequestMeta } = require('../../app/shared/requestMeta');
const { resolveTemplate } = require('../../app/shared/templateResolver');

function resolveHistoryMode(rawMode) {
  const mode = String(rawMode || '').trim().toLowerCase();

  if (mode === 'single' || mode === 'batch' || mode === 'excel') {
    return mode;
  }

  // Legacy aliases
  if (mode === 'serial' || mode === 'series') {
    return 'batch';
  }

  return 'single';
}

// GET /api/cable/layouts
function listLayouts(_req, res, next) {
  try {
    const layouts = listCableLayouts();
    return sendSuccess(res, { layouts });
  } catch (error) {
    next(error);
  }
}

// GET /api/cable/layouts/:id
function getLayoutDetails(req, res, next) {
  try {
    const layout = getLayout(req.params.id);
    if (!layout) {
        throw new NotFoundError(`Layout '${req.params.id}' not found`, 'CABLE_LAYOUT_NOT_FOUND');
    }
    return sendSuccess(res, { layout });
  } catch (error) {
    next(error);
  }
}

// POST /api/cable/generate
async function generateLabels(req, res, next) {
  try {
    const rawBody = req.body || {};
    const { layout, config } = validateCablePayload(rawBody);

    const rows =
      Array.isArray(rawBody.rows) && rawBody.rows.length > 0
        ? rawBody.rows
        : buildCableRows(layout.slug, config);

    const historyMode = resolveHistoryMode(rawBody.mode);
    const filenameMode = historyMode === 'excel' ? 'Excel' : historyMode === 'batch' ? 'Batch' : 'Single';
    const filename = `CableLabel_${filenameMode}_${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.pdf`;

    const { sessionId, displayName, ip, userAgent } = extractRequestMeta(req);

    const finalPayload = {
      layout: layout.slug,
      rows,
      config,
      mode: historyMode
    };

    // Resolve Template via centralized resolver
    const template = resolveTemplate({
      templateId: req.body.templateId,
      moduleType: 'cable'
    });

    // Stream PDF using new Engine
    streamLabelPdf(res, rows, template, filename, next, {
      onComplete: () => {
        const jobId = historyService.createJob(
          sessionId,
          'cable',
          historyMode,
          finalPayload,
          rows.length,
          displayName,
          null,
          ip,
          userAgent
        );

        historyService.updateProgress(jobId, rows.length, true);
        historyService.logEvent(sessionId, displayName, 'print_created', jobId, ip, userAgent);
        historyService.logEvent(sessionId, displayName, 'print_completed', jobId, ip, userAgent);
      }
    });

  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
    logger.error('Failed to generate cable labels after headers sent', { message: error?.message });
  }
}

module.exports = {
  listLayouts,
  getLayoutDetails,
  generateLabels
};
