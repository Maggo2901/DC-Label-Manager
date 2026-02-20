import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FolderOpen,
  FileSpreadsheet,
  FileText,
  FileType2,
  Trash2,
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { templateLibraryApi } from '../../shared/api/platformApi';
import { API_BASE } from '../../shared/api/httpClient';
import { saveBlob } from '../../shared/utils/blob';
import ModulePageLayout from '../../shared/components/ModulePageLayout';

const DEFAULT_CATEGORIES = [
  { label: 'General', value: 'general' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Operations', value: 'operations' }
];

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(rawDate) {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString();
}

function typeMeta(type) {
  if (type === 'pdf') {
    return {
      Icon: FileText,
      badge: 'PDF',
      iconClass: 'text-rose-400',
      badgeClass: 'bg-rose-900/40 text-rose-300 border border-rose-800/60'
    };
  }
  if (type === 'xlsx') {
    return {
      Icon: FileSpreadsheet,
      badge: 'XLSX',
      iconClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/60'
    };
  }
  return {
    Icon: FileType2,
    badge: 'DOCX',
    iconClass: 'text-blue-400',
    badgeClass: 'bg-blue-900/40 text-blue-300 border border-blue-800/60'
  };
}

function sortItems(items, sortBy, order) {
  const direction = order === 'asc' ? 1 : -1;
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name) * direction;
    if (sortBy === 'fileType') return a.fileType.localeCompare(b.fileType) * direction;
    const aTs = new Date(a.createdAt).getTime() || 0;
    const bTs = new Date(b.createdAt).getTime() || 0;
    return (aTs - bTs) * direction;
  });
  return sorted;
}

