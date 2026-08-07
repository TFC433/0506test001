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

    getForm(activityId) {
      return request(`/activities/${encodeURIComponent(activityId)}/form`);
    },

    getDraftForm(activityId) {
      return request(`/activities/${encodeURIComponent(activityId)}/form/draft`);
    },

    getPublishedForm(activityId) {
      return request(`/activities/${encodeURIComponent(activityId)}/form/published`);
    },

    saveDraft(activityId, items) {
      return jsonRequest('PUT', `/activities/${encodeURIComponent(activityId)}/form/draft`, { items });
    },

    discardDraft(activityId) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/form/discard-draft`);
    },

    publishDraft(activityId) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/form/publish`);
    }
  });
})();
