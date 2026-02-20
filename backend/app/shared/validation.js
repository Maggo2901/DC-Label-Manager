/**
 * Shared Validation Utilities
 * Centralized parsing/validation helpers used across modules.
 */

/**
 * Parse and validate an integer value.
 * @param {*} value - Raw input value
 * @param {Object} opts
 * @param {string} opts.field - Field name for error reporting
 * @param {number} opts.min - Minimum allowed value
 * @param {number} opts.max - Maximum allowed value
 * @param {number} [opts.fallback] - Default value when input is empty
 * @param {Array} opts.issues - Array to push validation issues into
 * @returns {number|null}
 */
function parseInteger(value, { field, min, max, fallback, issues }) {
  const candidate = value === undefined || value === null || value === '' ? fallback : value;
  const parsed = Number(candidate);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    issues.push({ path: [field], message: `Expected integer in range ${min}..${max}` });
    return null;
  }

  return parsed;
}

/**
 * Parse and validate a string value.
 * @param {*} value - Raw input value
 * @param {Object} opts
 * @param {string} opts.field - Field name for error reporting
 * @param {number} [opts.min=0] - Minimum string length
 * @param {number} opts.max - Maximum string length
 * @param {string} [opts.fallback=''] - Default value when input is empty
 * @param {Array} opts.issues - Array to push validation issues into
 * @returns {string}
 */
function parseString(value, { field, min = 0, max, fallback = '', issues }) {
  const parsed = value === undefined || value === null ? fallback : String(value).trim();
  if (parsed.length < min || parsed.length > max) {
    issues.push({ path: [field], message: `Expected string length ${min}..${max}` });
    return '';
  }
  return parsed;
}

module.exports = {
  parseInteger,
  parseString
};
