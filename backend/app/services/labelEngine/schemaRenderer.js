/**
 * Schema-Driven PDFKit Renderer
 *
 * Renders pre-computed layout instructions (from schemaEngine.computeLayout)
 * into a PDFKit document.  This is the *only* place where PDFKit draw calls
 * are issued for schema-based layouts, ensuring a single rendering code path.
 */

'use strict';

const { addMmPage, mmToPt } = require('../../shared/pdfService');

let QRCode;
try { QRCode = require('qrcode'); } catch (_) { /* optional */ }

const FONT_MAP = {
  bold: 'Helvetica-Bold',
  normal: 'Helvetica',
};

/* ─── QR matrix helper ───────────────────────────────────────────────── */

function drawQrMatrix(doc, text, xMm, yMm, sizeMm) {
  if (!text || !QRCode) return;

  const qr = QRCode.create(text, { errorCorrectionLevel: 'M', margin: 0 });
  const modules = qr.modules;
  const moduleCount = modules.size;
  const moduleMm = sizeMm / moduleCount;

  doc.save();
  doc.fillColor('#ffffff');
  doc.rect(mmToPt(xMm), mmToPt(yMm), mmToPt(sizeMm), mmToPt(sizeMm)).fill();

  doc.fillColor('#000000');
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules.data[row * moduleCount + col]) {
        doc.rect(
          mmToPt(xMm + col * moduleMm),
          mmToPt(yMm + row * moduleMm),
          mmToPt(moduleMm),
          mmToPt(moduleMm),
        ).fill();
      }
    }
  }
  doc.restore();
}

/* ─── Decorator helper — dividerLine ─────────────────────────────────── */

/**
 * Draw text with flanking horizontal lines (e.g. ── LINE-001 ──).
 *
 * Font/size is set exactly once and shared between measurement and draw
 * so the two can never drift.  All coordinates are in pt (mm→pt conversion
 * happens here via mmToPt).
 */
function drawDividerLineDecorator(doc, instr) {
  const font = FONT_MAP[instr.fontWeight] || 'Helvetica';
  const textStr = String(instr.text || '');

  // Lock font/size — shared by widthOfString AND text()
  doc.font(font).fontSize(instr.fontSizePt);

  const regionXPt  = mmToPt(instr.xMm);
  const regionWPt  = mmToPt(instr.widthMm);
  const gapPt      = mmToPt(instr.decoratorGapMm || 1.0);
  const lineColor  = instr.decoratorColor || '#000000';
  const lineW      = Math.max(mmToPt(instr.decoratorThicknessMm || 0.3), 0.5); // min 0.5 pt
  const lineMidYPt = mmToPt(instr.yMm) + instr.fontSizePt * 0.45;

  if (textStr) {
    // Measure with the already-locked font state
    const textWidth  = doc.widthOfString(textStr);
    const centerXPt  = regionXPt + regionWPt / 2;
    const textLeftPt = centerXPt - textWidth / 2;
    const textRightPt = centerXPt + textWidth / 2;

    // Left line — clamp to 0 if text is too wide
    const leftLineEnd = textLeftPt - gapPt;
    if (leftLineEnd > regionXPt) {
      doc.save();
      doc.strokeColor(lineColor).lineWidth(lineW)
        .moveTo(regionXPt, lineMidYPt)
        .lineTo(leftLineEnd, lineMidYPt)
        .stroke();
      doc.restore();
    }

    // Right line — clamp to 0 if text is too wide
    const rightLineStart = textRightPt + gapPt;
    const regionEndPt = regionXPt + regionWPt;
    if (rightLineStart < regionEndPt) {
      doc.save();
      doc.strokeColor(lineColor).lineWidth(lineW)
        .moveTo(rightLineStart, lineMidYPt)
        .lineTo(regionEndPt, lineMidYPt)
        .stroke();
      doc.restore();
    }

    // Draw text — font/size already set above, just set fill color
    doc.fillColor('#000000')
      .text(textStr, mmToPt(instr.xMm), mmToPt(instr.yMm), {
        width: mmToPt(instr.widthMm),
        align: 'center',
        lineBreak: false,
      });
  } else {
    // Empty text → draw a single centered line (no gap)
    doc.save();
    doc.strokeColor(lineColor).lineWidth(lineW)
      .moveTo(regionXPt, lineMidYPt)
      .lineTo(regionXPt + regionWPt, lineMidYPt)
      .stroke();
    doc.restore();
  }
}

/* ═══ Main renderer ══════════════════════════════════════════════════ */

/**
 * Render a computed layout to a PDFKit document page.
 *
 * @param {PDFDocument} doc       – PDFKit document instance
 * @param {Object}      computed  – output of schemaEngine.computeLayout()
 */
function renderComputedLayout(doc, computed) {
  // Add a page with exact mm dimensions
  addMmPage(doc, { widthMm: computed.page.widthMm, heightMm: computed.page.heightMm });

  for (const instr of computed.instructions) {
    switch (instr.type) {
      case 'text': {
        if (instr.decorator === 'dividerLine') {
          drawDividerLineDecorator(doc, instr);
        } else {
          const font = FONT_MAP[instr.fontWeight] || 'Helvetica';
          doc
            .font(font)
            .fontSize(instr.fontSizePt)
            .fillColor('#000000')
            .text(String(instr.text || ''), mmToPt(instr.xMm), mmToPt(instr.yMm), {
              width: mmToPt(instr.widthMm),
              align: instr.align || 'center',
              lineBreak: false,
            });
        }
        break;
      }

      case 'divider': {
        doc.save();
        if (instr.style === 'dashed') {
          doc.dash(mmToPt(1), { space: mmToPt(1) });
        }
        doc
          .moveTo(0, mmToPt(instr.yMm))
          .lineTo(mmToPt(instr.widthMm), mmToPt(instr.yMm))
          .strokeColor(instr.color || '#94a3b8')
          .lineWidth(0.5)
          .stroke();
        doc.restore();
        break;
      }

      case 'qr': {
        drawQrMatrix(doc, instr.payload, instr.xMm, instr.yMm, instr.sizeMm);
        break;
      }

      default:
        break;
    }
  }
}

module.exports = { renderComputedLayout };
