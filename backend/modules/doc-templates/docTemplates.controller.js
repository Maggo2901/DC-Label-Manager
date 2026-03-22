const fs = require('fs');
const {
  listTemplates,
  getCategories,
  getTemplateById,
  resolveTemplateFilePath,
  createTemplate,
  removeTemplate
} = require('./docTemplates.service');
const { sendSuccess } = require('../../app/http/response');

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function uploadTemplate(req, res, next) {
  try {
    const created = createTemplate({
      file: req.file,
      category: req.body?.category,
      name: req.body?.name
    });
    return sendSuccess(res, { template: created }, 201);
  } catch (error) {
    return next(error);
  }
}

function listDocTemplates(req, res, next) {
  try {
    const items = listTemplates({
      category: req.query?.category,
      sortBy: req.query?.sortBy,
      order: req.query?.order
    });
    const categories = getCategories();
    return sendSuccess(res, { items, categories });
  } catch (error) {
    return next(error);
  }
}

function getDocTemplate(req, res, next) {
  try {
    const item = getTemplateById(req.params.id);
    const wantsFile = req.query?.download === '1' || req.query?.inline === '1' || req.query?.file === '1';

    if (!wantsFile) {
      return sendSuccess(res, {
        template: {
          id: item.id,
          name: item.name,
          originalFilename: item.original_filename,
          fileType: item.file_type,
          category: item.category,
          size: item.size,
          createdAt: item.created_at
        }
      });
    }

    const filePath = resolveTemplateFilePath(item);
    if (!fs.existsSync(filePath)) {
      const err = new Error('Stored file not found');
      err.statusCode = 404;
      err.code = 'DOC_TEMPLATE_FILE_NOT_FOUND';
      throw err;
    }

    const contentType = CONTENT_TYPES[item.file_type] || 'application/octet-stream';
    const disposition = req.query?.inline === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${item.original_filename}"`);
    return res.sendFile(filePath);
  } catch (error) {
    return next(error);
  }
}

function deleteDocTemplate(req, res, next) {
  try {
    const removed = removeTemplate(req.params.id);
    return sendSuccess(res, { template: removed });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadTemplate,
  listDocTemplates,
  getDocTemplate,
  deleteDocTemplate
};
