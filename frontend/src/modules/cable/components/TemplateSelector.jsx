import { useState, useEffect } from 'react';
import { templatesApi } from '../../../shared/api/templatesApi';

export default function TemplateSelector({ selectedTemplateId, onSelect, moduleType = 'cable' }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadTemplates() {
      try {
        setLoading(true);
        const data = await templatesApi.getAll(moduleType);
        if (mounted) {
          setTemplates(data);
        }
      } catch (err) {
        console.error("Failed to load templates", err);
        if (mounted) setError("Failed to load templates");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTemplates();
    return () => { mounted = false; };
  }, [moduleType]);

  // Auto-select default
  useEffect(() => {
    if (!loading && templates.length > 0 && !selectedTemplateId) {
        const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
        if (defaultTemplate) {
            onSelect(defaultTemplate);
        }
    }
  }, [loading, templates, selectedTemplateId, onSelect]);

  const handleChange = (e) => {
    const templateId = Number(e.target.value);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onSelect(template);
    }
  };

  if (loading) return <div className="text-xs text-slate-500">Loading templates...</div>;
  if (error) return <div className="text-xs text-red-500">Error loading templates</div>;

  return (
    <div>
      <label className="dc-section-label mb-2 block">Template</label>
      <select
        value={selectedTemplateId || ''}
        onChange={handleChange}
        className="dc-select"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.isDefault ? '(Default)' : ''}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-500">
        {templates.find(t => t.id === selectedTemplateId)?.description || 'Select a template'}
      </p>
    </div>
  );
}
