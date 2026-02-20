const TEMPLATES = {
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance',
    subtitle: 'Scheduled maintenance in progress',
    accentColor: '#f59e0b',
    textColor: '#111827'
  },
  'do-not-touch': {
    id: 'do-not-touch',
    name: 'Do Not Touch',
    subtitle: 'Authorized personnel only',
    accentColor: '#dc2626',
    textColor: '#111827'
  },
  'temporary-install': {
    id: 'temporary-install',
    name: 'Temporary Install',
    subtitle: 'Temporary deployment - review required',
    accentColor: '#2563eb',
    textColor: '#111827'
  }
};

function getTemplate(templateId) {
  return TEMPLATES[String(templateId || '').trim()] || null;
}

function listTemplates() {
  return Object.values(TEMPLATES).map((template) => ({
    id: template.id,
    name: template.name,
    subtitle: template.subtitle
  }));
}

module.exports = {
  getTemplate,
  listTemplates
};
