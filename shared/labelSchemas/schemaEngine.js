/**
 * Schema Layout Engine — Shared Computation Layer
 *
 * Transforms a declarative layout schema + data row into a flat list of
 * positioned render instructions.  Both the backend (PDFKit) and frontend
 * (React) renderers consume these instructions so output is guaranteed to
 * be structurally identical.
 *
 * All coordinates are in millimetres (mm).
 * Font sizes are in typographic points (pt).
 */

/* ─── Text resolution ────────────────────────────────────────────────── */

/**
 * Resolve the display text for an element from a data row.
 *
 * Resolution order:
 *  1. `staticText`   – literal string (e.g. '<->')
 *  2. `resolveKeys`  – first non-empty value from an ordered key list
 *  3. `key`          – single data key
 *
 * If `conditional` is true and the resolved value is empty the element
 * is skipped entirely by the layout engine.
 */
export function resolveText(row, element) {
  if (element.staticText != null) return String(element.staticText);

  if (element.resolveKeys) {
    for (const k of element.resolveKeys) {
      const v = String(row[k] ?? '').trim();
      if (v) return (element.prefix || '') + v;
    }
    return '';
  }

  const raw = String(row[element.key] ?? '').trim();
  if (!raw && element.conditional) return '';
  return (element.prefix || '') + raw;
}

/* ─── Block computation — flow positioning ───────────────────────────── */

function computeFlowBlock(block, segmentYMm, row, pageMm) {
  const contentWidth = pageMm.widthMm * block.contentWidthRatio;
  const xMm = (pageMm.widthMm - contentWidth) / 2;
  let currentY = segmentYMm + (block.paddingTopMm || 0);

  const instructions = [];

  for (const el of block.elements) {
    const text = resolveText(row, el);
    if (el.conditional && !text) continue;

    instructions.push({
      type: 'text',
      id: el.id,
      text: text,
      xMm: xMm,
      yMm: currentY,
      widthMm: contentWidth,
      fontSizePt: el.fontSizePt,
      fontWeight: el.fontWeight || 'normal',
      align: el.align || 'center',
      decorator: el.decorator || null,
      decoratorColor: el.decoratorColor || null,
      decoratorThicknessMm: el.decoratorThicknessMm || null,
      decoratorGapMm: el.decoratorGapMm || null,
    });

    currentY += (el.heightMm || 0) + (el.spacingAfterMm || 0);
  }

  return instructions;
}

/* ─── Block computation — centered positioning ───────────────────────── */

function computeCenteredBlock(block, segmentYMm, segmentHeightMm, row, pageMm) {
  const contentWidth = pageMm.widthMm * block.contentWidthRatio;
  const xMm = (pageMm.widthMm - contentWidth) / 2;
  const yStart = segmentYMm + (segmentHeightMm - block.contentHeightMm) / 2;

  const instructions = [];

  for (const el of block.elements) {
    const text = resolveText(row, el);

    instructions.push({
      type: 'text',
      id: el.id,
      text: text,
      xMm: xMm,
      yMm: yStart + (el.offsetMm || 0),
      widthMm: contentWidth,
      fontSizePt: el.fontSizePt,
      fontWeight: el.fontWeight || 'normal',
      align: el.align || 'center',
    });
  }

  return instructions;
}

/* ─── QR segment computation ─────────────────────────────────────────── */

export function computeQrPayload(qrDef, row) {
  const lines = [];

  for (const field of qrDef.payloadFields) {
    if (field.resolveKeys) {
      for (const k of field.resolveKeys) {
        const v = String(row[k] ?? '').trim();
        if (v) { lines.push(v); break; }
      }
    } else if (field.key) {
      const v = String(row[field.key] ?? '').trim();
      if (v) lines.push((field.prefix || '') + v);
    }
  }

  return lines.join('\n');
}

function computeQrSegment(qrDef, segmentYMm, segmentHeightMm, row, pageMm) {
  const sizeMm = qrDef.sizeMm;
  const xMm = (pageMm.widthMm - sizeMm) / 2;
  const yMm = segmentYMm + (segmentHeightMm - sizeMm) / 2;

  return [{
    type: 'qr',
    payload: computeQrPayload(qrDef, row),
    xMm: xMm,
    yMm: yMm,
    sizeMm: sizeMm,
  }];
}

/* ─── Grid segment computation ───────────────────────────────────────── */

function computeGridSegment(gridSeg, row, pageMm) {
  const cellWidth = pageMm.widthMm / gridSeg.cols;
  const cellHeight = gridSeg.heightMm / gridSeg.rows;
  const card = gridSeg.card;

  const instructions = [];

  for (var r = 0; r < gridSeg.rows; r++) {
    for (var c = 0; c < gridSeg.cols; c++) {
      var cardXMm = c * cellWidth + (cellWidth - card.widthMm) / 2;
      var cardYMm = gridSeg.yMm + r * cellHeight + (cellHeight - card.heightMm) / 2;

      for (const el of card.elements) {
        var text = resolveText(row, el);

        instructions.push({
          type: 'text',
          id: el.id + '_r' + r + 'c' + c,
          text: text,
          xMm: cardXMm,
          yMm: cardYMm + (el.offsetMm || 0),
          widthMm: card.widthMm,
          fontSizePt: el.fontSizePt,
          fontWeight: el.fontWeight || 'normal',
          align: el.align || 'center',
        });
      }
    }
  }

  return instructions;
}

/* ═══ Main entry — compute full layout ═══════════════════════════════ */

/**
 * Compute the complete set of render instructions for a layout schema
 * and a data row.
 *
 * @param {Object} schema  – a layout schema from cableSchemas.js
 * @param {Object} row     – label data (aSide, zSide, portA, etc.)
 * @param {Object} [pageOverride] – optional { widthMm, heightMm } override
 * @returns {{ page, background, instructions }}
 */
export function computeLayout(schema, row, pageOverride) {
  var pageMm = pageOverride && pageOverride.widthMm
    ? { widthMm: pageOverride.widthMm, heightMm: pageOverride.heightMm }
    : schema.page;

  var safeRow = row && typeof row === 'object' ? row : {};
  var instructions = [];

  for (var i = 0; i < schema.segments.length; i++) {
    var segment = schema.segments[i];

    if (segment.type === 'block') {
      var block = segment.block;
      var blockInstr;

      if (block.positioning === 'centered') {
        blockInstr = computeCenteredBlock(block, segment.yMm, segment.heightMm, safeRow, pageMm);
      } else {
        blockInstr = computeFlowBlock(block, segment.yMm, safeRow, pageMm);
      }

      for (var b = 0; b < blockInstr.length; b++) instructions.push(blockInstr[b]);
    } else if (segment.type === 'divider') {
      instructions.push({
        type: 'divider',
        yMm: segment.yMm,
        style: segment.style || 'dashed',
        color: segment.color || '#94a3b8',
        widthMm: pageMm.widthMm,
      });
    } else if (segment.type === 'qr') {
      var qrInstr = computeQrSegment(segment.qr, segment.yMm, segment.heightMm, safeRow, pageMm);
      for (var q = 0; q < qrInstr.length; q++) instructions.push(qrInstr[q]);
    } else if (segment.type === 'grid') {
      var gridInstr = computeGridSegment(segment, safeRow, pageMm);
      for (var g = 0; g < gridInstr.length; g++) instructions.push(gridInstr[g]);
    }
  }

  return {
    page: pageMm,
    background: schema.background || [],
    instructions: instructions,
  };
}
