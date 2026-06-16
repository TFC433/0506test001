// public/scripts/internal-ops/internal-ops-subscriptions.js
/**
 * @version 1.1.0
 * @date 2026-06-08
 * @description Inline Subscription Ops list, create, edit, and archive UI.
 */

if (typeof window.__subscriptionsCreateOpen === 'undefined') {
    window.__subscriptionsCreateOpen = false;
}

if (typeof window.__subscriptionsCreateTab === 'undefined') {
    window.__subscriptionsCreateTab = 'subscription';
}

if (typeof window.__subscriptionsExpandedEditId === 'undefined') {
    window.__subscriptionsExpandedEditId = null;
}

if (typeof window.__subscriptionsExpandedNoteId === 'undefined') {
    window.__subscriptionsExpandedNoteId = null;
}

if (typeof window.__subscriptionsAllNotesExpanded === 'undefined') {
    window.__subscriptionsAllNotesExpanded = false;
}

if (typeof window.__subscriptionsInlineError === 'undefined') {
    window.__subscriptionsInlineError = '';
}

if (typeof window.__subscriptionOpsOperationMode === 'undefined') {
    window.__subscriptionOpsOperationMode = false;
}

if (typeof window.__subscriptionWonOpportunityOptions === 'undefined') {
    window.__subscriptionWonOpportunityOptions = [];
}

if (typeof window.__subscriptionWonOpportunityLoaded === 'undefined') {
    window.__subscriptionWonOpportunityLoaded = false;
}

if (typeof window.__subscriptionWonOpportunityLoading === 'undefined') {
    window.__subscriptionWonOpportunityLoading = false;
}

if (typeof window.__subscriptionWonOpportunityError === 'undefined') {
    window.__subscriptionWonOpportunityError = '';
}

if (typeof window.__subscriptionSelectedOpportunityId === 'undefined') {
    window.__subscriptionSelectedOpportunityId = '';
}

if (typeof window.__subscriptionSelectedProductId === 'undefined') {
    window.__subscriptionSelectedProductId = '';
}

if (typeof window.__subscriptionOpportunitySearchKeyword === 'undefined') {
    window.__subscriptionOpportunitySearchKeyword = '';
}

const SUBSCRIPTION_STATUS_OPTIONS = [
    '\u9032\u884c\u4e2d',
    '\u5f85\u8655\u7406',
    '\u5df2\u7e8c\u7d04',
    '\u5df2\u7d42\u6b62',
    '\u5df2\u5c01\u5b58'
];

const SUBSCRIPTION_FORM_FIELDS = [
    'manualCustomerName',
    'manualItemName',
    'subscriptionStartDate',
    'subscriptionEndDate',
    'reminderOwnerName',
    'reminderStages',
    'status',
    'notes'
];

const SUBSCRIPTION_OPPORTUNITY_FORM_FIELDS = [
    'manualItemName',
    'subscriptionStartDate',
    'subscriptionEndDate',
    'reminderStages',
    'status',
    'notes'
];

const CUSTOM_REMINDER_FORM_FIELDS = [
    'customSubject',
    'customNote',
    'subscriptionEndDate'
];

const SUBSCRIPTION_REMINDER_STAGE_OPTIONS = ['180', '90', '30'];

const SUBSCRIPTION_COMPATIBILITY_FIELDS = {
    manualCustomerName: 'customerName',
    manualItemName: 'subscriptionItemName',
    subscriptionEndDate: 'endDate',
    reminderOwnerName: 'ownerName'
};

function escapeSubscriptionHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatSubscriptionValue(value) {
    return escapeSubscriptionHtml(value || '-');
}

function getSubscriptionValue(item, field) {
    if (!item) return '';
    if (item[field] !== null && item[field] !== undefined && item[field] !== '') {
        return item[field];
    }

    const fallbackField = SUBSCRIPTION_COMPATIBILITY_FIELDS[field];
    if (fallbackField && item[fallbackField] !== null && item[fallbackField] !== undefined) {
        return item[fallbackField];
    }

    return '';
}

function parseSubscriptionReminderStages(value, useDefault) {
    if ((value === null || value === undefined || value === '') && useDefault) {
        return SUBSCRIPTION_REMINDER_STAGE_OPTIONS.slice();
    }

    return String(value ?? '')
        .split(',')
        .map(stage => stage.trim())
        .filter(stage => SUBSCRIPTION_REMINDER_STAGE_OPTIONS.includes(stage));
}

function formatSubscriptionReminderStages(value) {
    const stages = parseSubscriptionReminderStages(value, false);
    if (stages.length === 0) return '-';
    return stages.map(stage => `${stage} \u5929`).join(' / ');
}

function renderSubscriptionOptions(options, selectedValue, includeBlank) {
    const blank = includeBlank ? '<option value=""></option>' : '';
    return blank + options.map(option => {
        const selected = option === selectedValue ? ' selected' : '';
        return `<option value="${escapeSubscriptionHtml(option)}"${selected}>${escapeSubscriptionHtml(option)}</option>`;
    }).join('');
}

function getSubscriptionRecord(id) {
    return (window.__internalOpsSubscriptionsData || []).find(item => String(item.id) === String(id));
}

function getSelectedSubscriptionOpportunity() {
    const selectedId = String(window.__subscriptionSelectedOpportunityId || '');
    return (window.__subscriptionWonOpportunityOptions || []).find(item => String(item.opportunityId) === selectedId) || null;
}

function getSubscriptionOpportunityById(opportunityId) {
    if (!opportunityId) return null;
    return (window.__subscriptionWonOpportunityOptions || []).find(item => String(item.opportunityId) === String(opportunityId)) || null;
}

function getSubscriptionProductById(opportunity, productId) {
    if (!opportunity || !productId || !Array.isArray(opportunity.products)) return null;
    return opportunity.products.find(item => String(item.productId) === String(productId)) || null;
}

function isCustomReminder(item) {
    return Boolean(item && item.reminderKind === 'custom');
}

function getSubscriptionDisplayModel(item) {
    if (isCustomReminder(item)) {
        return {
            wonDate: '',
            opportunityName: '',
            customerName: '-',
            itemName: getSubscriptionValue(item, 'customSubject'),
            startDate: '',
            endDate: getSubscriptionValue(item, 'subscriptionEndDate'),
            ownerName: '',
            reminderStages: '',
            notes: getSubscriptionValue(item, 'customNote'),
            productLabel: '',
            opportunity: null,
            product: null
        };
    }

    const opportunity = getSubscriptionOpportunityById(item && item.opportunityId);
    const product = getSubscriptionProductById(opportunity, item && item.productId);
    const isOpportunityLinked = Boolean(item && item.sourceType === 'opportunity');

    return {
        wonDate: isOpportunityLinked ? formatSubscriptionDateOnly(opportunity && (opportunity.expectedCloseDate || opportunity.lastUpdateTime)) : '',
        opportunityName: isOpportunityLinked ? (opportunity && opportunity.opportunityName) : '',
        customerName: isOpportunityLinked
            ? (opportunity && opportunity.customerCompany)
            : getSubscriptionValue(item, 'manualCustomerName'),
        itemName: isOpportunityLinked
            ? (getSubscriptionValue(item, 'manualItemName') || (product ? getSubscriptionProductLabel(product) : '\u672a\u9078\u64c7'))
            : getSubscriptionValue(item, 'manualItemName'),
        productLabel: product ? getSubscriptionProductLabel(product) : '',
        startDate: getSubscriptionValue(item, 'subscriptionStartDate'),
        endDate: getSubscriptionValue(item, 'subscriptionEndDate'),
        ownerName: getSubscriptionValue(item, 'reminderOwnerName'),
        reminderStages: getSubscriptionValue(item, 'reminderStages'),
        notes: getSubscriptionValue(item, 'notes'),
        opportunity,
        product
    };
}

function formatSubscriptionDateOnly(value) {
    if (!value) return '';
    return String(value).split('T')[0];
}

function renderSubscriptionInlineMessage() {
    if (!window.__subscriptionsInlineError) return '';
    return `
        <div class="subscription-inline-error" role="status">
            ${escapeSubscriptionHtml(window.__subscriptionsInlineError)}
        </div>
    `;
}

