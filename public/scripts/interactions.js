// views/scripts/interactions.js

/**
 * 載入並渲染所有互動紀錄頁面的主函式
 * @param {number} [page=1] - 要載入的頁碼
 * @param {string} [query=''] - 搜尋關鍵字
 */
let currentInteractionOverviewTab = 'crm';
let currentInteractionOverviewQuery = '';

const ACTIVITY_TIMELINE_PREF_ITEM = 'activity_timeline_enabled_event_types';
const ACTIVITY_TIMELINE_PAGE_SIZE = 50;

const ACTIVITY_TIMELINE_OPTION_GROUPS = [
    {
        label: '事件紀錄',
        options: [
            { value: 'event_log_created', label: '新增事件紀錄', defaultChecked: true },
            { value: 'event_log_updated', label: '更新事件紀錄', defaultChecked: false },
            { value: 'event_log_deleted', label: '刪除事件紀錄', defaultChecked: false },
            { value: 'event_log_voided', label: '作廢事件紀錄', defaultChecked: false }
        ]
    },
    {
        label: '機會案件',
        options: [
            { value: 'opportunity_created', label: '新增機會', defaultChecked: true },
            { value: 'opportunity_won', label: '機會成交', defaultChecked: true },
            { value: 'opportunity_lost', label: '機會失敗', defaultChecked: true },
            { value: 'opportunity_stage_changed', label: '變更機會階段', defaultChecked: true },
            { value: 'opportunity_status_changed', label: '變更機會狀態', defaultChecked: true },
            { value: 'opportunity_assignee_changed', label: '變更機會負責人', defaultChecked: true },
            { value: 'opportunity_value_changed', label: '變更機會金額', defaultChecked: true },
            { value: 'opportunity_contact_linked', label: '機會關聯聯絡人', defaultChecked: false },
            { value: 'opportunity_contact_unlinked', label: '機會移除聯絡人', defaultChecked: false },
            { value: 'opportunity_updated', label: '更新機會一般欄位', defaultChecked: false },
            { value: 'opportunity_deleted', label: '刪除機會', defaultChecked: false }
        ]
    },
    {
        label: '公司資料',
        options: [
            { value: 'company_created', label: '新增公司', defaultChecked: true },
            { value: 'company_updated', label: '更新公司', defaultChecked: false },
            { value: 'company_deleted', label: '刪除公司', defaultChecked: false }
        ]
    },
    {
        label: '內部開發',
        options: [
            { value: 'dev_project_created', label: '新增開發專案', defaultChecked: true },
            { value: 'dev_project_completed', label: '完成開發專案', defaultChecked: true },
            { value: 'dev_project_status_changed', label: '變更開發專案狀態', defaultChecked: true },
            { value: 'dev_project_owner_changed', label: '變更開發專案負責人', defaultChecked: true },
            { value: 'dev_project_progress_changed', label: '變更開發專案進度', defaultChecked: false },
            { value: 'dev_project_archived', label: '封存開發專案', defaultChecked: false },
            { value: 'dev_project_unarchived', label: '解除封存開發專案', defaultChecked: false },
            { value: 'dev_project_collaborators_changed', label: '變更協作者', defaultChecked: false },
            { value: 'dev_project_dates_changed', label: '變更日期', defaultChecked: false },
            { value: 'dev_project_opportunity_link_changed', label: '變更關聯機會', defaultChecked: false },
            { value: 'dev_project_parent_changed', label: '變更父層關聯', defaultChecked: false },
            { value: 'dev_project_updated', label: '編輯開發專案一般欄位', defaultChecked: false },
            { value: 'dev_project_deleted', label: '刪除開發專案', defaultChecked: false }
        ]
    },
    {
        label: '訂閱營運',
        options: [
            { value: 'subscription_created', label: '新增訂閱項目', defaultChecked: true },
            { value: 'subscription_archived', label: '封存訂閱項目', defaultChecked: true },
            { value: 'subscription_updated', label: '更新訂閱項目', defaultChecked: false }
        ]
    }
];

function getNormalizedCurrentRole() {
    return String(localStorage.getItem('crmUserRole') || '').trim().toLowerCase();
}

function isCurrentUserSuperAdmin() {
    return getNormalizedCurrentRole() === 'super_admin';
}

