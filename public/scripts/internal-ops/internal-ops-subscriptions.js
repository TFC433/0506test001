// public/scripts/internal-ops/internal-ops-subscriptions.js
/**
 * @version 1.1.0
 * @date 2026-06-08
 * @description Inline Subscription Ops list, create, edit, and archive UI.
 */

if (typeof window.__subscriptionsCreateOpen === 'undefined') {
    window.__subscriptionsCreateOpen = false;
}

if (typeof window.__subscriptionsExpandedEditId === 'undefined') {
    window.__subscriptionsExpandedEditId = null;
}

if (typeof window.__subscriptionsInlineError === 'undefined') {
    window.__subscriptionsInlineError = '';
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
    'reminderOwnerEmail',
    'reminderStages',
    'status',
    'notes'
];

const SUBSCRIPTION_OPPORTUNITY_FORM_FIELDS = [
    'subscriptionStartDate',
    'subscriptionEndDate',
    'reminderOwnerName',
    'reminderOwnerEmail',
    'reminderStages',
    'status',
    'notes'
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

function getSubscriptionDisplayModel(item) {
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
            ? (product ? (product.label || product.productName || product.productId) : '\u672a\u9078\u64c7')
            : getSubscriptionValue(item, 'manualItemName'),
        startDate: getSubscriptionValue(item, 'subscriptionStartDate'),
        endDate: getSubscriptionValue(item, 'subscriptionEndDate'),
        ownerName: getSubscriptionValue(item, 'reminderOwnerName'),
        reminderStages: getSubscriptionValue(item, 'reminderStages'),
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
    const options = window.__subscriptionWonOpportunityOptions || [];
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

function renderSubscriptionOpportunityReference(opportunity) {
    if (!opportunity) return '';

    const closeDate = formatSubscriptionDateOnly(opportunity.expectedCloseDate || opportunity.lastUpdateTime);
    const rows = [
        ['\u6a5f\u6703\u540d\u7a31', opportunity.opportunityName],
        ['\u5ba2\u6236', opportunity.customerCompany],
        ['\u6a5f\u6703\u985e\u578b', opportunity.opportunityType],
        ['\u6210\u4ea4\u65e5', closeDate],
        ['\u6a5f\u6703\u8ca0\u8cac\u4eba', opportunity.assignee]
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
            <div class="subscription-inline-grid">
                <label class="subscription-inline-field subscription-inline-field-wide">
                    <span>\u6210\u4ea4\u6a5f\u6703 *</span>
                    <select id="${prefix}-opportunityId" onchange="window.handleSubscriptionOpportunitySelect(this.value)">
                        ${renderWonOpportunityOptions(window.__subscriptionSelectedOpportunityId)}
                    </select>
                </label>
                <label class="subscription-inline-field subscription-inline-field-wide">
                    <span>\u7522\u54c1</span>
                    <select id="${prefix}-productId" onchange="window.handleSubscriptionProductSelect(this.value)" ${opportunity ? '' : 'disabled'}>
                        ${renderSubscriptionProductOptions(opportunity, window.__subscriptionSelectedProductId)}
                    </select>
                </label>
            </div>
            ${stateHtml}
            ${renderSubscriptionOpportunityReference(opportunity)}
            ${productState}
        </div>
    `;
}

function renderSubscriptionField(prefix, field, item = {}) {
    const id = `${prefix}-${field}`;
    const value = getSubscriptionValue(item, field);

    if (field === 'status') {
        const selectedValue = value || '\u9032\u884c\u4e2d';
        return `
            <label class="subscription-inline-field">
                <span>\u72c0\u614b *</span>
                <select id="${id}" required>
                    ${renderSubscriptionOptions(SUBSCRIPTION_STATUS_OPTIONS, selectedValue, false)}
                </select>
            </label>
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
                <textarea id="${id}" rows="2">${escapeSubscriptionHtml(value)}</textarea>
            </label>
        `;
    }

    const labels = {
        manualCustomerName: '\u5ba2\u6236 *',
        manualItemName: '\u8a02\u95b1\u9805\u76ee *',
        subscriptionStartDate: '\u8a02\u95b1\u958b\u59cb\u65e5',
        subscriptionEndDate: '\u8a02\u95b1\u5230\u671f\u65e5 *',
        reminderOwnerName: '\u63d0\u9192\u8ca0\u8cac\u4eba',
        reminderOwnerEmail: '\u63d0\u9192\u8ca0\u8cac\u4eba Email'
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

    return `
        <tr class="subscription-inline-form-row">
            <td colspan="10">
                <div class="subscription-inline-form">
                    ${opportunityControls}
                    ${productControls}
                    <div class="subscription-inline-grid">
                        ${fields.map(field => renderSubscriptionField(prefix, field, item)).join('')}
                    </div>
                    <div class="subscription-inline-form-actions">
                        <button type="button" class="internal-ops-btn" onclick="${cancelFn}">\u53d6\u6d88</button>
                        <button type="button" class="action-btn primary btn-sm" onclick="${saveFn}">
                            <span class="btn-text">\u5132\u5b58</span>
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function renderSubscriptionEditReference(item) {
    const display = getSubscriptionDisplayModel(item);
    return renderSubscriptionOpportunityReference(display.opportunity);
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

    return `
        <tr class="subscription-inline-form-row">
            <td colspan="10">
                <div class="subscription-inline-form">
                    <div class="subscription-inline-grid">
                        ${fields.map(field => renderSubscriptionField(prefix, field, item)).join('')}
                    </div>
                    <div class="subscription-inline-form-actions">
                        <button type="button" class="internal-ops-btn" onclick="${cancelFn}">\u53d6\u6d88</button>
                        <button type="button" class="action-btn primary btn-sm" onclick="${saveFn}">
                            <span class="btn-text">\u5132\u5b58</span>
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function renderSubscriptionFormForRow(prefix, item = {}, mode = 'create') {
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
    const payload = collectSubscriptionForm('create-subscription', SUBSCRIPTION_OPPORTUNITY_FORM_FIELDS);
    const opportunitySelect = document.getElementById('create-subscription-opportunityId');
    const productSelect = document.getElementById('create-subscription-productId');
    payload.sourceType = 'opportunity';
    payload.opportunityId = opportunitySelect ? opportunitySelect.value.trim() : (window.__subscriptionSelectedOpportunityId || '');

    const selectedProductId = productSelect ? productSelect.value.trim() : (window.__subscriptionSelectedProductId || '');
    if (selectedProductId) {
        payload.productId = selectedProductId;
    }

    return payload;
}

function collectEditSubscriptionPayload(id) {
    const record = getSubscriptionRecord(id);
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
    }
}

async function refreshSubscriptionsInline() {
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsExpandedEditId = null;
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
        const display = getSubscriptionDisplayModel(item);

        return `
            <tr class="subscription-op-row">
                <td class="subscription-row-number">${index + 1}.</td>
                <td>${formatSubscriptionValue(display.wonDate)}</td>
                <td><strong>${formatSubscriptionValue(display.opportunityName)}</strong></td>
                <td>${formatSubscriptionValue(display.customerName)}</td>
                <td>${formatSubscriptionValue(display.itemName)}</td>
                <td>${formatSubscriptionValue(display.startDate)}</td>
                <td>${formatSubscriptionValue(display.endDate)}</td>
                <td>${formatSubscriptionValue(display.ownerName)}</td>
                <td>${escapeSubscriptionHtml(formatSubscriptionReminderStages(display.reminderStages))}</td>
                <td>
                    <div class="internal-ops-actions">
                        <button type="button" class="internal-ops-btn" onclick="window.toggleSubscriptionExpandedEdit('${id}')">\u7de8\u8f2f</button>
                        <button type="button" class="internal-ops-btn subscription-archive-btn" onclick="window.archiveSubscriptionOp('${id}')">\u5c01\u5b58</button>
                    </div>
                </td>
            </tr>
            ${editOpen ? renderSubscriptionFormForRow(`edit-${id}`, item, 'edit') : ''}
        `;
    }).join('');

    const createRow = window.__subscriptionsCreateOpen
        ? renderSubscriptionFormForRow('create-subscription', {}, 'create')
        : '';

    const emptyState = activeRecords.length === 0 && !window.__subscriptionsCreateOpen
        ? '<tr><td colspan="10"><div class="subscription-empty-state">\u76ee\u524d\u6c92\u6709\u8a02\u95b1\u8ffd\u8e64\u8a18\u9304</div></td></tr>'
        : '';

    return `
        <div class="subscription-ops-scope">
            ${renderSubscriptionInlineMessage()}
            <table class="internal-ops-table subscription-ops-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>\u6210\u4ea4\u65e5</th>
                        <th>\u6a5f\u6703\u540d\u7a31</th>
                        <th>\u5ba2\u6236</th>
                        <th>\u8a02\u95b1\u7522\u54c1</th>
                        <th>\u958b\u59cb\u65e5</th>
                        <th>\u5230\u671f\u65e5</th>
                        <th>\u63d0\u9192\u8ca0\u8cac\u4eba</th>
                        <th>\u63d0\u9192</th>
                        <th>\u64cd\u4f5c</th>
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
    window.__subscriptionsExpandedEditId = null;
    window.__subscriptionsInlineError = '';
    window.__subscriptionSelectedOpportunityId = '';
    window.__subscriptionSelectedProductId = '';
    rerenderSubscriptionsInline();
    ensureSubscriptionWonOpportunityOptions();
};

window.cancelSubscriptionCreateInline = function() {
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsInlineError = '';
    window.__subscriptionSelectedOpportunityId = '';
    window.__subscriptionSelectedProductId = '';
    rerenderSubscriptionsInline();
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
        .subscription-ops-table { table-layout: fixed; min-width: 1120px; }
        .subscription-ops-table th:nth-child(1),
        .subscription-ops-table td:nth-child(1) { width: 48px; color: var(--text-muted); }
        .subscription-ops-table th:nth-child(2),
        .subscription-ops-table td:nth-child(2),
        .subscription-ops-table th:nth-child(6),
        .subscription-ops-table td:nth-child(6),
        .subscription-ops-table th:nth-child(7),
        .subscription-ops-table td:nth-child(7) { width: 104px; white-space: nowrap; }
        .subscription-ops-table th:nth-child(8),
        .subscription-ops-table td:nth-child(8) { width: 132px; }
        .subscription-ops-table th:nth-child(9),
        .subscription-ops-table td:nth-child(9) { width: 112px; }
        .subscription-ops-table th:nth-child(10),
        .subscription-ops-table td:nth-child(10) { width: 128px; }
        .subscription-op-row td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .subscription-row-number { font-variant-numeric: tabular-nums; }
        .subscription-inline-form-row td { background: var(--secondary-bg); padding: 12px; }
        .subscription-inline-form { border: 1px solid var(--border-color); border-radius: 6px; background: var(--card-bg); padding: 12px; }
        .subscription-inline-grid { display: grid; grid-template-columns: repeat(3, minmax(150px, 1fr)); gap: 10px; }
        .subscription-inline-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .subscription-inline-field span { color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; }
        .subscription-inline-field input,
        .subscription-inline-field select,
        .subscription-inline-field textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 5px; background: var(--secondary-bg); color: var(--text-primary); padding: 7px 8px; font-size: 0.84rem; }
        .subscription-reminder-stage-field { border: 0; margin: 0; padding: 0; }
        .subscription-reminder-stage-field legend { color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; padding: 0; margin-bottom: 4px; }
        .subscription-reminder-stage-group { display: flex; align-items: center; gap: 10px; min-height: 34px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--secondary-bg); padding: 6px 8px; box-sizing: border-box; }
        .subscription-reminder-stage-option { display: inline-flex; align-items: center; gap: 4px; color: var(--text-primary); font-size: 0.84rem; white-space: nowrap; }
        .subscription-reminder-stage-option input { width: auto; margin: 0; }
        .subscription-reminder-stage-option span { color: var(--text-primary); font-size: 0.84rem; font-weight: 500; }
        .subscription-inline-field-wide { grid-column: span 3; }
        .subscription-opportunity-create-block { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
        .subscription-readonly-product { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 8px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--secondary-bg); }
        .subscription-readonly-product span { color: var(--text-muted); font-size: 0.78rem; font-weight: 600; }
        .subscription-readonly-product strong { color: var(--text-primary); font-size: 0.84rem; font-weight: 600; }
        .subscription-opportunity-reference { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; padding: 8px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--secondary-bg); }
        .subscription-reference-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .subscription-reference-item span { color: var(--text-muted); font-size: 0.72rem; font-weight: 600; }
        .subscription-reference-item strong { color: var(--text-primary); font-size: 0.82rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .subscription-inline-note { color: var(--text-muted); font-size: 0.82rem; padding: 2px 0; }
        .subscription-inline-note.is-error { color: var(--danger-color, #b42318); }
        .subscription-inline-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
        .subscription-empty-state { padding: 26px; text-align: center; color: var(--text-muted); }
        .subscription-inline-error { margin: 10px 12px; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 5px; color: var(--danger-color, #b42318); background: var(--card-bg); font-size: 0.84rem; }
        .subscription-archive-btn { color: var(--text-secondary); }
        @media (max-width: 900px) {
            .subscription-inline-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); }
            .subscription-inline-field-wide { grid-column: span 2; }
            .subscription-opportunity-reference { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
    `;
    document.head.appendChild(style);
})();
