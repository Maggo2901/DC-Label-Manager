const express = require('express');
const router = express.Router();
const historyController = require('./history.controller');

router.get('/', historyController.listHistory);
router.get('/team', historyController.listTeamHistory); // New endpoint
router.get('/:id', historyController.getJob);
router.post('/:id/resume', historyController.resumeJob);

module.exports = router;
