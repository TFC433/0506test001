// routes/event.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/event.controller');

// --- Event Log Routes ---
// ( /api/events/* )

// [Phase 8 Fix] Dashboard route MUST come before :eventId to avoid capture
router.get('/dashboard', controller.getDashboardData);

router.post('/', controller.createEventLog);
router.get('/:eventId', controller.getEventLogById);
router.put('/:eventId', controller.updateEventLog);
router.delete('/:eventId', controller.deleteEventLog);

module.exports = router;