function renderInteractionOverviewTabs(activeTab) {
    if (!isCurrentUserSuperAdmin()) return '';

    const tabs = [
        { id: 'crm', label: 'CRM 互動總覽' },
        { id: 'audit', label: '系統稽核總覽' },
        { id: 'activity', label: '使用者活動' },
        { id: 'settings', label: '活動顯示設定' }
    ];

    return `
        <div class="action-buttons-container" style="margin-bottom: 1rem;">
            ${tabs.map(tab => {
                const tabClass = tab.id === activeTab ? 'action-btn small primary' : 'action-btn small secondary';
                return `<button type="button" class="${tabClass}" data-interactions-tab="${tab.id}">${tab.label}</button>`;
            }).join('')}
        </div>
    `;
}

function renderInteractionOverviewShell(query = '', activeTab = 'crm') {
    const isCrmTab = activeTab === 'crm';
    const isAuditTab = activeTab === 'audit';
    const isLegacyCrmTab = isCrmTab && !isCurrentUserSuperAdmin();

    return `
        <div class="dashboard-widget">
            <div class="widget-header">
                <h2 class="widget-title">所有互動紀錄</h2>
            </div>
            ${renderInteractionOverviewTabs(activeTab)}
            ${isCrmTab ? `
                <div class="search-pagination" style="padding: 0 1.5rem 1rem;">
                    ${isLegacyCrmTab ? `<input type="text" class="search-box" id="all-interactions-search" placeholder="搜尋內容、機會名稱、記錄人..." value="${query}">` : ''}
                    ${isCrmTab && !isLegacyCrmTab ? '<div id="activity-timeline-range" class="text-muted"></div>' : ''}
                    <div class="pagination" id="all-interactions-pagination"></div>
                </div>
            ` : ''}
            ${isAuditTab ? `
                <div class="search-pagination" style="padding: 0 1.5rem 1rem;">
                    <div class="pagination" id="audit-logs-pagination"></div>
                </div>
            ` : ''}
            <div id="all-interactions-content" class="widget-content">
                ${isCrmTab ? '<div class="loading show"><div class="spinner"></div><p>載入互動總覽中...</p></div>' : ''}
            </div>
        </div>
    `;
}

function bindInteractionOverviewControls(query = '') {
    const searchInput = document.getElementById('all-interactions-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const newQuery = event.target.value;
                loadAllInteractionsPage(1, newQuery);
            }
        });
    }

    document.querySelectorAll('[data-interactions-tab]').forEach(tabButton => {
        tabButton.addEventListener('click', () => {
            const selectedTab = tabButton.dataset.interactionsTab;
            if (selectedTab === 'crm') {
                loadAllInteractionsPage(1, currentInteractionOverviewQuery);
                return;
            }

            if (selectedTab === 'audit') {
                loadAuditLogsPage(1);
                return;
            }

            if (selectedTab === 'settings') {
                renderActivityDisplaySettingsTab(query);
                return;
            }

            renderInteractionOverviewPlaceholder(selectedTab, query);
        });
    });
}

function renderInteractionOverviewPlaceholder(activeTab, query = '') {
    const container = document.getElementById('page-interactions');
    if (!container) return;

    currentInteractionOverviewTab = activeTab;
    currentInteractionOverviewQuery = query;

    const placeholderText = activeTab === 'audit'
        ? '系統稽核總覽功能將在後續階段建置。'
        : '使用者登入與活動總覽功能將在後續階段建置。';

    container.innerHTML = renderInteractionOverviewShell(query, activeTab);
    document.getElementById('all-interactions-content').innerHTML = `
        <div class="alert alert-info" style="text-align:center;">${placeholderText}</div>
    `;
    bindInteractionOverviewControls(query);
}

function escapeActivitySettingsHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getDefaultActivityTimelineEnabledEventTypes() {
    return ACTIVITY_TIMELINE_OPTION_GROUPS
        .flatMap(group => group.options)
        .filter(option => option.defaultChecked)
        .map(option => option.value);
}

function findActivityTimelineSettingRow() {
    const systemConfig = window.CRM_APP?.systemConfig || {};
    const groups = Object.values(systemConfig).filter(Array.isArray);

    for (const group of groups) {
        const row = group.find(item => item && item.value === ACTIVITY_TIMELINE_PREF_ITEM);
        if (row) return row;
    }

    return null;
}

async function ensureActivityTimelineSystemConfig() {
    const config = window.CRM_APP?.systemConfig || {};
    const hasConfigArrays = Object.values(config).some(Array.isArray);

    if (!hasConfigArrays && window.CRM_APP && typeof window.CRM_APP.loadConfig === 'function') {
        try {
            await window.CRM_APP.loadConfig();
        } catch (error) {
            console.warn('[Activity Settings] Failed to load system config:', error);
        }
    }
}

