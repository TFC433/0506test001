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

    hardDeleteActivity = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.hardDeleteActivity(req.params.activityId, req.user);
            res.json({ success: true, data });
        });
    };

    getForm = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getForm(req.params.activityId, formContextFromRequest(req));
            res.json({ success: true, data });
        });
    };

    getDraftForm = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getDraftForm(req.params.activityId, formContextFromRequest(req));
            res.json({ success: true, data });
        });
    };

    getPublishedForm = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getPublishedForm(req.params.activityId, formContextFromRequest(req));
            res.json({ success: true, data });
        });
    };

    saveDraft = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.saveDraft(req.params.activityId, bodyWithFormContext(req), req.user);
            res.json({ success: true, data });
        });
    };

    discardDraft = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.discardDraft(req.params.activityId, req.user, formContextFromRequest(req));
            res.json({ success: true, data });
        });
    };

    publishDraft = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.publishDraft(req.params.activityId, req.user, formContextFromRequest(req));
            res.json({ success: true, data });
        });
    };

    initializeFormContext = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.initializeFormContext(req.params.activityId, req.body, req.user);
            res.status(201).json({ success: true, data });
        });
    };

    uploadMedia = async (req, res) => {
        await this._handle(res, async () => {
            const upload = parseMultipartImageUpload(req);
            const data = await this.activityIntelligenceService.uploadFormMedia({
                file: upload.file,
                activityId: upload.fields.activityId,
                itemKey: upload.fields.itemKey
            });
            res.status(201).json({ success: true, data });
        });
    };

    analyzeActivity = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.analyzeActivity(req.params.activityId, req.body, req.user);
            res.json({ success: true, data });
        });
    };

    listSubmissions = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.listSubmissions(req.params.activityId, req.query, req.user);
            res.json({ success: true, data });
        });
    };

    getFormAssistSuggestions = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getFormAssistSuggestions(req.params.activityId, req.query);
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
            const data = await this.activityIntelligenceService.getSubmission(req.params.submissionId, req.user);
            res.json({ success: true, data });
        });
    };

    saveAdditionalVisitor = async (req, res) => {
        await this._handle(res, async () => {
            const payload = req.params.supplementId
                ? { ...(req.body || {}), supplementId: req.params.supplementId }
                : req.body;
            const data = await this.activityIntelligenceService.saveAdditionalVisitor(req.params.submissionId, payload, req.user);
            res.json({ success: true, data });
        });
    };

    deleteAdditionalVisitor = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.deleteAdditionalVisitor(req.params.submissionId, req.params.supplementId, req.user);
            res.json({ success: true, data });
        });
    };

    upsertMyContribution = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.upsertMyContribution(req.params.submissionId, req.body, req.user);
            res.json({ success: true, data });
        });
    };

    deleteMyContribution = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.deleteMyContribution(req.params.submissionId, req.user);
            res.json({ success: true, data });
        });
    };

    updateSubmission = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.updateSubmission(req.params.submissionId, req.body, req.user);
            res.json({ success: true, data });
        });
    };

    hardDeleteSubmission = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.hardDeleteSubmission(req.params.submissionId, req.user);
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
        const publicFormAiError = error.code && String(error.code).startsWith('FORM_AI_');
        const message = statusCode >= 500 && !publicFormAiError ? 'Activity Intelligence request failed.' : error.message;
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

const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseMultipartImageUpload(req) {
    const contentType = String(req.headers['content-type'] || '');
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) throw mediaUploadError('Multipart image upload is required.', 'FORM_MEDIA_MULTIPART_REQUIRED');
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw mediaUploadError('Image file is required.', 'FORM_MEDIA_FILE_REQUIRED');

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const parts = multipartParts(req.body, boundary);
    const fields = {};
    let file = null;
    let fileCount = 0;

    parts.forEach(part => {
        const disposition = part.headers['content-disposition'] || '';
        const name = headerParam(disposition, 'name');
        const filename = headerParam(disposition, 'filename');
        if (!name) return;
        if (filename) {
            fileCount += 1;
            if (fileCount > 1) throw mediaUploadError('Upload exactly one image file.', 'FORM_MEDIA_SINGLE_FILE_REQUIRED');
            const mimeType = String(part.headers['content-type'] || '').toLowerCase();
            if (!ALLOWED_MEDIA_TYPES.has(mimeType)) {
                throw mediaUploadError('Unsupported image type. Use JPG, PNG, or WebP.', 'FORM_MEDIA_TYPE_NOT_ALLOWED');
            }
            file = {
                originalName: filename,
                mimeType,
                buffer: part.body
            };
        } else {
            fields[name] = part.body.toString('utf8').trim();
        }
    });

    if (!file || !file.buffer.length) throw mediaUploadError('Image file is required.', 'FORM_MEDIA_FILE_REQUIRED');
    return { fields, file };
}

function multipartParts(body, boundary) {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const headerSeparator = Buffer.from('\r\n\r\n');
    const parts = [];
    let cursor = 0;

    while (cursor < body.length) {
        const boundaryStart = body.indexOf(boundaryBuffer, cursor);
        if (boundaryStart < 0) break;
        let partStart = boundaryStart + boundaryBuffer.length;
        if (body.slice(partStart, partStart + 2).toString('latin1') === '--') break;
        if (body.slice(partStart, partStart + 2).toString('latin1') === '\r\n') partStart += 2;

        const headerEnd = body.indexOf(headerSeparator, partStart);
        if (headerEnd < 0) break;
        const bodyStart = headerEnd + headerSeparator.length;
        const nextBoundary = body.indexOf(Buffer.from(`\r\n--${boundary}`), bodyStart);
        if (nextBoundary < 0) break;

        const headerText = body.slice(partStart, headerEnd).toString('utf8');
        const headers = {};
        headerText.split('\r\n').forEach(line => {
            const index = line.indexOf(':');
            if (index > 0) headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
        });

        parts.push({ headers, body: body.slice(bodyStart, nextBoundary) });
        cursor = nextBoundary + 2;
    }

    return parts;
}

function headerParam(headerValue, key) {
    const match = String(headerValue || '').match(new RegExp(`${key}="([^"]*)"`, 'i'));
    return match ? match[1] : '';
}

function mediaUploadError(message, code) {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = code;
    return error;
}

function formContextFromRequest(req) {
    const query = req.query || {};
    const body = req.body || {};
    return query.formContext || query.form_context || query.context || body.formContext || body.form_context || body.context;
}

function bodyWithFormContext(req) {
    const body = { ...(req.body || {}) };
    const context = formContextFromRequest(req);
    if (context && !body.formContext && !body.form_context && !body.context) body.formContext = context;
    return body;
}

module.exports = ActivityIntelligenceController;
