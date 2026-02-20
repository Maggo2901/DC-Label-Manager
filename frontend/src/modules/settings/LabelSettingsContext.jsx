import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsApi } from '../../shared/api/platformApi';

const LabelSettingsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useLabelSettings = () => {
  const context = useContext(LabelSettingsContext);
  if (!context) {
    throw new Error('useLabelSettings must be used within a LabelSettingsProvider');
  }
  return context;
};

export const LabelSettingsProvider = ({ children, activeModuleId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async () => {
    if (!activeModuleId) return;
    setIsLoading(true);
    try {
      const data = await settingsApi.listTemplates(activeModuleId);
      setTemplates(data);
      // Auto-select default if no active template, or if active template is not in the new list
      // (Simple check: just reset if we switched modules)
      const def = data.find(t => t.isDefault);
      setActiveTemplate(def || (data.length > 0 ? data[0] : null));
    } catch (error) {
      console.error('Failed to load templates', error);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleId]);

  const openSettings = () => setIsModalOpen(true);
  const closeSettings = () => setIsModalOpen(false);

  const applyTemplate = (template) => {
    setActiveTemplate(template);
  };

  const saveTemplate = async (name, layoutKey, config) => {
    try {
        await settingsApi.createTemplate({ moduleType: activeModuleId, name, layoutKey, pageConfig: config, dataSchema: {} });
        await fetchTemplates();
    } catch (e) {
        console.error("Failed to save template", e);
        throw e;
    }
  };

  const updateTemplate = async (id, name, layoutKey, config) => {
     try {
        await settingsApi.updateTemplate(id, { name, layoutKey, pageConfig: config, dataSchema: {} });
        await fetchTemplates();
    } catch (e) {
        console.error("Failed to update template", e);
        throw e;
    } 
  };
  
  const deleteTemplate = async (id) => {
      try {
        await settingsApi.deleteTemplate(id);
        if (activeTemplate && activeTemplate.id === id) {
            setActiveTemplate(null);
        }
        await fetchTemplates();
    } catch (e) {
        console.error("Failed to delete template", e);
        throw e;
    }
  };

  const setDefault = async (id) => {
      try {
          await settingsApi.setDefault(id);
          await fetchTemplates();
      } catch (e) {
          console.error("Failed to set default", e);
          throw e;
      }
  }

  const value = {
    isModalOpen,
    openSettings,
    closeSettings,
    templates,
    activeTemplate,
    applyTemplate,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    setDefault,
    refreshTemplates: fetchTemplates,
    isLoading,
    activeModuleId
  };

  return (
    <LabelSettingsContext.Provider value={value}>
      {children}
    </LabelSettingsContext.Provider>
  );
};
