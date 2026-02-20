import { useState, useMemo, useEffect } from 'react';
import { Download, Printer, Save } from 'lucide-react'; 
import { cableApi, draftsApi } from '../../shared/api/platformApi';
import { openBlobForPrint, saveBlob } from '../../shared/utils/blob';
import { getLayoutDefinition } from './layoutRegistry';
import { getModuleLabelByMode } from '../../app/moduleRegistry';
import { CABLE_SAMPLE_CONFIG } from '../../shared/labels/sampleData';
import { buildCableFirstRow, resolveCableConfig } from '../../shared/labels/cablePreviewModel';
import { useLabelSettings } from '../settings/LabelSettingsContext';
import TemplateSelector from '../../shared/components/TemplateSelector';

import CableInputColumn from './components/CableInputColumn';
import CableExcelInput from './components/CableExcelInput';
import CableWorkingList from './components/CableWorkingList';
import CableLivePreview from './components/CableLivePreview';
import ConfirmModal from '../../shared/components/ConfirmModal';
import ModulePageLayout from '../../shared/components/ModulePageLayout';

// ... (SAMPLE_PREVIEW_ROW, DEFAULT_CONFIG remains same)
const SAMPLE_PREVIEW_ROW = {
  aSide: 'DEVICE-A',
  portA: '01',
  zSide: 'DEVICE-B',
  portB: '01',
  serial: 'LINE-01',
  lineId: 'LINE-01',
  lineName: 'LINE-01',
  // Layout B/C specific if needed
  aSideDevice: 'DEVICE-A',
  zSideDevice: 'DEVICE-B'
};

const DEFAULT_CONFIG = {
  templateId: null, // Global ID from DB
  layoutSlug: 'layout-a', // Legacy fallback
  aSideDevice: '',
  zSideDevice: '',
  quantity: '1',
  portAStart: '1',
  portBStart: '1',
  portStep: '1',
  serialPrefix: '',
  serialSuffix: '',
  padLength: '3',
  linePrefix: 'line-',
  useAutoNumbering: true
};

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function firstNonEmpty(values, fallback = '') {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return fallback;
}

function sanitizeRowForLayout(row, layoutSlug) {
  const source = row && typeof row === 'object' ? row : {};

  if (layoutSlug === 'layout-a') {
    return {
      aSide: String(source.aSide ?? ''),
      portA: String(source.portA ?? ''),
      zSide: String(source.zSide ?? ''),
      portB: String(source.portB ?? ''),
      additionalText: String(source.additionalText ?? source.serial ?? '').trim()
    };
  }

  if (layoutSlug === 'layout-b') {
    return {
      aSide: String(source.aSide ?? ''),
      zSide: String(source.zSide ?? '')
    };
  }

  return {
    lineName: String(source.lineName ?? source.lineId ?? ''),
    aSide: String(source.aSide ?? ''),
    zSide: String(source.zSide ?? '')
  };
}

// Normalize frontend form/list state to the backend serial payload contract.
function normalizePayloadForGeneration(config, rows) {
  const safe = resolveCableConfig(config);
  const layout = safe.layoutSlug || 'layout-a';
  const sanitizedRows = Array.isArray(rows) ? rows.map((row) => sanitizeRowForLayout(row, layout)) : [];

  const aSideBase = firstNonEmpty([
    config?.aSideDevice,
    ...sanitizedRows.map((row) => row.aSide)
  ], 'N/A');
  const zSideBase = firstNonEmpty([
    config?.zSideDevice,
    ...sanitizedRows.map((row) => row.zSide)
  ], 'N/A');

  const payload = {
    layout: config.layoutSlug || layout, // Legacy
    templateId: config.templateId, // NEW
    config: {
      startNumber: 1,
      endNumber: clampInteger(sanitizedRows.length || config?.quantity, 1, 1, 999999),
      step: 1,
      padLength: clampInteger(config?.padLength, 3, 1, 8),
      serialPrefix: String(config?.serialPrefix ?? '').trim(),
      serialSuffix: String(config?.serialSuffix ?? '').trim(),
      linePrefix: String(config?.linePrefix ?? '').trim().slice(0, 24),
      aSideBase: aSideBase.slice(0, 64),
      zSideBase: zSideBase.slice(0, 64),
      portAStart: clampInteger(config?.portAStart, 1, 1, 99999),
      portBStart: clampInteger(config?.portBStart, 1, 1, 99999),
      portStep: clampInteger(config?.portStep, 1, 0, 1000)
    },
    // Explicitly send the mode (single vs series)
    mode: config.mode || 'single' // Fallback if not set, but we will ensure it is passed
  };

  if (sanitizedRows.length > 0) {
    payload.rows = sanitizedRows;
  }

  return payload;
}


