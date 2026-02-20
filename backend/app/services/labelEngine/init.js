const { registerLayout } = require('./registry');
const { renderComputedLayout } = require('./schemaRenderer');

/**
 * Initialise the label engine.
 *
 * The shared layout schemas live in /shared/labelSchemas/ as ES Modules
 * (single source of truth for both frontend preview and backend PDF).
 * Since the backend is CommonJS we load them via dynamic import().
 */
async function initLabelEngine() {
  console.log('[LabelEngine] Initializing...');

  // ── Load shared ESM schemas ──────────────────────────────────────────
  const [schemas, engine] = await Promise.all([
    import('../../../../shared/labelSchemas/cableSchemas.js'),
    import('../../../../shared/labelSchemas/schemaEngine.js'),
  ]);

  const { LAYOUT_A, LAYOUT_A_QR, LAYOUT_B, LAYOUT_C } = schemas;
  const { computeLayout } = engine;

  // ── Helper: create a thin renderer closure ───────────────────────────
  const makeRenderer = (schema) => (doc, row, pageConfig) => {
    renderComputedLayout(doc, computeLayout(schema, row, pageConfig));
  };

  // 1. Register Layouts
  registerLayout('layout-a', makeRenderer(LAYOUT_A), {
    name: 'Standard Cable (A)',
    description: 'A/B port mapping with separate port lines.',
    pageDefaults: LAYOUT_A.page,
    previewColumns: ['A-Side', 'Port A', 'Z-Side', 'Port B', 'Line ID'],
    zones: { printHalfMm: 25.4 },
  });

  registerLayout('layout-a-qr', makeRenderer(LAYOUT_A_QR), {
    name: 'Standard Cable Label + QR',
    description: 'Standard A layout with QR code at bottom.',
    pageDefaults: LAYOUT_A_QR.page,
    previewColumns: ['A-Side', 'Port A', 'Z-Side', 'Port B', 'Line ID'],
    zones: { printHalfMm: 25.4 },
  });

  registerLayout('layout-b', makeRenderer(LAYOUT_B), {
    name: 'Compact Cable (B)',
    description: 'Compact A/Z endpoint layout with inline port mapping.',
    pageDefaults: LAYOUT_B.page,
    previewColumns: ['A-Side', 'Z-Side', 'Line ID'],
    zones: { printHalfMm: 25.4 },
  });

  registerLayout('layout-c', makeRenderer(LAYOUT_C), {
    name: 'Grid Cable (C)',
    description: 'Four-up compact card layout with line name and endpoints.',
    pageDefaults: LAYOUT_C.page,
    previewColumns: ['Line Name', 'A-Side', 'Z-Side'],
    zones: { printHalfMm: 25.4 },
  });

  // 2. Register Default Templates
  console.log('[LabelEngine] Templates are managed via DB.');

  // 3. Self-Healing: Seed Defaults if missing
  try {
    const templatesService = require('../../../modules/templates/templates.service');
    const seeded = templatesService.seedDefaults();
    if (seeded) {
      console.log('[LabelEngine] Default templates seeded.');
    }
  } catch (err) {
    console.error('[LabelEngine] Failed to seed defaults:', err);
  }

  console.log('[LabelEngine] Initialization complete.');
}

module.exports = {
  initLabelEngine,
};
