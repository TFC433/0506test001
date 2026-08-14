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

  function localDateFromDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function localToday() {
    return localDateFromDate(new Date());
  }

  function parseTimestamp(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const text = String(value).trim();
    if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    const normalized = text.replace(' ', 'T');
    const fallback = new Date(normalized);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  function localDateForTimestamp(value) {
    return localDateFromDate(parseTimestamp(value));
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
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) return text.slice(0, 10);
    const date = parseTimestamp(value);
    if (!date) return text.replace('T', ' ').slice(0, 16);
    return `${localDateFromDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    localToday,
    localDateForTimestamp,
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
