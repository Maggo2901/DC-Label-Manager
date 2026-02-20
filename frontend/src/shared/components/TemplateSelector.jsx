import React from 'react';
import { useLabelSettings } from '../../modules/settings/LabelSettingsContext';
import { Settings, ChevronDown, Check } from 'lucide-react';

export default function TemplateSelector() {
  const { 
    templates, 
    activeTemplate, 
    applyTemplate, 
    openSettings,
    isLoading 
  } = useLabelSettings();

  const handleChange = (e) => {
    const templateId = e.target.value;
    // Find full template object or create a proxy if needed
    // We need the full object to apply it via context
    const selected = templates.find(t => String(t.id) === String(templateId));
    if (selected) {
        applyTemplate(selected);
    }
  };

  return (
    <div className="flex items-center gap-2">
        <div className="relative group">
            <select
                value={activeTemplate?.id || ''}
                onChange={handleChange}
                disabled={isLoading}
                className="dc-select appearance-none pl-3 pr-8 min-w-[200px] cursor-pointer"
            >
                {templates.length === 0 && <option value="">No templates found</option>}
                {templates.map(t => (
                    <option key={t.id} value={t.id}>
                        {t.name} {t.isDefault ? '(Default)' : ''}
                    </option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={14} />
            </div>
            
            {/* Hover Tooltip or Status Indicator */}
            {activeTemplate && (
                <div className="absolute top-full left-0 mt-2 w-max max-w-xs p-2 bg-slate-900 border border-slate-700 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 hidden group-hover:block">
                    <div className="text-xs text-slate-400">Layout: <span className="text-slate-200">{activeTemplate.layoutKey}</span></div>
                    {activeTemplate.isDefault && <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1"><Check size={10} /> Default Template</div>}
                </div>
            )}
        </div>

        <button
            onClick={openSettings}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Manage Templates"
        >
            <Settings size={18} />
        </button>
    </div>
  );
}
