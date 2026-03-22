const { ValidationError } = require('../../app/http/errors');
const { getTemplate, listTemplates } = require('./templateLibrary.registry');

function parseText(value, field, max, issues) {
  const parsed = String(value || '').trim();
  if (parsed.length > max) {
    issues.push({ path: [field], message: `Maximum ${max} characters` });
  }
  return parsed;
}

function listLibraryTemplates() {
  return listTemplates();
}

function validateTemplatePayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const issues = [];

  const template = getTemplate(payload.templateId);
  if (!template) {
    issues.push({ path: ['templateId'], message: 'Unknown template ID' });
  }

  const location = parseText(payload.location, 'location', 80, issues);
  const requestedBy = parseText(payload.requestedBy, 'requestedBy', 60, issues);
  const note = parseText(payload.note, 'note', 160, issues);

  if (!location) {
    issues.push({ path: ['location'], message: 'location is required' });
  }

  if (!requestedBy) {
    issues.push({ path: ['requestedBy'], message: 'requestedBy is required' });
  }

  if (issues.length > 0) {
    throw new ValidationError('Invalid template payload', issues);
  }

  return {
    template,
    payload: {
      location,
      requestedBy,
      note
    }
  };
}

module.exports = {
  listLibraryTemplates,
  validateTemplatePayload
};
