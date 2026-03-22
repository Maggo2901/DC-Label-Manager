const {
  listLibraryTemplates,
  validateTemplatePayload
} = require('./templateLibrary.service');
const {
  PAGE,
  streamTemplateLibraryPdf
} = require('./templateLibrary.pdf');
const { ValidationError } = require('../../app/http/errors');
const { sendError, sendSuccess } = require('../../app/http/response');
const logger = require('../../app/logger');

function listTemplates(req, res, next) {
  try {
    return sendSuccess(res, {
      page: PAGE,
      templates: listLibraryTemplates()
    });
  } catch (error) {
    next(error);
  }
}

function generateTemplate(req, res, next) {
  try {
    const { template, payload } = validateTemplatePayload(req.body || {});

    streamTemplateLibraryPdf({
      res,
      template,
      payload,
      filename: `template-${template.id}.pdf`
    });

    return undefined;
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
    logger.error('Failed to generate template library PDF after headers sent', { message: error?.message });
  }
}

module.exports = {
  listTemplates,
  generateTemplate
};