function getSavedActivityTimelineEnabledEventTypes() {
    const settingRow = findActivityTimelineSettingRow();
    if (!settingRow || typeof settingRow.note !== 'string') {
        return getDefaultActivityTimelineEnabledEventTypes();
    }

    try {
        const parsed = JSON.parse(settingRow.note);
        if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === 'string');
        }
    } catch (error) {
        console.warn('[Activity Settings] Invalid saved event type setting:', error);
    }

    return getDefaultActivityTimelineEnabledEventTypes();
}

function renderActivityDisplaySettingsContent(enabledEventTypes, message = null) {
    const enabledSet = new Set(enabledEventTypes);
    const messageHtml = message
        ? `<div class="alert ${message.type === 'error' ? 'alert-error' : 'alert-info'}" style="margin-bottom: 1rem;">${escapeActivitySettingsHtml(message.text)}</div>`
        : '';

    return `
        <div class="alert alert-info" style="margin-bottom: 1rem;">
            &#36984;&#25799;&#35201;&#22312; CRM &#27963;&#21205;&#26178;&#38291;&#27969;&#20013;&#39023;&#31034;&#30340;&#31995;&#32113;&#20107;&#20214;&#39006;&#22411;&#12290;&#25163;&#21205;&#20114;&#21205;&#32000;&#37636;&#26371;&#25345;&#32396;&#39023;&#31034;&#65307;&#21462;&#28040;&#21246;&#36984;&#21482;&#26371;&#38577;&#34255;&#23565;&#25033;&#30340;&#31995;&#32113;&#31293;&#26680;&#20107;&#20214;&#12290;
        </div>
        ${messageHtml}
        <div id="activity-display-settings-form">
            ${ACTIVITY_TIMELINE_OPTION_GROUPS.map(group => `
                <div class="form-group">
                    <div class="form-label">${escapeActivitySettingsHtml(group.label)}</div>
                    <div>
                        ${group.options.map(option => `
                            <label>
                                <input type="checkbox" name="activity-event-type" value="${escapeActivitySettingsHtml(option.value)}" ${enabledSet.has(option.value) ? 'checked' : ''}>
                                <span>${escapeActivitySettingsHtml(option.label)}</span>
                                <code class="text-muted">${escapeActivitySettingsHtml(option.value)}</code>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="action-buttons-container">
            <button type="button" class="action-btn small secondary" id="select-all-activity-settings">&#20840;&#36984;</button>
            <button type="button" class="action-btn small secondary" id="unselect-all-activity-settings">&#21462;&#28040;&#20840;&#36984;</button>
            <button type="button" class="action-btn primary" id="save-activity-settings">儲存設定</button>
        </div>
    `;
}

function bindActivityDisplaySettingsControls(query = '') {
    const selectAllButton = document.getElementById('select-all-activity-settings');
    const unselectAllButton = document.getElementById('unselect-all-activity-settings');
    const saveButton = document.getElementById('save-activity-settings');

    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            document.querySelectorAll('input[name="activity-event-type"]').forEach(input => {
                input.checked = true;
            });
        });
    }

    if (unselectAllButton) {
        unselectAllButton.addEventListener('click', () => {
            document.querySelectorAll('input[name="activity-event-type"]').forEach(input => {
                input.checked = false;
            });
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => saveActivityTimelineDisplaySettings(query));
    }
}

async function renderActivityDisplaySettingsTab(query = '', message = null) {
    const container = document.getElementById('page-interactions');
    if (!container) return;

    currentInteractionOverviewTab = 'settings';
    currentInteractionOverviewQuery = query;

    container.innerHTML = renderInteractionOverviewShell(query, currentInteractionOverviewTab);
    bindInteractionOverviewControls(query);

    const content = document.getElementById('all-interactions-content');
    if (!content) return;

    content.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入設定中...</p></div>';
    await ensureActivityTimelineSystemConfig();

    content.innerHTML = renderActivityDisplaySettingsContent(getSavedActivityTimelineEnabledEventTypes(), message);
    bindActivityDisplaySettingsControls(query);
}

function getSelectedActivityTimelineEventTypes() {
    return Array.from(document.querySelectorAll('input[name="activity-event-type"]:checked'))
        .map(input => input.value);
}

