/**
 * SchemaPreview — Unified Label Preview Renderer (React)
 *
 * Renders the same computed layout instructions that the backend PDF
 * renderer uses, ensuring pixel-perfect structural parity between the
 * on-screen preview and the printed PDF output.
 *
 * All positioning uses CSS `mm` units and font sizes use CSS `pt` so that
 * the spatial relationships are identical to PDFKit's coordinate model.
 */

import { QRCodeSVG } from 'qrcode.react';

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const CSS_PX_PER_MM = 96 / 25.4;

/* ─── Instruction renderers ─────────────────────────────────────────── */

function TextInstruction({ instr }) {
  const style = {
    position: 'absolute',
    left: `${instr.xMm}mm`,
    top: `${instr.yMm}mm`,
    width: `${instr.widthMm}mm`,
    fontSize: `${instr.fontSizePt}pt`,
    fontWeight: instr.fontWeight === 'bold' ? 700 : 400,
    fontFamily: FONT_FAMILY,
    textAlign: instr.align || 'center',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    color: '#000000',
  };

  if (instr.decorator === 'dividerLine') {
    const lineColor = instr.decoratorColor || '#000000';
    const lineHeight = `${instr.decoratorThicknessMm || 0.3}mm`;
    const lineGap = `${instr.decoratorGapMm || 1.0}mm`;
    const lineStyle = { flex: 1, minWidth: 0, height: lineHeight, backgroundColor: lineColor };

    // Empty text → single continuous line (matches PDF behaviour)
    if (!instr.text) {
      return (
        <div style={style}>
          <div style={{ ...lineStyle, flex: 'none', width: '100%' }} />
        </div>
      );
    }

    return (
      <div style={style}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={lineStyle} />
          <span
            style={{
              flexShrink: 0,
              marginLeft: lineGap,
              marginRight: lineGap,
            }}
          >
            {instr.text}
          </span>
          <div style={lineStyle} />
        </div>
      </div>
    );
  }

  return <div style={style}>{instr.text}</div>;
}

function DividerInstruction({ instr }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: `${instr.yMm}mm`,
        width: '100%',
        borderTop: `0.2mm ${instr.style || 'dashed'} ${instr.color || '#94a3b8'}`,
      }}
    />
  );
}

function QrInstruction({ instr }) {
  const sizePx = Math.round(instr.sizeMm * CSS_PX_PER_MM);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${instr.xMm}mm`,
        top: `${instr.yMm}mm`,
        width: `${instr.sizeMm}mm`,
        height: `${instr.sizeMm}mm`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {instr.payload ? (
        <QRCodeSVG
          value={instr.payload}
          size={sizePx}
          style={{ width: '100%', height: '100%' }}
          level="M"
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '1px dashed #94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '7pt',
            color: '#64748b',
            fontFamily: FONT_FAMILY,
          }}
        >
          QR
        </div>
      )}
    </div>
  );
}

/* ═══ Main component ════════════════════════════════════════════════ */

/**
 * Render a computed layout (from schemaEngine.computeLayout) as a React
 * preview that mirrors the PDF output.
 *
 * @param {Object}  props.computed   - { page, background, instructions }
 * @param {boolean} props.showFrame  - show border / shadow (default true)
 */
export default function SchemaPreview({ computed, showFrame = true }) {
  const { page, background, instructions } = computed;

  const pageStyle = {
    position: 'relative',
    width: `${page.widthMm}mm`,
    height: `${page.heightMm}mm`,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    fontFamily: FONT_FAMILY,
    border: showFrame ? '1px solid #64748b' : 'none',
    boxShadow: showFrame ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
  };

  return (
    <div style={pageStyle}>
      {/* Background regions (e.g. laminate zone) */}
      {background.map((bg, i) => (
        <div
          key={`bg-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            top: `${bg.yMm}mm`,
            width: '100%',
            height: `${bg.heightMm}mm`,
            backgroundColor: bg.color,
          }}
        />
      ))}

      {/* Render instructions */}
      {instructions.map((instr, i) => {
        switch (instr.type) {
          case 'text':
            return <TextInstruction key={`i-${i}`} instr={instr} />;
          case 'divider':
            return <DividerInstruction key={`i-${i}`} instr={instr} />;
          case 'qr':
            return <QrInstruction key={`i-${i}`} instr={instr} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
