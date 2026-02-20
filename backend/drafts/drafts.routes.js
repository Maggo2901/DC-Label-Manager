const express = require('express');
const router = express.Router();
const draftsController = require('./drafts.controller');

router.post('/save', draftsController.saveDraft);
router.get('/load', draftsController.loadDraft);

module.exports = router;
