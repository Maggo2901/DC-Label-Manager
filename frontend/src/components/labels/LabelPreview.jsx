/**
 * LabelPreview — Unified preview component
 *
 * Cable layouts are rendered by the shared schema engine + SchemaPreview,
 * guaranteeing structural parity with PDF output.
 */

import { useMemo } from 'react';
import { computeLayout, getSchema } from '../../shared/labels/labelSchemas';
import SchemaPreview from '../../shared/labels/SchemaPreview';

const panelClass = 'rounded-xl border border-slate-800 bg-slate-900/60 p-4';

function PreviewFrame({ title, children, hint }) {
  return (
    <div className={panelClass}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
      <div className="flex min-h-0 items-center justify-center">{children}</div>
    </div>
  );
}

function TemplatePreview({ row, template }) {
  return (
    <div className="relative flex aspect-[148/105] w-full max-w-[520px] flex-col overflow-hidden border border-slate-500 bg-white text-black shadow-sm">
      <div className="px-4 py-3" style={{ backgroundColor: template?.accentColor || '#f59e0b' }}>
        <div className="text-lg font-bold tracking-wide text-white">{String(template?.name || 'Template').toUpperCase()}</div>
        <div className="text-xs text-slate-100">{template?.subtitle || 'Operational notice'}</div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-2 px-4 py-3 text-sm">
        <div>
          <div className="text-[11px] font-semibold uppercase text-slate-500">Location</div>
          <div>{row?.location || '-'}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase text-slate-500">Requested By</div>
          <div>{row?.requestedBy || '-'}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase text-slate-500">Note</div>
          <div className="text-xs">{row?.note || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}

export default function LabelPreview({ type, row, layoutSlug = 'layout-a', template, hint, frameless = false, scale = 1 }) {
  const containerStyle = scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: 'center' } : {};

  // Compute layout from shared schema (memoised for perf)
  const computed = useMemo(() => {
    if (type !== 'cable') return null;
    const schema = getSchema(layoutSlug);
    if (!schema) return null;
    return computeLayout(schema, row || {});
  }, [type, layoutSlug, row]);

  if (type === 'cable') {
    const title = `Cable Label Preview (${String(layoutSlug).toUpperCase()})`;

    const content = computed
      ? <SchemaPreview computed={computed} showFrame={!frameless} />
      : <div className="text-xs text-slate-500">Unknown layout: {layoutSlug}</div>;

    if (frameless) {
      return <div style={containerStyle}>{content}</div>;
    }

    return (
      <PreviewFrame title={title} hint={hint}>
        <div style={containerStyle}>{content}</div>
      </PreviewFrame>
    );
  }

  if (type === 'template') {
    if (frameless) return <div style={containerStyle}><TemplatePreview row={row} template={template} /></div>;
    return (
      <PreviewFrame title="Template Preview" hint={hint}>
        <div style={containerStyle}><TemplatePreview row={row} template={template} /></div>
      </PreviewFrame>
    );
  }

  return null;
}
