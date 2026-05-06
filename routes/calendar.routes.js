// routes/calendar.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/event.controller'); // 共用 event.controller

// --- Calendar Routes ---
// ( /api/calendar/* )

// POST /api/calendar/events
router.post('/events', controller.createCalendarEvent);

// GET /api/calendar/week
router.get('/week', controller.getThisWeekEvents);

module.exports = router;