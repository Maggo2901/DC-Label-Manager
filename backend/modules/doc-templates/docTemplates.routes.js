const express = require('express');
const multer = require('multer');
const controller = require('./docTemplates.controller');
const { MAX_FILE_SIZE_BYTES } = require('./docTemplates.service');
const { BadRequestError } = require('../../app/http/errors');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES }
});

function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new BadRequestError(`File too large. Max ${MAX_FILE_SIZE_BYTES} bytes`, 'DOC_TEMPLATE_FILE_TOO_LARGE'));
    }

    return next(new BadRequestError(err.message || 'Upload failed', 'DOC_TEMPLATE_UPLOAD_FAILED'));
  });
}

router.post('/upload', uploadMiddleware, controller.uploadTemplate);
router.get('/', controller.listDocTemplates);
router.get('/:id', controller.getDocTemplate);
router.delete('/:id', controller.deleteDocTemplate);

module.exports = router;