function updateLocalActivityTimelineSetting(note) {
    if (!window.CRM_APP) return;
    if (!window.CRM_APP.systemConfig) window.CRM_APP.systemConfig = {};

    const existingRow = findActivityTimelineSettingRow();
    if (existingRow) {
        existingRow.note = note;
        return;
    }

    if (!Array.isArray(window.CRM_APP.systemConfig.SystemPref)) {
        window.CRM_APP.systemConfig.SystemPref = [];
    }

    window.CRM_APP.systemConfig.SystemPref.push({
        value: ACTIVITY_TIMELINE_PREF_ITEM,
        note,
        order: 0,
        category: 'System'
    });
}

async function saveActivityTimelineDisplaySettings(query = '') {
    const saveButton = document.getElementById('save-activity-settings');
    const enabledEventTypes = getSelectedActivityTimelineEventTypes();
    const note = JSON.stringify(enabledEventTypes);

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = '儲存中...';
    }

    try {
        await authedFetch('/api/config/pref', {
            method: 'PUT',
            body: JSON.stringify({
                item: ACTIVITY_TIMELINE_PREF_ITEM,
                note
            })
        });

        updateLocalActivityTimelineSetting(note);
        await renderActivityDisplaySettingsTab(query, { type: 'success', text: '活動顯示設定已儲存。' });
    } catch (error) {
        const content = document.getElementById('all-interactions-content');
        if (content) {
            content.innerHTML = renderActivityDisplaySettingsContent(enabledEventTypes, {
                type: 'error',
                text: `儲存失敗：${error.message}`
            });
            bindActivityDisplaySettingsControls(query);
        }
    }
}

async function loadAuditLogsPage(page = 1) {
    const container = document.getElementById('page-interactions');
    if (!container) return;

    currentInteractionOverviewTab = 'audit';

    container.innerHTML = renderInteractionOverviewShell(currentInteractionOverviewQuery, currentInteractionOverviewTab);
    bindInteractionOverviewControls(currentInteractionOverviewQuery);

    const content = document.getElementById('all-interactions-content');
    if (!content) return;

    content.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入系統稽核紀錄中...</p></div>';

    try {
        const result = await authedFetch(`/api/audit-logs?page=${page}&limit=50`);
        const auditLogs = result.data || [];

        content.innerHTML = renderAuditLogsTable(auditLogs);

        const pagination = result.pagination || {
            current: page,
            total: 1,
            totalItems: auditLogs.length,
            hasNext: false,
            hasPrev: page > 1
        };

        renderPagination('audit-logs-pagination', pagination, 'loadAuditLogsPage');
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">載入系統稽核紀錄失敗: ${escapeActivitySettingsHtml(error.message)}</div>`;
    }
}

function formatAuditLogDate(value) {
    if (!value) return '-';
    if (typeof formatDateTime === 'function') {
        return formatDateTime(value);
    }
    return value;
}

