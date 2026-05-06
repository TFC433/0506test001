// routes/sales.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/sales.controller');

// GET /api/sales-analysis
router.get('/', controller.getSalesAnalysis);

module.exports = router;