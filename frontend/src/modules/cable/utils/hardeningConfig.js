/**
 * Hardening Configuration for Cable Excel Mode
 */

// Max File Size: 10 MB
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Max Row Count
export const MAX_ROW_COUNT = 2000;

// Allowed Extensions
export const ALLOWED_EXTENSIONS = ['.xlsx'];

// Template Version - Must match value in template
export const TEMPLATE_VERSION = 'v1.0';

// Max Cell Lengths to prevent PDF overflow
export const CELL_LIMITS = {
  aSide: 100,
  portA: 20,
  zSide: 100,
  portB: 20,
  serial: 50,
  additionalText: 100
};
