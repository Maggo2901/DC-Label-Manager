const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const db = require('../../db');
const { BadRequestError, NotFoundError } = require('../../app/http/errors');

const STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage', 'doc-templates');
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(['pdf', 'docx', 'xlsx']);

function ensureStorageRoot() {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

function sanitizeCategory(raw) {
  const normalized = String(raw || 'general').trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return safe || 'general';
}

function getExtension(originalFilename) {
  return path.extname(String(originalFilename || '')).replace('.', '').toLowerCase();
}

function toApiModel(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    originalFilename: row.original_filename,
    fileType: row.file_type,
    category: row.category,
    size: row.size,
    createdAt: row.created_at
  };
}

function getTemplateById(id) {
  const item = db.prepare('SELECT * FROM document_templates WHERE id = ?').get(id);
  if (!item) {
    throw new NotFoundError(`Document template not found: ${id}`, 'DOC_TEMPLATE_NOT_FOUND');
  }
  return item;
}

function resolveTemplateFilePath(item) {
  return path.join(STORAGE_ROOT, item.category, item.id, item.original_filename);
}

function listTemplates({ category, sortBy = 'createdAt', order = 'desc' }) {
  const colMap = {
    name: 'name',
    type: 'file_type',
    fileType: 'file_type',
    createdAt: 'created_at'
  };
  const orderBy = colMap[sortBy] || 'created_at';
  const direction = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  if (category) {
    const safeCategory = sanitizeCategory(category);
    const rows = db.prepare(
      `SELECT * FROM document_templates WHERE category = ? ORDER BY ${orderBy} ${direction}, name ASC`
    ).all(safeCategory);
    return rows.map(toApiModel);
  }

  const rows = db.prepare(
    `SELECT * FROM document_templates ORDER BY ${orderBy} ${direction}, name ASC`
  ).all();
  return rows.map(toApiModel);
}

function getCategories() {
  const rows = db.prepare('SELECT DISTINCT category FROM document_templates ORDER BY category ASC').all();
  return rows.map((row) => row.category);
}

function createTemplate({ file, category, name }) {
  if (!file) {
    throw new BadRequestError('File is required', 'DOC_TEMPLATE_FILE_REQUIRED');
  }

  if (!Buffer.isBuffer(file.buffer)) {
    throw new BadRequestError('Invalid file payload', 'DOC_TEMPLATE_FILE_INVALID');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(`File too large. Max ${MAX_FILE_SIZE_BYTES} bytes`, 'DOC_TEMPLATE_FILE_TOO_LARGE');
  }

  const originalFilename = path.basename(String(file.originalname || '').trim());
  if (!originalFilename) {
    throw new BadRequestError('Filename is required', 'DOC_TEMPLATE_FILENAME_REQUIRED');
  }

  const fileType = getExtension(originalFilename);
  if (!ALLOWED_FILE_TYPES.has(fileType)) {
    throw new BadRequestError('Unsupported file type. Allowed: pdf, docx, xlsx', 'DOC_TEMPLATE_TYPE_INVALID');
  }

  const safeCategory = sanitizeCategory(category);
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  const cleanName = String(name || baseName).trim().slice(0, 255) || baseName;
  const id = randomUUID();

  ensureStorageRoot();
  const targetDir = path.join(STORAGE_ROOT, safeCategory, id);
  fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, originalFilename);
  fs.writeFileSync(targetPath, file.buffer);

  db.prepare(
    `INSERT INTO document_templates
      (id, name, original_filename, file_type, category, size)
      VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, cleanName, originalFilename, fileType, safeCategory, file.size);

  return toApiModel(getTemplateById(id));
}

function removeTemplate(id) {
  const item = getTemplateById(id);
  db.prepare('DELETE FROM document_templates WHERE id = ?').run(id);

  const dir = path.join(STORAGE_ROOT, item.category, item.id);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    // Keep delete operation idempotent even if storage cleanup fails.
    console.error('[DocTemplates] Failed to remove template directory', err);
  }

  return toApiModel(item);
}

module.exports = {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
  sanitizeCategory,
  listTemplates,
  getCategories,
  getTemplateById,
  resolveTemplateFilePath,
  createTemplate,
  removeTemplate
};
