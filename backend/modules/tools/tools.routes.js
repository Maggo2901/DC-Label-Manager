const express = require('express');
const timeRoutes = require('./time/time.routes');

const router = express.Router();

router.use('/time', timeRoutes);

module.exports = router;
