import { useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { CABLE_SAMPLE_CONFIG } from '../../../shared/labels/sampleData';
import TemplateSelector from './TemplateSelector';

export default function CableInputColumn({
  mode,
  config,
  setConfig,
  onAddSingle,
  onGenerateBatch,
  editingItem,
  onUpdateSingle,
  onCancelEdit,
  resetTrigger,
  onInputChange
}) {
  // Sync editing item to config when it changes
  useEffect(() => {
    if (editingItem) {
      setConfig((prev) => ({ ...prev, ...editingItem }));
    }
  }, [editingItem, setConfig]);

  // UX: Auto-focus Device A on reset
  const deviceARef = useRef(null);
  
  useEffect(() => {
    if (resetTrigger > 0 && deviceARef.current) {
       // Small timeout to ensure state update propagated
       setTimeout(() => {
           deviceARef.current.focus();
           deviceARef.current.select(); // Optional: select text if any (though it should be empty)
       }, 50);
    }
  }, [resetTrigger]);

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    // Always trigger input change to notify parent
    if (onInputChange) {
        onInputChange();
    }
  };

  const handleTemplateSelect = useCallback((template) => {
    setConfig(prev => {
        // Prevent unnecessary updates if already selected
        if (prev.templateId === template.id) return prev;
        
        return {
            ...prev,
            templateId: template.id,
            layoutSlug: template.layout_key, // Maintain compatibility
        };
    });
  }, [setConfig]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 custom-scrollbar">
      {/* Template Selection */}
      <TemplateSelector 
        selectedTemplateId={config.templateId} 
        onSelect={handleTemplateSelect} 
        moduleType="cable"
      />

      <hr className="border-slate-800" />

      {/* SINGLE MODE INPUTS */}
      {mode === 'single' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="dc-label">Device A</label>
              <input
                ref={deviceARef}
                value={config.aSideDevice}
                onChange={(e) => handleChange('aSideDevice', e.target.value)}
                placeholder="Device A"
                className="dc-input"
              />
            </div>
            <div>
              <label className="dc-label">Port A</label>
              <input
                value={config.portAStart}
                onChange={(e) => handleChange('portAStart', e.target.value)}
                placeholder="Port A"
                className="dc-input"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-center text-slate-600">
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
              <label className="dc-label">Device B</label>
              <input
                value={config.zSideDevice}
                onChange={(e) => handleChange('zSideDevice', e.target.value)}
                placeholder="Device B"
                className="dc-input"
              />
            </div>
            <div>
              <label className="dc-label">Port B</label>
              <input
                value={config.portBStart}
                onChange={(e) => handleChange('portBStart', e.target.value)}
                placeholder="Port B"
                className="dc-input"
              />
            </div>
          </div>

          <div>
            <label className="dc-label">Additional Text (Optional)</label>
             <input
                value={config.serialPrefix} // reusing serialPrefix for additional text in single mode if needed, or specific field
                onChange={(e) => handleChange('serialPrefix', e.target.value)}
                placeholder="e.g. Line ID, Notes"
                className="dc-input"
              />
          </div>


          <div className="flex gap-2">
            {!editingItem ? (
              <button
                onClick={onAddSingle}
                className="dc-btn-primary w-full"
              >
                <Plus className="h-4 w-4" />
                Add Connection
              </button>
            ) : (
              <>
                 <button
                  onClick={onUpdateSingle}
                  className="dc-btn-success flex-1"
                >
                  Save Changes
                </button>
                 <button
                  onClick={onCancelEdit}
                  className="dc-btn-ghost border border-slate-600"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* BATCH MODE INPUTS */}
      {mode === 'batch' && (
        <div className="flex flex-col gap-3">
           <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="dc-label">Device A</label>
              <input
                value={config.aSideDevice}
                onChange={(e) => handleChange('aSideDevice', e.target.value)}
                className="dc-input"
              />
            </div>
            <div>
              <label className="dc-label">Device B</label>
              <input
                value={config.zSideDevice}
                onChange={(e) => handleChange('zSideDevice', e.target.value)}
                className="dc-input"
              />
            </div>
          </div>

          <div>
             <label className="dc-section-label mb-2 block">Port Range A</label>
             <div className="grid grid-cols-3 gap-2">
               <div>
                 <input
                  type="number"
                  placeholder="Start"
                  value={config.portAStart}
                  onChange={(e) => handleChange('portAStart', e.target.value)}
                  className="dc-input"
                 />
                 <span className="text-[10px] text-slate-500 block mt-1">Start-Nr.</span>
               </div>
               <div>
                  <input
                  type="number"
                  placeholder="Count"
                  value={config.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  className="dc-input"
                 />
                 <span className="text-[10px] text-slate-500 block mt-1">Anzahl</span>
               </div>
               <div>
                 <input
                  type="number"
                  placeholder="Step"
                  value={config.portStep}
                  onChange={(e) => handleChange('portStep', e.target.value)}
                  className="dc-input"
                 />
                 <span className="text-[10px] text-slate-500 block mt-1">Schritt</span>
               </div>
             </div>
          </div>

          <div>
             <label className="dc-section-label mb-2 block">Port Range B (Start)</label>
             <div className="grid grid-cols-1 gap-2">
               <input
                type="number"
                placeholder="Start Port B"
                value={config.portBStart}
                onChange={(e) => handleChange('portBStart', e.target.value)}
                className="dc-input"
               />
               <span className="text-[10px] text-slate-500">Start-Port für Seite B (wird automatisch hochgezählt)</span>
             </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoNumber"
                checked={!!config.useAutoNumbering}
                onChange={(e) => handleChange('useAutoNumbering', e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoNumber" className="text-sm text-slate-300">Auto-numbering (Pad 3)</label>
            </div>
            <span className="text-[10px] text-slate-500 ml-6">Generiert eine laufende Nummer (z.B. 001, 002...)</span>
          </div>
          
           <div>
            <label className="dc-label">Prefix (Optional)</label>
             <input
                value={config.serialPrefix}
                onChange={(e) => handleChange('serialPrefix', e.target.value)}
                className="dc-input"
              />
          </div>

          <button
            onClick={onGenerateBatch}
            className="dc-btn-primary w-full"
          >
            <Plus className="h-4 w-4" />
            Generate Connections
          </button>
        </div>
      )}
    </div>
  );
}
