import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import CableLabelTemplate from './CableLabelTemplate';
import { CABLE_BASE_LAYOUT_LABEL } from '../../../shared/labels/layoutDimensions';

const CSS_PX_PER_MM = 96 / 25.4;

function mmToPx(mm) {
  const n = Number(mm);
  if (!Number.isFinite(n) || n <= 0) {
    return 0;
  }
  return n * CSS_PX_PER_MM;
}

const CableLabelQRTemplate = forwardRef(({ row, scale = 1, showFrame = true }, ref) => {
  const page = {
    widthMm: Number(CABLE_BASE_LAYOUT_LABEL?.widthMm) || 38.1,
    heightMm: Number(CABLE_BASE_LAYOUT_LABEL?.heightMm) || 101.6
  };
  const qrSizeMm = 21;
  const qrSizePx = Math.max(1, Math.round(mmToPx(qrSizeMm)));

  console.log('[VERIFY][PREVIEW] CableLabelQRTemplate render file: frontend/src/modules/cable/components/CableLabelQRTemplate.jsx');
  console.log('[VERIFY][PREVIEW] CableLabelQRTemplate component render');
  console.log('[VERIFY][PREVIEW] page size mm:', page.widthMm, page.heightMm);
  console.log('[VERIFY][PREVIEW] qr size mm/px:', qrSizeMm, qrSizePx);

  return (
    <CableLabelTemplate
      ref={ref}
      row={row}
      scale={scale}
      showFrame={showFrame}
      renderBottom={({ additionalText }) => {
        console.log('[VERIFY][PREVIEW] layout-a-qr renderBottom executed');
        const qrPayload = [
          additionalText,
          row?.aSide ? `Device A: ${row.aSide}` : '',
          row?.portA ? `Port A: ${row.portA}` : '',
          row?.zSide ? `Device B: ${row.zSide}` : '',
          row?.portB ? `Port B: ${row.portB}` : ''
        ].filter(Boolean).join('\n');

        return (
          <div className="flex h-full items-center justify-center text-center">
            {qrPayload ? (
              <QRCodeSVG
                value={qrPayload}
                size={qrSizePx}
                style={{ width: '21mm', height: '21mm' }}
                level="M"
              />
            ) : (
              <div
                className="flex items-center justify-center border border-dashed border-slate-400 text-[10px] text-slate-600"
                style={{ width: '21mm', height: '21mm', padding: '1mm' }}
              >
                QR Code will be generated in PDF
              </div>
            )}
          </div>
        );
      }}
    />
  );
});

CableLabelQRTemplate.displayName = 'CableLabelQRTemplate';

export default CableLabelQRTemplate;