function renderAuditLogsTable(auditLogs) {
    if (!auditLogs || auditLogs.length === 0) {
        return '<div class="alert alert-info" style="text-align:center;">目前沒有系統稽核紀錄</div>';
    }

    let tableHTML = `<table class="data-table">
                        <thead>
                            <tr>
                                <th>時間</th>
                                <th>事件</th>
                                <th>內容</th>
                                <th>模組</th>
                                <th>使用者</th>
                                <th>關聯對象</th>
                            </tr>
                        </thead>
                        <tbody>`;

    auditLogs.forEach(item => {
        const eventText = item.eventTitle || item.businessEventType || item.action || '-';
        const moduleText = item.module || '-';
        const businessEventType = item.businessEventType && item.businessEventType !== eventText
            ? `<div style="font-size: 0.85em; opacity: 0.75;">${escapeActivitySettingsHtml(item.businessEventType)}</div>`
            : '';
        const actorText = item.actorName && item.actorUsername
            ? `${item.actorName} (${item.actorUsername})`
            : (item.actorName || item.actorUsername || '-');
        const targetText = item.targetLabel || item.targetId || '-';

        tableHTML += `
            <tr>
                <td data-label="時間">${escapeActivitySettingsHtml(formatAuditLogDate(item.createdAt))}</td>
                <td data-label="事件">${escapeActivitySettingsHtml(eventText)}</td>
                <td data-label="內容" style="white-space: pre-wrap; word-break: break-word;">${escapeActivitySettingsHtml(item.eventSummary || '-')}</td>
                <td data-label="模組">${escapeActivitySettingsHtml(moduleText)}${businessEventType}</td>
                <td data-label="使用者">${escapeActivitySettingsHtml(actorText)}</td>
                <td data-label="關聯對象">${escapeActivitySettingsHtml(targetText)}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
}

async function loadActivityTimelinePage(page = 1) {
    const container = document.getElementById('page-interactions');
    if (!container) return;

    currentInteractionOverviewTab = 'crm';

    container.innerHTML = renderInteractionOverviewShell('', currentInteractionOverviewTab);
    bindInteractionOverviewControls('');

    const content = document.getElementById('all-interactions-content');
    if (!content) return;

    content.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入 CRM 活動時間流中...</p></div>';

    try {
        const result = await authedFetch(`/api/activity-timeline?page=${page}&limit=50`);
        const timelineItems = result.data || [];
        const pagination = result.pagination || {
            current: page,
            total: 1,
            totalItems: timelineItems.length,
            hasNext: false,
            hasPrev: page > 1
        };
        const currentPage = pagination.current || page;

        content.innerHTML = renderActivityTimelineTable(timelineItems, currentPage, ACTIVITY_TIMELINE_PAGE_SIZE);
        renderActivityTimelineRangeText(currentPage, ACTIVITY_TIMELINE_PAGE_SIZE, pagination.totalItems || 0);
        renderPagination('all-interactions-pagination', pagination, 'loadActivityTimelinePage');
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">載入 CRM 活動時間流失敗: ${escapeActivitySettingsHtml(error.message)}</div>`;
    }
}

function renderActivityTimelineRangeText(page, limit, totalItems) {
    const rangeElement = document.getElementById('activity-timeline-range');
    if (!rangeElement) return;

    const total = Number(totalItems) || 0;
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    rangeElement.textContent = total === 0
        ? '\u5171 0 \u7b46'
        : `\u986f\u793a ${start}-${end} \u7b46\uff0c\u5171 ${total} \u7b46`;
}

function renderActivityTimelineTable(items, page = 1, limit = ACTIVITY_TIMELINE_PAGE_SIZE) {
    if (!items || items.length === 0) {
        return '<div class="alert alert-info" style="text-align:center;">目前沒有 CRM 活動時間流紀錄</div>';
    }

    let tableHTML = `<table class="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>時間</th>
                                <th>關聯對象</th>
                                <th>事件類型</th>
                                <th>內容摘要</th>
                                <th>記錄人</th>
                            </tr>
                        </thead>
                        <tbody>`;

    items.forEach((item, rowIndex) => {
        const targetHtml = renderActivityTimelineTarget(item);
        const summaryHtml = item.source === 'interaction'
            ? renderInteractionSummaryWithEventReportLinks(item.summary || '-')
            : escapeActivitySettingsHtml(item.summary || '-');
        const titleText = item.title || item.businessEventType || item.interactionType || item.module || '-';
        const secondaryText = item.source === 'audit'
            ? (item.module || item.businessEventType || '')
            : (item.interactionType || '');
        const eventHtml = secondaryText && secondaryText !== titleText
            ? `${escapeActivitySettingsHtml(titleText)}<div class="text-muted">${escapeActivitySettingsHtml(secondaryText)}</div>`
            : escapeActivitySettingsHtml(titleText);
        const actorText = item.actorName || item.actorUsername || '-';
        const rowNumber = (page - 1) * limit + rowIndex + 1;

        tableHTML += `
            <tr>
                <td data-label="#">${rowNumber}</td>
                <td data-label="時間">${escapeActivitySettingsHtml(formatAuditLogDate(item.time))}</td>
                <td data-label="關聯對象">${targetHtml}</td>
                <td data-label="事件類型">${eventHtml}</td>
                <td data-label="內容摘要" style="white-space: pre-wrap; word-break: break-word;">${summaryHtml}</td>
                <td data-label="記錄人">${escapeActivitySettingsHtml(actorText)}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
}

function renderActivityTimelineTarget(item) {
    const targetText = item.targetLabel || item.targetId || '-';

    if (item.source !== 'interaction') {
        return escapeActivitySettingsHtml(targetText);
    }

    if (item.targetType === 'opportunity' && item.targetId) {
        return `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${escapeActivitySettingsJsString(item.targetId)}' })">
                    ${escapeActivitySettingsHtml(targetText)}
                </a>`;
    }

    if (item.targetType === 'company' && targetText !== '-') {
        const encodedCompanyName = encodeURIComponent(item.targetLabel || item.targetId);
        return `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('company-details', { companyName: '${escapeActivitySettingsJsString(encodedCompanyName)}' })">
                    ${escapeActivitySettingsHtml(targetText)}
                </a>`;
    }

    return escapeActivitySettingsHtml(targetText);
}

function renderInteractionSummaryWithEventReportLinks(summary) {
    const escapedSummary = escapeActivitySettingsHtml(summary);
    const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9]+)\)/g;

    return escapedSummary.replace(linkRegex, (fullMatch, text, eventId) => {
        const safeEventId = escapeActivitySettingsJsString(eventId);
        return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${escapeActivitySettingsHtml(text)}</a>`;
    });
}

function escapeActivitySettingsJsString(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function loadAllInteractionsPage(page = 1, query = '') {
    const container = document.getElementById('page-interactions');
    if (!container) return;

    if (isCurrentUserSuperAdmin()) {
        return loadActivityTimelinePage(page);
    }

    currentInteractionOverviewTab = 'crm';
    currentInteractionOverviewQuery = query;

    // 步驟 1: 渲染頁面基本骨架
    container.innerHTML = renderInteractionOverviewShell(query, currentInteractionOverviewTab);

    // 綁定搜尋事件
    bindInteractionOverviewControls(query);

    // 步驟 2: 獲取數據並渲染
    try {
        const result = await authedFetch(`/api/interactions/all?page=${page}&q=${encodeURIComponent(query)}`);
        
        document.getElementById('all-interactions-content').innerHTML = renderAllInteractionsTable(result.data || []);
        renderPagination('all-interactions-pagination', result.pagination, 'loadAllInteractionsPage');

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('載入所有互動紀錄失敗:', error);
            document.getElementById('all-interactions-content').innerHTML = `<div class="alert alert-error">載入紀錄失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 【已修改】渲染所有互動紀錄的 *表格* 列表
 * @param {Array<object>} interactions - 互動紀錄資料陣列
 * @returns {string} HTML 表格字串
 */
function renderAllInteractionsTable(interactions) {
    if (!interactions || interactions.length === 0) {
        return '<div class="alert alert-info" style="text-align:center;">找不到符合條件的互動紀錄</div>';
    }

    // --- 替換為表格 Table HTML ---
    let tableHTML = `<table class="data-table">
                        <thead>
                            <tr>
                                <th>互動時間</th>
                                <th>關聯對象</th>
                                <th>事件類型</th>
                                <th>內容摘要</th>
                                <th>記錄人</th>
                            </tr>
                        </thead>
                        <tbody>`;

    interactions.forEach(item => {
        let summaryHTML = item.contentSummary || '';
        // 讓摘要中的報告連結可以點擊
        const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9]+)\)/g; // 修正 Regex
        summaryHTML = summaryHTML.replace(linkRegex, (fullMatch, text, eventId) => {
            const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
        });

        // --- 修正開始：建立可點擊的機會或公司連結 ---
        // (item.opportunityName 已在後端 reader 修正為會包含公司名稱)
        let opportunityLink = item.opportunityName || '未指定'; 
        if (item.opportunityId) {
            // 連結至機會
            opportunityLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${item.opportunityId}' })">
                                   ${item.opportunityName}
                               </a>`;
        } else if (item.companyId && item.opportunityName !== '未指定' && item.opportunityName !== '未知機會' && item.opportunityName !== '未知公司') {
            // 連結至公司 (item.opportunityName 此時是公司名稱)
            const encodedCompanyName = encodeURIComponent(item.opportunityName);
            opportunityLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('company-details', { companyName: '${encodedCompanyName}' })">
                                   ${item.opportunityName} (公司)
                               </a>`;
        }
        // --- 修正結束 ---

        tableHTML += `
            <tr>
                <td data-label="互動時間">${formatDateTime(item.interactionTime)}</td>
                <td data-label="關聯對象">${opportunityLink}</td>
                <td data-label="事件類型">${item.eventTitle || item.eventType}</td>
                <td data-label="內容摘要" style="white-space: pre-wrap; word-break: break-word;">${summaryHTML}</td>
                <td data-label="記錄人">${item.recorder || '-'}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
}

// 【修正】向主應用程式註冊此模組的載入函式
if (window.CRM_APP) {
    window.CRM_APP.pageModules.interactions = loadAllInteractionsPage;
}

window.loadActivityTimelinePage = loadActivityTimelinePage;
