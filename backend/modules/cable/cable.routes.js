const express = require('express');
const router = express.Router();
const cableController = require('./cable.controller');
const rateLimit = require('express-rate-limit');

// Rate Limiter: 100 requests per 15 minutes
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, 
  legacyHeaders: false,
});

// JSON Body Limit for this route specifically (10MB)
const jsonLimit = express.json({ limit: '10mb' });

// Generate Labels (PDF)
router.post('/generate', generateLimiter, jsonLimit, cableController.generateLabels);

// List Available Layouts
router.get('/layouts', cableController.listLayouts);

// Get Specific Layout Details
router.get('/layouts/:id', cableController.getLayoutDetails);

module.exports = router;
