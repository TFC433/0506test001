(function () {
  'use strict';

  const BASE_URL = '/api/activity-intelligence';

  function requireAuthedFetch() {
    if (typeof window.authedFetch !== 'function') {
      throw new Error('Activity Intelligence requires the shared authedFetch service.');
    }
    return window.authedFetch;
  }

  async function request(path, options) {
    const authedFetch = requireAuthedFetch();
    const result = await authedFetch(`${BASE_URL}${path}`, {
      skipRefresh: true,
      ...(options || {})
    });

    if (!result || result.success === false) {
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

    updateActivity(activityId, payload) {
      return jsonRequest('PATCH', `/activities/${encodeURIComponent(activityId)}`, payload);
    },

    duplicateActivity(activityId, payload) {
      return jsonRequest('POST', `/activities/${encodeURIComponent(activityId)}/duplicate`, payload);
    },

    getForm(activityId) {
      return request(`/activities/${encodeURIComponent(activityId)}/form`);
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