function renderWonOpportunityOptions(selectedValue) {
    const keyword = String(window.__subscriptionOpportunitySearchKeyword || '').toLowerCase();
    const options = window.__subscriptionWonOpportunityOptions || [];
    const filtered = keyword
        ? options.filter(option => {
            const name = String(option.opportunityName || '').toLowerCase();
            const customer = String(option.customerCompany || '').toLowerCase();
            return name.includes(keyword) || customer.includes(keyword);
        })
        : options;
    return renderSubscriptionOpportunityOptions(filtered, selectedValue);
}

function renderSubscriptionOpportunityOptions(options, selectedValue) {
    const items = options.map(option => {
        const selected = String(option.opportunityId) === String(selectedValue) ? ' selected' : '';
        const closeDate = formatSubscriptionDateOnly(option.expectedCloseDate || option.lastUpdateTime);
        const labelParts = [
            option.customerCompany || '',
            option.opportunityName || option.opportunityId,
            closeDate
        ].filter(Boolean);
        return `<option value="${escapeSubscriptionHtml(option.opportunityId)}"${selected}>${escapeSubscriptionHtml(labelParts.join(' - '))}</option>`;
    }).join('');

    return '<option value=""></option>' + items;
}

function renderSubscriptionProductOptions(opportunity, selectedValue) {
    const products = opportunity && Array.isArray(opportunity.products) ? opportunity.products : [];
    const items = products.map(product => {
        const selected = String(product.productId) === String(selectedValue) ? ' selected' : '';
        const unresolvedText = product.isResolved === false ? ' (\u672a\u5c0d\u61c9)' : '';
        const label = product.label || product.productName || product.productId;
        return `<option value="${escapeSubscriptionHtml(product.productId)}"${selected}>${escapeSubscriptionHtml(label + unresolvedText)}</option>`;
    }).join('');

    return '<option value="">\u672a\u9078\u64c7 / \u4e0d\u6307\u5b9a\u7522\u54c1</option>' + items;
}

function getSubscriptionProductLabel(product) {
    if (!product) return '';
    return product.label || product.productName || product.productId || '';
}

function getSubscriptionDaysRemaining(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;

    const today = new Date();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const end = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function getSubscriptionDueState(value) {
    const days = getSubscriptionDaysRemaining(value);
    if (days === null) return '';
    if (days < 0) return 'overdue';
    if (days <= 7) return 'within7';
    return '';
}

function formatSubscriptionDueDate(value) {
    const dateText = formatSubscriptionValue(value);
    const dueState = getSubscriptionDueState(value);
    if (!dueState) return dateText;

    const label = dueState === 'overdue' ? '\u5df2\u903e\u671f' : '7\u5929\u5167';
    return `
        <span class="subscription-due-stack">
            <span>${dateText}</span>
            <span class="subscription-due-badge is-${dueState}">${label}</span>
        </span>
    `;
}

function formatSubscriptionDaysRemaining(value) {
    const days = getSubscriptionDaysRemaining(value);
    if (days === null) return '-';
    if (days < 0) return `\u903e\u671f ${Math.abs(days)} \u5929`;
    if (days === 0) return '\u4eca\u5929';
    return `\u5269 ${days} \u5929`;
}

function getSubscriptionBadgeModel(value) {
    const days = getSubscriptionDaysRemaining(value);
    if (days === null) return { label: '-', tier: 'none' };
    if (days < 0) return { label: '\u5df2\u903e\u671f', tier: 'overdue' };
    if (days === 0) return { label: '\u4eca\u5929', tier: 'today' };
    if (days <= 7) return { label: '7\u5929\u5167', tier: 'within7' };
    if (days <= 30) return { label: '30\u5929\u5167', tier: 'within30' };
    if (days <= 60) return { label: '60\u5929\u5167', tier: 'within60' };
    if (days <= 90) return { label: '90\u5929\u5167', tier: 'within90' };
    if (days <= 120) return { label: '120\u5929\u5167', tier: 'within120' };
    if (days <= 180) return { label: '180\u5929\u5167', tier: 'within180' };
    return { label: '180\u5929\u4ee5\u4e0a', tier: 'over180' };
}

function renderSubscriptionUrgencyBadge(value) {
    const badge = getSubscriptionBadgeModel(value);
    return `<span class="subscription-urgency-badge is-${badge.tier}">${escapeSubscriptionHtml(badge.label)}</span>`;
}

function getSubscriptionStatusLabel(item) {
    return item && item.isArchived === true ? '\u5df2\u5c01\u5b58' : '\u9032\u884c\u4e2d';
}

function getSubscriptionTypeLabel(item) {
    return isCustomReminder(item) ? '\u81ea\u8a02' : '\u8a02\u95b1';
}

function renderSubscriptionPrimaryCell(item, display, id) {
    const editableAttrs = window.__subscriptionOpsOperationMode
        ? ` role="button" tabindex="0" onclick="window.openSubscriptionEditFromName('${id}')" onkeydown="window.handleSubscriptionNameKeydown(event, '${id}')"`
        : ` role="button" tabindex="0" onclick="window.toggleSubscriptionNoteDetail('${id}')" onkeydown="window.handleSubscriptionNameKeydown(event, '${id}')"`;
    const interactionClass = window.__subscriptionOpsOperationMode ? ' is-editable' : ' is-viewable';

    if (isCustomReminder(item)) {
        return `
            <div class="subscription-cell-main subscription-primary-name${interactionClass}"${editableAttrs}>${formatSubscriptionValue(display.itemName)}</div>
            <div class="subscription-cell-sub">\u81ea\u8a02\u63d0\u9192</div>
        `;
    }

    return `
        <div class="subscription-cell-main subscription-primary-name${interactionClass}"${editableAttrs}>${formatSubscriptionValue(display.opportunityName || display.customerName)}</div>
    `;
}

function renderSubscriptionItemNotesCell(item, display) {
    const primary = isCustomReminder(item)
        ? display.notes
        : (display.itemName || display.productLabel);
    const secondary = isCustomReminder(item) ? '' : display.notes;

    return `
        <div class="subscription-cell-main">${formatSubscriptionValue(primary)}</div>
        ${secondary ? `<div class="subscription-cell-sub">${escapeSubscriptionHtml(secondary)}</div>` : ''}
    `;
}

function getSubscriptionDateDay(value) {
    if (!value) return null;
    const rawValue = String(value).trim();
    if (!rawValue) return null;

    const dateMatch = rawValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dateMatch) {
        const year = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        const day = Number(dateMatch[3]);
        const parsed = new Date(year, month - 1, day);
        if (
            parsed.getFullYear() === year &&
            parsed.getMonth() === month - 1 &&
            parsed.getDate() === day
        ) {
            return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
        }
        return null;
    }

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return Math.floor(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) / 86400000);
}

function getSubscriptionPeriodProgress(startDate, endDate) {
    const startDay = getSubscriptionDateDay(startDate);
    const endDay = getSubscriptionDateDay(endDate);
    if (startDay === null || endDay === null) return null;

    const today = new Date();
    const todayDay = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
    const totalDays = endDay - startDay;

    if (totalDays < 0) return null;
    if (totalDays === 0) return todayDay >= endDay ? 100 : 0;

    const elapsedDays = todayDay - startDay;
    return Math.min(Math.max(Math.round((elapsedDays / totalDays) * 100), 0), 100);
}

function getSubscriptionProgressSeverity(percent, display) {
    const daysRemaining = getSubscriptionDaysRemaining(display && display.endDate);
    if (daysRemaining !== null && daysRemaining < 0) return 'critical';
    if (percent >= 100) return 'critical';
    if (percent >= 75) return 'alert';
    if (percent >= 50) return 'warning';
    return 'normal';
}

function getSubscriptionRemainingDaysSeverity(display) {
    const progress = getSubscriptionPeriodProgress(display.startDate, display.endDate);
    if (progress !== null) return getSubscriptionProgressSeverity(progress, display);

    const daysRemaining = getSubscriptionDaysRemaining(display.endDate);
    return daysRemaining !== null && daysRemaining < 0 ? 'critical' : '';
}

function renderSubscriptionPeriodCell(display) {
    return `
        <div class="subscription-period-cell">
            <div class="subscription-period-dates">
                <div class="subscription-period-row">
                    <span class="subscription-period-label">開始</span>
                    <span class="subscription-period-value">${formatSubscriptionValue(display.startDate)}</span>
                </div>
                <div class="subscription-period-row">
                    <span class="subscription-period-label">到期</span>
                    <span class="subscription-period-value">${formatSubscriptionValue(display.endDate)}</span>
                </div>
            </div>
        </div>
    `;
}