const TemplateLibraryModule = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedId, setSelectedId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);
  const [excelPreview, setExcelPreview] = useState({ loading: false, error: '', headers: [], rows: [] });

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await templateLibraryApi.listTemplates();
      const list = response?.data?.items || [];
      const serverCategories = response?.data?.categories || [];
      const merged = [...DEFAULT_CATEGORIES];
      const known = new Set(merged.map((item) => item.value));
      serverCategories.forEach((value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized || known.has(normalized)) return;
        merged.push({ label: normalized.charAt(0).toUpperCase() + normalized.slice(1), value: normalized });
        known.add(normalized);
      });

      setItems(list);
      setCategories(merged);

      if (list.length === 0) {
        setSelectedId('');
      } else if (!list.some((item) => item.id === selectedId)) {
        setSelectedId(list[0].id);
      }
    } catch (apiError) {
      setError(apiError.message || 'Failed to load document templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => item.category === selectedCategory);
    return sortItems(filtered, sortBy, order);
  }, [items, selectedCategory, sortBy, order]);

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSelectedId('');
      return;
    }
    if (!visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0].id);
    }
  }, [visibleItems, selectedId]);

  const selectedItem = useMemo(
    () => visibleItems.find((item) => item.id === selectedId) || null,
    [visibleItems, selectedId]
  );

  useEffect(() => {
    setPdfPreviewFailed(false);
    setExcelPreview({ loading: false, error: '', headers: [], rows: [] });
  }, [selectedId]);

  const onUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onUploadChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);
      await templateLibraryApi.upload(formData);
      await loadTemplates();
    } catch (apiError) {
      setError(apiError.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDownload = async () => {
    if (!selectedItem) return;
    setError('');
    try {
      const { blob, filename } = await templateLibraryApi.download(selectedItem.id);
      saveBlob(blob, filename || selectedItem.originalFilename || `${selectedItem.name}.${selectedItem.fileType}`);
    } catch (apiError) {
      setError(apiError.message || 'Download failed');
    }
  };

  const onDelete = async () => {
    if (!selectedItem) return;
    const ok = window.confirm(`Delete template "${selectedItem.name}"?`);
    if (!ok) return;
    setError('');
    try {
      await templateLibraryApi.delete(selectedItem.id);
      await loadTemplates();
    } catch (apiError) {
      setError(apiError.message || 'Delete failed');
    }
  };

  const previewUrl = selectedItem
    ? `${API_BASE}/api/doc-templates/${selectedItem.id}?inline=1#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
    : '';

  useEffect(() => {
    let cancelled = false;

    const loadExcelPreview = async () => {
      if (!selectedItem || selectedItem.fileType !== 'xlsx') {
        return;
      }

      setExcelPreview({ loading: true, error: '', headers: [], rows: [] });
      try {
        const { blob } = await templateLibraryApi.download(selectedItem.id);
        const buffer = await blob.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        if (!sheet) {
          throw new Error('Missing worksheet');
        }

        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        const slicedRows = (Array.isArray(matrix) ? matrix : []).slice(0, 20).map((row) => {
          const cells = Array.isArray(row) ? row : [];
          const fixed = [];
          for (let i = 0; i < 10; i += 1) {
            fixed.push(String(cells[i] ?? ''));
          }
          return fixed;
        });

        const headers = slicedRows[0] && slicedRows[0].some((cell) => String(cell).trim() !== '')
          ? slicedRows[0]
          : Array.from({ length: 10 }, (_, idx) => `Column ${idx + 1}`);
        const rows = slicedRows.length > 1 ? slicedRows.slice(1) : [];

        if (!cancelled) {
          setExcelPreview({ loading: false, error: '', headers, rows });
        }
      } catch { // Excel parse failure — non-critical
        if (!cancelled) {
          setExcelPreview({ loading: false, error: 'Excel preview not available. Download to view.', headers: [], rows: [] });
        }
      }
    };

    loadExcelPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  return (
    <ModulePageLayout>
      <ModulePageLayout.Content>
        <section className="flex h-full min-h-0 dc-panel overflow-hidden">
          <aside className="flex h-full w-[220px] min-w-[220px] flex-col border-r border-slate-800">
            <div className="shrink-0 px-4 pb-3 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Categories</div>
            <div className="min-h-0 flex-1 space-y-2 overflow-auto px-4 pb-4">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedCategory === category.value
                    ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="shrink-0 border-t border-slate-800 p-4">
              <button
                onClick={onUploadClick}
                disabled={uploading}
                className="dc-btn-success w-full"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Template'}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={onUploadChange} accept=".pdf,.docx,.xlsx" />
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedItem ? (
              <>
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-200">Preview Workspace</div>
                    <div className="truncate text-sm font-medium text-slate-100">{selectedItem.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-medium text-slate-300">
                        {String(selectedItem.fileType || '').toUpperCase()}
                      </span>
                      <span>{formatBytes(selectedItem.size)}</span>
                      <span>{formatDate(selectedItem.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={onDownload}
                      className="dc-btn-primary px-3 py-1.5 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                    <button
                      onClick={onDelete}
                      className="dc-btn-danger px-3 py-1.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {selectedItem.fileType === 'pdf' ? (
                    <div className="h-full w-full overflow-hidden bg-slate-950 transition-all duration-200">
                      {pdfPreviewFailed ? (
                        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
                          Preview unavailable. Download to view.
                        </div>
                      ) : (
                        <iframe
                          title={`Preview ${selectedItem.name}`}
                          src={previewUrl}
                          onError={() => setPdfPreviewFailed(true)}
                          className="h-full w-full border-0"
                        />
                      )}
                    </div>
                  ) : selectedItem.fileType === 'xlsx' ? (
                    <div className="h-full w-full overflow-auto bg-slate-950 transition-all duration-200">
                      {excelPreview.loading ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading Excel preview...</div>
                      ) : excelPreview.error ? (
                        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
                          Excel preview not available. Download to view.
                        </div>
                      ) : (
                        <table className="min-w-max w-full text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-800 text-slate-200">
                            <tr>
                              {excelPreview.headers.map((head, idx) => (
                                <th key={`h-${idx}`} className="whitespace-nowrap border-b border-slate-700 px-3 py-2 text-left font-semibold">
                                  {head || `Column ${idx + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelPreview.rows.map((row, rowIdx) => (
                              <tr key={`r-${rowIdx}`} className={rowIdx % 2 === 0 ? 'bg-slate-900/70' : 'bg-slate-900/30'}>
                                {row.map((cell, colIdx) => (
                                  <td key={`c-${rowIdx}-${colIdx}`} className="whitespace-nowrap border-b border-slate-800 px-3 py-2 text-slate-300">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
                      Preview not supported. Download to view.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <FolderOpen className="mb-3 h-12 w-12 text-slate-500" />
                <p className="text-sm font-medium text-slate-200">Select a template to preview</p>
              </div>
            )}
            {error && <p className="shrink-0 border-t border-slate-800 px-4 py-2 text-sm text-rose-400 sm:px-5">{error}</p>}
          </main>

          <aside className="flex h-full w-[320px] min-w-[320px] flex-col border-l border-slate-800">
            <div className="shrink-0 border-b border-slate-800 px-4 py-3">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="dc-select w-auto"
                >
                  <option value="name">Sort by Name</option>
                  <option value="createdAt">Sort by Date</option>
                  <option value="fileType">Sort by Type</option>
                </select>
                <select
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                  className="dc-select w-auto"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
              <div className="text-xs text-slate-500">{loading ? 'Loading...' : `${visibleItems.length} files`}</div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {visibleItems.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                    <div className="w-full rounded-xl border border-dashed border-slate-700 p-6 text-center">
                    <FolderOpen className="mb-3 h-10 w-10 text-slate-500" />
                    <p className="text-sm font-medium text-slate-200">No templates in this category yet.</p>
                    <p className="mt-1 text-xs text-slate-500">Upload your first template to get started.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-1">
                  {visibleItems.map((item) => {
                    const meta = typeMeta(item.fileType);
                    const active = item.id === selectedId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                          active
                            ? 'border-indigo-500 bg-slate-800 ring-1 ring-indigo-500/40'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <meta.Icon className={`h-5 w-5 ${meta.iconClass}`} />
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}>
                            {meta.badge}
                          </span>
                        </div>
                        <div className="truncate text-sm font-semibold text-slate-100">{item.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{item.originalFilename}</div>
                        <div className="mt-3 space-y-1 text-xs text-slate-400">
                          <div>Size: {formatBytes(item.size)}</div>
                          <div>Date: {formatDate(item.createdAt)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </section>
      </ModulePageLayout.Content>
    </ModulePageLayout>
  );
};

export default TemplateLibraryModule;
