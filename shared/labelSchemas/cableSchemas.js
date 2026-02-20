/**
 * Cable Label Layout Schemas — Single Source of Truth
 *
 * These declarative schemas define every visual property of each cable label
 * layout.  Both the backend PDF renderer (PDFKit) and the frontend preview
 * renderer (React) consume these schemas through the shared `schemaEngine`
 * so that preview and print output are *structurally identical*.
 *
 * Rules:
 *  - All dimensions are in millimetres (mm).
 *  - All font sizes are in typographic points (pt).
 *  - No rendering logic lives here — only data.
 *  - Coordinates are absolute from the page / segment origin.
 */

/* ─── Page ────────────────────────────────────────────────────────────── */

export const CABLE_PAGE = Object.freeze({ widthMm: 38.1, heightMm: 101.6 });
export const SEGMENT_HEIGHT_MM = 25.4; // Each printable segment = ¼ page height

/* ─── Layout A — Standard Cable ──────────────────────────────────────── */

export const LAYOUT_A_BLOCK = Object.freeze({
  contentWidthRatio: 0.92,
  paddingTopMm: 2.0,
  positioning: 'flow',
  elements: Object.freeze([
    {
      id: 'additionalText',
      resolveKeys: ['additionalText', 'serial', 'lineId'],
      fontSizePt: 6.2,
      fontWeight: 'bold',
      align: 'center',
      heightMm: 2.2,
      spacingAfterMm: 1.6,
      conditional: true,
      decorator: 'dividerLine',
      decoratorColor: '#000000',
      decoratorThicknessMm: 0.3,
      decoratorGapMm: 1.0,
    },
    {
      id: 'aSide',
      key: 'aSide',
      fontSizePt: 8,
      fontWeight: 'bold',
      align: 'center',
      heightMm: 2.8,
      spacingAfterMm: 1.2,
    },
    {
      id: 'portA',
      key: 'portA',
      prefix: 'Port ',
      fontSizePt: 6,
      fontWeight: 'normal',
      align: 'center',
      heightMm: 2.1,
      spacingAfterMm: 1.2,
      conditional: true,
    },
    {
      id: 'arrow',
      staticText: '<->',
      fontSizePt: 6.5,
      fontWeight: 'normal',
      align: 'center',
      heightMm: 2.3,
      spacingAfterMm: 1.2,
    },
    {
      id: 'zSide',
      key: 'zSide',
      fontSizePt: 8,
      fontWeight: 'bold',
      align: 'center',
      heightMm: 2.8,
      spacingAfterMm: 1.2,
    },
    {
      id: 'portB',
      key: 'portB',
      prefix: 'Port ',
      fontSizePt: 6,
      fontWeight: 'normal',
      align: 'center',
      heightMm: 2.1,
      spacingAfterMm: 0,
      conditional: true,
    },
  ]),
});

/* ─── Layout B — Compact Cable ───────────────────────────────────────── */

export const LAYOUT_B_BLOCK = Object.freeze({
  contentWidthRatio: 0.86,
  positioning: 'centered',
  contentHeightMm: 12.8,
  elements: Object.freeze([
    { id: 'aSide', key: 'aSide', fontSizePt: 7.6, fontWeight: 'bold', align: 'center', offsetMm: 0 },
    { id: 'arrow', staticText: '<->', fontSizePt: 6.6, fontWeight: 'normal', align: 'center', offsetMm: 4.2 },
    { id: 'zSide', key: 'zSide', fontSizePt: 7.6, fontWeight: 'bold', align: 'center', offsetMm: 8.5 },
  ]),
});

/* ─── Layout C — Grid Cable (2 × 2 cards) ────────────────────────────── */

