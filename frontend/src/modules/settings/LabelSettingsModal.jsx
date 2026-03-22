import React, { useState, useEffect } from 'react';
import { useLabelSettings } from './LabelSettingsContext';
import { X, Plus, Save, Trash2, CheckCircle, Printer } from 'lucide-react';
import { cableApi } from '../../shared/api/platformApi';

export default function LabelSettingsModal() {
  const { 
    isModalOpen, 
    closeSettings, 
    templates, 
    activeTemplate, 
    applyTemplate, 
    saveTemplate, 
    updateTemplate, 
    deleteTemplate,
    setDefault,
    activeModuleId
  } = useLabelSettings();

  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    layoutKey: '',
    widthMm: 38.1,
    heightMm: 101.6,
    paperType: 'continuous',
    orientation: 0,
    margins: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  const [isDirty, setIsDirty] = useState(false);
  
  // Layout Options
  const [layoutOptions, setLayoutOptions] = useState([]);

  useEffect(() => {
    async function loadLayouts() {
        if (activeModuleId === 'cable') {
            try {
                const res = await cableApi.listLayouts();
                if (res && res.data && res.data.layouts) {
                    setLayoutOptions(res.data.layouts);
                } else if (res && res.layouts) {
                    // Fallback in case API changes to unwrap data
                    setLayoutOptions(res.layouts);
                }
            } catch (err) {
                console.error("Failed to load layouts", err);
            }
        } else {
             // Mock or empty for others for now
             setLayoutOptions([
                 { slug: 'default', name: 'Standard Layout' }
             ]);
        }
    }
    if (isModalOpen) loadLayouts();
  }, [activeModuleId, isModalOpen]);

  const selectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setFormData({
        name: template.name,
        layoutKey: template.layout_key || template.layoutKey || '',
        widthMm: template.pageConfig?.widthMm || template.config?.widthMm || 38.1,
        heightMm: template.pageConfig?.heightMm || template.config?.heightMm || 101.6,
        paperType: template.pageConfig?.paperType || template.config?.paperType || 'continuous',
        orientation: template.pageConfig?.orientation || template.config?.orientation || 0,
        margins: { 
            top: template.pageConfig?.margins?.top || template.config?.margins?.top || 0,
            right: template.pageConfig?.margins?.right || template.config?.margins?.right || 0,
            bottom: template.pageConfig?.margins?.bottom || template.config?.margins?.bottom || 0,
            left: template.pageConfig?.margins?.left || template.config?.margins?.left || 0
        }
    });
    setIsDirty(false);
  };

  const resetForm = () => {
    setSelectedTemplateId('new');
    setFormData({
        name: 'New Template',
        layoutKey: layoutOptions[0]?.slug || '',
        widthMm: 38.1,
        heightMm: 101.6,
        paperType: 'continuous',
        orientation: 0,
        margins: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    setIsDirty(true);
  };

  // Sync selection with active template on open, or specific selection
  useEffect(() => {
    if (isModalOpen) {
        if (activeTemplate && activeTemplate.id !== selectedTemplateId) {
            selectTemplate(activeTemplate);
        } else if (!activeTemplate && templates.length > 0 && !selectedTemplateId) {
            selectTemplate(templates[0]);
        } else if (templates.length === 0) {
            resetForm();
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, activeTemplate, templates]);

  const handleSave = async () => {
      const config = {
          widthMm: parseFloat(formData.widthMm),
          heightMm: parseFloat(formData.heightMm),
          paperType: formData.paperType,
          orientation: parseInt(formData.orientation),
          margins: {
              top: parseFloat(formData.margins.top),
              right: parseFloat(formData.margins.right),
              bottom: parseFloat(formData.margins.bottom),
              left: parseFloat(formData.margins.left)
          }
      };

      if (selectedTemplateId === 'new') {
          await saveTemplate(formData.name, formData.layoutKey, config);
      } else {
          await updateTemplate(selectedTemplateId, formData.name, formData.layoutKey, config);
      }
      setIsDirty(false);
  };

  const handleDelete = async () => {
      if (selectedTemplateId && selectedTemplateId !== 'new') {
          if (confirm('Are you sure you want to delete this template?')) {
              await deleteTemplate(selectedTemplateId);
              // meaningful selection update handled by effect or manual
              if (templates.length > 0) selectTemplate(templates[0]);
              else resetForm();
          }
      }
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="flex h-[600px] w-[900px] overflow-hidden rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
        
        {/* Sidebar List */}
        <div className="flex w-72 flex-col border-r border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <h2 className="font-semibold text-slate-200">Templates</h2>
            <button 
                onClick={resetForm} 
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" 
                title="New Template"
            >
                <Plus size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {templates.map(t => (
              <div 
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group
                    ${selectedTemplateId === t.id 
                        ? 'bg-indigo-500/10 text-white border-l-2 border-indigo-500' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-l-2 border-transparent'
                    }
                `}
              >
                <div className="flex items-center gap-3 truncate">
                    <span className="truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {activeTemplate?.id === t.id && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Active</span>
                    )}
                    {t.is_default && <CheckCircle size={14} className="text-emerald-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Printer size={20} />
                </div>
                Label Configuration 
                <div className="ml-4 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wide border border-indigo-500/30">
                    {activeModuleId}
                </div>
            </h2>
            <button 
                onClick={closeSettings} 
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid gap-6">
                
                {/* Basic Info */}
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="dc-label uppercase">Template Name</span>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => { setFormData({...formData, name: e.target.value}); setIsDirty(true); }}
                                className="dc-input"
                                placeholder="e.g. Standard Shipping Label"
                            />
                        </label>
                        <label className="block">
                            <span className="dc-label uppercase">Base Layout</span>
                            <select
                                value={formData.layoutKey}
                                onChange={e => { setFormData({...formData, layoutKey: e.target.value}); setIsDirty(true); }}
                                className="dc-select"
                            >
                                <option value="" disabled>Select Layout</option>
                                {layoutOptions.map(l => (
                                    <option key={l.slug} value={l.slug}>{l.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Dimensions */}
                    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            Dimensions <span className="text-xs font-normal text-slate-500">(mm)</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label>
                                <span className="dc-label">Width</span>
                                <input 
                                    type="number" step="0.1"
                                    value={formData.widthMm}
                                    onChange={e => { setFormData({...formData, widthMm: e.target.value}); setIsDirty(true); }}
                                    className="dc-input"
                                />
                            </label>
                            <label>
                                <span className="dc-label">Height</span>
                                <input 
                                    type="number" step="0.1"
                                    value={formData.heightMm}
                                    onChange={e => { setFormData({...formData, heightMm: e.target.value}); setIsDirty(true); }}
                                    className="dc-input"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Margins */}
                    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            Margins <span className="text-xs font-normal text-slate-500">(mm)</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <label>
                                <span className="dc-section-label mb-1 block">Top</span>
                                <input type="number" step="0.1" value={formData.margins.top} onChange={e => { setFormData({...formData, margins: {...formData.margins, top: e.target.value}}); setIsDirty(true); }} className="dc-input" />
                            </label>
                            <label>
                                <span className="dc-section-label mb-1 block">Right</span>
                                <input type="number" step="0.1" value={formData.margins.right} onChange={e => { setFormData({...formData, margins: {...formData.margins, right: e.target.value}}); setIsDirty(true); }} className="dc-input" />
                            </label>
                            <label>
                                <span className="dc-section-label mb-1 block">Bottom</span>
                                <input type="number" step="0.1" value={formData.margins.bottom} onChange={e => { setFormData({...formData, margins: {...formData.margins, bottom: e.target.value}}); setIsDirty(true); }} className="dc-input" />
                            </label>
                            <label>
                                <span className="dc-section-label mb-1 block">Left</span>
                                <input type="number" step="0.1" value={formData.margins.left} onChange={e => { setFormData({...formData, margins: {...formData.margins, left: e.target.value}}); setIsDirty(true); }} className="dc-input" />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                         <label className="block">
                            <span className="block text-sm font-semibold text-slate-300 mb-2">Paper Type</span>
                            <select 
                                value={formData.paperType}
                                onChange={e => { setFormData({...formData, paperType: e.target.value}); setIsDirty(true); }}
                                className="dc-select"
                            >
                                <option value="continuous">Continuous (Endless)</option>
                                <option value="die-cut">Die-Cut (Gap)</option>
                            </select>
                        </label>
                    </div>
                </div>

            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-6 py-5">
            <div className="flex gap-2">
                {selectedTemplateId !== 'new' && (
                    <button 
                        onClick={() => setDefault(selectedTemplateId)}
                        className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        Set Default
                    </button>
                )}
                 {selectedTemplateId !== 'new' && (
                    <button 
                        onClick={handleDelete}
                        className="rounded-lg px-3 py-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Template"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => applyTemplate({...formData, id: selectedTemplateId, layout_key: formData.layoutKey, pageConfig: { ...formData }})}
                    className="dc-btn-secondary"
                >
                    Use Temporarily
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`dc-btn-primary px-6 shadow-lg ${
                        isDirty 
                        ? 'shadow-indigo-500/20' 
                        : 'cursor-not-allowed !bg-slate-800 !text-slate-500 border border-slate-700'
                    }`}
                >
                    <Save size={16} /> Save Template
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
