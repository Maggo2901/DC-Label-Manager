import { deleteJson, getBlob, getJson, postBlob, postFormJson, postJson, putJson } from './httpClient';

const cableApi = {
  listLayouts() {
    return getJson('/api/cable/layouts');
  },
  preview(payload) {
    return postJson('/api/cable/preview', payload);
  },
  generatePdf(payload) {
    return postBlob('/api/cable/generate', payload);
  }
};

const ptouchApi = {
  generate(payload) {
    return postBlob('/api/ptouch/generate', payload);
  }
};

const templateLibraryApi = {
  listTemplates(category) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return getJson(`/api/doc-templates${query}`);
  },
  upload(formData) {
    return postFormJson('/api/doc-templates/upload', formData);
  },
  getById(id) {
    return getJson(`/api/doc-templates/${id}`);
  },
  download(id) {
    return getBlob(`/api/doc-templates/${id}?download=1`);
  },
  delete(id) {
    return deleteJson(`/api/doc-templates/${id}`);
  }
};

const logisticsApi = {
  getStatus() {
    return getJson('/api/logistics');
  }
};

const draftsApi = {
  save(mode, data) {
    // data can be { connections, config } OR just connections array (legacy)
    // We send it as 'payload' to match new backend logic
    return postJson('/api/draft/save', { mode, payload: data });
  },
  load(mode) {
    return getJson(`/api/draft/load?mode=${mode}`);
  }
};

const historyApi = {
  list() {
    return getJson('/api/history');
  },
  listTeam() {
    return getJson('/api/history/team');
  },
  get(id) {
    return getJson(`/api/history/${id}`);
  },
  resume(id, resumeFrom) {
    return postBlob(`/api/history/${id}/resume`, { resume_from: resumeFrom });
  }
};

const printHistoryApi = {
    listMy() {
        return getJson('/api/print-history/my');
    },
    listTeam() {
        return getJson('/api/print-history/team');
    }
};

const settingsApi = {
  listTemplates(moduleType) {
    const query = moduleType ? `?moduleType=${encodeURIComponent(moduleType)}` : '';
    return getJson(`/api/templates${query}`);
  },
  createTemplate(data) {
    return postJson('/api/templates', data);
  },
  updateTemplate(id, data) {
    return putJson(`/api/templates/${id}`, data);
  },
  deleteTemplate(id) {
    return deleteJson(`/api/templates/${id}`);
  },
  setDefault(id) {
    return postJson(`/api/templates/${id}/set-default`);
  }
};

export {
  cableApi,
  ptouchApi,
  templateLibraryApi,
  logisticsApi,
  draftsApi,
  historyApi,
  printHistoryApi,
  settingsApi
};
