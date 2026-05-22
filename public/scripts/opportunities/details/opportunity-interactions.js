/*
 * Project: TFC CRM
 * File: public/scripts/opportunities/details/opportunity-interactions.js
 * Version: v8.0.24 (Opportunity Operational Surface Alignment)
 * Date: 2026-05-22
 * Changelog: 
 * - Phase 8 Interaction UI: operation-key rowIndex -> interactionId for edit/delete
 * - Phase 8.10.2 Fix: Relaxed strict result.success check to prevent unreachable markStale on 204/raw responses
 * - Phase 8.10.3 Fix: Appended 'Z' to naive UTC ISO strings during showForEditing to prevent 8-hour offset loss.
 * - Phase 8.10.4 Patch: Restore legacy clickable event report links inside contentSummary.
 * - Phase 8.10.5 Fix: Restored mandatory timeline-card structure (crm-timeline-item) and left/right layout.
 * - Phase 8.10.6 Fix: Aligned left/right with eventType (not index), fixed Event Report placement.
 * - Phase 8.10.7 Patch: Fixed timeline geometry (absolute marker on center line), dynamic config-driven left/right logic, and adjusted card information hierarchy.
 * - Phase 8.10.8 Fix: Migrated left/right layout to strictly use '時間軸佈局' config source, solidified geometry and information hierarchy.
 * - Phase 8.10.9 Polish: Converted timeline to fixed-height scrollable workspace, styled right form as a contained panel, refined typography, and removed expand/collapse.
 * - Phase 8.10.10 Patch: Micro fix to ensure timeline vertical line always spans the full dynamic height of rendered items.
 * - Phase 8.10.11 Patch: Micro fix to wrap all timeline items in .interaction-timeline to ensure vertical line anchoring.
 * - Phase 8.10.12 Patch: Micro fix to restore correct render targets (#discussion-timeline, #activity-log-timeline).
 * - Phase 8.10.13 Patch: Reverted wrapper injection and moved ::before line logic directly to #discussion-timeline and #activity-log-timeline to fix double line issue.
 * - Phase 8.10.15 Patch: Critical structural visual fix. Forced height: auto !important on timeline containers to override external height locks.
 * - Phase 8.10.16 Patch: Final structural ownership fix. Introduced .crm-timeline-content wrapper to guarantee vertical line accurately follows true rendered item height without viewport clamping.
 * - Phase 8.10.17 Patch: Precision fix to remove stale SPA CSS injections and guarantee only one consistent timeline center line exists.
 * - Phase 8.10.18 Polish: Stabilized box-sizing, content overflow wrapping, and added strict SPA bleed protection for timeline line ownership.
 * - Phase 8.10.19 UI: Tokenized timeline surfaces and reduced operational card radius/shadow for dark/light consistency.
 * - Phase 8.10.20 Patch: Modalized interaction form while preserving runtime form lifecycle.
 */
// public/scripts/opportunities/details/opportunity-interactions.js
// 職責：專門管理「互動與新增」頁籤的所有 UI 與功能

