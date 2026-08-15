(function () {
  'use strict';

  const BASE_URL = '/api/line/activity-intelligence';

  async function request(path, options, retrying) {
    const sessionHeaders = window.ActivityIntelligenceSession && typeof window.ActivityIntelligenceSession.requestHeaders === 'function'
      ? window.ActivityIntelligenceSession.requestHeaders()
      : {};
    const requestOptions = options || {};
    const response = await fetch(`${BASE_URL}${path}`, {
      ...requestOptions,
      credentials: 'same-origin',
      headers: {
        ...(requestOptions.headers || {}),
        ...sessionHeaders
      }
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 401 && !retrying && window.ActivityIntelligenceSession && typeof window.ActivityIntelligenceSession.recoverSession === 'function') {
      const recovered = await window.ActivityIntelligenceSession.recoverSession();
      if (recovered) return request(path, options, true);
    }

    if (!response.ok || !result || result.success === false) {
      throw new Error((result && (result.error || result.message)) || 'Activity Intelligence request failed.');
    }

    return result.data;
  }

  function jsonRequest(method, path, payload) {
    return request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
  }

  function formContextSuffix(formContext) {
    return formContext ? `?formContext=${encodeURIComponent(formContext)}` : '';
  }

  async function lineRequest(path) {
    const sessionHeaders = window.ActivityIntelligenceSession && typeof window.ActivityIntelligenceSession.requestHeaders === 'function'
      ? window.ActivityIntelligenceSession.requestHeaders()
      : {};
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: sessionHeaders
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result || result.success === false) {
      throw new Error((result && (result.error || result.message)) || 'LINE request failed.');
    }
    return result.data;
  }

  window.ActivityIntelligenceApi = Object.freeze({
    listActivities() {
      return request('/activities');
    },

    createActivity(payload) {
      return jsonRequest('POST', '/activities', payload);
    },

    getActivity(activityId) {
      return request(`/activities/${encodeURIComponent(activityId)}`);
    },

    updateActivity(activityId, payload) {
      return jsonRequest('PATCH', `/activities/${encodeURIComponent(activityId)}`, payload);
    },

    duplicateActivity(activityId, payload) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/duplicate`, payload);
    },

    hardDeleteActivity(activityId) {
      return request(`/activities/${encodeURIComponent(activityId)}`, { method: 'DELETE' });
    },

    getForm(activityId, formContext) {
      return request(`/activities/${encodeURIComponent(activityId)}/form${formContextSuffix(formContext)}`);
    },

    getDraftForm(activityId, formContext) {
      return request(`/activities/${encodeURIComponent(activityId)}/form/draft${formContextSuffix(formContext)}`);
    },

    getPublishedForm(activityId, formContext) {
      return request(`/activities/${encodeURIComponent(activityId)}/form/published${formContextSuffix(formContext)}`);
    },

    saveDraft(activityId, items, formContext) {
      return jsonRequest('PUT', `/activities/${encodeURIComponent(activityId)}/form/draft`, { items, ...(formContext ? { formContext } : {}) });
    },

    discardDraft(activityId, formContext) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/form/discard-draft`, formContext ? { formContext } : {});
    },

    publishDraft(activityId, formContext) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/form/publish`, formContext ? { formContext } : {});
    },

    uploadMedia(file, metadata) {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(metadata || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') formData.append(key, value);
      });
      return request('/media', {
        method: 'POST',
        body: formData
      });
    },

    analyzeActivity(activityId, payload) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/ai-analysis`, payload);
    },

    getFormAssistSuggestions(activityId, query) {
      const params = new URLSearchParams();
      Object.entries(query || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, value);
      });
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return request(`/activities/${encodeURIComponent(activityId)}/form-assist/suggestions${suffix}`);
    },

    listSubmissions(activityId, query) {
      const params = new URLSearchParams();
      Object.entries(query || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, value);
      });
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return request(`/activities/${encodeURIComponent(activityId)}/submissions${suffix}`);
    },

    createSubmission(activityId, payload) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/submissions`, payload);
    },

    getSubmission(submissionId) {
      return request(`/submissions/${encodeURIComponent(submissionId)}`);
    },

    updateSubmission(submissionId, payload) {
      return jsonRequest('PATCH', `/submissions/${encodeURIComponent(submissionId)}`, payload);
    },

    hardDeleteSubmission(submissionId) {
      return request(`/submissions/${encodeURIComponent(submissionId)}`, { method: 'DELETE' });
    },

    voidSubmission(submissionId) {
      return jsonRequest('POST', `/submissions/${encodeURIComponent(submissionId)}/void`);
    },

    restoreSubmission(submissionId) {
      return jsonRequest('POST', `/submissions/${encodeURIComponent(submissionId)}/restore`);
    },

    listRawCards() {
      return lineRequest('/api/line/leads');
    }
  });
})();
