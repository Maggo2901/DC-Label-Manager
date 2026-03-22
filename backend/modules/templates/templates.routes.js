const express = require('express');
const router = express.Router();
const templatesController = require('./templates.controller');

router.get('/', templatesController.getAll);
router.post('/', express.json(), templatesController.create);
router.put('/:id', express.json(), templatesController.update);
router.delete('/:id', templatesController.delete);
router.post('/:id/set-default', templatesController.setDefault);

module.exports = router;
