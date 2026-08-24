const { performance } = require('perf_hooks');

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

    getOverviewSummary = async (req, res) => {
        await this._handle(res, async () => {
            const data = await this.activityIntelligenceService.getOverviewSummary(req.query, req.user);
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
            // TEMP SUBMISSIONS PERFORMANCE DIAGNOSTIC
            const profile = createSubmissionsProfile(req);
            try {
                const data = await this.activityIntelligenceService.listSubmissions(req.params.activityId, req.query, req.user, {
                    submissionsProfile: profile
                });
                profile.counts.response_submission_count = Array.isArray(data) ? data.length : 0;
                profile.timings.controller_total_ms = elapsedMs(profile.startedAt);
                logSubmissionsProfile(profile);
                res.json({ success: true, data });
            } catch (error) {
                profile.error = error && error.code ? error.code : 'ACTIVITY_INTELLIGENCE_ERROR';
                profile.timings.controller_total_ms = elapsedMs(profile.startedAt);
                logSubmissionsProfile(profile);
                throw error;
            }
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

function createSubmissionsProfile(req) {
    return {
        activityId: req.params && req.params.activityId,
        state: (req.query && req.query.state) || '',
        startedAt: performance.now(),
        timings: {},
        counts: {}
    };
}

function elapsedMs(startedAt) {
    return Number((performance.now() - startedAt).toFixed(3));
}

function formatProfileNumber(value) {
    return Number.isFinite(value) ? value.toFixed(3) : '';
}

function logSubmissionsProfile(profile) {
    if (!profile) return;
    const timings = profile.timings || {};
    const counts = profile.counts || {};
    const lines = [
        '[SUBMISSIONS_PROFILE]',
        `activity_id=${profile.activityId || ''}`,
        `state=${profile.state || ''}`,
        `submission_count=${counts.submission_count || 0}`,
        `response_submission_count=${counts.response_submission_count || 0}`,
        `answer_row_count=${counts.answer_row_count || 0}`,
        `answer_page_count=${counts.answer_page_count || 0}`,
        `form_version_count=${counts.form_version_count || 0}`,
        `form_item_count=${counts.form_item_count || 0}`,
        `card_lookup_count=${counts.card_lookup_count || 0}`,
        `supplement_summary_count=${counts.supplement_summary_count || 0}`,
        `require_activity_ms=${formatProfileNumber(timings.require_activity_ms)}`,
        `base_query_ms=${formatProfileNumber(timings.base_query_ms)}`,
        `answers_ms=${formatProfileNumber(timings.answers_ms)}`,
        `form_items_ms=${formatProfileNumber(timings.form_items_ms)}`,
        `form_versions_ms=${formatProfileNumber(timings.form_versions_ms)}`,
        `form_schema_ms=${formatProfileNumber(timings.form_schema_ms)}`,
        `hydration_parallel_ms=${formatProfileNumber(timings.hydration_parallel_ms)}`,
        `hydration_ms=${formatProfileNumber(timings.hydration_ms)}`,
        `search_filter_ms=${formatProfileNumber(timings.search_filter_ms)}`,
        `reader_total_ms=${formatProfileNumber(timings.reader_total_ms)}`,
        `card_lookup_total_ms=${formatProfileNumber(timings.card_lookup_total_ms)}`,
        `card_enrichment_ms=${formatProfileNumber(timings.card_enrichment_ms)}`,
        `card_enrich_avg_ms=${formatProfileNumber(timings.card_enrich_avg_ms)}`,
        `supplement_summary_ms=${formatProfileNumber(timings.supplement_summary_ms)}`,
        `dto_mapping_ms=${formatProfileNumber(timings.dto_mapping_ms)}`,
        `service_total_ms=${formatProfileNumber(timings.service_total_ms)}`,
        `controller_total_ms=${formatProfileNumber(timings.controller_total_ms)}`,
        'timing_note=answers/form_items/form_versions are parallel nested timings; hydration_parallel_ms is their wall time; controller_total_ms excludes response write'
    ];
    if (profile.error) lines.push(`error=${profile.error}`);
    console.log(lines.join('\n'));
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
