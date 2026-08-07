const express = require('express');

const router = express.Router();

function getController(req) {
    const services = req.app.get('services');
    if (!services || !services.activityIntelligenceController) {
        throw new Error('ActivityIntelligenceController is not initialized.');
    }
    return services.activityIntelligenceController;
}

router.get('/activities', (req, res, next) => getController(req).listActivities(req, res, next));
router.post('/activities', (req, res, next) => getController(req).createActivity(req, res, next));
router.get('/activities/:activityId', (req, res, next) => getController(req).getActivity(req, res, next));
router.patch('/activities/:activityId', (req, res, next) => getController(req).updateActivity(req, res, next));
router.post('/activities/:activityId/duplicate', (req, res, next) => getController(req).duplicateActivity(req, res, next));

router.get('/activities/:activityId/form', (req, res, next) => getController(req).getForm(req, res, next));
router.get('/activities/:activityId/form/draft', (req, res, next) => getController(req).getDraftForm(req, res, next));
router.get('/activities/:activityId/form/published', (req, res, next) => getController(req).getPublishedForm(req, res, next));
router.put('/activities/:activityId/form/draft', (req, res, next) => getController(req).saveDraft(req, res, next));
router.post('/activities/:activityId/form/discard-draft', (req, res, next) => getController(req).discardDraft(req, res, next));
router.post('/activities/:activityId/form/publish', (req, res, next) => getController(req).publishDraft(req, res, next));

router.get('/activities/:activityId/submissions', (req, res, next) => getController(req).listSubmissions(req, res, next));
router.post('/activities/:activityId/submissions', (req, res, next) => getController(req).createSubmission(req, res, next));
router.get('/submissions/:submissionId', (req, res, next) => getController(req).getSubmission(req, res, next));
router.patch('/submissions/:submissionId', (req, res, next) => getController(req).updateSubmission(req, res, next));
router.post('/submissions/:submissionId/void', (req, res, next) => getController(req).voidSubmission(req, res, next));
router.post('/submissions/:submissionId/restore', (req, res, next) => getController(req).restoreSubmission(req, res, next));

module.exports = router;
