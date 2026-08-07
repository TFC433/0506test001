const express = require('express');

const router = express.Router();
const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const DESIGNER_ROLES = new Set(['super_admin']);

function getController(req) {
    const services = req.app.get('services');
    if (!services || !services.activityIntelligenceController) {
        throw new Error('ActivityIntelligenceController is not initialized.');
    }
    return services.activityIntelligenceController;
}

function requireRole(allowedRoles) {
    return (req, res, next) => {
        const role = req.user && req.user.role;
        if (allowedRoles.has(role)) return next();
        return res.status(403).json({
            success: false,
            error: 'Activity Intelligence permission denied.',
            code: 'ACTIVITY_INTELLIGENCE_FORBIDDEN'
        });
    };
}

router.get('/activities', (req, res, next) => getController(req).listActivities(req, res, next));
router.post('/activities', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).createActivity(req, res, next));
router.get('/activities/:activityId', (req, res, next) => getController(req).getActivity(req, res, next));
router.patch('/activities/:activityId', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).updateActivity(req, res, next));
router.post('/activities/:activityId/duplicate', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).duplicateActivity(req, res, next));

router.get('/activities/:activityId/form', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).getForm(req, res, next));
router.get('/activities/:activityId/form/draft', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).getDraftForm(req, res, next));
router.get('/activities/:activityId/form/published', (req, res, next) => getController(req).getPublishedForm(req, res, next));
router.put('/activities/:activityId/form/draft', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).saveDraft(req, res, next));
router.post('/activities/:activityId/form/discard-draft', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).discardDraft(req, res, next));
router.post('/activities/:activityId/form/publish', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).publishDraft(req, res, next));

router.get('/activities/:activityId/submissions', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).listSubmissions(req, res, next));
router.post('/activities/:activityId/submissions', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).createSubmission(req, res, next));
router.get('/submissions/:submissionId', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).getSubmission(req, res, next));
router.patch('/submissions/:submissionId', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).updateSubmission(req, res, next));
router.post('/submissions/:submissionId/void', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).voidSubmission(req, res, next));
router.post('/submissions/:submissionId/restore', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).restoreSubmission(req, res, next));

module.exports = router;
