import { env } from '../../config/env';

const API_BASE = env.apiBaseUrl;

function buildUrl(path) {
  const rawPath = String(path || '').trim();
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  if (!rawPath.startsWith('/')) {
    return `${API_BASE}/${rawPath}`;
  }

  return `${API_BASE}${rawPath}`;
}

async function request(path, options = {}) {
  return fetch(buildUrl(path), options);
}

async function parseError(response) {
  const payload = await response.json().catch(() => ({}));
  const message = payload?.error?.message || payload?.error || 'Request failed';
  const error = new Error(message);
  error.payload = payload;
  error.status = response.status;
  throw error;
}

import { getSessionId } from '../utils/session'; 

// Helper to generate auth headers
function getAuthHeaders() {
  const headers = {};
  
  // Session ID
  const sessionId = getSessionId();
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }

  // Display Name / Username
  // Prefer 'username' (set by new modal), fallback to 'dc_display_name' (legacy), or default
  const username = localStorage.getItem('username') || localStorage.getItem('dc_display_name');
  if (username) {
    headers['x-display-name'] = encodeURIComponent(username);
    // Also send explicitly as x-generated-by if backend supports it, 
    // but typically we reused x-display-name for this.
    // Let's stick to x-display-name as the primary identity carrier for now.
  }

  return headers;
}

async function requestJson(path, options = {}) {
  const body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };

  const { headers: customHeaders = {}, ...restOptions } = options;

  const response = await request(path, {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...getAuthHeaders(), // Inject headers
      ...customHeaders
    }
  });


  if (!response.ok) {
    await parseError(response);
  }

  return response.json().catch(() => ({}));
}

async function requestBlob(path, options = {}) {
  const { headers: customHeaders = {}, ...restOptions } = options;
  
  // Inject headers here too!
  const response = await request(path, {
    ...restOptions,
    headers: {
      ...getAuthHeaders(), 
      ...customHeaders
    }
  });

  if (!response.ok) {
    await parseError(response);
  }

  const blob = await response.blob();
  
  // Extract filename from Content-Disposition
  const disposal = response.headers.get('content-disposition');

  let filename = 'download.pdf';
  
  if (disposal && disposal.includes('filename=')) {
    // try standard regex
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposal);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    } else {
        // Fallback: simple split
        const parts = disposal.split('filename=');
        if (parts.length > 1) {
            filename = parts[1].split(';')[0].trim().replace(/['"]/g, '');
        }
    }
  }
  

  return { blob, filename };
}

function getJson(path) {
  return requestJson(path, { method: 'GET' });
}

function postJson(path, body) {
  return requestJson(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

function putJson(path, body) {
  return requestJson(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

function deleteJson(path) {
  return requestJson(path, {
    method: 'DELETE'
  });
}

function postBlob(path, body) {
  return requestBlob(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

function getBlob(path) {
  return requestBlob(path, { method: 'GET' });
}

function postFormJson(path, formData) {
  return requestJson(path, {
    method: 'POST',
    body: formData,
    headers: {}
  });
}

export {
  API_BASE,
  getJson,
  postJson,
  putJson,
  deleteJson,
  postBlob,
  getBlob,
  postFormJson,
  requestJson
};
