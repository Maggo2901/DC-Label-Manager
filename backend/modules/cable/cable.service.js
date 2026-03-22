const { getLayout, listLayouts: registryListLayouts } = require('../../app/services/labelEngine/registry');
const { parseInteger, parseString } = require('../../app/shared/validation');
const { ValidationError } = require('../../app/http/errors');

const MAX_LABELS_PER_REQUEST = 2000;

function ensureCableLayout(slug) {
  const layout = getLayout(slug);
  if (!layout) {
    throw new ValidationError('Invalid cable layout', [{ path: ['layout'], message: 'Unknown layout' }]);
  }
  return layout;
}

function listCableLayouts() {
  return registryListLayouts().filter(l =>
    l.slug.startsWith('layout-') || l.slug === 'layout-a' || l.slug === 'layout-b' || l.slug === 'layout-c'
  );
}

function buildCableRows(layoutSlug, config) {
  const rows = [];

  for (let current = config.startNumber; current <= config.endNumber; current += config.step) {
    const index = rows.length;
    const paddedNum = String(current).padStart(config.padLength, '0');
    const serialSuffix = `${config.serialPrefix}${paddedNum}${config.serialSuffix}`;
    const lineId = `${config.linePrefix}${paddedNum}`;
    const portA = String(config.portAStart + index * config.portStep);
    const portB = String(config.portBStart + index * config.portStep);
    const additionalText = serialSuffix || '';

    if (layoutSlug === 'layout-a') {
      rows.push({
        aSide: `${config.aSideBase} ${portA}`,
        portA,
        zSide: `${config.zSideBase} ${portB}`,
        portB,
        additionalText,
        lineId
      });
      continue;
    }

    if (layoutSlug === 'layout-b') {
      rows.push({
        aSide: `${config.aSideBase} ${portA}`,
        zSide: `${config.zSideBase} ${portB}`,
        additionalText,
        lineId
      });
      continue;
    }

    // layout-c und andere
    rows.push({
      lineName: lineId,
      aSide: `${config.aSideBase} ${portA}`,
      zSide: `${config.zSideBase} ${portB}`,
      additionalText,
      lineId
    });
  }

  return rows;
}

const templatesService = require('../templates/templates.service');

function validateCablePayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const issues = [];
  
  let layoutSlug = payload.layout || payload.template;

  // If layout is missing but templateId is provided, try to resolve layout from template
  if (!layoutSlug && payload.templateId) {
      const template = templatesService.getById(payload.templateId);
      if (template) {
          layoutSlug = template.layoutKey;
      } else {
          const { NotFoundError } = require('../../app/http/errors');
          throw new NotFoundError(`Template ${payload.templateId} not found`, 'TEMPLATE_NOT_FOUND');
      }
  }

  // If still no layout, try default template
  if (!layoutSlug) {
       const def = templatesService.getDefault('cable');
       if (def) {
           layoutSlug = def.layoutKey;
       }
  }

  const layout = ensureCableLayout(layoutSlug);
  const input = payload.config && typeof payload.config === 'object' ? payload.config : {};

  // If rows are provided (Single/Excel mode), we don't strictly need batch config
  const isBatch = !payload.rows || !Array.isArray(payload.rows) || payload.rows.length === 0;
  const minLen = isBatch ? 1 : 0;

  const config = {
    startNumber: parseInteger(input.startNumber, { field: 'startNumber', min: 1, max: 999999, fallback: 1, issues }),
    endNumber: parseInteger(input.endNumber, { field: 'endNumber', min: 1, max: 999999, fallback: 120, issues }),
    step: parseInteger(input.step, { field: 'step', min: 1, max: 1000, fallback: 1, issues }),
    padLength: parseInteger(input.padLength, { field: 'padLength', min: 1, max: 8, fallback: 3, issues }),
    serialPrefix: parseString(input.serialPrefix, { field: 'serialPrefix', max: 24, fallback: '', issues }),
    serialSuffix: parseString(input.serialSuffix, { field: 'serialSuffix', max: 24, fallback: '', issues }),
    linePrefix: parseString(input.linePrefix, { field: 'linePrefix', max: 24, fallback: 'LINE-', issues }),
    aSideBase: parseString(input.aSideBase, { field: 'aSideBase', min: minLen, max: 64, issues }),
    zSideBase: parseString(input.zSideBase, { field: 'zSideBase', min: minLen, max: 64, issues }),
    portAStart: parseInteger(input.portAStart, { field: 'portAStart', min: 1, max: 99999, fallback: 1, issues }),
    portBStart: parseInteger(input.portBStart, { field: 'portBStart', min: 1, max: 99999, fallback: 1, issues }),
    portStep: parseInteger(input.portStep, { field: 'portStep', min: 0, max: 1000, fallback: 1, issues })
  };

  if (Number.isInteger(config.endNumber) && Number.isInteger(config.startNumber) && config.endNumber < config.startNumber) {
    issues.push({ path: ['endNumber'], message: 'endNumber must be >= startNumber' });
  }

  if (Number.isInteger(config.startNumber) && Number.isInteger(config.endNumber) && Number.isInteger(config.step)) {
    const count = Math.floor((config.endNumber - config.startNumber) / config.step) + 1;
    if (count < 1 || count > MAX_LABELS_PER_REQUEST) {
      issues.push({ path: ['endNumber'], message: `Batch size must be between 1 and ${MAX_LABELS_PER_REQUEST}` });
    }
  }

  if (issues.length > 0) {
    throw new ValidationError('Invalid cable payload', issues);
  }

  return { layout, config };
}

module.exports = {
  MAX_LABELS_PER_REQUEST,
  listCableLayouts,
  validateCablePayload,
  buildCableRows
};