const OpportunityInteractions = (() => {
    // 模組私有變數
    let _interactions = [];
    let _context = {}; // { opportunityId, companyId }
    let _container = null;
    let _editingInteractionId = null;
    let _isCreatingInline = false;

    // ✅ [Fix] 系統自動產生類型：必須與鎖定證據一致
    // Evidence: const isLockedRecord = ['系統事件', '事件報告'].includes(item.eventType);
    const SYSTEM_GENERATED_TYPES = ['系統事件', '事件報告'];

    // 子頁籤點擊事件
    function _handleTabClick(event) {
        if (!event.target.classList.contains('sub-tab-link')) return;

        const tab = event.target;
        const tabName = tab.dataset.tab;

        _container.querySelectorAll('.sub-tab-link').forEach(t => t.classList.remove('active'));
        _container.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const contentPane = _container.querySelector(`#${tabName}-pane`);
        if (contentPane) contentPane.classList.add('active');
    }

    function _getInteractionFormModal() {
        return _container ? _container.querySelector('#interaction-form-modal') : null;
    }

    function _openInteractionFormModal() {
        const modal = _getInteractionFormModal();
        if (modal) modal.hidden = false;
    }

    function _closeInteractionFormModal() {
        const modal = _getInteractionFormModal();
        if (modal) modal.hidden = true;
    }

    function createInteractionFormHTML(mode = 'create') {
        const formMode = mode === 'edit' ? 'edit' : 'create';
        return `
                    <h3 style="margin-bottom: 1.5rem;">新增/編輯互動</h3>
                    <form id="new-interaction-form" data-interaction-form-mode="${formMode}">
                        <input type="hidden" id="interaction-opportunity-id">
                        <input type="hidden" id="interaction-edit-rowIndex">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">互動類型</label>
                                <div class="select-wrapper">
                                    <select class="form-select" id="interaction-event-type" required></select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">互動時間</label>
                                <input type="datetime-local" class="form-input" id="interaction-time" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">內容摘要 *</label>
                            <textarea class="form-textarea" id="interaction-summary" placeholder="記錄互動重點..." required></textarea>
                        </div>
                         <div class="form-group">
                            <label class="form-label">下次行動</label>
                            <input type="text" class="form-input" id="interaction-next-action" placeholder="準備報價單並於下週三前寄出..."></input>
                        </div>
                        <button type="submit" class="submit-btn" id="interaction-submit-btn">💾 新增紀錄</button>
                    </form>
        `;
    }

    function renderInteractionForm(mode = 'create') {
        const content = _container ? _container.querySelector('#interaction-form-modal .interaction-form-modal__content') : null;
        if (!content) return null;

        let formRoot = content.querySelector('[data-interaction-form-root]');
        if (!formRoot) {
            formRoot = document.createElement('div');
            formRoot.setAttribute('data-interaction-form-root', '');
            content.appendChild(formRoot);
        }

        formRoot.innerHTML = createInteractionFormHTML(mode);
        return formRoot.querySelector('#new-interaction-form');
    }

    function _resetFormForCreate(form) {
        form.reset();
        form.querySelector('#interaction-edit-rowIndex').value = '';
        form.querySelector('#interaction-submit-btn').textContent = '💾 新增紀錄';

        const eventTypeSelect = form.querySelector('#interaction-event-type');
        const summaryTextarea = form.querySelector('#interaction-summary');
        const nextActionInput = form.querySelector('#interaction-next-action');
        if (eventTypeSelect) eventTypeSelect.disabled = false;
        if (summaryTextarea) summaryTextarea.readOnly = false;
        if (nextActionInput) nextActionInput.readOnly = false;

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        form.querySelector('#interaction-time').value = now.toISOString().slice(0, 16);
    }

    function showCreateForm() {
        if (!_container) return;
        if (_isCreatingInline) {
            _focusInlineCreateRow();
            return;
        }
        _isCreatingInline = true;
        _editingInteractionId = null;
        _updateTimelineView();
        _focusInlineCreateRow();
    }

    /**
     * 【鑑識修補】HTML 轉義 (XSS 防護)
     */
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function _formatInteractionTimeInput(rawTime) {
        let value = rawTime || new Date().toISOString();
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)) {
            value += 'Z';
        }

        const date = new Date(value);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    }

    function _createInteractionTypeOptionsHTML(selectedValue) {
        if (!window.CRM_APP || !window.CRM_APP.systemConfig || !window.CRM_APP.systemConfig['互動類型']) {
            return `<option value="${escapeHtml(selectedValue || '')}" selected>${escapeHtml(selectedValue || '')}</option>`;
        }

        return window.CRM_APP.systemConfig['互動類型']
            .filter(type => {
                const note = type.note || type.value;
                return !SYSTEM_GENERATED_TYPES.includes(note) && !SYSTEM_GENERATED_TYPES.includes(type.value);
            })
            .map(type => {
                const selected = type.value === selectedValue ? ' selected' : '';
                return `<option value="${escapeHtml(type.value)}"${selected}>${escapeHtml(type.note || type.value)}</option>`;
            })
            .join('');
    }

    function _getRenderWeight(interaction) {
        const value = `${interaction.eventType || ''} ${interaction.eventTitle || ''}`.toLowerCase();
        const microKeywords = ['phone', 'line', 'email', 'follow', 'call', '電話', '信件', '郵件', '追蹤'];
        const operationalKeywords = ['meeting', 'visit', 'test', 'event report', '事件報告', '會議', '拜訪', '測試'];
        if (operationalKeywords.some(keyword => value.includes(keyword))) return 'operational';
        if (microKeywords.some(keyword => value.includes(keyword))) return 'micro';
        return 'operational';
    }

    function _getDateDividerLabel(rawTime) {
        if (!rawTime) return '';
        const date = new Date(rawTime);
        if (Number.isNaN(date.getTime())) return '';

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfItem = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.floor((startOfToday - startOfItem) / 86400000);

        if (diffDays === 0) return 'TODAY';
        if (diffDays === 1) return 'YESTERDAY';
        if (diffDays > 1 && diffDays < 7) return 'THIS WEEK';
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }

    function _renderInlineMicroEditForm(interaction, recorder) {
        const interactionId = escapeHtml(interaction.interactionId);
        const timeValue = _formatInteractionTimeInput(interaction.interactionTime || interaction.createdTime);
        return `
            <div class="crm-stream-item micro editing" data-inline-edit-id="${interactionId}">
                <div class="interaction-inline-edit-frame">
                    <div class="inline-edit-row">
                        <label class="inline-edit-field inline-edit-type-field">
                            <span>互動種類</span>
                            <select class="inline-edit-input inline-edit-type" data-inline-field="eventType" required>
                                ${_createInteractionTypeOptionsHTML(interaction.eventType)}
                            </select>
                        </label>
                        <label class="inline-edit-field inline-edit-time-field">
                            <span>互動時間</span>
                            <input type="datetime-local" class="inline-edit-input inline-edit-time" data-inline-field="interactionTime" value="${escapeHtml(timeValue)}" required>
                        </label>
                    </div>
                    <label class="inline-edit-field">
                        <span>內容摘要</span>
                        <textarea class="inline-edit-input inline-edit-summary" data-inline-field="contentSummary" required>${escapeHtml(interaction.contentSummary || '')}</textarea>
                    </label>
                    <label class="inline-edit-field">
                        <span>下一步</span>
                        <textarea class="inline-edit-input inline-edit-next-action" data-inline-field="nextAction">${escapeHtml(interaction.nextAction || '')}</textarea>
                    </label>
                    <div class="inline-edit-meta">
                        <span>${recorder}</span>
                        <span class="inline-edit-actions">
                            <button type="button" class="stream-action-btn" onclick="OpportunityInteractions.saveInlineEdit('${interactionId}')">Save</button>
                            <button type="button" class="stream-action-btn" onclick="OpportunityInteractions.cancelInlineEdit()">Cancel</button>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    function _renderInlineMicroCreateForm() {
        const timeValue = _formatInteractionTimeInput(new Date().toISOString());
        return `
            <div class="crm-stream-item micro editing" data-inline-create-row>
                <div class="interaction-inline-edit-frame">
                    <div class="inline-edit-row">
                        <label class="inline-edit-field inline-edit-type-field">
                            <span>互動種類</span>
                            <select class="inline-edit-input inline-edit-type" data-inline-field="eventType" required>
                                ${_createInteractionTypeOptionsHTML('')}
                            </select>
                        </label>
                        <label class="inline-edit-field inline-edit-time-field">
                            <span>互動時間</span>
                            <input type="datetime-local" class="inline-edit-input inline-edit-time" data-inline-field="interactionTime" value="${escapeHtml(timeValue)}" required>
                        </label>
                    </div>
                    <label class="inline-edit-field">
                        <span>內容摘要</span>
                        <textarea class="inline-edit-input inline-edit-summary" data-inline-field="contentSummary" required></textarea>
                    </label>
                    <label class="inline-edit-field">
                        <span>下一步</span>
                        <textarea class="inline-edit-input inline-edit-next-action" data-inline-field="nextAction"></textarea>
                    </label>
                    <div class="inline-edit-meta">
                        <span>${escapeHtml(getCurrentUser())}</span>
                        <span class="inline-edit-actions">
                            <button type="button" class="stream-action-btn" onclick="OpportunityInteractions.cancelInlineCreate()">Cancel</button>
                            <button type="button" class="stream-action-btn" onclick="OpportunityInteractions.saveInlineCreate()">Create</button>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 【鑑識修補】動態取得 Left/Right 排版屬性
     * Source: window.CRM_APP.systemConfig['時間軸佈局']
     * Rule: 設定項目 (value) === eventType -> Extract 備註 (note)
     */
    function getTimelineSide(eventType) {
        if (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['時間軸佈局']) {
            const layoutConfigs = window.CRM_APP.systemConfig['時間軸佈局'];
            
            // Exact match: 設定項目 (config.value) === eventType
            const config = layoutConfigs.find(c => c.value === eventType);
            if (config && config.note) {
                const side = config.note.trim().toLowerCase();
                if (side === 'left' || side === 'right') {
                    return side;
                }
            }
        }
        
        // Strict fallback only if config missing or invalid
        return 'right';
    }

    /**
     * 【鑑識修補】渲染單一互動項目
     * 遵守 timeline-card UI doctrine (crm-timeline-item, crm-timeline-card, left/right layout)
     * 並維持 Strategy A：rowIndex 非有效數字則不渲染刪除按鈕
     */
    function renderSingleInteractionItem(interaction) {
        if (!interaction) return '';

        const rawTime = interaction.interactionTime || interaction.createdTime || '';
        const timeStr = (typeof formatDateTime === 'function')
            ? formatDateTime(rawTime)
            : rawTime;

        const typeStr = escapeHtml(interaction.eventTitle || interaction.eventType || '未分類');
        const recorder = escapeHtml(interaction.recorder || interaction.author || interaction.modifier || '系統');

        const rawSummary = interaction.contentSummary || '(無內容)';
        let summaryHtml = escapeHtml(rawSummary).replace(/\n/g, '<br>');
        const nextActionHtml = interaction.nextAction
            ? `<span class="stream-next-action">下一步：${escapeHtml(interaction.nextAction)}</span>`
            : '';

        // [Phase 8 Patch] Restore legacy clickable event report links inside contentSummary
        const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9_-]+)\)/g;
        summaryHtml = summaryHtml.replace(linkRegex, (fullMatch, text, eventId) => {
            const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
        });

        const rowId = interaction.interactionId;
        const rowIndex = interaction.rowIndex;

        // 鎖定邏輯（必須與 showForEditing 證據一致）
        const isLocked = ['系統事件', '事件報告'].includes(interaction.eventType);

        const renderWeight = _getRenderWeight(interaction);

        let buttonsHtml = '';
        if (rowId) {
            const editAction = !isLocked && renderWeight === 'micro'
                ? `OpportunityInteractions.startInlineEdit('${rowId}')`
                : `OpportunityInteractions.showForEditing('${rowId}')`;
            buttonsHtml += `
                <button type="button" class="stream-action-btn" onclick="${editAction}" title="${isLocked ? 'View' : 'Edit'}">
                    ${isLocked ? 'View' : '&#9998;'}
                </button>
            `;

            // Strategy A: only render delete for editable rows with a numeric rowIndex.
            const rowIndexNum = Number(rowIndex);
            if (!isLocked && Number.isFinite(rowIndexNum)) {
                buttonsHtml += `
                    <button type="button" class="stream-action-btn danger" onclick="OpportunityInteractions.confirmDelete('${rowId}', ${rowIndexNum})" title="Delete">
                        Delete
                    </button>
                `;
            }
        }

        if (renderWeight === 'micro') {
            if (_editingInteractionId === rowId && !isLocked) {
                return _renderInlineMicroEditForm(interaction, recorder);
            }

            return `
                <div class="crm-stream-item micro">
                    <div class="stream-row-main">
                        <div class="stream-main-copy">
                            <span class="stream-type stream-type-badge">${typeStr}</span>
                            <span class="stream-summary">${summaryHtml}</span>
                        </div>
                        <span class="stream-row-time">${escapeHtml(timeStr)}</span>
                    </div>
                    <div class="stream-meta-footer">
                        ${nextActionHtml}
                        <span class="stream-recorder-action">
                            <span class="stream-recorder">${recorder}</span>
                            <span class="stream-actions">${buttonsHtml}</span>
                        </span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="crm-stream-item operational">
                <div class="stream-card">
                    <div class="stream-card-header">
                        <strong>${typeStr}</strong>
                        <span class="feed-time">${escapeHtml(timeStr)}</span>
                    </div>
                    <div class="stream-card-body">
                        ${summaryHtml}
                    </div>
                    <div class="stream-card-footer">
                        <div class="footer-meta">紀錄: ${recorder}</div>
                        <div class="footer-actions">
                            ${buttonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染一個時間軸列表
     * @param {string} containerSelector - e.g. '#discussion-timeline'
     * @param {Array<object>} interactions
     */
    function _renderTimelineList(containerSelector, interactions) {
        const historyList = _container.querySelector(containerSelector);
        if (!historyList) {
            console.error(`[Interactions] 找不到時間軸容器: ${containerSelector}`);
            return;
        }

        const allInteractions = Array.isArray(interactions) ? interactions : [];
        const createRowHtml = containerSelector.includes('discussion') && _isCreatingInline
            ? _renderInlineMicroCreateForm()
            : '';
        if (allInteractions.length === 0) {
            historyList.innerHTML = `
                <div class="crm-timeline-content">
                    ${createRowHtml}
                    <div class="alert alert-info">
                        ${containerSelector.includes('discussion') ? '尚無動態' : '尚無系統活動'}
                    </div>
                </div>
            `;
            return;
        }

        // [Polish] Removed limit and expand/collapse. Render entire list in scrollable workspace.
        let lastDivider = '';
        let listHtml = allInteractions.map(interaction => {
            const divider = _getDateDividerLabel(interaction.interactionTime || interaction.createdTime);
            const dividerHtml = divider && divider !== lastDivider
                ? `<div class="stream-date-divider">${divider}</div>`
                : '';
            if (divider) lastDivider = divider;
            return dividerHtml + renderSingleInteractionItem(interaction);
        }).join('');

        // Structural visual fix: Bind the center line dynamically to the true rendered content
        historyList.innerHTML = `
            <div class="crm-timeline-content">
                ${createRowHtml}
                ${listHtml}
            </div>
        `;
    }

    /**
     * 更新時間軸視圖：分離討論 vs 系統活動
     */
    function _updateTimelineView() {
        if (!_container) return;

        const discussionInteractions = [];
        const activityLogInteractions = [];

        _interactions.forEach(interaction => {
            // [Fix] Placement Rule: Only pure '系統事件' remains in activity-log. 
            // '事件報告' (Event Reports) are explicitly treated as discussions.
            if (interaction.eventType === '系統事件') {
                activityLogInteractions.push(interaction);
            } else {
                discussionInteractions.push(interaction);
            }
        });

        // 可選：確保排序（若後端已排序可刪）
        // discussionInteractions.sort((a, b) => new Date(b.interactionTime || b.createdTime || 0) - new Date(a.interactionTime || a.createdTime || 0));
        // activityLogInteractions.sort((a, b) => new Date(b.interactionTime || b.createdTime || 0) - new Date(a.interactionTime || a.createdTime || 0));

        _renderTimelineList('#discussion-timeline', discussionInteractions);
        _renderTimelineList('#activity-log-timeline', activityLogInteractions);
    }

    /**
     * 表單提交：新增/編輯
     */
    async function _handleSubmit(event) {
        event.preventDefault();
        if (!_container) return;

        const form = _container.querySelector('#new-interaction-form');
        
        // #interaction-edit-rowIndex carries interactionId since Phase 8; legacy name kept for minimal diff.
        const interactionId = form.querySelector('#interaction-edit-rowIndex').value;
        const isEditMode = !!interactionId;

        showLoading(isEditMode ? '正在更新互動紀錄...' : '正在新增互動紀錄...');
        try {
            const interactionTimeInput = form.querySelector('#interaction-time').value;
            const interactionTimeISO = interactionTimeInput
                ? new Date(interactionTimeInput).toISOString()
                : new Date().toISOString();

            const interactionData = {
                interactionTime: interactionTimeISO,
                eventType: form.querySelector('#interaction-event-type').value,
                contentSummary: form.querySelector('#interaction-summary').value,
                nextAction: form.querySelector('#interaction-next-action').value,
                modifier: getCurrentUser()
            };

            if (_context.opportunityId) interactionData.opportunityId = _context.opportunityId;
            if (_context.companyId) interactionData.companyId = _context.companyId;

            const url = isEditMode ? `/api/interactions/${interactionId}` : '/api/interactions';
            const method = isEditMode ? 'PUT' : 'POST';

            if (!isEditMode) interactionData.recorder = getCurrentUser();

            const result = await authedFetch(url, { method, body: JSON.stringify(interactionData) });

            // [Phase 8.10.2 Fix] Production rule: treat explicit success:false as failure.
            // Bypasses false-positive throws on 204 No Content (null) or raw object returns.
            if (result && result.success === false) {
                throw new Error(result.details || '操作失敗');
            }
            
            // [Phase 8.10 Dashboard Refresh Fix] Interaction alters followUp list and recentActivity feed
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

            _closeInteractionFormModal();
            
            // 成功後 authedFetch 可能刷新/通知（維持既有行為）
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`操作失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    function startInlineEdit(interactionId) {
        if (!_container) return;

        const item = _interactions.find(i => i.interactionId === interactionId);
        if (!item || SYSTEM_GENERATED_TYPES.includes(item.eventType) || _getRenderWeight(item) !== 'micro') {
            showForEditing(interactionId);
            return;
        }

        _editingInteractionId = interactionId;
        _updateTimelineView();
        _autosizeInlineEditTextareas();
    }

    function cancelInlineEdit() {
        _editingInteractionId = null;
        _updateTimelineView();
    }

    function _autosizeInlineEditTextareas() {
        if (!_container) return;
        _container.querySelectorAll('.inline-edit-summary, .inline-edit-next-action').forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            textarea.removeEventListener('input', _autosizeInlineEditTextareas);
            textarea.addEventListener('input', _autosizeInlineEditTextareas);
        });
    }

    function _focusInlineCreateRow() {
        if (!_container) return;
        const row = _container.querySelector('[data-inline-create-row]');
        if (!row) return;
        row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const summary = row.querySelector('[data-inline-field="contentSummary"]');
        if (summary) summary.focus();
        _autosizeInlineEditTextareas();
    }

    function cancelInlineCreate() {
        _isCreatingInline = false;
        _updateTimelineView();
    }

    async function saveInlineCreate() {
        if (!_container) return;

        const frame = _container.querySelector('[data-inline-create-row]');
        if (!frame) return;

        const interactionTimeInput = frame.querySelector('[data-inline-field="interactionTime"]').value;
        const interactionData = {
            interactionTime: interactionTimeInput
                ? new Date(interactionTimeInput).toISOString()
                : new Date().toISOString(),
            eventType: frame.querySelector('[data-inline-field="eventType"]').value,
            contentSummary: frame.querySelector('[data-inline-field="contentSummary"]').value,
            nextAction: frame.querySelector('[data-inline-field="nextAction"]').value,
            recorder: getCurrentUser(),
            modifier: getCurrentUser()
        };

        if (!interactionData.eventType || !interactionData.contentSummary) return;
        if (_context.opportunityId) interactionData.opportunityId = _context.opportunityId;
        if (_context.companyId) interactionData.companyId = _context.companyId;

        showLoading('Saving interaction...');
        try {
            const result = await authedFetch('/api/interactions', { method: 'POST', body: JSON.stringify(interactionData) });
            if (result && result.success === false) {
                throw new Error(result.details || 'Save failed');
            }

            const createdInteraction = result && (result.data || result.interaction || result);
            const createdId = typeof createdInteraction === 'string'
                ? createdInteraction
                : createdInteraction && (createdInteraction.interactionId || createdInteraction.id);
            if (createdId) {
                _interactions.unshift({
                    ...interactionData,
                    ...(typeof createdInteraction === 'object' ? createdInteraction : {}),
                    interactionId: createdId,
                    recorder: interactionData.recorder
                });
            }

            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

            _isCreatingInline = false;
            _updateTimelineView();
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`Save failed: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    async function saveInlineEdit(interactionId) {
        if (!_container) return;

        const frame = Array.from(_container.querySelectorAll('[data-inline-edit-id]'))
            .find(element => element.getAttribute('data-inline-edit-id') === interactionId);
        if (!frame) return;

        const interactionTimeInput = frame.querySelector('[data-inline-field="interactionTime"]').value;
        const interactionData = {
            interactionTime: interactionTimeInput
                ? new Date(interactionTimeInput).toISOString()
                : new Date().toISOString(),
            eventType: frame.querySelector('[data-inline-field="eventType"]').value,
            contentSummary: frame.querySelector('[data-inline-field="contentSummary"]').value,
            nextAction: frame.querySelector('[data-inline-field="nextAction"]').value
        };

        if (!interactionData.eventType || !interactionData.contentSummary) return;
        if (_context.opportunityId) interactionData.opportunityId = _context.opportunityId;
        if (_context.companyId) interactionData.companyId = _context.companyId;

        showLoading('Saving interaction...');
        try {
            const result = await authedFetch(`/api/interactions/${interactionId}`, { method: 'PUT', body: JSON.stringify(interactionData) });
            if (result && result.success === false) {
                throw new Error(result.details || 'Save failed');
            }

            const updatedInteraction = result && (result.data || result.interaction || result);
            const existing = _interactions.find(i => i.interactionId === interactionId);
            if (existing) {
                const preservedRecorder = existing.recorder;
                const preservedAuthor = existing.author;
                const preservedModifier = existing.modifier;
                Object.assign(existing, interactionData, updatedInteraction && updatedInteraction.interactionId ? updatedInteraction : {});
                if (!existing.recorder && preservedRecorder) existing.recorder = preservedRecorder;
                if (!existing.author && preservedAuthor) existing.author = preservedAuthor;
                if (!existing.modifier && preservedModifier) existing.modifier = preservedModifier;
            }

            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

            _editingInteractionId = null;
            _updateTimelineView();
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`Save failed: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }
    // 動態注入樣式（保留既有行為並補齊精確的時間軸幾何與 CSS）
    function _injectStyles() {
        const styleId = 'interactions-dynamic-styles';
        
        // [Fix] Remove existing style block to prevent SPA duplicate/stale CSS issues
        const existing = document.getElementById(styleId);
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- Narrative Stream Workspace --- */
            .interaction-layout {
                display: grid;
                grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
                width: 100%;
            }
            .interaction-layout > .activity-hub-header {
                grid-column: 1 / -1;
            }
            .interaction-history-section {
                grid-column: 1 / 2;
            }

            .interaction-timeline,
            #discussion-timeline,
            #activity-log-timeline {
                box-sizing: border-box;
                height: auto !important;
                max-height: none !important;
                max-width: 100% !important;
                overflow: visible !important;
                width: 100% !important;
            }
            .interaction-timeline::before {
                content: none !important;
                display: none !important;
            }

            #discussion-pane, #activity-pane {
                height: auto;
                overflow: visible;
                padding-right: 0;
            }

            .interaction-layout > .activity-hub-header {
                align-items: center;
                border-bottom: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
                display: flex;
                gap: 4px;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 8px;
            }
            .interaction-layout > .activity-hub-header .sub-tab-link {
                background: transparent;
                border: 0;
                color: var(--text-muted);
                cursor: default;
                font-size: 0.82rem;
                font-weight: 600;
                letter-spacing: 0.02em;
                padding: 0;
            }
            .interaction-layout > .activity-hub-header .sub-tab-link.active {
                color: var(--text-muted);
                font-weight: 600;
            }
            .interaction-layout > .activity-hub-header .sub-tab-link[data-tab="activity"] {
                display: none;
            }
            .activity-hub-header-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                justify-content: flex-end;
                margin-left: auto;
            }
            .activity-hub-header-actions .action-btn {
                font-size: 0.78rem;
                padding: 6px 10px;
            }

            .crm-timeline-content {
                border-left: 1px solid color-mix(in srgb, var(--border-color) 45%, transparent);
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 7px;
                padding: 6px 0 6px 14px;
                position: relative;
                width: 100%;
            }
            .crm-timeline-content::before {
                content: none;
                display: none;
            }

            .stream-date-divider {
                color: var(--text-muted);
                font-size: 0.72rem;
                font-weight: 600;
                letter-spacing: 0.04em;
                margin: 6px 0 2px;
            }

            .crm-stream-item {
                box-sizing: border-box;
                position: relative;
                width: 100%;
            }
            .crm-stream-item::before {
                background: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: 50%;
                content: '';
                height: 6px;
                left: -18px;
                position: absolute;
                top: 10px;
                width: 6px;
                z-index: 1;
            }
            .crm-stream-item.operational::before {
                background: var(--text-muted);
            }

            .crm-stream-item.micro {
                border-bottom: 1px solid color-mix(in srgb, var(--border-color) 45%, transparent);
                max-width: min(52%, 560px);
                padding: 5px 0 6px;
                width: 100%;
            }
            .crm-stream-item.micro.editing {
                border-bottom: 0;
                max-width: min(52%, 560px);
                padding: 4px 0 7px;
                width: 100%;
            }
            .interaction-inline-edit-frame {
                background: rgba(59, 130, 246, 0.07);
                border: 1px solid var(--text-primary);
                border-radius: var(--rounded-sm);
                box-sizing: border-box;
                padding: 8px 10px;
                width: 100%;
            }
            .inline-edit-row {
                align-items: flex-end;
                display: flex;
                gap: 8px;
                margin-bottom: 6px;
            }
            .inline-edit-field {
                color: var(--text-muted);
                display: block;
                font-size: 0.7rem;
                line-height: 1.25;
                margin-top: 6px;
            }
            .inline-edit-field > span {
                display: block;
                margin-bottom: 3px;
            }
            .inline-edit-type-field {
                flex: 0 0 132px;
            }
            .inline-edit-time-field {
                flex: 0 0 190px;
                margin-left: auto;
            }
            .inline-edit-input {
                background: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 3px;
                color: var(--text-primary);
                font-size: 0.82rem;
                padding: 5px 7px;
            }
            .inline-edit-type {
                width: 100%;
            }
            .inline-edit-time {
                width: 100%;
            }
            .inline-edit-summary {
                box-sizing: border-box;
                display: block;
                line-height: 1.42;
                min-height: 58px;
                overflow: hidden;
                resize: none;
                width: 100%;
            }
            .inline-edit-next-action {
                box-sizing: border-box;
                display: block;
                line-height: 1.42;
                min-height: 34px;
                overflow: hidden;
                resize: none;
                width: 100%;
            }
            .inline-edit-meta {
                align-items: center;
                color: var(--text-muted);
                display: flex;
                font-size: 0.73rem;
                gap: 8px;
                margin-top: 6px;
            }
            .inline-edit-actions {
                display: inline-flex;
                gap: 6px;
                margin-left: auto;
            }
            .stream-row-main {
                align-items: flex-start;
                display: flex;
                gap: 8px;
                min-width: 0;
            }
            .stream-main-copy {
                align-items: baseline;
                display: flex;
                gap: 8px;
                min-width: 0;
            }
            .stream-type {
                color: var(--text-primary);
                flex: 0 0 auto;
                font-size: 0.84rem;
                font-weight: 600;
            }
            .stream-type-badge {
                background: color-mix(in srgb, var(--secondary-bg) 84%, var(--border-color));
                border: 1px solid color-mix(in srgb, var(--border-color) 75%, transparent);
                border-radius: 3px;
                color: var(--text-secondary);
                font-size: 0.72rem;
                line-height: 1;
                padding: 2px 5px;
            }
            .stream-summary {
                color: var(--text-secondary);
                font-size: 0.84rem;
                line-height: 1.42;
                min-width: 0;
                overflow-wrap: anywhere;
            }
            .stream-row-time {
                color: var(--text-muted);
                flex: 0 0 auto;
                font-size: 0.73rem;
                margin-left: auto;
            }
            .stream-meta-footer {
                align-items: flex-end;
                color: var(--text-muted);
                display: flex;
                flex-direction: column;
                font-size: 0.73rem;
                gap: 2px;
                margin-left: auto;
                margin-top: 2px;
                max-width: 240px;
                text-align: right;
            }
            .stream-recorder {
                color: var(--text-muted);
            }
            .stream-recorder-action {
                align-items: center;
                display: inline-flex;
                gap: 6px;
                justify-content: flex-end;
            }
            .stream-next-action {
                color: var(--text-muted);
                font-size: 0.73rem;
                line-height: 1.35;
                margin: 0;
                overflow-wrap: anywhere;
            }
            .stream-meta {
                align-items: center;
                color: var(--text-muted);
                display: flex;
                flex-wrap: wrap;
                font-size: 0.73rem;
                gap: 8px;
                margin-top: 2px;
            }
            .stream-actions {
                align-items: center;
                display: inline-flex;
                gap: 4px;
                margin-left: auto;
            }
            .stream-meta-footer .stream-actions {
                margin-left: 0;
            }

            .stream-action-btn {
                background: transparent;
                border: 0;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 0.73rem;
                line-height: 1;
                padding: 1px 2px;
            }
            .stream-action-btn:hover {
                color: var(--text-primary);
            }
            .stream-action-btn.danger {
                color: var(--text-muted);
            }

            .stream-card {
                background: var(--primary-bg);
                border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
                border-radius: var(--rounded-sm);
                box-sizing: border-box;
                box-shadow: none;
                max-width: min(68%, 760px);
                padding: 8px 10px;
                width: 100%;
            }
            .stream-card-header {
                align-items: center;
                color: var(--text-primary);
                display: flex;
                font-size: 0.9rem;
                gap: 8px;
                margin-bottom: 4px;
            }
            .stream-card-header .feed-time {
                color: var(--text-muted);
                font-size: 0.73rem;
                font-weight: 400;
            }
            .stream-card-body {
                color: var(--text-secondary);
                font-size: 0.84rem;
                line-height: 1.48;
                overflow-wrap: anywhere;
            }
            .stream-card-footer {
                align-items: center;
                border-top: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
                display: flex;
                font-size: 0.75rem;
                justify-content: space-between;
                margin-top: 6px;
                padding-top: 5px;
            }
            .interaction-form-modal[hidden] {
                display: none !important;
            }

            .interaction-form-modal {
                align-items: center;
                background: rgba(0, 0, 0, 0.45);
                bottom: 0;
                display: flex;
                justify-content: center;
                left: 0;
                padding: 24px;
                position: fixed;
                right: 0;
                top: 0;
                z-index: 1200;
            }

            .interaction-form-modal__shell {
                max-height: min(760px, calc(100vh - 48px));
                max-width: 640px;
                overflow: auto;
                width: 100%;
            }

            .interaction-form-modal__content {
                position: relative;
            }

            #interaction-form-modal-close {
                position: absolute;
                right: 14px;
                top: 12px;
            }

            /* --- Right Panel Structure & Typography --- */
            .interaction-form-section {
                background-color: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--rounded-sm);
                padding: 24px;
                height: fit-content;
            }
            
            .interaction-form-section h3 {
                font-size: 1.1rem;
                margin-bottom: 1.2rem !important;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 12px;
            }

            .interaction-form-section .form-label {
                font-size: 0.85rem;
                color: var(--text-secondary);
                margin-bottom: 6px;
            }

            .interaction-form-section .form-input,
            .interaction-form-section .form-select,
            .interaction-form-section .form-textarea {
                font-size: 0.9rem;
                padding: 8px 10px;
                box-sizing: border-box;
            }

            .interaction-form-section .form-group {
                margin-bottom: 16px;
            }

            .interaction-form-section .submit-btn {
                margin-top: 8px;
                width: 100%;
            }

            /* Mobile Responsive Fallback */
            @media (max-width: 768px) {
                #discussion-pane, #activity-pane {
                    height: auto;
                    max-height: none;
                    overflow: visible;
                }
                .crm-timeline-content {
                    padding-left: 14px;
                }
                .crm-stream-item::before {
                    left: -18px;
                }
                .crm-stream-item.micro,
                .crm-stream-item.micro.editing,
                .stream-card {
                    max-width: 100%;
                }
                .interaction-form-section {
                    margin-top: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 公開：顯示表單供編輯
     */
    function showForEditing(interactionId) {
        if (!_container) return;

        const item = _interactions.find(i => i.interactionId === interactionId);
        if (!item) {
            showNotification('找不到該筆互動紀錄資料', 'error');
            return;
        }

        const form = _container.querySelector('#new-interaction-form');
        if (!form) return;
        form.dataset.interactionFormMode = 'edit';

        // #interaction-edit-rowIndex carries interactionId since Phase 8; legacy name kept for minimal diff.
        form.querySelector('#interaction-edit-rowIndex').value = item.interactionId;

        // [Strict Digital Forensics Patch] Ensure UTC parsing for naive DB strings before offset calculation
        let rawInteractionTime = item.interactionTime || item.createdTime;
        if (typeof rawInteractionTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(rawInteractionTime)) {
            rawInteractionTime += 'Z';
        }
        const interactionTime = new Date(rawInteractionTime || new Date().toISOString());
        
        interactionTime.setMinutes(interactionTime.getMinutes() - interactionTime.getTimezoneOffset());
        form.querySelector('#interaction-time').value = interactionTime.toISOString().slice(0, 16);

        form.querySelector('#interaction-event-type').value = item.eventType;
        form.querySelector('#interaction-summary').value = item.contentSummary;
        form.querySelector('#interaction-next-action').value = item.nextAction;

        const eventTypeSelect = form.querySelector('#interaction-event-type');
        const summaryTextarea = form.querySelector('#interaction-summary');
        const nextActionInput = form.querySelector('#interaction-next-action');
        const submitBtn = form.querySelector('#interaction-submit-btn');

        // Evidence: 鎖定判斷固定兩類
        const isLockedRecord = ['系統事件', '事件報告'].includes(item.eventType);

        if (isLockedRecord) {
            eventTypeSelect.disabled = true;
            summaryTextarea.readOnly = true;
            nextActionInput.readOnly = true;
            submitBtn.textContent = '💾 僅儲存時間變更';
        } else {
            eventTypeSelect.disabled = false;
            summaryTextarea.readOnly = false;
            nextActionInput.readOnly = false;
            submitBtn.textContent = '💾 儲存變更';
        }

        _openInteractionFormModal();
    }

    /**
     * 公開：刪除確認
     */
    function confirmDelete(interactionId, rowIndex) {
        if (!_container) return;

        const item = _interactions.find(i => i.interactionId === interactionId);
        const summary = item ? (item.contentSummary || '此紀錄').substring(0, 30) + '...' : '此筆紀錄';

        const message = `您確定要永久刪除這筆互動紀錄嗎？\n\n"${summary}"\n\n此操作無法復原。`;

        showConfirmDialog(message, async () => {
            showLoading('正在刪除紀錄...');
            try {
                await authedFetch(`/api/interactions/${interactionId}`, { method: 'DELETE' });
                
                // [Phase 8.10 Dashboard Refresh Fix] 
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    console.error('刪除互動紀錄失敗:', error);
                }
            } finally {
                hideLoading();
            }
        });
    }

    /**
     * 公開：初始化
     */
    function init(containerElement, context, interactions) {
        _container = containerElement;
        _context = context || {};
        _interactions = Array.isArray(interactions) ? interactions : [];

        if (!_container) {
            console.error('[Interactions] 初始化失敗：未提供有效的容器元素。');
            return;
        }

        const form = renderInteractionForm('create');
        if (!form) {
            console.error('[Interactions] 初始化失敗：在指定的容器中找不到 #new-interaction-form。');
            return;
        }

        // 填入下拉選單（保留既有邏輯，僅避免把系統類型放進去）
        const eventTypeSelect = form.querySelector('#interaction-event-type');
        if (eventTypeSelect && window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['互動類型']) {
            const interactionTypes = window.CRM_APP.systemConfig['互動類型'];
            eventTypeSelect.innerHTML = '<option value="">請選擇類型...</option>';

            interactionTypes.forEach(type => {
                const note = type.note || type.value;
                // 不提供系統自動類型（避免前端手動建立系統事件）
                if (!SYSTEM_GENERATED_TYPES.includes(note) && !SYSTEM_GENERATED_TYPES.includes(type.value)) {
                    eventTypeSelect.innerHTML += `<option value="${type.value}">${note}</option>`;
                }
            });

            if (eventTypeSelect.options.length === 2) eventTypeSelect.selectedIndex = 1;
        }

        // 重置表單
        _resetFormForCreate(form);

        form.removeEventListener('submit', _handleSubmit);
        form.addEventListener('submit', _handleSubmit);

        const closeBtn = _container.querySelector('#interaction-form-modal-close');
        if (closeBtn) {
            closeBtn.removeEventListener('click', _closeInteractionFormModal);
            closeBtn.addEventListener('click', _closeInteractionFormModal);
        }

        const tabContainer = _container.querySelector('.sub-tabs');
        if (tabContainer) {
            tabContainer.removeEventListener('click', _handleTabClick);
            tabContainer.addEventListener('click', _handleTabClick);
        }

        _injectStyles();
        _updateTimelineView();
    }

    return {
        init,
        showCreateForm,
        showForEditing,
        startInlineEdit,
        saveInlineEdit,
        cancelInlineEdit,
        saveInlineCreate,
        cancelInlineCreate,
        confirmDelete
    };
})();
