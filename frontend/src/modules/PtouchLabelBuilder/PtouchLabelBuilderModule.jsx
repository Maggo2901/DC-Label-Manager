import { useMemo, useState } from 'react';
import { FileDown, Layers, Plus, Printer, Trash2 } from 'lucide-react';
import { ptouchApi } from '../../shared/api/platformApi';
import { saveBlob } from '../../shared/utils/blob';

const WIDTH_OPTIONS = [9, 12, 16, 20, 24];
const DEFAULT_LABELS = ['Router-01', 'Switch-A', 'Device-5', 'PatchPanel-24'];

function estimateFontPx(tapeWidthMm, text, availableWidthPx) {
  const preferred = Math.max(10, Math.min(36, tapeWidthMm * 1.45));
  const content = String(text || '');
  if (!content) return preferred;

  let size = preferred;
  while (size > 8) {
    const estimated = content.length * size * 0.55;
    if (estimated <= availableWidthPx) break;
    size -= 0.5;
  }
  return size;
}

const PtouchLabelBuilderModule = () => {
  const [tapeWidth, setTapeWidth] = useState(12);
  const [inputValue, setInputValue] = useState('');
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const preview = useMemo(() => {
    const blockHeight = Math.max(36, tapeWidth * 2.7);
    const gap = 14;
    const baseFont = Math.max(11, Math.min(24, tapeWidth * 1.35));
    const hPadding = 22;
    const maxEstimatedWidth = labels.reduce((max, line) => {
      return Math.max(max, String(line || '').length * baseFont * 0.55);
    }, 160);
    const stripWidth = Math.max(220, Math.min(760, Math.round(maxEstimatedWidth + hPadding * 2)));
    return {
      blockHeight,
      gap,
      stripWidth,
      hPadding
    };
  }, [labels, tapeWidth]);

  const onAddLabel = () => {
    const value = inputValue.trim();
    if (!value) return;
    setLabels((prev) => [...prev, value]);
    setInputValue('');
    setError('');
  };

  const onDeleteLabel = (index) => {
    setLabels((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onGeneratePdf = async () => {
    setError('');
    if (labels.length === 0) {
      setError('Please add at least one label.');
      return;
    }

    setLoading(true);
    try {
      const { blob, filename } = await ptouchApi.generate({
        tapeWidth,
        labels
      });
      saveBlob(blob, filename || `PTouch_Labels_${tapeWidth}mm.pdf`);
    } catch (apiError) {
      setError(apiError.message || 'Failed to generate P-Touch PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)_260px] gap-4">
        <section className="flex min-h-0 flex-col dc-panel p-4">
          <div className="mb-3 flex items-center gap-2 text-slate-200">
            <Printer className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold">P-Touch Settings</h3>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500">Tape Width</p>
            <div className="grid grid-cols-5 gap-1.5 rounded-lg border border-slate-700 bg-slate-800 p-1">
              {WIDTH_OPTIONS.map((size) => {
                const active = tapeWidth === size;
                return (
                  <button
                    key={size}
                    onClick={() => setTapeWidth(size)}
                    className={`rounded-md px-1 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {size}mm
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Add Label</p>
            <div className="flex items-center gap-2">
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onAddLabel();
                  }
                }}
                placeholder="Type label text"
                className="dc-input h-10"
              />
              <button
                onClick={onAddLabel}
                className="dc-btn-secondary h-10 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Labels ({labels.length})</p>
            <div className="min-h-0 flex-1 space-y-2 overflow-auto rounded-lg border border-slate-700 bg-slate-800/50 p-2">
              {labels.length === 0 ? (
                <div className="flex h-full min-h-[80px] items-center justify-center text-sm text-slate-500">
                  No labels added.
                </div>
              ) : (
                labels.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-2"
                  >
                    <span className="truncate text-sm text-slate-200">{label}</span>
                    <button
                      onClick={() => onDeleteLabel(index)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300"
                      title="Delete label"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={onGeneratePdf}
            disabled={loading}
            className="dc-btn-primary mt-4 h-10 w-full"
          >
            <FileDown className="h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Tape PDF'}
          </button>

          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        </section>

        <section className="min-h-0 dc-panel">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-200">Live Tape Preview</h3>
              <p className="text-xs text-slate-500">Label-per-page preview ({tapeWidth}mm tape, {labels.length} labels)</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="flex min-h-full items-start justify-center rounded-lg border border-slate-800/80 bg-slate-950/60 p-6">
                {labels.length === 0 ? (
                  <div className="flex min-h-[200px] w-full items-center justify-center text-sm text-slate-500">
                    Add labels to preview.
                  </div>
                ) : (
                  <div
                    className="rounded-md border border-slate-300 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
                    style={{ width: `${preview.stripWidth}px` }}
                  >
                    {labels.map((line, index) => {
                      const textWidth = preview.stripWidth - preview.hPadding * 2;
                      const fontSize = estimateFontPx(tapeWidth, line, textWidth);
                      return (
                        <div
                          key={`${line}-${index}`}
                          className="flex items-center justify-center border border-slate-200 text-black"
                          style={{
                            height: `${preview.blockHeight}px`,
                            marginBottom: index === labels.length - 1 ? 0 : `${preview.gap}px`,
                            paddingLeft: `${preview.hPadding}px`,
                            paddingRight: `${preview.hPadding}px`,
                            fontSize: `${fontSize}px`,
                            lineHeight: 1,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span className="block max-w-full overflow-hidden text-ellipsis">{line}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col dc-panel p-4">
          <div className="mb-3 flex items-center gap-2 text-slate-300">
            <Layers className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold">Future Panel</h3>
          </div>
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-500">
            Reserved for upcoming P-Touch features:
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Import from CSV/XLSX</li>
              <li>Font presets</li>
              <li>Cut mark options</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PtouchLabelBuilderModule;
