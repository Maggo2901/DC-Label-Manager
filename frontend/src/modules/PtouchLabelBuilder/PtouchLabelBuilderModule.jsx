import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, Copy, FileDown, Hash, Layers, Pencil, Plus, Printer, Trash2, X } from 'lucide-react';
import { ptouchApi } from '../../shared/api/platformApi';
import { saveBlob } from '../../shared/utils/blob';

/* ───── constants ───── */
const WIDTH_PRESETS = [9, 12, 16, 20, 24];
const TAPE_MIN = 3;
const TAPE_MAX = 36;

/* ───── helpers ───── */

let _nextId = 1;

/** Create a label entry with full metadata. */
function createLabelEntry(text, source, tapeWidth, repeatCount) {
  return {
    id: _nextId++,
    text,
    creationSource: source,       // "manual" | "range"
    tapeWidth,
    createdAt: Date.now(),
    repeatCount: repeatCount ?? 1,
  };
}

/** Format timestamp compactly. */
function fmtTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/* ──────────────────────────────────────────────────────────── */

const PtouchLabelBuilderModule = () => {
  /* ── tape width ── */
  const [tapeWidth, setTapeWidth] = useState(12);
  const [customWidthInput, setCustomWidthInput] = useState('');
  const isCustomWidth = !WIDTH_PRESETS.includes(tapeWidth);

  const applyCustomWidth = useCallback((raw) => {
    const v = parseInt(raw, 10);
    if (!Number.isNaN(v) && v >= TAPE_MIN && v <= TAPE_MAX) {
      setTapeWidth(v);
    }
  }, []);

  /* ── labels (rich entries) ── */
  const [inputValue, setInputValue] = useState('');
  const [labels, setLabels] = useState([]);

  /* ── selection ── */
  const [selectedIds, setSelectedIds] = useState(new Set());

  /* ── inline editing ── */
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRepeat, setEditRepeat] = useState(1);

  /* ── range generator ── */
  const [rangeBase, setRangeBase] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  /* ── duplicate print ── */
  const [duplicateEnabled, setDuplicateEnabled] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(2);

  /* ── general ── */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── preview container ref ── */
  const previewContainerRef = useRef(null);

  /* ────── preview computation ────── */
  const preview = useMemo(() => {
    const blockHeight = Math.max(44, tapeWidth * 3.6);
    const gap = 12;
    const hPadding = 24;
    return { blockHeight, gap, hPadding };
  }, [tapeWidth]);

  /* ────── selection helpers ────── */
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === labels.length) return new Set();
      return new Set(labels.map((l) => l.id));
    });
  }, [labels]);

  const selectedCount = selectedIds.size;

  /* ────── actions ────── */
  const onAddLabel = () => {
    const value = inputValue.trim();
    if (!value) return;
    const entry = createLabelEntry(
      value,
      'manual',
      tapeWidth,
      duplicateEnabled ? duplicateCount : 1
    );
    setLabels((prev) => [...prev, entry]);
    setInputValue('');
    setError('');
  };

  const onDeleteLabel = (id) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (editingId === id) setEditingId(null);
  };

  const onClearLabels = () => {
    setLabels([]);
    setSelectedIds(new Set());
    setEditingId(null);
  };

  /* ── inline edit ── */
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
    setEditRepeat(entry.repeatCount ?? 1);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    setLabels((prev) =>
      prev.map((l) =>
        l.id === editingId ? { ...l, text: editText.trim(), repeatCount: editRepeat } : l
      )
    );
    setEditingId(null);
  };

  /* ── range generation ── */
  const onGenerateRange = () => {
    setError('');
    const base = rangeBase.trim();
    if (!rangeFrom || !rangeTo) { setError('Both From and To values are required.'); return; }

    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (Number.isNaN(from) || Number.isNaN(to)) { setError('From/To must be numeric.'); return; }
    if (to < from) { setError('To must be >= From.'); return; }
    if (to - from > 999) { setError('Range limited to 1000 entries.'); return; }

    const padLen = rangeFrom.length;
    const repeat = duplicateEnabled ? duplicateCount : 1;
    const generated = [];
    for (let i = from; i <= to; i++) {
      const num = String(i).padStart(padLen, '0');
      const text = base ? `${base} ${num}` : num;
      generated.push(createLabelEntry(text, 'range', tapeWidth, repeat));
    }
    setLabels((prev) => [...prev, ...generated]);
  };

  /* ── build final label list for preview & PDF ── */
  const buildFinalTexts = useCallback(
    (entries) => {
      const out = [];
      for (const entry of entries) {
        const repeat = duplicateEnabled ? (entry.repeatCount ?? 1) : 1;
        for (let i = 0; i < repeat; i++) out.push(entry.text);
      }
      return out;
    },
    [duplicateEnabled]
  );

  const labelsForPreview = useMemo(() => buildFinalTexts(labels), [labels, buildFinalTexts]);

  const onGeneratePdf = async () => {
    setError('');
    const entriesToPrint = selectedCount > 0
      ? labels.filter((l) => selectedIds.has(l.id))
      : labels;
    const texts = buildFinalTexts(entriesToPrint);

    if (texts.length === 0) {
      setError('Please add at least one label.');
      return;
    }
    setLoading(true);
    try {
      const { blob, filename } = await ptouchApi.generate({
        tapeWidth,
        labels: texts,
        duplicateCount: 1,  // duplication already applied via entry repeatCount
      });
      saveBlob(blob, filename || `PTouch_Labels_${tapeWidth}mm.pdf`);
    } catch (apiError) {
      setError(apiError.message || 'Failed to generate P-Touch PDF');
    } finally {
      setLoading(false);
    }
  };

  /* ────── generate button label ────── */
  const generateLabel = useMemo(() => {
    if (loading) return 'Generating...';
    if (selectedCount > 0) return `Generate PDF (${selectedCount} selected)`;
    return 'Generate Tape PDF';
  }, [loading, selectedCount]);

  /* ──────────────── render ──────────────── */
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)_260px] gap-4">

        {/* ═══════════════ LEFT – CONFIGURATION ═══════════════ */}
        <section className="flex min-h-0 flex-col dc-panel p-4 overflow-auto">
          <div className="mb-4 flex items-center gap-2 text-slate-200">
            <Printer className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold">P-Touch Settings</h3>
          </div>

          {/* Tape Width */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500">Tape Width</p>
            <div className="grid grid-cols-5 gap-1.5 rounded-lg border border-slate-700 bg-slate-800 p-1">
              {WIDTH_PRESETS.map((size) => {
                const active = tapeWidth === size;
                return (
                  <button
                    key={size}
                    onClick={() => { setTapeWidth(size); setCustomWidthInput(''); }}
                    className={`rounded-md px-1 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {size}mm
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={TAPE_MIN}
                max={TAPE_MAX}
                value={customWidthInput}
                onChange={(e) => {
                  setCustomWidthInput(e.target.value);
                  applyCustomWidth(e.target.value);
                }}
                onBlur={() => {
                  if (customWidthInput && !isCustomWidth) setCustomWidthInput('');
                }}
                placeholder="Custom mm"
                className="dc-input h-8 w-full text-xs"
              />
              <span className="shrink-0 text-[10px] text-slate-500">{TAPE_MIN}–{TAPE_MAX}mm</span>
            </div>
            {isCustomWidth && (
              <p className="text-[10px] text-indigo-400">Custom width: {tapeWidth}mm</p>
            )}
          </div>

          <div className="my-4 border-t border-slate-700/60" />

          {/* Add Label */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Add Label</p>
            <div className="flex items-center gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddLabel(); } }}
                placeholder="Type label text"
                className="dc-input h-10"
              />
              <button onClick={onAddLabel} className="dc-btn-secondary h-10 shrink-0">
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {/* Generate */}
          <div className="mt-auto pt-4">
            <button
              onClick={onGeneratePdf}
              disabled={loading}
              className="dc-btn-primary h-10 w-full"
            >
              <FileDown className="h-4 w-4" />
              {generateLabel}
            </button>
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          </div>
        </section>

        {/* ═══════════════ CENTER – LABELS LIST + PREVIEW (side-by-side) ═══════════════ */}
        <section className="min-h-0 dc-panel grid grid-cols-[1fr_1fr] grid-rows-[minmax(0,1fr)] overflow-hidden">

          {/* ── Labels List (left half) ── */}
          <div className="flex flex-col min-h-0 overflow-hidden border-r border-slate-800">

            {/* Header – fixed height */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {labels.length > 0 && (
                  <input
                    type="checkbox"
                    checked={labels.length > 0 && selectedIds.size === labels.length}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                    title="Select all"
                  />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Labels ({labels.length})
                  {selectedCount > 0 && (
                    <span className="ml-1.5 normal-case text-indigo-400">{selectedCount} sel.</span>
                  )}
                </span>
              </div>
              {labels.length > 0 && (
                <button onClick={onClearLabels} className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors">
                  Clear
                </button>
              )}
            </div>

            {/* List body – scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {labels.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No labels yet.
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {labels.map((entry) => {
                    const isSelected = selectedIds.has(entry.id);
                    const isEditing = editingId === entry.id;

                    if (isEditing) {
                      return (
                        <div key={entry.id} className="flex items-center justify-between gap-2 rounded border border-indigo-500/50 bg-slate-800/80 px-3 py-2 min-h-[42px]">
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            className="dc-input h-7 min-w-0 flex-1 text-sm"
                            autoFocus
                          />
                          {duplicateEnabled && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">×</span>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={editRepeat}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(v) && v >= 1 && v <= 50) setEditRepeat(v);
                                }}
                                className="dc-input h-7 w-12 text-center text-xs"
                              />
                            </div>
                          )}
                          <button onClick={saveEdit} className="rounded p-0.5 text-emerald-400 hover:bg-slate-700" title="Save">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="rounded p-0.5 text-slate-500 hover:bg-slate-700 hover:text-slate-300" title="Cancel">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={entry.id}
                        className={`group flex items-center justify-between rounded border px-3 py-2 min-h-[42px] transition-colors ${
                          isSelected
                            ? 'border-indigo-500/40 bg-indigo-950/30'
                            : 'border-transparent hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(entry.id)}
                            className="h-3.5 w-3.5 shrink-0 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-base text-slate-200 whitespace-normal break-words min-w-0">{entry.text}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold uppercase leading-tight ${
                            entry.creationSource === 'range' ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400'
                          }`}>
                            {entry.creationSource === 'range' ? 'RANGE' : 'SINGLE'}
                          </span>
                          <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-xs font-medium leading-tight text-slate-400">
                            {entry.tapeWidth}mm
                          </span>
                          <span className="text-xs tabular-nums text-slate-500">{fmtTime(entry.createdAt)}</span>
                          {duplicateEnabled && entry.repeatCount > 1 && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold leading-tight text-amber-400">
                              ×{entry.repeatCount}
                            </span>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button onClick={() => startEdit(entry)} className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => onDeleteLabel(entry.id)} className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-rose-300" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ── Live Preview (right half) ── */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 border-b border-slate-800 px-4 py-2">
              <h3 className="text-sm font-semibold text-slate-200">Live Tape Preview</h3>
              <p className="text-[11px] text-slate-500">
                {tapeWidth}mm tape · {labelsForPreview.length} label{labelsForPreview.length !== 1 ? 's' : ''}
                {duplicateEnabled ? ' · duplication on' : ''}
              </p>
            </div>
            <div ref={previewContainerRef} className="min-h-0 flex-1 overflow-auto p-4">
              <div className="flex min-h-full items-start justify-center rounded-lg border border-slate-800/80 bg-slate-950/60 p-5">
                {labelsForPreview.length === 0 ? (
                  <div className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 text-xs text-slate-500">
                    <Layers className="h-6 w-6 text-slate-700" />
                    <span>Add labels to preview.</span>
                  </div>
                ) : (
                  <div className="w-full max-w-[92%] rounded-md border border-slate-300 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
                    {labelsForPreview.map((line, index) => {
                      const fontSize = Math.max(12, Math.min(56, tapeWidth * 2.2));
                      return (
                        <div
                          key={`${line}-${index}`}
                          className="flex items-center justify-center border border-slate-200 text-black"
                          style={{
                            height: `${preview.blockHeight}px`,
                            marginBottom: index === labelsForPreview.length - 1 ? 0 : `${preview.gap}px`,
                            paddingLeft: `${preview.hPadding}px`,
                            paddingRight: `${preview.hPadding}px`,
                            fontSize: `${fontSize}px`,
                            fontWeight: 500,
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                          }}
                        >
                          <span className="block max-w-full overflow-hidden text-ellipsis" style={{ fontSize: 'inherit' }}>
                            {line}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </section>

        {/* ═══════════════ RIGHT – GENERATION TOOLS ═══════════════ */}
        <section className="flex min-h-0 flex-col dc-panel p-4 overflow-auto">

          {/* Range Generator */}
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-slate-200">
              <Hash className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold">Range Generator</h3>
            </div>
            <div className="space-y-2.5 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Base Text <span className="normal-case text-slate-600">(optional)</span></label>
                <input
                  value={rangeBase}
                  onChange={(e) => setRangeBase(e.target.value)}
                  placeholder="e.g. rack"
                  className="dc-input h-8 w-full text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">From</label>
                  <input
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    placeholder="0101"
                    className="dc-input h-8 w-full text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">To</label>
                  <input
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    placeholder="0125"
                    className="dc-input h-8 w-full text-xs"
                  />
                </div>
              </div>
              <button
                onClick={onGenerateRange}
                className="dc-btn-secondary h-8 w-full text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Generate Range
              </button>
            </div>
          </div>

          <div className="mb-5 border-t border-slate-700/60" />

          {/* Duplicate Print */}
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-slate-200">
              <Copy className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold">Duplicate Print</h3>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={duplicateEnabled}
                  onChange={(e) => setDuplicateEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-300">Print each label multiple times</span>
              </label>
              {duplicateEnabled && (
                <div className="mt-2.5 flex items-center gap-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500">Copies</label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={duplicateCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 2 && v <= 50) setDuplicateCount(v);
                    }}
                    className="dc-input h-7 w-16 text-xs text-center"
                  />
                  <span className="text-[10px] text-slate-500">per label</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="mt-auto">
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-500">
              Upcoming features:
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Import from CSV/XLSX</li>
                <li>Font presets</li>
                <li>Cut mark options</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default PtouchLabelBuilderModule;
