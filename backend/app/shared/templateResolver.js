/**
 * Template Resolution Utility
 * Centralized logic for resolving a label template by ID, layout, or default.
 */
const templatesService = require('../../modules/templates/templates.service');
const { BadRequestError, ConflictError } = require('../http/errors');

/**
 * Resolve a template for PDF generation.
 * @param {Object} opts
 * @param {number|string} [opts.templateId] - Explicit template ID
 * @param {string} opts.moduleType - Module type ('cable', 'rack', etc.)
 * @param {string} [opts.layoutKey] - Fallback layout key for legacy resolution
 * @returns {Object} Resolved template object
 * @throws {BadRequestError|ConflictError}
 */
function resolveTemplate({ templateId, moduleType, layoutKey }) {
  // 1. Explicit template ID
  if (templateId) {
    const template = templatesService.getById(templateId);
    if (!template) {
      throw new BadRequestError('Invalid templateId provided.', 'TEMPLATE_NOT_FOUND');
    }
    if (template.moduleType !== moduleType) {
      throw new BadRequestError(
        `Template does not belong to ${moduleType} module.`,
        'TEMPLATE_MODULE_MISMATCH'
      );
    }
    return template;
  }

  // 2. Fallback by layout key (legacy jobs)
  if (layoutKey) {
    const template = templatesService.getByLayout(layoutKey, moduleType);
    if (template) {
      return template;
    }
  }

  // 3. Default template for module
  const defaultTemplate = templatesService.getDefault(moduleType);
  if (defaultTemplate) {
    return defaultTemplate;
  }

  throw new ConflictError(
    `No default template found for ${moduleType}. Please configure a template.`,
    'NO_DEFAULT_TEMPLATE'
  );
}

module.exports = {
  resolveTemplate
};
