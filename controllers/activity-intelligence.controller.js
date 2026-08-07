class ActivityIntelligenceController {
    constructor(activityIntelligenceService) {
        this.activityIntelligenceService = activityIntelligenceService;
    }

    listActivities = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.listActivities();
            res.json({ success: true, data });
        });
    };

    createActivity = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.createActivity(req.body, req.user);
            res.status(201).json({ success: true, data });
        });
    };

    getActivity = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getActivity(req.params.activityId);
            res.json({ success: true, data });
        });
    };

    updateActivity = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.updateActivity(req.params.activityId, req.body, req.user);
            res.json({ success: true, data });
        });
    };

    duplicateActivity = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.duplicateActivity(req.params.activityId, req.body, req.user);
            res.status(201).json({ success: true, data });
        });
    };

    getForm = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getForm(req.params.activityId);
            res.json({ success: true, data });
        });
    };

    getDraftForm = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getDraftForm(req.params.activityId);
            res.json({ success: true, data });
        });
    };

    getPublishedForm = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getPublishedForm(req.params.activityId);
            res.json({ success: true, data });
        });
    };

    saveDraft = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.saveDraft(req.params.activityId, req.body, req.user);
            res.json({ success: true, data });
        });
    };

    discardDraft = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.discardDraft(req.params.activityId, req.user);
            res.json({ success: true, data });
        });
    };

    publishDraft = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.publishDraft(req.params.activityId, req.user);
            res.json({ success: true, data });
        });
    };

    listSubmissions = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.listSubmissions(req.params.activityId, req.query);
            res.json({ success: true, data });
        });
    };

    createSubmission = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.createSubmission(req.params.activityId, req.body, req.user);
            res.status(201).json({ success: true, data });
        });
    };

    getSubmission = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getSubmission(req.params.submissionId);
            res.json({ success: true, data });
        });
    };

    updateSubmission = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.updateSubmission(req.params.submissionId, req.body, req.user);
            res.json({ success: true, data });
        });
    };

    voidSubmission = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.voidSubmission(req.params.submissionId, req.user);
            res.json({ success: true, data });
        });
    };

    restoreSubmission = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.restoreSubmission(req.params.submissionId, req.user);
            res.json({ success: true, data });
        });
    };

    async _handle(res, fn) {
        try {
            await fn();
        } catch (error) {
            this._sendError(res, error);
        }
    }

    _sendError(res, error) {
        const statusCode = error.statusCode || this._statusFromError(error);
        const message = statusCode >= 500 ? 'Activity Intelligence request failed.' : error.message;
        if (statusCode >= 500) {
            console.error('[ActivityIntelligenceController] Internal Error:', error.message);
        }
        res.status(statusCode).json({
            success: false,
            error: message,
            code: error.code || 'ACTIVITY_INTELLIGENCE_ERROR'
        });
    }

    _statusFromError(error) {
        if (!error || !error.message) return 500;
        if (error.message.includes('not found')) return 404;
        if (error.message.includes('violates') || error.message.includes('current') || error.message.includes('stale')) return 409;
        if (error.message.includes('invalid') || error.message.includes('required')) return 400;
        return 500;
    }
}

module.exports = ActivityIntelligenceController;
