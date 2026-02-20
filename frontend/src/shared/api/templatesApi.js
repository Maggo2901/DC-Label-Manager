/**
 * @deprecated Use settingsApi from './platformApi' instead.
 * This file re-exports settingsApi for backward compatibility.
 */
import { settingsApi } from './platformApi';

export const templatesApi = {
  getAll: settingsApi.listTemplates,
  create: settingsApi.createTemplate,
  update: settingsApi.updateTemplate,
  delete: settingsApi.deleteTemplate,
  setDefault: settingsApi.setDefault
};
