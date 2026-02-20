const express = require('express');
const router = express.Router();
const historyService = require('./history.service');

// GET /api/print-history/my
// Returns last 20 jobs for current session (user)
router.get('/my', (req, res, next) => {
    try {
        const sessionId = req.headers['x-session-id'];
        if (!sessionId) {
            const { BadRequestError } = require('../app/http/errors');
            throw new BadRequestError('Missing session ID', 'MISSING_SESSION_ID');
        }
        // Limit 20 as requested
        const history = historyService.getHistory(sessionId, 20);
        res.json({ history });
    } catch (err) {
        next(err);
    }
});

// GET /api/print-history/team
// Returns last 100 jobs global
router.get('/team', (req, res, next) => {
    try {
        const history = historyService.getTeamHistory(100);
        res.json({ history });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
