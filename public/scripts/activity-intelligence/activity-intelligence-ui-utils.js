(function () {
  'use strict';

  const CURRENT_DATE = new Date().toISOString().slice(0, 10);

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function nowStamp() {
    const date = new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function formatDate(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  function formatDateTime(value) {
    if (!value) return '';
    return String(value).replace('T', ' ').slice(0, 16);
  }

  function answerText(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? '是' : '否';
    return value == null ? '' : String(value);
  }

  function recordSummary(record) {
    const answers = record && record.answers ? record.answers : {};
    return answerText(answers.customerName || answers.name || Object.values(answers).find(Boolean) || record?.id || '');
  }

  function activitySubtitle(activity) {
    if (!activity) return '';
    if (activity.exhibitionStart && activity.exhibitionEnd) {
      return `${formatDate(activity.exhibitionStart)} - ${formatDate(activity.exhibitionEnd)}`;
    }
    return '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function emptyState() {
    return { activities: [], records: [], selectedActivityId: null };
  }

  window.AIMStore = Object.freeze({
    CURRENT_DATE,
    nowStamp,
    clone,
    formatDate,
    formatDateTime,
    answerText,
    recordSummary,
    activitySubtitle,
    escapeHtml,
    defaultFields() {
      return [];
    },
    formDesignFromFormFields() {
      return {
        published: { items: [], publishedAt: '' },
        draft: { items: [] }
      };
    },
    reset: emptyState,
    load: emptyState,
    save() {},
    touch(entity, user) {
      if (!entity) return;
      entity.updatedByUserId = user && user.userId;
      entity.updatedByDisplayName = user && user.displayName;
      entity.updatedAt = nowStamp();
    },
    isLocalhost() {
      return false;
    }
  });
})();
