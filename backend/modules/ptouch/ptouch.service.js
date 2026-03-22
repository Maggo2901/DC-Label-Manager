const { ValidationError } = require('../../app/http/errors');
const { createPdfDocument, mmToPt, setPdfDownloadHeaders } = require('../../app/shared/pdfService');

/* ─── Constants ─── */
const PRESET_WIDTHS_MM    = [9, 12, 16, 20, 24];
const MIN_TAPE_WIDTH      = 3;
const MAX_TAPE_WIDTH      = 36;
const MIN_FONT_SIZE_PT    = 6;
const MAX_LABELS          = 500;
const H_PADDING_MM        = 5;
const MIN_LABEL_WIDTH_MM  = 20;

/* ─── Validation ─── */

function validatePayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const issues = [];

  const tapeWidth = Number(payload.tapeWidth);
  if (
    Number.isNaN(tapeWidth) ||
    !Number.isFinite(tapeWidth) ||
    tapeWidth < MIN_TAPE_WIDTH ||
    tapeWidth > MAX_TAPE_WIDTH
  ) {
    issues.push({
      path: ['tapeWidth'],
      message: `Tape width must be between ${MIN_TAPE_WIDTH} and ${MAX_TAPE_WIDTH} mm`
    });
  }

  const labels = Array.isArray(payload.labels)
    ? payload.labels.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  if (labels.length < 1) {
    issues.push({
      path: ['labels'],
      message: 'Provide at least one non-empty label'
    });
  }

  if (labels.length > MAX_LABELS) {
    issues.push({
      path: ['labels'],
      message: `Maximum ${MAX_LABELS} lines are allowed`
    });
  }

  labels.forEach((line, idx) => {
    if (line.length > 120) {
      issues.push({
        path: ['labels', idx],
        message: 'Label line is too long (max 120 chars)'
      });
    }
  });

  /* duplicateCount – optional, defaults to 1 */
  let duplicateCount = 1;
  if (payload.duplicateCount != null) {
    duplicateCount = Number(payload.duplicateCount);
    if (
      Number.isNaN(duplicateCount) ||
      !Number.isInteger(duplicateCount) ||
      duplicateCount < 1 ||
      duplicateCount > 50
    ) {
      issues.push({
        path: ['duplicateCount'],
        message: 'duplicateCount must be an integer between 1 and 50'
      });
      duplicateCount = 1;
    }
  }

  if (issues.length > 0) {
    throw new ValidationError('Invalid P-Touch payload', issues);
  }

  return { tapeWidth, labels, duplicateCount };
}

/* ─── Layout helpers ─── */

function computeBaseFontSize(tapeHeightPt) {
  return Math.max(MIN_FONT_SIZE_PT, Math.min(26, tapeHeightPt * 0.52));
}

function fitFontSize(doc, text, preferredSize, maxWidthPt) {
  let size = preferredSize;
  while (size > MIN_FONT_SIZE_PT) {
    if (doc.fontSize(size).widthOfString(text) <= maxWidthPt) break;
    size -= 0.5;
  }
  return Math.max(MIN_FONT_SIZE_PT, size);
}

/* ─── PDF Generation ─── */

/**
 * Stream a P-Touch PDF to the HTTP response.
 *
 * Output: one PDF page per label.
 *   Page height = tape width.
 *   Page width  = dynamically calculated from text content.
 *
 * @param {Object}   res              Express response
 * @param {Object}   payload          Raw request body
 * @param {Object}   [options]
 * @param {Function} [options.onComplete]  Called with result after stream finishes
 * @returns {{ count: number, tapeWidth: number, filename: string }}
 */
function streamTapePdf(res, payload, options = {}) {
  const { tapeWidth, labels, duplicateCount } = validatePayload(payload);
  const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;

  /* Expand duplicates into flat list */
  const expanded = [];
  for (const text of labels) {
    for (let c = 0; c < duplicateCount; c++) expanded.push(text);
  }

  const doc          = createPdfDocument();
  const tapeHeightPt = mmToPt(tapeWidth);
  const hPadPt       = mmToPt(H_PADDING_MM);
  const minCellPt    = mmToPt(MIN_LABEL_WIDTH_MM);
  const baseFontSize = computeBaseFontSize(tapeHeightPt);

  /* Response headers + pipe */
  const ts    = new Date().toISOString().replace(/[:.]/g, '-');
  const fname = `PTouch_Labels_${tapeWidth}mm_${ts}.pdf`;
  setPdfDownloadHeaders(res, fname);
  doc.pipe(res);

  /* Completion hook (registered before render to avoid race) */
  const result = { count: expanded.length, tapeWidth, filename: fname };
  if (onComplete) {
    res.once('finish', () => {
      try { onComplete(result); } catch (e) {
        console.error('[PTouch] onComplete hook error:', e);
      }
    });
  }

  /* One page per label */
  doc.font('Helvetica');
  expanded.forEach((text) => {
    const textW = doc.fontSize(baseFontSize).widthOfString(text);
    const pageW = Math.max(minCellPt, textW + hPadPt * 2);
    const avail = pageW - hPadPt * 2;
    const fSize = fitFontSize(doc, text, baseFontSize, avail);

    doc.addPage({ size: [pageW, tapeHeightPt], margin: 0 });
    doc.rect(0, 0, pageW, tapeHeightPt).fill('#FFFFFF');

    const lineH = doc.font('Helvetica').fontSize(fSize).currentLineHeight(true);
    const yText = (tapeHeightPt - lineH) / 2;

    doc
      .font('Helvetica')
      .fontSize(fSize)
      .fillColor('#000000')
      .text(text, hPadPt, yText, {
        width: avail,
        align: 'center',
        lineBreak: false,
      });
  });

  doc.end();
  return result;
}

module.exports = { PRESET_WIDTHS_MM, streamTapePdf };