export const LAYOUT_C_CARD = Object.freeze({
  widthMm: 16,
  heightMm: 13,
  elements: Object.freeze([
    { id: 'lineName', key: 'lineName', fontSizePt: 5.8, fontWeight: 'bold', align: 'center', offsetMm: 0 },
    { id: 'aSide', key: 'aSide', fontSizePt: 5.4, fontWeight: 'normal', align: 'center', offsetMm: 4.1 },
    { id: 'zSide', key: 'zSide', fontSizePt: 5.4, fontWeight: 'normal', align: 'center', offsetMm: 8.2 },
  ]),
});

/* ─── QR Segment payload definition ──────────────────────────────────── */

export const QR_SEGMENT_DEF = Object.freeze({
  sizeMm: 21,
  payloadFields: Object.freeze([
    { resolveKeys: ['additionalText', 'serial', 'lineId'] },
    { key: 'aSide', prefix: 'Device A: ' },
    { key: 'portA', prefix: 'Port A: ' },
    { key: 'zSide', prefix: 'Device B: ' },
    { key: 'portB', prefix: 'Port B: ' },
  ]),
});

/* ═══ Full Layout Schemas ═════════════════════════════════════════════ */

const DIVIDER_SEGMENT = Object.freeze({
  type: 'divider',
  yMm: SEGMENT_HEIGHT_MM,
  style: 'dashed',
  color: '#94a3b8',
});

const LAMINATE_BG = Object.freeze([
  { yMm: 50.8, heightMm: 50.8, color: '#f1f5f9' },
]);

export const LAYOUT_A = Object.freeze({
  id: 'layout-a',
  name: 'Standard Cable (A)',
  page: CABLE_PAGE,
  background: LAMINATE_BG,
  segments: Object.freeze([
    { type: 'block', yMm: 0, heightMm: SEGMENT_HEIGHT_MM, block: LAYOUT_A_BLOCK },
    DIVIDER_SEGMENT,
    { type: 'block', yMm: SEGMENT_HEIGHT_MM, heightMm: SEGMENT_HEIGHT_MM, block: LAYOUT_A_BLOCK },
  ]),
});

export const LAYOUT_A_QR = Object.freeze({
  id: 'layout-a-qr',
  name: 'Standard Cable Label + QR',
  page: CABLE_PAGE,
  background: LAMINATE_BG,
  segments: Object.freeze([
    { type: 'block', yMm: 0, heightMm: SEGMENT_HEIGHT_MM, block: LAYOUT_A_BLOCK },
    DIVIDER_SEGMENT,
    { type: 'qr', yMm: SEGMENT_HEIGHT_MM, heightMm: SEGMENT_HEIGHT_MM, qr: QR_SEGMENT_DEF },
  ]),
});

export const LAYOUT_B = Object.freeze({
  id: 'layout-b',
  name: 'Compact Cable (B)',
  page: CABLE_PAGE,
  background: [],
  segments: Object.freeze([
    { type: 'block', yMm: 0, heightMm: SEGMENT_HEIGHT_MM, block: LAYOUT_B_BLOCK },
    { type: 'block', yMm: SEGMENT_HEIGHT_MM, heightMm: SEGMENT_HEIGHT_MM, block: LAYOUT_B_BLOCK },
  ]),
});

export const LAYOUT_C = Object.freeze({
  id: 'layout-c',
  name: 'Grid Cable (C)',
  page: CABLE_PAGE,
  background: [],
  segments: Object.freeze([
    {
      type: 'grid',
      yMm: 0,
      heightMm: SEGMENT_HEIGHT_MM * 2,
      cols: 2,
      rows: 2,
      card: LAYOUT_C_CARD,
    },
  ]),
});

/* ─── Registry lookup helper ─────────────────────────────────────────── */

export const SCHEMA_MAP = Object.freeze({
  'layout-a': LAYOUT_A,
  'layout-a-qr': LAYOUT_A_QR,
  'layout-b': LAYOUT_B,
  'layout-c': LAYOUT_C,
});

export function getSchema(layoutSlug) {
  return SCHEMA_MAP[layoutSlug] || null;
}
