import { useState, useRef, useCallback } from 'react';
import { Upload, FileDown, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { generateExcelTemplate } from '../utils/excelTemplate';
import { saveBlob } from '../../../shared/utils/blob';
import { MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS } from '../utils/hardeningConfig';
import TemplateSelector from './TemplateSelector';

export default function CableExcelInput({
  onImport,
  onClear,
  importStatus,
  setImportStatus,
  config,
  setConfig 
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0); // 0-100
  const fileInputRef = useRef(null);

  const handleTemplateSelect = useCallback((template) => {
    if (!setConfig) return;
    setConfig(prev => {
        if (prev.templateId === template.id) return prev;
        return {
            ...prev,
            templateId: template.id,
            layoutSlug: template.layout_key, 
        };
    });
  }, [setConfig]);

  // Status is managed by parent (or locally if just UI state, but we need to pass data up)
  // Props:
  // importStatus = { state: 'idle' | 'valid' | 'invalid', summary: { total, valid, invalid }, errors: [] }
  
  const handleDownloadTemplate = () => {
    try {
      const blob = generateExcelTemplate();
      saveBlob(blob, 'CableLabel_Template.xlsx');
    } catch (err) {
      console.error("Failed to generate template", err);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    // 1. Extension Guard
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
    if (!isXlsx) {
        setImportStatus({
            state: 'error',
            summary: null,
            errors: [{ message: "Invalid file type. Only .xlsx files are allowed." }],
            fileName: file.name
        });
        return;
    }

    // 2. Size Guard
    if (file.size > MAX_FILE_SIZE_BYTES) {
        setImportStatus({
            state: 'error',
            summary: null,
            errors: [{ message: `File too large. Max size is ${MAX_FILE_SIZE_BYTES / (1024*1024)}MB.` }],
            fileName: file.name
        });
        return;
    }

    setIsParsing(true);
    setParseProgress(0);
    setImportStatus({ state: 'parsing', summary: null, errors: [] }); // Reset previous

    try {
      const { validRows, invalidRows, errors } = await parseExcelFile(file, (progress) => {
          setParseProgress(progress);
      });
      
      const summary = {
        total: validRows.length + invalidRows.length,
        valid: validRows.length,
        invalid: invalidRows.length
      };

      const newState = errors.length > 0 || invalidRows.length > 0 ? 'invalid' : 'valid';
      
      const statusData = {
        state: newState,
        summary,
        errors: errors,
        fileName: file.name
      };
      
      setImportStatus(statusData);
      
      if (validRows.length > 0) {
        onImport(validRows);
      }

    } catch (err) {
      console.error("Parse error", err);
      // Handle explicit errors from parser (e.g. Row Limit exceeded)
      const msg = err.message || "Failed to parse file.";
      setImportStatus({
        state: 'error',
        summary: null,
        errors: [{ message: msg }],
        fileName: file.name
      });
    } finally {
      setIsParsing(false);
      setParseProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      processFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 custom-scrollbar">
      {/* Template Selection */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Template Selection</h3>
        <TemplateSelector 
            selectedTemplateId={config?.templateId} 
            onSelect={handleTemplateSelect} 
            moduleType="cable"
        />
      </div>

      {/* Template Download */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">1. Get Excel Template</h3>
        <button
          onClick={handleDownloadTemplate}
          className="dc-btn-secondary w-full py-3"
        >
          <FileDown className="h-4 w-4" />
          Download Excel Template
        </button>
      </div>

      <div className="flex items-center justify-center text-slate-600">
        <div className="h-px flex-1 bg-slate-800"></div>
        <span className="px-2 text-xs uppercase">Then</span>
        <div className="h-px flex-1 bg-slate-800"></div>
      </div>

      {/* File Upload Zone */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">2. Upload Filled File</h3>
        
        {importStatus.state === 'idle' || importStatus.state === 'parsing' || importStatus.state === 'error' ? (
           <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer
              ${isDragOver 
                 ? 'border-indigo-500 bg-indigo-500/10' 
                 : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".xlsx" 
              className="hidden" 
            />
            
            {isParsing ? (
               <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                 <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-indigo-500"></div>
                 <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="bg-indigo-500 h-full transition-all duration-300 ease-out"
                        style={{ width: `${parseProgress}%` }}
                    />
                 </div>
                 <span className="text-sm text-slate-400">Parsing... {Math.round(parseProgress)}%</span>
               </div>
            ) : (
               <>
                 <Upload className="h-8 w-8 text-slate-500" />
                 <div className="text-center">
                   <p className="text-sm font-medium text-slate-300">Click to upload</p>
                   <p className="text-xs text-slate-500">or drag and drop .xlsx</p>
                 </div>
               </>
            )}
          </div>
        ) : (
            // Result View
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm font-medium text-slate-200 truncate max-w-[140px]" title={importStatus.fileName}>
                            {importStatus.fileName}
                        </span>
                    </div>
                    <button 
                        onClick={() => { onClear(); setImportStatus({ state: 'idle' }); }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-rose-400"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {importStatus.summary && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                        <div className="rounded bg-slate-800/50 p-1.5">
                            <div className="font-bold text-slate-300">{importStatus.summary.total}</div>
                            <div className="text-slate-500">Total</div>
                        </div>
                        <div className="rounded bg-slate-800/50 p-1.5">
                            <div className="font-bold text-emerald-400">{importStatus.summary.valid}</div>
                            <div className="text-slate-500">Valid</div>
                        </div>
                        <div className="rounded bg-slate-800/50 p-1.5">
                            <div className={`font-bold ${importStatus.summary.invalid > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                {importStatus.summary.invalid}
                            </div>
                            <div className="text-slate-500">Invalid</div>
                        </div>
                    </div>
                )}

                {importStatus.errors.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        <div className="rounded bg-rose-950/30 border border-rose-900/50 p-2 text-xs text-rose-300">
                            <div className="flex items-center gap-1.5 mb-1 font-medium">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Issues Found</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 opacity-80 max-h-[100px] overflow-y-auto custom-scrollbar">
                                {importStatus.errors.slice(0, 5).map((err, i) => (
                                    <li key={i}>{err.message} {err.row ? `(Row ${err.row})` : ''}</li>
                                ))}
                                {importStatus.errors.length > 5 && (
                                    <li className="italic">...and {importStatus.errors.length - 5} more</li>
                                )}
                            </ul>
                        </div>
                        <button
                            onClick={() => {
                                 const content = [
                                     ['Row', 'Type', 'Message', 'Value'].join(','),
                                     ...importStatus.errors.map(e => 
                                         [e.row || '-', e.type || 'Error', `"${e.message.replace(/"/g, '""')}"`, `"${(e.value || '').replace(/"/g, '""')}"`].join(',')
                                     )
                                 ].join('\n');
                                 const blob = new Blob([content], { type: 'text/csv' });
                                 saveBlob(blob, `error_report_${new Date().toISOString().slice(0,19)}.csv`);
                            }}
                            className="w-full rounded bg-slate-700 py-1.5 text-xs text-slate-300 hover:bg-slate-600 border border-slate-600"
                        >
                            Download Error Report
                        </button>
                    </div>
                ) : (
                    <div className="rounded bg-emerald-950/30 border border-emerald-900/50 p-2 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ready to generate!</span>
                    </div>
                )}
            </div>
        )}
      </div>

       {importStatus.state === 'error' && (
          <div className="rounded bg-rose-950/30 border border-rose-900/50 p-3 text-xs text-rose-300">
             <p className="font-medium mb-1">Upload Error</p>
             <p className="opacity-80">{importStatus.errors[0]?.message}</p>
          </div>
       )}
    </div>
  );
}