// InlineHistoryList removed – history is available via global Print History page

// ... existing code ...

const CableLabelsModule = () => {
  // Global Settings Context
  const { activeTemplate } = useLabelSettings();

  // State
  const [mode, setMode] = useState('single'); // 'single' | 'batch' | 'excel'
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [singleModeList, setSingleModeList] = useState([]);
  const [batchModeList, setBatchModeList] = useState([]); // Renamed from serialModeList
  const [excelItems, setExcelItems] = useState([]); // New Excel State
  const [importStatus, setImportStatus] = useState({ state: 'idle', summary: null, errors: [] });
  const [draftsLoaded, setDraftsLoaded] = useState(false); // Persistence Flag

  const [selectedIndices, setSelectedIndices] = useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0); // Fixed missing useState
  const [editingIndex, setEditingIndex] = useState(null); // Index of item being edited
  
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState('');
  
  // History refresh trigger (kept for backend compatibility)
  const [, setHistoryRefreshTrigger] = useState(0);

  // Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'danger',
    onConfirm: () => {}
  });

  // Sync Template Selection
  useEffect(() => {
    if (activeTemplate) {
        setConfig(prev => ({
            ...prev,
            ...(activeTemplate.pageConfig || {}), // Use parsed camelCase prop
            templateId: activeTemplate.id,
            layoutSlug: activeTemplate.layoutKey || activeTemplate.layout_key || prev.layoutSlug
        }));
    }
  }, [activeTemplate]);

  // Restore Mode Check
  useEffect(() => {
      const pendingMode = localStorage.getItem('dc_restore_mode');
      if (pendingMode) {
          if (pendingMode === 'batch' || pendingMode === 'single') {
              setMode(pendingMode);
          }
          // Legacy support for 'series' during transition (optional)
          if (pendingMode === 'series') setMode('batch');
          
          localStorage.removeItem('dc_restore_mode');
      }
  }, []);

  // Derived
  const layoutSlug = config.layoutSlug || 'layout-a';
  const layoutDefinition = useMemo(() => getLayoutDefinition(layoutSlug), [layoutSlug]);
  const activeModeList = useMemo(() => {
     if (mode === 'single') return singleModeList;
     if (mode === 'batch') return batchModeList;
     if (mode === 'excel') return excelItems;
     return [];
  }, [mode, singleModeList, batchModeList, excelItems]);
  
  // -- Effects --

  // Load drafts on mount
  useEffect(() => {
    let mounted = true;
    
    const loadAllDrafts = async () => {
        try {
            // Load 'batch' draft. Fallback to 'serial' if 'batch' is empty (migration scenario)
            const [singleLoad, batchLoad, legacySerialLoad] = await Promise.all([
                draftsApi.load('single').catch(() => ({ connections: [], config: null })),
                draftsApi.load('batch').catch(() => ({ connections: [], config: null })),
                draftsApi.load('serial').catch(() => null)
            ]);

            if (mounted) {
                if (singleLoad?.connections) setSingleModeList(singleLoad.connections);
                
                // Prefer batchLoad, otherwise use legacySerialLoad
                if (batchLoad?.connections && batchLoad.connections.length > 0) {
                    setBatchModeList(batchLoad.connections);
                    if (batchLoad?.config) setConfig(prev => ({ ...prev, ...batchLoad.config }));
                } else if (legacySerialLoad?.connections) {
                     // Migration: Loaded from 'serial', set to batchModeList
                     setBatchModeList(legacySerialLoad.connections);
                     if (legacySerialLoad?.config) setConfig(prev => ({ ...prev, ...legacySerialLoad.config }));
                }
                
                setDraftsLoaded(true);
            }
        } catch (err) {
            console.error("Failed to load drafts:", err);
            if (mounted) setDraftsLoaded(true); 
        }
    };

    loadAllDrafts();

    return () => { mounted = false; };
  }, []);

  // Auto-save Single Mode List
  useEffect(() => {
    if (!draftsLoaded) return;
    
    const timer = setTimeout(() => {
        draftsApi.save('single', { connections: singleModeList }).catch(err => console.error("Auto-save single failed", err));
    }, 500);

    return () => clearTimeout(timer);
  }, [singleModeList, draftsLoaded]);

  // Auto-save Batch Mode List & Config
  useEffect(() => {
    if (!draftsLoaded) return;

    const timer = setTimeout(() => {
        draftsApi.save('batch', { 
            connections: batchModeList,
            config: config 
        }).catch(err => console.error("Auto-save batch failed", err));
    }, 500);

    return () => clearTimeout(timer);
  }, [batchModeList, config, draftsLoaded]);


  // Cleanup PDF blob
  useEffect(() => {
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    setActivePreviewIndex(0);
    setSelectedIndices([]);
    setEditingIndex(null);
  }, [mode]);

  const updateActiveModeList = (updater) => {
    if (mode === 'single') {
      setSingleModeList(updater);
      return;
    }

    if (mode === 'excel') {
        setExcelItems(updater);
        return;
    }
    setBatchModeList(updater);
  };

  // -- Helpers --
  const getActiveModeList = () => {
     if (mode === 'single') return singleModeList;
     if (mode === 'batch') return batchModeList;
     if (mode === 'excel') return excelItems;
     return [];
  };
  
  const getPreviewItem = () => {
    // 1. If we are in "Live Input" mode (index -1), return a preview generated from current inputs
    if (activePreviewIndex === -1) {
        return generatePreviewFromConfig();
    }

    // 2. If we are editing a specific item AND that item is the one being previewed, 
    // show the LIVE config (so the user sees what they are typing), not the saved item.
    if (editingIndex !== null && editingIndex === activePreviewIndex) {
        return generatePreviewFromConfig();
    }

    // 3. Otherwise, show the saved item from the list
    if (activeModeList.length > 0 && activePreviewIndex >= 0 && activeModeList[activePreviewIndex]) {
      return activeModeList[activePreviewIndex];
    }
    
    // Fallback
    return generatePreviewFromConfig();
  };

  const generatePreviewFromConfig = () => {
    const isLayoutB = layoutSlug === 'layout-b';
    const startA = config.portAStart || '01';
    const startB = config.portBStart || '01';
    const padLen = Number(config.padLength) || 3;
    
    // Generate sample serial
    let serial = 'LINE-001';
    if (config.serialPrefix) {
        serial = `${config.serialPrefix}${config.useAutoNumbering ? '001'.padStart(padLen, '0') : ''}${config.serialSuffix || ''}`;
    }

    return {
       aSide: isLayoutB ? `${config.aSideDevice || 'Device A'} ${startA}` : (config.aSideDevice || 'Device A'),
       zSide: isLayoutB ? `${config.zSideDevice || 'Device B'} ${startB}` : (config.zSideDevice || 'Device B'),
       portA: startA,
       portB: startB,
       serial: serial,
       lineId: serial, // Fallback
       lineName: serial, // Fallback
       
       // Raw fields for specific layouts
       aSideDevice: config.aSideDevice || 'Device A',
       zSideDevice: config.zSideDevice || 'Device B',
       additionalText: config.serialPrefix || '' 
    };
  };

  // -- Helpers --
  const resetSingleForm = () => {
    setConfig(prev => ({
      ...DEFAULT_CONFIG,
      layoutSlug: prev.layoutSlug, // Preserve layout
    }));
    setResetTrigger(prev => prev + 1); // Trigger focus
  };

  const resetBatchForm = () => {
    setConfig(prev => ({
      ...DEFAULT_CONFIG,
      layoutSlug: prev.layoutSlug,
    }));
    setResetTrigger(prev => prev + 1);
  };

  // State
  const [resetTrigger, setResetTrigger] = useState(0);

  // -- Handlers --

  const handleAddSingle = () => {
    const newRow = buildCableFirstRow(layoutSlug, { ...config, rawInput: true });
    newRow._raw = { ...config };

    setSingleModeList((prev) => {
      const next = [...prev, newRow];
      // Do NOT auto-select the new item. Keep activePreviewIndex as is (likely -1),
      // so the user stays in "Live Input" mode for the next entry.
      return next;
    });
    
    // UX: Reset form and focus
    resetSingleForm();
  };

  const handleGenerateBatch = () => {
    const safe = resolveCableConfig(config, true);
    
    const hasValue = [
        safe.aSideDevice, safe.zSideDevice, 
        safe.portAStart, safe.portBStart,
        safe.serialPrefix, safe.linePrefix
    ].some(val => val !== '');

    if (!hasValue) {
        setError('Please enter at least one value before generating connections.');
        return;
    }
    setError('');

    const count = Number(safe.quantity) || 1;
    const step = Number(safe.portStep) || 1;
    const startA = safe.portAStart === '' ? null : Number(safe.portAStart);
    const startB = safe.portBStart === '' ? null : Number(safe.portBStart);
    const padLen = Number(safe.padLength) || 0; 
    const shouldGenerateSerial = safe.serialPrefix !== '';

    const newRows = [];

    for (let i = 0; i < count; i++) {
        const currentPortA = startA !== null ? String(startA + (i * step)) : '';
        const currentPortB = startB !== null ? String(startB + (i * step)) : '';
        
        let serial = '';
        if (shouldGenerateSerial) {
             const serialNum = (i + 1);
             const serialSuffix = config.useAutoNumbering 
                ? String(serialNum).padStart(padLen, '0') 
                : ''; 
             serial = `${safe.serialPrefix}${serialSuffix}${safe.serialSuffix}`;
        }
        
        const aSide = [safe.aSideDevice, currentPortA].filter(Boolean).join(' ');
        const zSide = [safe.zSideDevice, currentPortB].filter(Boolean).join(' ');
        const lineId = safe.linePrefix ? `${safe.linePrefix}${config.useAutoNumbering ? String(i + 1).padStart(padLen, '0') : ''}` : '';
        
        const row = {
           aSide,
           zSide,
           portA: currentPortA,
           portB: currentPortB,
           serial,
           lineId,
           _raw: { 
               ...safe, 
               portAStart: currentPortA, 
               portBStart: currentPortB,
               serialPrefix: safe.serialPrefix, 
               serialSuffix: safe.serialSuffix
           } 
        };

        if (layoutSlug === 'layout-a') {
             row.aSide = safe.aSideDevice;
             row.zSide = safe.zSideDevice;
        } else if (layoutSlug === 'layout-b') {
             row.aSide = [safe.aSideDevice, currentPortA].filter(Boolean).join(' ');
             row.zSide = [safe.zSideDevice, currentPortB].filter(Boolean).join(' ');
        }
        
        newRows.push(row);
    }

    setBatchModeList((prev) => [...prev, ...newRows]);
    
    // UX: Reset form and preview to Live Input
    resetBatchForm();
    setActivePreviewIndex(-1);
  };

  const handleUpdateSingle = () => {
    if (editingIndex === null) return;
    const updatedRow = buildCableFirstRow(layoutSlug, { ...config, rawInput: true });
    updatedRow._raw = { ...config };
    updateActiveModeList((prev) => {
      const copy = [...prev];
      copy[editingIndex] = updatedRow;
      return copy;
    });
    setEditingIndex(null);
    setConfig(DEFAULT_CONFIG);
  };

  const handleEditItem = (index) => {
    setEditingIndex(index);
    setActivePreviewIndex(index);
    
    const item = getActiveModeList()[index];
    if (item._raw) {
        setConfig(item._raw);
        return;
    }

    setConfig(prev => ({
        ...prev,
        aSideDevice: item.aSide?.split(' ')[0] || item.aSideDevice || '', 
        zSideDevice: item.zSide?.split(' ')[0] || item.zSideDevice || '',
        portAStart: item.portA || '',
        portBStart: item.portB || '',
        serialPrefix: '', 
        serialSuffix: ''
    }));
  };

  const handleDelete = (index) => {
    const currentList = getActiveModeList();
    updateActiveModeList((prev) => prev.filter((_, i) => i !== index));

    if (editingIndex === index) {
      setEditingIndex(null);
    }
    if (activePreviewIndex >= currentList.length - 1) {
      setActivePreviewIndex(Math.max(0, currentList.length - 2));
    } else if (activePreviewIndex >= index && activePreviewIndex > 0) {
      setActivePreviewIndex((prev) => prev - 1);
    }
    setSelectedIndices((prev) => prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  /* PDF Generation */
  const handleGeneratePDF = async (onlySelected = false) => {
    const currentList = getActiveModeList();
    const indices = onlySelected ? selectedIndices : currentList.map((_, i) => i);
    const rowsToPrint = indices.map((i) => currentList[i]);

    if (rowsToPrint.length === 0) {
        setError("No items to print");
        return;
    }

    await handleGenerateBackend(rowsToPrint, onlySelected);
  };

  const handleGenerateBackend = async (rowsToPrint, onlySelected = false) => {
      // Legacy wrapper for Layout B/C
      try {
        setLoadingGenerate(true);
        setError('');
        const basePayload = normalizePayloadForGeneration(config, rowsToPrint);
        const payload = { ...basePayload, mode };
        const { blob, filename } = await cableApi.generatePdf(payload);
        const url = window.URL.createObjectURL(blob);
        if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl(url);
        saveBlob(blob, filename);

        if (onlySelected) {
          const indicesToRemove = new Set(selectedIndices);
          updateActiveModeList((prev) => prev.filter((_, i) => !indicesToRemove.has(i)));
          setSelectedIndices([]);
        } else {
          updateActiveModeList(() => []);
          setSelectedIndices([]);
        }

        if (mode === 'single') resetSingleForm();
        else if (mode === 'batch') resetBatchForm();
        else if (mode === 'excel') { /* No reset needed for now */ }

        setActivePreviewIndex(-1);
        setHistoryRefreshTrigger(prev => prev + 1);
      } catch(err) {
        setError(err.message);
      } finally {
        setLoadingGenerate(false);
      }
  };

  return (
    <ModulePageLayout>
      
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">{getModuleLabelByMode('cable')}</h2>
            
            {/* Template Selector */}
            <div className="h-6 w-px bg-slate-800"></div>
            <TemplateSelector />
        </div>

        <div className="flex rounded-lg bg-slate-900 p-1">
          <button
            onClick={() => setMode('single')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === 'single' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Mode
          </button>
          <button
            onClick={() => setMode('batch')}
             className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === 'batch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Batch Mode
          </button>
           <button
            onClick={() => setMode('excel')}
             className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === 'excel' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Excel Mode
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <ModulePageLayout.Content className="pt-4">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[320px_1fr_minmax(400px,480px)]">
        
        {/* LEFT: Input */}
        <div className="min-h-0 overflow-hidden dc-panel">
          {mode !== 'excel' && (
          <CableInputColumn 
            mode={mode}
            config={config}
            setConfig={setConfig}
            onAddSingle={handleAddSingle}
            onGenerateBatch={handleGenerateBatch}
            editingItem={editingIndex !== null}
            onUpdateSingle={handleUpdateSingle}
            onCancelEdit={() => { 
                setEditingIndex(null); 
                setConfig(DEFAULT_CONFIG); 
                setActivePreviewIndex(-1);
            }}
            resetTrigger={resetTrigger}
            onInputChange={() => {
                if (editingIndex === null && activePreviewIndex !== -1) {
                     console.log("Auto-switching to Live Preview");
                     setActivePreviewIndex(-1);
                }
            }}
          />
          )}

          {mode === 'excel' && (
            <CableExcelInput 
                config={config}
                setConfig={setConfig}
                onImport={(rows) => {
                    setExcelItems(rows);
                    setActivePreviewIndex(-1);
                }}
                onClear={() => {
                    setExcelItems([]);
                    setActivePreviewIndex(-1);
                }}
                importStatus={importStatus}
                setImportStatus={setImportStatus}
            />
          )}
        </div>

        {/* CENTER: Working List */}
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 flex flex-col">
             <CableWorkingList 
                items={activeModeList}
                selectedIndices={selectedIndices}
                onToggleSelect={(idx) => {
                    setSelectedIndices(prev => 
                        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                    );
                }}
                onToggleSelectAll={() => {
                    if (selectedIndices.length === activeModeList.length) setSelectedIndices([]);
                    else setSelectedIndices(activeModeList.map((_, i) => i));
                }}
                onDelete={handleDelete}
                onDeleteAll={() => {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Delete All Items',
                        message: 'Are you sure you want to delete ALL items from the list? This action cannot be undone.',
                        confirmLabel: 'Delete All',
                        variant: 'danger',
                        onConfirm: () => {
                            updateActiveModeList(() => []);
                            setSelectedIndices([]);
                            setActivePreviewIndex(-1);
                        }
                    });
                }}
                onDeleteSelected={() => {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Delete Selected Items',
                        message: `Are you sure you want to delete the ${selectedIndices.length} selected items?`,
                        confirmLabel: 'Delete Selected',
                        variant: 'danger',
                        onConfirm: () => {
                            const indicesToRemove = new Set(selectedIndices);
                            updateActiveModeList(prev => prev.filter((_, i) => !indicesToRemove.has(i)));
                            setSelectedIndices([]);
                            setActivePreviewIndex(-1);
                        }
                    });
                }}
                onItemClick={(idx) => {
                    setActivePreviewIndex(idx);
                    if (mode !== 'excel') { 
                        handleEditItem(idx);
                    }
                }}
                activePreviewIndex={activePreviewIndex}
             />
          </div>
          
          {/* Action Footer */}
          <div className="shrink-0 space-y-4">
              <div className="flex gap-3 dc-panel p-3">
                 <button 
                    onClick={() => handleGeneratePDF(false)}
                    disabled={loadingGenerate || activeModeList.length === 0}
                    className="dc-btn-primary flex-1"
                 >
                    <Download className="h-4 w-4" />
                    Generate PDF ({activeModeList.length})
                 </button>
                  <button 
                    onClick={() => handleGeneratePDF(true)}
                    disabled={loadingGenerate || selectedIndices.length === 0}
                    className="dc-btn-secondary flex-1"
                 >
                    <Download className="h-4 w-4" />
                    Selected ({selectedIndices.length})
                 </button>
                 {pdfUrl && (
                    <button
                        onClick={() => openBlobForPrint(pdfUrl)}
                        className="dc-btn-success px-3"
                        title="Print last generated PDF"
                    >
                        <Printer className="h-4 w-4" />
                    </button>
                 )}
              </div>
          </div>

          {error && <div className="text-sm text-rose-400 text-center">{error}</div>}
        </div>

        {/* RIGHT: Live Preview (full height) */}
        <div className="min-h-0 flex flex-col overflow-hidden">
           <CableLivePreview 
             activeItem={getPreviewItem()}
             activeIndex={activePreviewIndex}
             totalItems={activeModeList.length}
             onNavigate={(dir) => {
                 if (activeModeList.length === 0) return;
                 if (activePreviewIndex === -1 && dir === 'next') setActivePreviewIndex(0);
                 if (activePreviewIndex === -1 && dir === 'prev') setActivePreviewIndex(activeModeList.length - 1);
                 
                 if (activePreviewIndex !== -1) {
                    if (dir === 'prev') setActivePreviewIndex(Math.max(-1, activePreviewIndex - 1));
                    if (dir === 'next') setActivePreviewIndex(Math.min(activeModeList.length - 1, activePreviewIndex + 1));
                 }
             }}
             layoutSlug={layoutSlug}
             layoutDefinition={layoutDefinition}
             previewHint={activePreviewIndex === -1 ? "Live Input Preview" : `Item ${activePreviewIndex + 1} of ${activeModeList.length}`}
           />
        </div>

      </div>
      </ModulePageLayout.Content>

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
      />
    </ModulePageLayout>
  );
};

export default CableLabelsModule;
