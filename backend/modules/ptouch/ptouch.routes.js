const express = require('express');
const controller = require('./ptouch.controller');

const router = express.Router();

router.post('/generate', controller.generateTapePdf);

module.exports = router;