function renderSubscriptionTimeProgressCell(display) {
    const progress = getSubscriptionPeriodProgress(display.startDate, display.endDate);
    if (progress === null) {
        return '<span class="subscription-time-progress-empty">-</span>';
    }
    const severity = getSubscriptionProgressSeverity(progress, display);

    return `
        <div class="subscription-time-progress is-${severity}" aria-label="期間進度 ${progress}%">
            <div class="subscription-time-progress-track">
                <span class="subscription-time-progress-fill" style="width: ${progress}%;"></span>
            </div>
            <span class="subscription-time-progress-percent">${progress}%</span>
        </div>
    `;
}

function renderSubscriptionRemainingDaysCell(display) {
    const severity = getSubscriptionRemainingDaysSeverity(display);
    const severityClass = severity ? ` is-${severity}` : '';
    return `<span class="subscription-days-remaining${severityClass}">${escapeSubscriptionHtml(formatSubscriptionDaysRemaining(display.endDate))}</span>`;
}

function renderSubscriptionNoteDetailRow(display) {
    const noteText = display.notes ? escapeSubscriptionHtml(display.notes) : '\u5c1a\u7121\u5099\u8a3b';
    return `
        <tr class="subscription-note-detail-row">
            <td colspan="8" class="subscription-note-detail-cell">
                <div class="subscription-note-detail">
                    <span class="subscription-note-detail-label">\u5099\u8a3b</span>
                    <span class="subscription-note-detail-text">${noteText}</span>
                </div>
            </td>
        </tr>
    `;
}

function renderSubscriptionFormActions(saveFn, cancelFn, archiveId) {
    return `
        <div class="subscription-inline-form-actions">
            <div class="subscription-inline-form-actions-left">
                ${archiveId ? `<button type="button" class="subscription-form-btn is-danger" onclick="window.archiveSubscriptionOp('${archiveId}')">\u5c01\u5b58</button>` : ''}
            </div>
            <div class="subscription-inline-form-actions-right">
                <button type="button" class="subscription-form-btn" onclick="${cancelFn}">\u53d6\u6d88</button>
                <button type="button" class="subscription-form-btn is-save" onclick="${saveFn}">
                    <span class="btn-text">\u5132\u5b58</span>
                </button>
            </div>
        </div>
    `;
}

function getSubscriptionReminderOwnerLabel(opportunity, fallbackOwnerName) {
    return fallbackOwnerName || (opportunity && opportunity.assignee) || '\u672a\u8a2d\u5b9a';
}

