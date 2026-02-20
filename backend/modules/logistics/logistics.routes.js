const express = require('express');
const controller = require('./logistics.controller');

const router = express.Router();

router.get('/', controller.getLogisticsPlaceholder);

module.exports = router;
