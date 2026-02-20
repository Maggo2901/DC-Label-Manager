const { ValidationError } = require('../../app/http/errors');
const { createPdfDocument, mmToPt, setPdfDownloadHeaders } = require('../../app/shared/pdfService');

const PRESET_WIDTHS_MM = [9, 12, 16, 20, 24];
const MIN_TAPE_WIDTH = 3;
const MAX_TAPE_WIDTH = 36;
const MIN_FONT_SIZE_PT = 6;
const MAX_LABELS = 500;
const H_PADDING_MM = 5;

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

  return {
    tapeWidth,
    labels,
    duplicateCount
  };
}

function computeLayout(doc, tapeWidth, labelText) {
  const pageHeightPt = mmToPt(tapeWidth);
  const hPaddingPt = mmToPt(H_PADDING_MM);
  const baseFontSize = Math.max(MIN_FONT_SIZE_PT, Math.min(26, pageHeightPt * 0.52));

  doc.font('Helvetica');
  const textWidthPt = doc.fontSize(baseFontSize).widthOfString(labelText);
  const pageWidthPt = Math.max(mmToPt(20), textWidthPt + hPaddingPt * 2);

  return {
    hPaddingPt,
    baseFontSize,
    pageWidthPt,
    pageHeightPt
  };
}

function fitFontSize(doc, text, preferredSize, maxWidthPt) {
  let size = preferredSize;
  while (size > MIN_FONT_SIZE_PT) {
    const width = doc.fontSize(size).widthOfString(text);
    if (width <= maxWidthPt) {
      break;
    }
    size -= 0.5;
  }
  return Math.max(MIN_FONT_SIZE_PT, size);
}

function streamTapePdf(res, payload) {
  const { tapeWidth, labels, duplicateCount } = validatePayload(payload);
  const doc = createPdfDocument();
  const nowIso = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `PTouch_Labels_${tapeWidth}mm_${nowIso}.pdf`;

  setPdfDownloadHeaders(res, filename);
  doc.pipe(res);

  labels.forEach((text) => {
    const layout = computeLayout(doc, tapeWidth, text);
    const availableWidth = layout.pageWidthPt - layout.hPaddingPt * 2;
    const fontSize = fitFontSize(doc, text, layout.baseFontSize, availableWidth);

    /* Repeat each label duplicateCount times (default 1) */
    for (let copy = 0; copy < duplicateCount; copy++) {
      doc.addPage({
        size: [layout.pageWidthPt, layout.pageHeightPt],
        margin: 0
      });

      doc.rect(0, 0, layout.pageWidthPt, layout.pageHeightPt).fill('#FFFFFF');

      const lineHeight = doc.font('Helvetica').fontSize(fontSize).currentLineHeight(true);
      const textY = (layout.pageHeightPt - lineHeight) / 2;

      doc
        .font('Helvetica')
        .fontSize(fontSize)
        .fillColor('#000000')
        .text(text, layout.hPaddingPt, textY, {
          width: availableWidth,
          align: 'center',
          lineBreak: false
        });
    }
  });

  doc.end();

  return {
    count: labels.length * duplicateCount,
    tapeWidth
  };
}

module.exports = {
  PRESET_WIDTHS_MM,
  streamTapePdf
};
