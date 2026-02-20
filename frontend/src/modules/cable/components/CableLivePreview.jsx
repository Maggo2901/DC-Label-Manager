import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Grid3X3, Maximize2, Ruler
} from 'lucide-react';
import LabelPreview from '../../../components/labels/LabelPreview';
import { CABLE_BASE_LAYOUT_LABEL, CABLE_BASE_LAYOUT_MM } from '../../../shared/labels/layoutDimensions';

/* ─── Constants ─────────────────────────────────────────────── */
const MM_TO_PX = 96 / 25.4; // CSS spec: 1in = 96px → 1mm ≈ 3.7795px
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

/* ─── Grid overlay (pure CSS background, won't affect PDF) ── */
function GridOverlay({ widthMm, heightMm, scale }) {
  const gridSpacingMm = 5; // 5mm grid
  const w = widthMm * MM_TO_PX * scale;
  const h = heightMm * MM_TO_PX * scale;
  const gap = gridSpacingMm * MM_TO_PX * scale;

  return (
    <div
      className="pointer-events-none absolute rounded"
      style={{
        width: w,
        height: h,
        backgroundImage:
          `linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px),
           linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)`,
        backgroundSize: `${gap}px ${gap}px`,
        zIndex: 10,
      }}
    />
  );
}

/* ─── Dimension badge ───────────────────────────────────────── */
function DimensionBadge({ widthMm, heightMm }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2.5 py-1 border border-slate-700/60">
      <Ruler className="h-3 w-3 text-slate-500" />
      <span className="text-[11px] font-mono text-slate-400 select-none">
        {widthMm} × {heightMm} mm
      </span>
    </div>
  );
}

/* ─── Toolbar button helper ────────────────────────────────── */
function ToolbarToggle({ active, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? 'bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/40'
          : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
      }`}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CableLivePreview – Premium Label Preview
   ═══════════════════════════════════════════════════════════════ */
export default function CableLivePreview({
  activeItem,
  activeIndex,
  totalItems,
  onNavigate,
  layoutSlug,
  layoutDefinition,
  previewHint = 'Live Preview',
}) {
  const layoutName = layoutDefinition?.label || layoutSlug || 'Unknown Layout';
  const labelW = CABLE_BASE_LAYOUT_MM.width;
  const labelH = CABLE_BASE_LAYOUT_MM.height;

  /* ── State ──────────────────────────────────────────────── */
  const containerRef = useRef(null);
  const [autoFitScale, setAutoFitScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(100); // 50-200
  const [actualSize, setActualSize] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  /* ── Auto-fit calculation ───────────────────────────────── */
  const recalcAutoFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const labelWPx = labelW * MM_TO_PX;
    const labelHPx = labelH * MM_TO_PX;
    const pad = 0.88;
    const sx = (cw * pad) / labelWPx;
    const sy = (ch * pad) / labelHPx;
    setAutoFitScale(Math.min(sx, sy));
  }, [labelW, labelH]);

  useEffect(() => {
    recalcAutoFit();
    const ro = new ResizeObserver(recalcAutoFit);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recalcAutoFit);
    return () => { ro.disconnect(); window.removeEventListener('resize', recalcAutoFit); };
  }, [recalcAutoFit]);

  /* ── Derived scale ──────────────────────────────────────── */
  const effectiveScale = useMemo(() => {
    if (actualSize) return 1; // 1:1 CSS mm rendering
    return autoFitScale * (zoomPercent / 100);
  }, [actualSize, autoFitScale, zoomPercent]);

  /* ── Zoom helpers ───────────────────────────────────────── */
  const handleZoomChange = (val) => {
    setActualSize(false);
    setZoomPercent(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(val))));
  };

  const resetZoom = () => {
    setActualSize(false);
    setZoomPercent(100);
  };

  const toggleActualSize = () => {
    setActualSize((prev) => !prev);
  };

  return (
    <div className="flex h-full flex-col gap-0">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col items-center gap-2 pb-2">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Label Preview{' '}
          <span className="text-slate-500 font-normal">({layoutName})</span>
        </h3>

        {/* Pagination pill */}
        <div className="flex items-center gap-3 rounded-full bg-slate-800/60 px-4 py-1.5 border border-slate-700/50">
          <button
            onClick={() => onNavigate('prev')}
            disabled={totalItems <= 1}
            className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[100px] text-center text-xs font-mono font-medium text-emerald-400 select-none">
            {previewHint ||
              (activeIndex === -1
                ? 'LIVE INPUT'
                : `ITEM ${activeIndex + 1} OF ${totalItems}`)}
          </span>
          <button
            onClick={() => onNavigate('next')}
            disabled={totalItems <= 1}
            className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Toolbar ──────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-3 rounded-t-xl border border-b-0 border-slate-800 bg-slate-900/80 px-3 py-2">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoomChange(zoomPercent - ZOOM_STEP)}
            disabled={actualSize || zoomPercent <= ZOOM_MIN}
            className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors p-1"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={actualSize ? 100 : zoomPercent}
            onChange={(e) => handleZoomChange(e.target.value)}
            disabled={actualSize}
            className="w-24 accent-indigo-500 cursor-pointer disabled:opacity-40"
            title={`Zoom: ${zoomPercent}%`}
          />

          <button
            onClick={() => handleZoomChange(zoomPercent + ZOOM_STEP)}
            disabled={actualSize || zoomPercent >= ZOOM_MAX}
            className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors p-1"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={resetZoom}
            disabled={actualSize}
            className="text-[10px] font-mono text-slate-400 hover:text-white disabled:opacity-40 min-w-[40px] text-center transition-colors"
            title="Reset zoom to 100%"
          >
            {actualSize ? '1:1' : `${zoomPercent}%`}
          </button>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-1.5">
          <ToolbarToggle
            active={actualSize}
            onClick={toggleActualSize}
            title="Actual Size (1:1)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </ToolbarToggle>

          <ToolbarToggle
            active={showGrid}
            onClick={() => setShowGrid((v) => !v)}
            title="Toggle grid overlay"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </ToolbarToggle>
        </div>
      </div>

      {/* ─── Main Preview Area ────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 overflow-auto dc-panel rounded-t-none border-t-0 flex items-center justify-center"
      >
        {!activeItem ? (
          <div className="text-slate-600 flex flex-col items-center gap-2">
            <p className="text-sm">No preview available</p>
            <p className="text-xs text-slate-700">Enter label data to see a live preview</p>
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Grid overlay */}
            {showGrid && (
              <GridOverlay
                widthMm={labelW}
                heightMm={labelH}
                scale={effectiveScale}
              />
            )}

            <LabelPreview
              type="cable"
              layoutSlug={layoutSlug}
              row={activeItem}
              hint={activeIndex === -1 ? 'Live Preview' : `Item ${activeIndex + 1}`}
              scale={effectiveScale}
              frameless={true}
            />
          </div>
        )}

        {/* Actual-size indicator */}
        {actualSize && (
          <div className="absolute top-2 right-2 rounded bg-amber-600/90 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide select-none">
            Actual Size
          </div>
        )}
      </div>

      {/* ─── Footer: Dimensions ───────────────────────────── */}
      <div className="shrink-0 flex items-center justify-center gap-3 pt-2">
        <DimensionBadge widthMm={labelW} heightMm={labelH} />
        <span className="text-[10px] text-slate-600 uppercase tracking-widest select-none">
          {layoutDefinition?.page || CABLE_BASE_LAYOUT_LABEL}
        </span>
      </div>
    </div>
  );
}
