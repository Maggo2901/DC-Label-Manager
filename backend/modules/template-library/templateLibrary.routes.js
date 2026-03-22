const express = require('express');
const controller = require('./templateLibrary.controller');

const router = express.Router();

router.get('/templates', controller.listTemplates);
router.post('/generate', controller.generateTemplate);

module.exports = router;