function renderSubscriptionOpportunityReference(opportunity, fallbackOwnerName = '') {
    if (!opportunity) return '';

    const closeDate = formatSubscriptionDateOnly(opportunity.expectedCloseDate || opportunity.lastUpdateTime);
    const rows = [
        ['\u6a5f\u6703\u540d\u7a31', opportunity.opportunityName],
        ['\u5ba2\u6236', opportunity.customerCompany],
        ['\u6a5f\u6703\u985e\u578b', opportunity.opportunityType],
        ['\u6210\u4ea4\u65e5', closeDate],
        ['\u5167\u90e8\u63d0\u9192\u5c0d\u8c61', getSubscriptionReminderOwnerLabel(opportunity, fallbackOwnerName)]
    ];

    return `
        <div class="subscription-opportunity-reference">
            ${rows.map(([label, value]) => `
                <div class="subscription-reference-item">
                    <span>${label}</span>
                    <strong>${escapeSubscriptionHtml(value || '-')}</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function renderSubscriptionOpportunityCreateFields(prefix) {
    const opportunity = getSelectedSubscriptionOpportunity();
    const products = opportunity && Array.isArray(opportunity.products) ? opportunity.products : [];
    const searchKeyword = window.__subscriptionOpportunitySearchKeyword || '';

    let stateHtml = '';
    if (window.__subscriptionWonOpportunityLoading) {
        stateHtml = '<div class="subscription-inline-note">\u8f09\u5165\u6210\u4ea4\u6a5f\u6703\u4e2d...</div>';
    } else if (window.__subscriptionWonOpportunityError) {
        stateHtml = `<div class="subscription-inline-note is-error">${escapeSubscriptionHtml(window.__subscriptionWonOpportunityError)}</div>`;
    } else if (window.__subscriptionWonOpportunityLoaded && (window.__subscriptionWonOpportunityOptions || []).length === 0) {
        stateHtml = '<div class="subscription-inline-note">\u76ee\u524d\u6c92\u6709\u53ef\u9078\u7684\u6210\u4ea4\u6a5f\u6703</div>';
    }

    const productState = opportunity && products.length === 0
        ? '<div class="subscription-inline-note">\u9019\u500b\u6a5f\u6703\u6c92\u6709\u53ef\u9078\u7684\u7522\u54c1\u8a18\u9304</div>'
        : '';

    return `
        <div class="subscription-opportunity-create-block">
            <div class="subscription-opportunity-selector">
                <label class="subscription-inline-field">
                    <span>\u6210\u4ea4\u6a5f\u6703 *</span>
                    <input id="${prefix}-opportunitySearch" type="text" value="${escapeSubscriptionHtml(searchKeyword)}" placeholder="\u641c\u5c0b\u6a5f\u6703\u540d\u7a31\u6216\u5ba2\u6236..." oninput="window.filterSubscriptionOpportunities()">
                    <select id="${prefix}-opportunityId" onchange="window.handleSubscriptionOpportunitySelect(this.value)">
                        ${renderWonOpportunityOptions(window.__subscriptionSelectedOpportunityId)}
                    </select>
                </label>
            </div>
            ${stateHtml}
            ${renderSubscriptionOpportunityReference(opportunity)}
            <div class="subscription-inline-grid">
                <label class="subscription-inline-field">
                    <span>\u7522\u54c1\u5e6b\u624b</span>
                    <select id="${prefix}-productId" onchange="window.handleSubscriptionProductSelect(this.value)" ${opportunity ? '' : 'disabled'}>
                        ${renderSubscriptionProductOptions(opportunity, window.__subscriptionSelectedProductId)}
                    </select>
                </label>
            </div>
            ${productState}
        </div>
    `;
}

function renderSubscriptionCreateTabs() {
    const activeTab = window.__subscriptionsCreateTab || 'subscription';
    const tabs = [
        ['subscription', '\u8a02\u95b1\u7522\u54c1\u63d0\u9192'],
        ['custom', '\u81ea\u8a02\u63d0\u9192']
    ];

    return `
        <div class="subscription-create-tabs" role="tablist">
            ${tabs.map(([value, label]) => {
                const activeClass = activeTab === value ? ' is-active' : '';
                return `
                    <button type="button" class="subscription-create-tab${activeClass}" onclick="window.setSubscriptionCreateTab('${value}')">
                        ${label}
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function renderSubscriptionField(prefix, field, item = {}) {
    const id = `${prefix}-${field}`;
    const value = getSubscriptionValue(item, field);

    if (field === 'status') {
        const statusText = getSubscriptionStatusLabel(item);
        return `
            <div class="subscription-inline-field">
                <span>\u72c0\u614b</span>
                <div class="subscription-status-pill">${statusText}</div>
            </div>
        `;
    }

    if (field === 'reminderStages') {
        const selectedStages = parseSubscriptionReminderStages(value, !item.id);
        return `
            <fieldset class="subscription-inline-field subscription-reminder-stage-field">
                <legend>\u63d0\u9192\u968e\u6bb5</legend>
                <div class="subscription-reminder-stage-group">
                    ${SUBSCRIPTION_REMINDER_STAGE_OPTIONS.map(stage => {
                        const checked = selectedStages.includes(stage) ? ' checked' : '';
                        return `
                            <label class="subscription-reminder-stage-option">
                                <input type="checkbox" name="${id}" value="${stage}"${checked}>
                                <span>${stage} \u5929</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </fieldset>
        `;
    }

    if (field === 'notes') {
        return `
            <label class="subscription-inline-field subscription-inline-field-wide">
                <span>\u5099\u8a3b</span>
                <textarea id="${id}" rows="1" oninput="window.autoExpandSubscriptionTextarea(this)">${escapeSubscriptionHtml(value)}</textarea>
            </label>
        `;
    }

    if (field === 'customNote') {
        return `
            <label class="subscription-inline-field subscription-inline-field-wide">
                <span>\u5099\u8a3b</span>
                <textarea id="${id}" rows="1" oninput="window.autoExpandSubscriptionTextarea(this)">${escapeSubscriptionHtml(value)}</textarea>
            </label>
        `;
    }

    const labels = {
        manualCustomerName: '\u5ba2\u6236 *',
        manualItemName: '\u63d0\u9192\u540d\u7a31',
        subscriptionStartDate: '\u8a02\u95b1\u958b\u59cb\u65e5',
        subscriptionEndDate: '\u8a02\u95b1\u5230\u671f\u65e5 *',
        reminderOwnerName: '\u5167\u90e8\u63d0\u9192\u5c0d\u8c61',
        customSubject: '\u4e3b\u65e8 *'
    };

    const types = {
        subscriptionStartDate: 'date',
        subscriptionEndDate: 'date'
    };

    return `
        <label class="subscription-inline-field">
            <span>${labels[field] || field}</span>
            <input id="${id}" type="${types[field] || 'text'}" value="${escapeSubscriptionHtml(value)}">
        </label>
    `;
}

function renderCustomReminderInlineForm(prefix, item = {}, mode = 'create') {
    const saveFn = mode === 'create'
        ? 'window.saveSubscriptionCreateInline()'
        : `window.saveSubscriptionExpandedEdit('${escapeSubscriptionHtml(item.id)}')`;
    const cancelFn = mode === 'create'
        ? 'window.cancelSubscriptionCreateInline()'
        : 'window.cancelSubscriptionExpandedEdit()';
    const archiveId = mode === 'edit' && item.id ? escapeSubscriptionHtml(item.id) : '';

    return `
        <tr class="subscription-inline-form-row">
            <td colspan="8">
                <div class="subscription-inline-form">
                    ${mode === 'create' ? renderSubscriptionCreateTabs() : ''}
                    <div class="subscription-inline-grid">
                        ${CUSTOM_REMINDER_FORM_FIELDS.map(field => renderSubscriptionField(prefix, field, item)).join('')}
                    </div>
                    ${renderSubscriptionFormActions(saveFn, cancelFn, archiveId)}
                </div>
            </td>
        </tr>
    `;
}

function renderSubscriptionInlineForm(prefix, item = {}, mode = 'create') {
    const saveFn = mode === 'create'
        ? 'window.saveSubscriptionCreateInline()'
        : `window.saveSubscriptionExpandedEdit('${escapeSubscriptionHtml(item.id)}')`;
    const cancelFn = mode === 'create'
        ? 'window.cancelSubscriptionCreateInline()'
        : 'window.cancelSubscriptionExpandedEdit()';
    const fields = mode === 'create' || item.sourceType === 'opportunity'
        ? SUBSCRIPTION_OPPORTUNITY_FORM_FIELDS
        : SUBSCRIPTION_FORM_FIELDS;
    const opportunityControls = mode === 'create'
        ? renderSubscriptionOpportunityCreateFields(prefix)
        : (item.sourceType === 'opportunity' ? renderSubscriptionEditReference(item) : '');
    const productControls = mode === 'create' || item.sourceType !== 'opportunity'
        ? ''
        : renderSubscriptionReadOnlyProduct(item);
    const archiveId = mode === 'edit' && item.id ? escapeSubscriptionHtml(item.id) : '';

    return `
        <tr class="subscription-inline-form-row">
            <td colspan="8">
                <div class="subscription-inline-form">
                    ${mode === 'create' ? renderSubscriptionCreateTabs() : ''}
                    ${opportunityControls}
                    ${productControls}
                    <div class="subscription-inline-grid">
                        ${fields.map(field => renderSubscriptionField(prefix, field, item)).join('')}
                    </div>
                    ${renderSubscriptionFormActions(saveFn, cancelFn, archiveId)}
                </div>
            </td>
        </tr>
    `;
}

function renderSubscriptionEditReference(item) {
    const display = getSubscriptionDisplayModel(item);
    return renderSubscriptionOpportunityReference(display.opportunity, getSubscriptionValue(item, 'reminderOwnerName'));
}

function renderSubscriptionReadOnlyProduct(item) {
    const display = getSubscriptionDisplayModel(item);
    const productName = display.product
        ? (display.product.label || display.product.productName || display.product.productId)
        : '\u672a\u9078\u64c7';

    return `
        <div class="subscription-readonly-product">
            <span>\u7522\u54c1</span>
            <strong>${escapeSubscriptionHtml(productName)}</strong>
        </div>
    `;
}

function renderLegacySubscriptionInlineForm(prefix, item = {}, mode = 'edit') {
    const saveFn = `window.saveSubscriptionExpandedEdit('${escapeSubscriptionHtml(item.id)}')`;
    const cancelFn = 'window.cancelSubscriptionExpandedEdit()';
    const fields = SUBSCRIPTION_FORM_FIELDS;
    const archiveId = item.id ? escapeSubscriptionHtml(item.id) : '';

    return `
        <tr class="subscription-inline-form-row">
            <td colspan="8">
                <div class="subscription-inline-form">
                    <div class="subscription-inline-grid">
                        ${fields.map(field => renderSubscriptionField(prefix, field, item)).join('')}
                    </div>
                    ${renderSubscriptionFormActions(saveFn, cancelFn, archiveId)}
                </div>
            </td>
        </tr>
    `;
}

function renderSubscriptionFormForRow(prefix, item = {}, mode = 'create') {
    if (mode === 'create' && window.__subscriptionsCreateTab === 'custom') {
        return renderCustomReminderInlineForm(prefix, item, mode);
    }
    if (mode === 'edit' && isCustomReminder(item)) {
        return renderCustomReminderInlineForm(prefix, item, mode);
    }
    if (mode === 'edit' && item.sourceType !== 'opportunity') {
        return renderLegacySubscriptionInlineForm(prefix, item, mode);
    }
    return renderSubscriptionInlineForm(prefix, item, mode);
}

function collectSubscriptionForm(prefix, fields = SUBSCRIPTION_FORM_FIELDS) {
    return fields.reduce((payload, field) => {
        if (field === 'reminderStages') {
            const selectedStages = Array.from(document.querySelectorAll(`input[name="${prefix}-${field}"]:checked`))
                .map(input => input.value);
            payload[field] = selectedStages.join(',');
            return payload;
        }

        const input = document.getElementById(`${prefix}-${field}`);
        if (!input) return payload;

        const value = input.value.trim();
        if (value !== '') {
            payload[field] = value;
        }
        return payload;
    }, {});
}

function validateSubscriptionPayload(payload, mode = 'create') {
    if (payload.reminderKind === 'custom') {
        const missing = ['customSubject', 'subscriptionEndDate'].filter(field => !payload[field]);
        return missing.length > 0
            ? '\u8acb\u586b\u5beb\u5fc5\u586b\u6b04\u4f4d\uff1a\u4e3b\u65e8\u3001\u5230\u671f\u65e5'
            : '';
    }

    const required = mode === 'create'
        ? ['opportunityId', 'subscriptionEndDate']
        : ['subscriptionEndDate'];
    const missing = required.filter(field => !payload[field]);
    if (missing.length > 0) {
        return mode === 'create'
            ? '\u8acb\u586b\u5beb\u5fc5\u586b\u6b04\u4f4d\uff1a\u6210\u4ea4\u6a5f\u6703\u3001\u8a02\u95b1\u5230\u671f\u65e5'
            : '\u8acb\u586b\u5beb\u5fc5\u586b\u6b04\u4f4d\uff1a\u8a02\u95b1\u5230\u671f\u65e5';
    }
    return '';
}

function collectCreateSubscriptionPayload() {
    if (window.__subscriptionsCreateTab === 'custom') {
        const payload = collectSubscriptionForm('create-subscription', CUSTOM_REMINDER_FORM_FIELDS);
        payload.reminderKind = 'custom';
        payload.sourceType = 'manual';
        if (payload.customSubject) {
            payload.manualCustomerName = payload.customSubject;
            payload.manualItemName = payload.customSubject;
        }
        return payload;
    }

    const payload = collectSubscriptionForm('create-subscription', SUBSCRIPTION_OPPORTUNITY_FORM_FIELDS);
    payload.reminderKind = 'subscription';
    const opportunitySelect = document.getElementById('create-subscription-opportunityId');
    const productSelect = document.getElementById('create-subscription-productId');
    payload.sourceType = 'opportunity';
    payload.opportunityId = opportunitySelect ? opportunitySelect.value.trim() : (window.__subscriptionSelectedOpportunityId || '');

    const selectedProductId = productSelect ? productSelect.value.trim() : (window.__subscriptionSelectedProductId || '');
    if (selectedProductId) {
        payload.productId = selectedProductId;
    }

    const selectedOpportunity = getSelectedSubscriptionOpportunity();
    if (selectedOpportunity && selectedOpportunity.assignee) {
        payload.reminderOwnerName = selectedOpportunity.assignee;
    }

    return payload;
}

function collectEditSubscriptionPayload(id) {
    const record = getSubscriptionRecord(id);
    if (isCustomReminder(record)) {
        const payload = collectSubscriptionForm(`edit-${id}`, CUSTOM_REMINDER_FORM_FIELDS);
        payload.reminderKind = 'custom';
        payload.sourceType = 'manual';
        if (payload.customSubject) {
            payload.manualCustomerName = payload.customSubject;
            payload.manualItemName = payload.customSubject;
        }
        return payload;
    }

    const fields = record && record.sourceType === 'opportunity'
        ? SUBSCRIPTION_OPPORTUNITY_FORM_FIELDS
        : SUBSCRIPTION_FORM_FIELDS;
    return collectSubscriptionForm(`edit-${id}`, fields);
}

async function requestSubscriptionOps(url, options = {}) {
    if (typeof authedFetch === 'function') {
        return authedFetch(url, options);
    }
    return fetch(url, options).then(response => response.json());
}

async function ensureSubscriptionWonOpportunityOptions() {
    if (window.__subscriptionWonOpportunityLoaded || window.__subscriptionWonOpportunityLoading) return;

    window.__subscriptionWonOpportunityLoading = true;
    window.__subscriptionWonOpportunityError = '';
    rerenderSubscriptionsInline();

    try {
        const result = await requestSubscriptionOps('/api/internal-ops/subscription-ops/won-opportunity-options');
        if (!result || result.success === false || !Array.isArray(result.data)) {
            throw new Error(result && result.error ? result.error : '\u7121\u6cd5\u8f09\u5165\u6210\u4ea4\u6a5f\u6703');
        }

        window.__subscriptionWonOpportunityOptions = result.data;
        window.__subscriptionWonOpportunityLoaded = true;
        window.__subscriptionWonOpportunityError = '';
    } catch (error) {
        window.__subscriptionWonOpportunityOptions = [];
        window.__subscriptionWonOpportunityLoaded = false;
        window.__subscriptionWonOpportunityError = error.message || '\u7121\u6cd5\u8f09\u5165\u6210\u4ea4\u6a5f\u6703';
    } finally {
        window.__subscriptionWonOpportunityLoading = false;
        rerenderSubscriptionsInline();
    }
}

function rerenderSubscriptionsInline() {
    const container = document.getElementById('internal-ops-subscriptions-content');
    if (container) {
        container.innerHTML = window.renderSubscriptions(window.__internalOpsSubscriptionsData || []);
        applySubscriptionTextareaAutosize();
    }
}

function applySubscriptionTextareaAutosize() {
    setTimeout(() => {
        document
            .querySelectorAll('.subscription-ops-scope textarea')
            .forEach(textarea => window.autoExpandSubscriptionTextarea(textarea));
    }, 0);
}

function ensureSubscriptionHeaderControls() {
    setTimeout(() => {
        const container = document.getElementById('internal-ops-subscriptions-content');
        const widget = container && container.closest('.internal-ops-widget');
        const header = widget && widget.querySelector('.internal-ops-header');
        if (!header) return;

        const title = header.querySelector('h1, h2, h3, h4, .internal-ops-title');
        if (title) {
            title.textContent = '\u8a02\u95b1\u5236\u8207\u5c08\u6848\u63d0\u9192\u7ba1\u7406';

            let subtitle = header.querySelector('#subscription-header-subtitle');
            if (!subtitle) {
                subtitle = document.createElement('span');
                subtitle.id = 'subscription-header-subtitle';
                subtitle.className = 'subscription-header-subtitle';
                title.insertAdjacentElement('afterend', subtitle);
            }
            subtitle.textContent = '\u4f9d\u5230\u671f\u65e5\u7531\u8fd1\u5230\u9060\u6392\u5e8f';
        }

        const addButton = header.querySelector('button[onclick="window.openSubscriptionCreateInline()"]');
        if (addButton) {
            addButton.classList.remove('primary');
            addButton.classList.add('subscription-header-btn');
        }

        let actionGroup = header.querySelector('#subscription-header-action-group');
        if (!actionGroup) {
            actionGroup = document.createElement('div');
            actionGroup.id = 'subscription-header-action-group';
            actionGroup.className = 'subscription-header-action-group';
            header.appendChild(actionGroup);
        }

        let maintenanceHint = actionGroup.querySelector('#subscription-maintenance-hint');
        if (!maintenanceHint) {
            maintenanceHint = document.createElement('span');
            maintenanceHint.id = 'subscription-maintenance-hint';
            maintenanceHint.className = 'subscription-maintenance-hint';
        }
        maintenanceHint.textContent = '\u5982\u8981\u7de8\u8f2f\uff0c\u8acb\u9032\u5165\u7dad\u8b77\u6a21\u5f0f\uff0c\u4e26\u9ede\u64ca\u540d\u7a31\u9032\u884c\u7de8\u8f2f';
        actionGroup.appendChild(maintenanceHint);

        let noteToggleButton = actionGroup.querySelector('#subscription-notes-toggle');
        if (!noteToggleButton) {
            noteToggleButton = document.createElement('button');
            noteToggleButton.type = 'button';
            noteToggleButton.id = 'subscription-notes-toggle';
            noteToggleButton.className = 'subscription-header-btn';
            noteToggleButton.onclick = () => window.toggleAllSubscriptionNotes();
        }
        noteToggleButton.textContent = window.__subscriptionsAllNotesExpanded ? '\u6536\u5408\u5099\u8a3b' : '\u5c55\u958b\u5099\u8a3b';
        noteToggleButton.disabled = Boolean(window.__subscriptionOpsOperationMode);
        noteToggleButton.classList.toggle('is-active', Boolean(window.__subscriptionsAllNotesExpanded));
        actionGroup.appendChild(noteToggleButton);

        if (addButton) actionGroup.appendChild(addButton);

        let opButton = actionGroup.querySelector('#subscription-operation-toggle');
        if (!opButton) {
            opButton = document.createElement('button');
            opButton.type = 'button';
            opButton.id = 'subscription-operation-toggle';
            opButton.className = 'subscription-header-btn';
            opButton.onclick = () => window.toggleSubscriptionOperationMode();
        }

        opButton.textContent = window.__subscriptionOpsOperationMode ? '\u7d50\u675f\u7dad\u8b77' : '\u7dad\u8b77';
        opButton.classList.toggle('is-danger', Boolean(window.__subscriptionOpsOperationMode));
        opButton.classList.toggle('is-active', Boolean(window.__subscriptionOpsOperationMode));
        actionGroup.appendChild(opButton);
    }, 0);
}

async function refreshSubscriptionsInline() {
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsExpandedEditId = null;
    window.__subscriptionsExpandedNoteId = null;
    window.__subscriptionsAllNotesExpanded = false;
    window.__subscriptionsInlineError = '';

    if (typeof window.fetchAndRenderSection === 'function') {
        await window.fetchAndRenderSection(
            '/api/internal-ops/subscription-ops',
            window.renderSubscriptions,
            'internal-ops-subscriptions-content'
        );
    }
}

window.renderSubscriptions = function(data) {
    const records = Array.isArray(data) ? data : [];
    window.__internalOpsSubscriptionsData = records;
    ensureSubscriptionHeaderControls();

    if (
        records.some(item => item && item.sourceType === 'opportunity') &&
        !window.__subscriptionWonOpportunityLoaded &&
        !window.__subscriptionWonOpportunityLoading &&
        !window.__subscriptionWonOpportunityError
    ) {
        setTimeout(() => ensureSubscriptionWonOpportunityOptions(), 0);
    }

    const activeRecords = records.filter(item => item && item.isArchived !== true);
    const rows = activeRecords.map((item, index) => {
        const id = escapeSubscriptionHtml(item.id);
        const editOpen = String(window.__subscriptionsExpandedEditId || '') === String(item.id);
        const noteOpen = !window.__subscriptionOpsOperationMode && (
            window.__subscriptionsAllNotesExpanded ||
            String(window.__subscriptionsExpandedNoteId || '') === String(item.id)
        );
        const display = getSubscriptionDisplayModel(item);

        return `
            <tr class="subscription-op-row">
                <td class="subscription-row-number">${index + 1}.</td>
                <td>${renderSubscriptionPrimaryCell(item, display, id)}</td>
                <td>${formatSubscriptionValue(display.customerName)}</td>
                <td>${renderSubscriptionItemNotesCell(item, display)}</td>
                <td>${renderSubscriptionPeriodCell(display)}</td>
                <td>${renderSubscriptionTimeProgressCell(display)}</td>
                <td>${renderSubscriptionRemainingDaysCell(display)}</td>
                <td>${renderSubscriptionUrgencyBadge(display.endDate)}</td>
            </tr>
            ${noteOpen ? renderSubscriptionNoteDetailRow(display) : ''}
            ${editOpen ? renderSubscriptionFormForRow(`edit-${id}`, item, 'edit') : ''}
        `;
    }).join('');

    const createRow = window.__subscriptionsCreateOpen
        ? renderSubscriptionFormForRow('create-subscription', {}, 'create')
        : '';

    const emptyState = activeRecords.length === 0 && !window.__subscriptionsCreateOpen
        ? '<tr><td colspan="8"><div class="subscription-empty-state">\u76ee\u524d\u6c92\u6709\u8a02\u95b1\u8ffd\u8e64\u8a18\u9304</div></td></tr>'
        : '';

    applySubscriptionTextareaAutosize();

    return `
        <div class="subscription-ops-scope">
            ${renderSubscriptionInlineMessage()}
            <div class="subscription-list-count-row">
                <span class="subscription-list-count">\u5171 ${activeRecords.length} \u7b46</span>
            </div>
            <table class="internal-ops-table subscription-ops-table">
                <thead>
                    <tr>
                        <th>\u9805\u6b21</th>
                        <th>\u6a5f\u6703\u540d\u7a31 / \u63d0\u9192\u540d\u7a31</th>
                        <th>\u5ba2\u6236</th>
                        <th>\u63d0\u9192\u9805\u76ee / \u5099\u8a3b</th>
                        <th>\u671f\u9593</th>
                        <th>\u9032\u5ea6</th>
                        <th>\u5269\u9918\u5929\u6578</th>
                        <th>\u63d0\u9192</th>
                    </tr>
                </thead>
                <tbody>
                    ${createRow}
                    ${rows}
                    ${emptyState}
                </tbody>
            </table>
        </div>
    `;
};

window.openSubscriptionCreateInline = function() {
    window.__subscriptionsCreateOpen = true;
    window.__subscriptionsCreateTab = 'subscription';
    window.__subscriptionsExpandedEditId = null;
    window.__subscriptionsExpandedNoteId = null;
    window.__subscriptionsAllNotesExpanded = false;
    window.__subscriptionOpsOperationMode = false;
    window.__subscriptionsInlineError = '';
    window.__subscriptionSelectedOpportunityId = '';
    window.__subscriptionSelectedProductId = '';
    window.__subscriptionOpportunitySearchKeyword = '';
    rerenderSubscriptionsInline();
    ensureSubscriptionWonOpportunityOptions();
};

window.cancelSubscriptionCreateInline = function() {
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsCreateTab = 'subscription';
    window.__subscriptionsInlineError = '';
    window.__subscriptionSelectedOpportunityId = '';
    window.__subscriptionSelectedProductId = '';
    window.__subscriptionOpportunitySearchKeyword = '';
    rerenderSubscriptionsInline();
};

window.setSubscriptionCreateTab = function(tab) {
    window.__subscriptionsCreateTab = tab === 'custom' ? 'custom' : 'subscription';
    window.__subscriptionsInlineError = '';
    window.__subscriptionSelectedOpportunityId = '';
    window.__subscriptionSelectedProductId = '';
    window.__subscriptionOpportunitySearchKeyword = '';
    rerenderSubscriptionsInline();
    if (window.__subscriptionsCreateTab === 'subscription') {
        ensureSubscriptionWonOpportunityOptions();
    }
};

window.handleSubscriptionOpportunitySelect = function(opportunityId) {
    window.__subscriptionSelectedOpportunityId = opportunityId || '';
    window.__subscriptionSelectedProductId = '';
    window.__subscriptionsInlineError = '';
    rerenderSubscriptionsInline();
};

window.handleSubscriptionProductSelect = function(productId) {
    window.__subscriptionSelectedProductId = productId || '';
    window.__subscriptionsInlineError = '';
    const opportunity = getSelectedSubscriptionOpportunity();
    const product = getSubscriptionProductById(opportunity, productId);
    const reminderNameInput = document.getElementById('create-subscription-manualItemName');
    if (reminderNameInput && product) {
        reminderNameInput.value = getSubscriptionProductLabel(product);
    }
};

window.filterSubscriptionOpportunities = function() {
    const input = document.getElementById('create-subscription-opportunitySearch');
    const select = document.getElementById('create-subscription-opportunityId');
    if (!input || !select) return;

    const keyword = (input.value || '').toLowerCase();
    window.__subscriptionOpportunitySearchKeyword = input.value || '';
    const options = window.__subscriptionWonOpportunityOptions || [];
    const filtered = keyword
        ? options.filter(option => {
            const name = String(option.opportunityName || '').toLowerCase();
            const customer = String(option.customerCompany || '').toLowerCase();
            return name.includes(keyword) || customer.includes(keyword);
        })
        : options;

    const currentValue = select.value;
    select.innerHTML = renderSubscriptionOpportunityOptions(filtered, currentValue);
    if (currentValue && Array.from(select.options).some(option => option.value === currentValue)) {
        select.value = currentValue;
    }
};

window.autoExpandSubscriptionTextarea = function(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
};

window.toggleSubscriptionOperationMode = function() {
    window.__subscriptionOpsOperationMode = !window.__subscriptionOpsOperationMode;
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsExpandedEditId = null;
    window.__subscriptionsExpandedNoteId = null;
    window.__subscriptionsAllNotesExpanded = false;
    window.__subscriptionsInlineError = '';
    rerenderSubscriptionsInline();
    ensureSubscriptionHeaderControls();
};

window.openSubscriptionEditFromName = function(id) {
    if (!window.__subscriptionOpsOperationMode) return;
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsExpandedNoteId = null;
    window.__subscriptionsAllNotesExpanded = false;
    window.__subscriptionsInlineError = '';
    window.__subscriptionsExpandedEditId = String(window.__subscriptionsExpandedEditId || '') === String(id) ? null : String(id);
    rerenderSubscriptionsInline();
};

window.toggleSubscriptionNoteDetail = function(id) {
    if (window.__subscriptionOpsOperationMode) return;
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsExpandedEditId = null;
    window.__subscriptionsAllNotesExpanded = false;
    window.__subscriptionsInlineError = '';
    window.__subscriptionsExpandedNoteId = String(window.__subscriptionsExpandedNoteId || '') === String(id) ? null : String(id);
    rerenderSubscriptionsInline();
};

window.toggleAllSubscriptionNotes = function() {
    if (window.__subscriptionOpsOperationMode) return;
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsExpandedEditId = null;
    window.__subscriptionsExpandedNoteId = null;
    window.__subscriptionsAllNotesExpanded = !window.__subscriptionsAllNotesExpanded;
    window.__subscriptionsInlineError = '';
    rerenderSubscriptionsInline();
    ensureSubscriptionHeaderControls();
};

window.handleSubscriptionNameKeydown = function(event, id) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (window.__subscriptionOpsOperationMode) {
            window.openSubscriptionEditFromName(id);
        } else {
            window.toggleSubscriptionNoteDetail(id);
        }
    }
};

window.saveSubscriptionCreateInline = async function() {
    const payload = collectCreateSubscriptionPayload();
    const validationError = validateSubscriptionPayload(payload, 'create');
    if (validationError) {
        window.__subscriptionsInlineError = validationError;
        rerenderSubscriptionsInline();
        return;
    }

    try {
        const result = await requestSubscriptionOps('/api/internal-ops/subscription-ops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!result || result.success === false || result.error) {
            window.__subscriptionsInlineError = result && result.error ? result.error : '\u65b0\u589e\u5931\u6557';
            rerenderSubscriptionsInline();
            return;
        }

        await refreshSubscriptionsInline();
    } catch (error) {
        window.__subscriptionsInlineError = error.message || '\u65b0\u589e\u5931\u6557';
        rerenderSubscriptionsInline();
    }
};

window.toggleSubscriptionExpandedEdit = function(id) {
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsInlineError = '';
    window.__subscriptionsExpandedNoteId = null;
    window.__subscriptionsAllNotesExpanded = false;
    window.__subscriptionsExpandedEditId = String(window.__subscriptionsExpandedEditId || '') === String(id) ? null : id;
    rerenderSubscriptionsInline();
};

window.cancelSubscriptionExpandedEdit = function() {
    window.__subscriptionsExpandedEditId = null;
    window.__subscriptionsInlineError = '';
    rerenderSubscriptionsInline();
};

window.saveSubscriptionExpandedEdit = async function(id) {
    const record = getSubscriptionRecord(id);
    if (!record) {
        window.__subscriptionsInlineError = '\u627e\u4e0d\u5230\u8981\u7de8\u8f2f\u7684\u8a18\u9304';
        rerenderSubscriptionsInline();
        return;
    }

    const payload = collectEditSubscriptionPayload(id);
    const validationError = validateSubscriptionPayload(payload, 'edit');
    if (validationError) {
        window.__subscriptionsInlineError = validationError;
        rerenderSubscriptionsInline();
        return;
    }

    try {
        const result = await requestSubscriptionOps(`/api/internal-ops/subscription-ops/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!result || result.success === false || result.error) {
            window.__subscriptionsInlineError = result && result.error ? result.error : '\u66f4\u65b0\u5931\u6557';
            rerenderSubscriptionsInline();
            return;
        }

        await refreshSubscriptionsInline();
    } catch (error) {
        window.__subscriptionsInlineError = error.message || '\u66f4\u65b0\u5931\u6557';
        rerenderSubscriptionsInline();
    }
};

window.archiveSubscriptionOp = async function(id) {
    try {
        const result = await requestSubscriptionOps(`/api/internal-ops/subscription-ops/${encodeURIComponent(id)}/archive`, {
            method: 'PATCH'
        });

        if (!result || result.success === false || result.error) {
            window.__subscriptionsInlineError = result && result.error ? result.error : '\u5c01\u5b58\u5931\u6557';
            rerenderSubscriptionsInline();
            return;
        }

        await refreshSubscriptionsInline();
    } catch (error) {
        window.__subscriptionsInlineError = error.message || '\u5c01\u5b58\u5931\u6557';
        rerenderSubscriptionsInline();
    }
};

(function injectSubscriptionOpsStyles() {
    if (document.getElementById('subscription-ops-inline-style')) return;

    const style = document.createElement('style');
    style.id = 'subscription-ops-inline-style';
    style.textContent = `
        .subscription-ops-scope { width: 100%; }
        .subscription-ops-table { table-layout: fixed; min-width: 1060px; }
        .subscription-list-count-row { display: flex; justify-content: flex-end; padding: 0 4px 5px; }
        .subscription-list-count { color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
        .subscription-ops-table th,
        .subscription-ops-table td { padding-top: 3px; padding-bottom: 3px; vertical-align: top; }
        .subscription-ops-table th { font-size: 0.74rem; padding-top: 4px; padding-bottom: 4px; }
        .subscription-ops-table th:nth-child(1),
        .subscription-ops-table td:nth-child(1) { width: 72px; }
        .subscription-ops-table th:nth-child(2),
        .subscription-ops-table td:nth-child(2) { width: 210px; }
        .subscription-ops-table th:nth-child(3),
        .subscription-ops-table td:nth-child(3) { width: 128px; }
        .subscription-ops-table th:nth-child(4),
        .subscription-ops-table td:nth-child(4) { width: 220px; }
        .subscription-ops-table th:nth-child(5),
        .subscription-ops-table td:nth-child(5) { width: 140px; white-space: normal; }
        .subscription-ops-table th:nth-child(6),
        .subscription-ops-table td:nth-child(6) { width: 120px; white-space: nowrap; }
        .subscription-ops-table th:nth-child(7),
        .subscription-ops-table td:nth-child(7),
        .subscription-ops-table th:nth-child(8),
        .subscription-ops-table td:nth-child(8) { width: 84px; white-space: nowrap; }
        .subscription-op-row td { overflow: hidden; text-overflow: ellipsis; }
        .subscription-cell-main { color: var(--text-primary); font-size: 0.81rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.25; }
        .subscription-cell-sub { margin-top: 1px; color: var(--text-muted); font-size: 0.72rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2; }
        .subscription-period-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .subscription-period-dates { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .subscription-period-row { display: grid; grid-template-columns: 30px minmax(0, 1fr); column-gap: 6px; align-items: baseline; min-width: 0; }
        .subscription-period-label { color: var(--text-muted); font-size: 0.72rem; font-weight: 600; line-height: 1.15; white-space: nowrap; }
        .subscription-period-value { color: var(--text-secondary); font-size: 0.76rem; font-weight: 600; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .subscription-time-progress { --subscription-progress-color: var(--accent-blue, #2563eb); display: grid; grid-template-columns: 78px 32px; align-items: center; gap: 6px; min-width: 0; padding-top: 6px; }
        .subscription-time-progress.is-warning { --subscription-progress-color: #d97706; }
        .subscription-time-progress.is-alert { --subscription-progress-color: #dc2626; }
        .subscription-time-progress.is-critical { --subscription-progress-color: #991b1b; }
        .subscription-time-progress-track { position: relative; width: 78px; height: 6px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--border-color) 72%, transparent); }
        .subscription-time-progress-fill { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--subscription-progress-color); }
        .subscription-time-progress-percent { color: var(--subscription-progress-color); font-size: 0.7rem; font-weight: 700; line-height: 1; text-align: right; white-space: nowrap; }
        .subscription-time-progress-empty { display: inline-block; padding-top: 5px; color: var(--text-muted); font-size: 0.76rem; font-weight: 600; }
        .subscription-days-remaining { color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; }
        .subscription-days-remaining.is-normal { color: var(--accent-blue, #2563eb); }
        .subscription-days-remaining.is-warning { color: #d97706; }
        .subscription-days-remaining.is-alert { color: #dc2626; }
        .subscription-days-remaining.is-critical { color: #991b1b; }
        .subscription-primary-name.is-viewable { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 2px; }
        .subscription-primary-name.is-viewable:hover { color: var(--accent-blue, #2563eb); }
        .subscription-note-detail-row td { background: color-mix(in srgb, var(--secondary-bg) 82%, var(--card-bg)); }
        .subscription-note-detail-cell { padding: 5px 8px !important; border-top: 0; }
        .subscription-note-detail { display: grid; grid-template-columns: 38px minmax(0, 1fr); align-items: start; gap: 8px; min-width: 0; padding: 5px 7px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--card-bg); }
        .subscription-note-detail-label { color: var(--text-muted); font-size: 0.72rem; font-weight: 700; line-height: 1.35; white-space: nowrap; }
        .subscription-note-detail-text { color: var(--text-secondary); font-size: 0.78rem; font-weight: 500; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
        .subscription-due-stack { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
        .subscription-due-badge { display: inline-flex; align-items: center; height: 17px; padding: 0 5px; border-radius: 3px; border: 1px solid rgba(244, 63, 94, 0.24); background: rgba(244, 63, 94, 0.12); color: #b42318; font-size: 0.7rem; font-weight: 700; line-height: 17px; }
        .subscription-due-badge.is-overdue { background: rgba(185, 28, 28, 0.16); border-color: rgba(185, 28, 28, 0.28); color: #991b1b; }
        .subscription-urgency-badge { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 3px; border: 1px solid rgba(100, 116, 139, 0.16); background: rgba(100, 116, 139, 0.10); color: #586070; font-size: 0.72rem; font-weight: 700; line-height: 18px; white-space: nowrap; }
        .subscription-urgency-badge.is-overdue { color: #7f1d1d; background: rgba(185, 28, 28, 0.16); border-color: rgba(185, 28, 28, 0.28); }
        .subscription-urgency-badge.is-today { color: #991b1b; background: rgba(244, 63, 94, 0.13); border-color: rgba(244, 63, 94, 0.24); }
        .subscription-urgency-badge.is-within7 { color: #9f1239; background: rgba(244, 63, 94, 0.10); border-color: rgba(244, 63, 94, 0.20); }
        .subscription-urgency-badge.is-within30 { color: #935b11; background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.24); }
        .subscription-urgency-badge.is-within60 { color: #854d0e; background: rgba(234, 179, 8, 0.13); border-color: rgba(234, 179, 8, 0.22); }
        .subscription-urgency-badge.is-within90 { color: #256372; background: rgba(14, 165, 233, 0.11); border-color: rgba(14, 165, 233, 0.18); }
        .subscription-urgency-badge.is-within120 { color: #475569; background: rgba(100, 116, 139, 0.10); border-color: rgba(100, 116, 139, 0.16); }
        .subscription-urgency-badge.is-within180 { color: #596273; background: rgba(107, 114, 128, 0.09); border-color: rgba(107, 114, 128, 0.14); }
        .subscription-urgency-badge.is-over180 { color: #6b7280; background: rgba(107, 114, 128, 0.06); border-color: rgba(107, 114, 128, 0.10); }
        .subscription-status-pill { display: inline-flex; align-items: center; min-height: 28px; padding: 0 7px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-bg); color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; box-sizing: border-box; }
        .subscription-type-pill { display: inline-flex; align-items: center; height: 18px; padding: 0 5px; border: 1px solid var(--border-color); border-radius: 3px; background: var(--secondary-bg); color: var(--text-secondary); font-size: 0.7rem; font-weight: 700; line-height: 18px; white-space: nowrap; }
        .subscription-cell-main.is-editable { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 2px; }
        .subscription-cell-main.is-editable:hover { color: var(--accent-blue, #2563eb); }
        .subscription-form-btn { border: 1px solid var(--border-color); border-radius: 4px; background: var(--card-bg); color: var(--text-secondary); padding: 2px 6px; font-size: 0.74rem; font-weight: 600; line-height: 1.3; cursor: pointer; min-height: 23px; }
        .subscription-form-btn:hover { color: var(--text-primary); border-color: color-mix(in srgb, var(--border-color) 70%, var(--text-secondary)); }
        .subscription-form-btn.is-save { color: var(--accent-blue, #2563eb); background: color-mix(in srgb, var(--accent-blue, #2563eb) 7%, var(--card-bg)); border-color: color-mix(in srgb, var(--accent-blue, #2563eb) 25%, var(--border-color)); }
        .subscription-form-btn.is-danger { color: var(--danger-color, #b42318); }
        .subscription-header-subtitle { color: var(--text-secondary); font-size: 0.78rem; font-weight: 500; margin-left: 8px; white-space: nowrap; }
        .subscription-header-action-group { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; }
        .subscription-maintenance-hint { color: var(--text-secondary); font-size: 0.74rem; font-weight: 500; margin-right: 3px; white-space: nowrap; }
        .internal-ops-header .subscription-header-btn { border: 1px solid var(--border-color) !important; border-radius: 4px !important; background: var(--card-bg) !important; color: var(--text-secondary) !important; padding: 3px 8px !important; min-height: 24px !important; height: auto !important; font-size: 0.76rem !important; font-weight: 600 !important; line-height: 1.3 !important; box-shadow: none !important; transform: none !important; margin: 0 !important; }
        .internal-ops-header .subscription-header-btn.is-active { color: var(--accent-blue, #2563eb) !important; border-color: color-mix(in srgb, var(--accent-blue, #2563eb) 28%, var(--border-color)) !important; background: color-mix(in srgb, var(--accent-blue, #2563eb) 7%, var(--card-bg)) !important; }
        .internal-ops-header .subscription-header-btn.is-danger { color: var(--danger-color, #b42318) !important; border-color: color-mix(in srgb, var(--danger-color, #b42318) 24%, var(--border-color)) !important; background: color-mix(in srgb, var(--danger-color, #b42318) 5%, var(--card-bg)) !important; }
        .internal-ops-header .subscription-header-btn.is-danger.is-active { color: var(--danger-color, #b42318) !important; border-color: color-mix(in srgb, var(--danger-color, #b42318) 34%, var(--border-color)) !important; background: color-mix(in srgb, var(--danger-color, #b42318) 8%, var(--card-bg)) !important; }
        .internal-ops-header .subscription-header-btn:disabled { opacity: 0.45 !important; cursor: not-allowed !important; }
        .subscription-inline-form-row td { background: var(--secondary-bg); padding: 5px; }
        .subscription-inline-form { border: 1px solid var(--border-color); border-radius: 5px; background: var(--card-bg); padding: 6px; }
        .subscription-inline-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 5px; }
        .subscription-inline-field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .subscription-inline-field span { color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; }
        .subscription-inline-field input,
        .subscription-inline-field select,
        .subscription-inline-field textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-bg); color: var(--text-primary); padding: 4px 6px; font-size: 0.8rem; }
        .subscription-inline-field textarea { min-height: 28px; overflow: hidden; resize: none; }
        .subscription-create-tabs { display: inline-flex; align-items: center; gap: 2px; margin-bottom: 5px; padding: 2px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--secondary-bg); }
        .subscription-create-tab { border: 0; border-radius: 3px; background: transparent; color: var(--text-secondary); padding: 3px 7px; font-size: 0.76rem; font-weight: 600; cursor: pointer; }
        .subscription-create-tab.is-active { background: var(--card-bg); color: var(--text-primary); box-shadow: 0 0 0 1px var(--border-color); }
        .subscription-reminder-stage-field { border: 0; margin: 0; padding: 0; }
        .subscription-reminder-stage-field legend { color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; padding: 0; margin-bottom: 2px; }
        .subscription-reminder-stage-group { display: flex; align-items: center; gap: 6px; min-height: 28px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-bg); padding: 3px 6px; box-sizing: border-box; }
        .subscription-reminder-stage-option { display: inline-flex; align-items: center; gap: 3px; color: var(--text-primary); font-size: 0.78rem; white-space: nowrap; }
        .subscription-reminder-stage-option input { width: auto; margin: 0; }
        .subscription-reminder-stage-option span { color: var(--text-primary); font-size: 0.78rem; font-weight: 500; }
        .subscription-inline-field-wide { grid-column: span 4; }
        .subscription-opportunity-create-block { display: flex; flex-direction: column; gap: 4px; margin-bottom: 5px; }
        .subscription-opportunity-selector .subscription-inline-field { max-width: 360px; }
        .subscription-opportunity-selector .subscription-inline-field input { margin-bottom: 3px; }
        .subscription-readonly-product { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-bg); }
        .subscription-readonly-product span { color: var(--text-muted); font-size: 0.78rem; font-weight: 600; }
        .subscription-readonly-product strong { color: var(--text-primary); font-size: 0.84rem; font-weight: 600; }
        .subscription-opportunity-reference { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-bg); }
        .subscription-reference-item { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .subscription-reference-item span { color: var(--text-muted); font-size: 0.68rem; font-weight: 600; }
        .subscription-reference-item strong { color: var(--text-primary); font-size: 0.78rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .subscription-inline-note { color: var(--text-muted); font-size: 0.76rem; padding: 0; }
        .subscription-inline-note.is-error { color: var(--danger-color, #b42318); }
        .subscription-inline-form-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; }
        .subscription-inline-form-actions-left,
        .subscription-inline-form-actions-right { display: inline-flex; align-items: center; gap: 5px; }
        .subscription-empty-state { padding: 16px; text-align: center; color: var(--text-muted); }
        .subscription-inline-error { margin: 5px 8px; padding: 5px 7px; border: 1px solid var(--border-color); border-radius: 4px; color: var(--danger-color, #b42318); background: var(--card-bg); font-size: 0.78rem; }
        .subscription-archive-btn { color: var(--text-secondary); }
        @media (max-width: 900px) {
            .subscription-inline-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); }
            .subscription-inline-field-wide { grid-column: span 2; }
            .subscription-opportunity-reference { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
    `;
    document.head.appendChild(style);
})();
