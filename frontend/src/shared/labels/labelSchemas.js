/**
 * Label Schemas — ESM re-exports
 *
 * The canonical schema definitions live in /shared/labelSchemas/ as ES
 * Modules.  This file re-exports them so frontend components can import
 * from a single, short path.
 */

// ─── Schema definitions ─────────────────────────────────────────────────
export {
  CABLE_PAGE,
  SEGMENT_HEIGHT_MM,
  LAYOUT_A,
  LAYOUT_A_QR,
  LAYOUT_B,
  LAYOUT_C,
  SCHEMA_MAP,
  getSchema,
} from '@labelSchemas/cableSchemas';

// ─── Engine ─────────────────────────────────────────────────────────────
export {
  computeLayout,
  computeQrPayload,
  resolveText,
} from '@labelSchemas/schemaEngine';
