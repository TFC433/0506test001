const express = require('express');

const router = express.Router();
const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const DESIGNER_ROLES = new Set(['super_admin']);
const SUBMISSION_ROLES = new Set(['recorder', 'admin', 'super_admin']);
const HARD_DELETE_ROLES = new Set(['super_admin']);
const MEDIA_UPLOAD_LIMIT = '5mb';

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

function isGuestAccess(req) {
    return req.user && req.user.accessClass === 'guest' && req.user.whitelisted === false;
}

function sendForbidden(res) {
    return res.status(403).json({
        success: false,
        error: 'Activity Intelligence permission denied.',
        code: 'ACTIVITY_INTELLIGENCE_FORBIDDEN'
    });
}

function requireSubmissionCreateAccess(req, res, next) {
    const role = req.user && req.user.role;
    if (SUBMISSION_ROLES.has(role)) return next();
    if (isGuestAccess(req)) {
        if (req.body && req.body.cardId) {
            return res.status(403).json({
                success: false,
                error: 'Activity Intelligence card linking is not allowed for guest access.',
                code: 'ACTIVITY_INTELLIGENCE_GUEST_CARD_FORBIDDEN'
            });
        }
        return next();
    }
    return sendForbidden(res);
}

function requireSubmissionListAccess(req, res, next) {
    const role = req.user && req.user.role;
    if (SUBMISSION_ROLES.has(role)) return next();
    if (isGuestAccess(req)) {
        req.query = {
            ...(req.query || {}),
            recorderUserId: req.user.userId
        };
        return next();
    }
    return sendForbidden(res);
}

async function requireSubmissionReadAccess(req, res, next) {
    try {
        const role = req.user && req.user.role;
        if (SUBMISSION_ROLES.has(role)) return next();
        if (!isGuestAccess(req) || !req.user.userId) return sendForbidden(res);

        const services = req.app.get('services');
        const service = services && services.activityIntelligenceService;
        if (!service) throw new Error('ActivityIntelligenceService is not initialized.');

        const submission = await service.getSubmission(req.params.submissionId);
        if (!submission || submission.createdByUserId !== req.user.userId) return sendForbidden(res);
        req.activityIntelligenceSubmission = submission;
        return next();
    } catch (error) {
        return next(error);
    }
}

function requireSubmissionUpdateAccess(req, res, next) {
    const role = req.user && req.user.role;
    if (SUBMISSION_ROLES.has(role)) return next();
    if (isGuestAccess(req)) {
        if (req.body && req.body.cardId) {
            return res.status(403).json({
                success: false,
                error: 'Activity Intelligence card linking is not allowed for guest access.',
                code: 'ACTIVITY_INTELLIGENCE_GUEST_CARD_FORBIDDEN'
            });
        }
        return next();
    }
    return sendForbidden(res);
}

function isAdminRole(req) {
    return req.user && ADMIN_ROLES.has(req.user.role);
}

function scopeSubmissionList(req, res, next) {
    if (isAdminRole(req)) return next();
    if (isGuestAccess(req)) return next();
    if (!req.user || req.user.role !== 'recorder') {
        return res.status(403).json({
            success: false,
            error: 'Activity Intelligence permission denied.',
            code: 'ACTIVITY_INTELLIGENCE_FORBIDDEN'
        });
    }
    return next();
}

async function requireSubmissionAccess(req, res, next) {
    try {
        if (isAdminRole(req)) return next();
        if (!req.user || (req.user.role !== 'recorder' && !isGuestAccess(req))) {
            return res.status(403).json({
                success: false,
                error: 'Activity Intelligence permission denied.',
                code: 'ACTIVITY_INTELLIGENCE_FORBIDDEN'
            });
        }
        if (!req.user.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authenticated actor identity is unavailable.',
                code: 'ACTOR_UNAVAILABLE'
            });
        }

        const services = req.app.get('services');
        const service = services && services.activityIntelligenceService;
        if (!service) throw new Error('ActivityIntelligenceService is not initialized.');

        const submission = await service.getSubmission(req.params.submissionId);
        if (!submission || submission.createdByUserId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                error: 'Activity Intelligence permission denied.',
                code: 'ACTIVITY_INTELLIGENCE_FORBIDDEN'
            });
        }
        req.activityIntelligenceSubmission = submission;
        return next();
    } catch (error) {
        return next(error);
    }
}

router.get('/activities', (req, res, next) => getController(req).listActivities(req, res, next));
router.post('/activities', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).createActivity(req, res, next));
router.get('/activities/:activityId', (req, res, next) => getController(req).getActivity(req, res, next));
router.patch('/activities/:activityId', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).updateActivity(req, res, next));
router.delete('/activities/:activityId', requireRole(HARD_DELETE_ROLES), (req, res, next) => getController(req).hardDeleteActivity(req, res, next));
router.post('/activities/:activityId/duplicate', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).duplicateActivity(req, res, next));

router.get('/activities/:activityId/form', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).getForm(req, res, next));
router.get('/activities/:activityId/form/draft', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).getDraftForm(req, res, next));
router.get('/activities/:activityId/form/published', (req, res, next) => getController(req).getPublishedForm(req, res, next));
router.put('/activities/:activityId/form/draft', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).saveDraft(req, res, next));
router.post('/activities/:activityId/form/discard-draft', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).discardDraft(req, res, next));
router.post('/activities/:activityId/form/publish', requireRole(DESIGNER_ROLES), (req, res, next) => getController(req).publishDraft(req, res, next));
router.post(
    '/media',
    requireRole(DESIGNER_ROLES),
    express.raw({
        type: req => String(req.headers['content-type'] || '').toLowerCase().startsWith('multipart/form-data'),
        limit: MEDIA_UPLOAD_LIMIT
    }),
    (req, res, next) => getController(req).uploadMedia(req, res, next)
);
router.post('/activities/:activityId/ai-analysis', requireRole(ADMIN_ROLES), (req, res, next) => getController(req).analyzeActivity(req, res, next));

router.get('/activities/:activityId/submissions', requireSubmissionListAccess, scopeSubmissionList, (req, res, next) => getController(req).listSubmissions(req, res, next));
router.post('/activities/:activityId/submissions', requireSubmissionCreateAccess, (req, res, next) => getController(req).createSubmission(req, res, next));
router.get('/submissions/:submissionId', requireSubmissionReadAccess, (req, res, next) => getController(req).getSubmission(req, res, next));
router.patch('/submissions/:submissionId', requireSubmissionUpdateAccess, requireSubmissionAccess, (req, res, next) => getController(req).updateSubmission(req, res, next));
router.delete('/submissions/:submissionId', requireRole(HARD_DELETE_ROLES), (req, res, next) => getController(req).hardDeleteSubmission(req, res, next));
router.post('/submissions/:submissionId/void', requireRole(SUBMISSION_ROLES), requireSubmissionAccess, (req, res, next) => getController(req).voidSubmission(req, res, next));
router.post('/submissions/:submissionId/restore', requireRole(SUBMISSION_ROLES), requireSubmissionAccess, (req, res, next) => getController(req).restoreSubmission(req, res, next));

module.exports = router;
