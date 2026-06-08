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

const SUBSCRIPTION_STATUS_OPTIONS = [
    '\u9032\u884c\u4e2d',
    '\u5f85\u8655\u7406',
    '\u5df2\u7e8c\u7d04',
    '\u5df2\u7d42\u6b62',
    '\u5df2\u5c01\u5b58'
];

const SUBSCRIPTION_FORM_FIELDS = [
    'customerName',
    'subscriptionItemName',
    'endDate',
    'status',
    'ownerName',
    'notes'
];

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

function renderSubscriptionInlineMessage() {
    if (!window.__subscriptionsInlineError) return '';
    return `
        <div class="subscription-inline-error" role="status">
            ${escapeSubscriptionHtml(window.__subscriptionsInlineError)}
        </div>
    `;
}

function renderSubscriptionField(prefix, field, item = {}) {
    const id = `${prefix}-${field}`;
    const value = item[field] ?? '';

    if (field === 'status') {
        return `
            <label class="subscription-inline-field">
                <span>\u72c0\u614b *</span>
                <select id="${id}" required>
                    ${renderSubscriptionOptions(SUBSCRIPTION_STATUS_OPTIONS, value, true)}
                </select>
            </label>
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
        customerName: '\u5ba2\u6236\u540d\u7a31 *',
        subscriptionItemName: '\u8ffd\u8e64\u9805\u76ee *',
        endDate: '\u5230\u671f\u65e5 *',
        ownerName: '\u8ca0\u8cac\u4eba *'
    };

    const types = {
        endDate: 'date'
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

    return `
        <tr class="subscription-inline-form-row">
            <td colspan="7">
                <div class="subscription-inline-form">
                    <div class="subscription-inline-grid">
                        ${SUBSCRIPTION_FORM_FIELDS.map(field => renderSubscriptionField(prefix, field, item)).join('')}
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

function collectSubscriptionForm(prefix) {
    return SUBSCRIPTION_FORM_FIELDS.reduce((payload, field) => {
        const input = document.getElementById(`${prefix}-${field}`);
        if (!input) return payload;

        const value = input.value.trim();
        if (value !== '') {
            payload[field] = value;
        }
        return payload;
    }, {});
}

function validateSubscriptionPayload(payload) {
    const required = ['customerName', 'subscriptionItemName', 'endDate', 'status', 'ownerName'];
    const missing = required.filter(field => !payload[field]);
    if (missing.length > 0) {
        return '\u8acb\u586b\u5beb\u5fc5\u586b\u6b04\u4f4d\uff1a\u5ba2\u6236\u540d\u7a31\u3001\u8a02\u95b1\u9805\u76ee\u3001\u7d50\u675f\u65e5\u3001\u72c0\u614b\u3001\u8ca0\u8cac\u4eba';
    }
    return '';
}

async function requestSubscriptionOps(url, options = {}) {
    if (typeof authedFetch === 'function') {
        return authedFetch(url, options);
    }
    return fetch(url, options).then(response => response.json());
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

    const activeRecords = records.filter(item => item && item.isArchived !== true);
    const rows = activeRecords.map((item, index) => {
        const id = escapeSubscriptionHtml(item.id);
        const editOpen = String(window.__subscriptionsExpandedEditId || '') === String(item.id);

        return `
            <tr class="subscription-op-row">
                <td class="subscription-row-number">${index + 1}.</td>
                <td><strong>${formatSubscriptionValue(item.customerName)}</strong></td>
                <td>${formatSubscriptionValue(item.subscriptionItemName)}</td>
                <td>${formatSubscriptionValue(item.endDate)}</td>
                <td>${formatSubscriptionValue(item.status)}</td>
                <td>${formatSubscriptionValue(item.ownerName)}</td>
                <td>
                    <div class="internal-ops-actions">
                        <button type="button" class="internal-ops-btn" onclick="window.toggleSubscriptionExpandedEdit('${id}')">\u7de8\u8f2f</button>
                        <button type="button" class="internal-ops-btn subscription-archive-btn" onclick="window.archiveSubscriptionOp('${id}')">\u5c01\u5b58</button>
                    </div>
                </td>
            </tr>
            ${editOpen ? renderSubscriptionInlineForm(`edit-${id}`, item, 'edit') : ''}
        `;
    }).join('');

    const createRow = window.__subscriptionsCreateOpen
        ? renderSubscriptionInlineForm('create-subscription', {}, 'create')
        : '';

    const emptyState = activeRecords.length === 0 && !window.__subscriptionsCreateOpen
        ? '<tr><td colspan="7"><div class="subscription-empty-state">\u76ee\u524d\u6c92\u6709\u8a02\u95b1\u8ffd\u8e64\u8a18\u9304</div></td></tr>'
        : '';

    return `
        <div class="subscription-ops-scope">
            ${renderSubscriptionInlineMessage()}
            <table class="internal-ops-table subscription-ops-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>\u5ba2\u6236</th>
                        <th>\u8ffd\u8e64\u9805\u76ee</th>
                        <th>\u5230\u671f\u65e5</th>
                        <th>\u72c0\u614b</th>
                        <th>\u8ca0\u8cac\u4eba</th>
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
    rerenderSubscriptionsInline();
};

window.cancelSubscriptionCreateInline = function() {
    window.__subscriptionsCreateOpen = false;
    window.__subscriptionsInlineError = '';
    rerenderSubscriptionsInline();
};

window.saveSubscriptionCreateInline = async function() {
    const payload = collectSubscriptionForm('create-subscription');
    const validationError = validateSubscriptionPayload(payload);
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

    const payload = collectSubscriptionForm(`edit-${id}`);
    const validationError = validateSubscriptionPayload(payload);
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
        .subscription-ops-table { table-layout: fixed; min-width: 780px; }
        .subscription-ops-table th:nth-child(1),
        .subscription-ops-table td:nth-child(1) { width: 48px; color: var(--text-muted); }
        .subscription-ops-table th:nth-child(4),
        .subscription-ops-table td:nth-child(4) { width: 112px; white-space: nowrap; }
        .subscription-ops-table th:nth-child(5),
        .subscription-ops-table td:nth-child(5) { width: 108px; }
        .subscription-ops-table th:nth-child(6),
        .subscription-ops-table td:nth-child(6) { width: 120px; }
        .subscription-ops-table th:nth-child(7),
        .subscription-ops-table td:nth-child(7) { width: 128px; }
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
        .subscription-inline-field-wide { grid-column: span 3; }
        .subscription-inline-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
        .subscription-empty-state { padding: 26px; text-align: center; color: var(--text-muted); }
        .subscription-inline-error { margin: 10px 12px; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 5px; color: var(--danger-color, #b42318); background: var(--card-bg); font-size: 0.84rem; }
        .subscription-archive-btn { color: var(--text-secondary); }
        @media (max-width: 900px) {
            .subscription-inline-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); }
            .subscription-inline-field-wide { grid-column: span 2; }
        }
    `;
    document.head.appendChild(style);
})();
