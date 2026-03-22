import React, { forwardRef } from 'react';
import { CABLE_BASE_PREVIEW_STYLE } from '../../../shared/labels/layoutDimensions';

const CableLabelTemplate = forwardRef(({ row, scale = 1, showFrame = true, renderBottom }, ref) => {
  const containerStyle = scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: 'top left' } : {};
  const additionalText = String(row?.additionalText || row?.serial || row?.lineId || '').trim();

  // INLINE STYLES FOR RELIABLE EXPORT (html2canvas)
  const fontStyle = { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' };
  
  const blockText = (
    <>
      {additionalText && (
        <div className="flex w-full items-center px-3">
          <div className="flex-1" style={{ height: '1px', backgroundColor: '#94a3b8' }}></div>
          <div className="tracking-wider leading-none uppercase whitespace-nowrap" 
               style={{ ...fontStyle, fontSize: '2.2mm', fontWeight: 700, color: '#334155', margin: '0 4px' }}>
            {additionalText}
          </div>
          <div className="flex-1" style={{ height: '1px', backgroundColor: '#94a3b8' }}></div>
        </div>
      )}
      <div className="leading-none" 
           style={{ ...fontStyle, fontSize: '2.8mm', fontWeight: 600, marginTop: additionalText ? '1.6mm' : '0' }}>
        {row?.aSide}
      </div>
      <div className="leading-none" style={{ ...fontStyle, fontSize: '2.1mm', marginTop: '1.2mm' }}>
        Port {row?.portA}
      </div>
      <div className="leading-none" style={{ ...fontStyle, fontSize: '2.3mm', marginTop: '1.2mm' }}>
        &lt;-&gt;
      </div>
      <div className="leading-none" 
           style={{ ...fontStyle, fontSize: '2.8mm', fontWeight: 600, marginTop: '1.2mm' }}>
        {row?.zSide}
      </div>
      <div className="leading-none" style={{ ...fontStyle, fontSize: '2.1mm', marginTop: '1.2mm' }}>
        Port {row?.portB}
      </div>
    </>
  );

  return (
    <div 
        ref={ref}
        id="label-capture-target"
        className={`relative overflow-hidden bg-white text-black leading-none ${showFrame ? 'shadow-sm' : ''}`} 
        style={{
            ...CABLE_BASE_PREVIEW_STYLE, 
            ...containerStyle,
            ...fontStyle,
            border: showFrame ? '1px solid #64748b' : 'none'
        }}
    >
      {/* Backgrounds */}
      <div className="absolute left-0 w-full" 
           style={{ top: '50.8mm', height: '50.8mm', backgroundColor: '#f1f5f9' }} />
      
      {/* Cut Line */}
      <div className="absolute left-0 w-full border-t border-dashed" 
           style={{ top: '25.4mm', borderTopWidth: '0.2mm', borderColor: '#94a3b8' }} />
      
      {/* Top Label */}
      <div className="absolute left-0 top-0 w-full" style={{ height: '25.4mm' }}>
        <div className="flex h-full flex-col items-center justify-center text-center">{blockText}</div>
      </div>
      
      {/* Bottom Label (Duplicate) */}
      <div className="absolute left-0 w-full" style={{ top: '25.4mm', height: '25.4mm' }}>
        {typeof renderBottom === 'function'
          ? renderBottom({ row, additionalText, fontStyle, blockText })
          : <div className="flex h-full flex-col items-center justify-center text-center">{blockText}</div>}
      </div>
    </div>
  );
});

CableLabelTemplate.displayName = 'CableLabelTemplate';

export default CableLabelTemplate;
