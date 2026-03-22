/**
 * Label Engine Registry
 * Manages available layouts and templates.
 */

const layouts = new Map();
const templates = new Map();

/**
 * Register a layout renderer
 * @param {string} key - Unique layout key (e.g. 'cable_layout_a')
 * @param {Function} renderer - Function(doc, row, config)
 * @param {Object} metadata - { name, description, pageDefaults }
 */
function registerLayout(key, renderer, metadata = {}) {
  if (layouts.has(key)) {
    console.warn(`[LabelRegistry] Overwriting layout: ${key}`);
  }
  layouts.set(key, { renderer, ...metadata });
}

/**
 * Get a layout renderer
 * @param {string} key 
 */
function getLayout(key) {
  return layouts.get(key);
}

/**
 * Register a label template
 * @param {Object} template 
 */
const { ValidationError } = require('../../http/errors');

/**
 * Register a label template
 * @param {Object} template 
 */
function registerTemplate(template) {
  if (!template.id) throw new ValidationError("Template must have an ID", [{path: ['id'], message: 'Missing ID'}]);
  templates.set(template.id, template);
}

/**
 * Get a template by ID
 * @param {string} id 
 */
function getTemplate(id) {
  return templates.get(id);
}

/**
 * List all templates
 * @param {string} moduleType - Optional filter
 */
function listTemplates(moduleType) {
  const all = Array.from(templates.values());
  if (moduleType) {
    return all.filter(t => t.moduleType === moduleType);
  }
  return all;
}

/**
 * List all registered layouts
 * @returns {Array<{key: string, name: string, description: string, pageDefaults: Object}>}
 */
function listLayouts() {
  const result = [];
  for (const [key, value] of layouts.entries()) {
    result.push({
      slug: key,
      name: value.name || key,
      description: value.description || '',
      pageDefaults: value.pageDefaults || {},
      zones: value.zones || {},
      previewColumns: value.previewColumns || []
    });
  }
  return result;
}

module.exports = {
  registerLayout,
  getLayout,
  listLayouts,
  registerTemplate,
  getTemplate,
  listTemplates
};
