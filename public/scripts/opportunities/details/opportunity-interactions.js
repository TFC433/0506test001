/*
 * Project: TFC CRM
 * File: public/scripts/opportunities/details/opportunity-interactions.js
 * Version: v8.0.22 (Phase 8.10.18 - Timeline Stabilization & CSS Polish)
 * Date: 2026-04-14
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
 */
// public/scripts/opportunities/details/opportunity-interactions.js
// 職責：專門管理「互動與新增」頁籤的所有 UI 與功能

const OpportunityInteractions = (() => {
    // 模組私有變數
    let _interactions = [];
    let _context = {}; // { opportunityId, companyId }
    let _container = null;

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
        const recorder = escapeHtml(interaction.recorder || '系統');

        const rawSummary = interaction.contentSummary || '(無內容)';
        let summaryHtml = escapeHtml(rawSummary).replace(/\n/g, '<br>');

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

        let buttonsHtml = '';
        if (rowId) {
            buttonsHtml += `
                <button type="button" class="action-btn small secondary" onclick="OpportunityInteractions.showForEditing('${rowId}')">
                    ${isLocked ? '檢視' : '編輯'}
                </button>
            `;

            // Strategy A: 僅當非鎖定且 rowIndex 可被安全轉為數字才渲染刪除
            const rowIndexNum = Number(rowIndex);
            if (!isLocked && Number.isFinite(rowIndexNum)) {
                buttonsHtml += `
                    &nbsp;
                    <button type="button" class="action-btn small secondary" onclick="OpportunityInteractions.confirmDelete('${rowId}', ${rowIndexNum})">
                        刪除
                    </button>
                `;
            }
        }

        // Configuration driven layout from '時間軸佈局'
        const alignClass = getTimelineSide(interaction.eventType);

        // Corrected Information Hierarchy
        return `
            <div class="crm-timeline-item ${alignClass}">
                <div class="crm-timeline-marker"></div>
                <div class="crm-timeline-card">
                    <div class="card-header">
                        <strong>${typeStr}</strong>
                        <span class="feed-time">${escapeHtml(timeStr)}</span>
                    </div>
                    <div class="card-body">
                        ${summaryHtml}
                    </div>
                    <div class="card-footer">
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
        if (allInteractions.length === 0) {
            historyList.innerHTML = `
                <div class="alert alert-info">
                    ${containerSelector.includes('discussion') ? '尚無動態' : '尚無系統活動'}
                </div>
            `;
            return;
        }

        // [Polish] Removed limit and expand/collapse. Render entire list in scrollable workspace.
        let listHtml = allInteractions.map(renderSingleInteractionItem).join('');

        // Structural visual fix: Bind the center line dynamically to the true rendered content
        historyList.innerHTML = `
            <div class="crm-timeline-content">
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
            
            // 成功後 authedFetch 可能刷新/通知（維持既有行為）
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`操作失敗: ${error.message}`, 'error');
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
            /* --- Fixed Height Workspace (Scrollable Panes) --- */
            #discussion-pane, #activity-pane {
                height: 500px;
                overflow-y: auto;
                padding-right: 12px;
                scrollbar-width: thin;
                scrollbar-color: var(--border-color, #cbd5e1) transparent;
            }
            #discussion-pane::-webkit-scrollbar, #activity-pane::-webkit-scrollbar {
                width: 6px;
            }
            #discussion-pane::-webkit-scrollbar-thumb, #activity-pane::-webkit-scrollbar-thumb {
                background-color: var(--border-color, #cbd5e1);
                border-radius: 4px;
            }

            /* --- Timeline Exact Geometry Implementation --- */
            .crm-timeline-content {
                position: relative;
                padding: 20px 0;
                width: 100%;
                box-sizing: border-box;
            }

            /* --- STRICT SPA BLEED PROTECTION: Double Line Prevention --- */
            #discussion-timeline::before,
            #activity-log-timeline::before,
            .interaction-timeline::before {
                content: none !important;
                display: none !important;
                width: 0 !important;
                background: transparent !important;
            }
            .crm-timeline-content,
            .interaction-timeline,
            #discussion-timeline,
            #activity-log-timeline {
                border-left: none !important;
                border-right: none !important;
                background-image: none !important;
            }
            
            /* The Anchor: Vertical Center Line (SINGLE OWNER) */
            .crm-timeline-content::before {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                left: 50%;
                width: 2px;
                background: var(--border-color, #e2e8f0);
                transform: translateX(-50%);
                z-index: 1;
            }

            /* The Item Layout Shell */
            .crm-timeline-item {
                position: relative;
                width: 100%;
                margin-bottom: 24px;
                display: flex;
                box-sizing: border-box;
            }
            .crm-timeline-item.left {
                justify-content: flex-start;
            }
            .crm-timeline-item.right {
                justify-content: flex-end;
            }

            /* The Anchor Point: Exactly centered Marker */
            .crm-timeline-marker {
                box-sizing: border-box;
                position: absolute;
                left: 50%;
                top: 20px;
                transform: translateX(-50%);
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--primary-color, #4f46e5);
                border: 3px solid var(--bg-color, #ffffff);
                box-shadow: 0 0 0 2px var(--border-color, #cbd5e1);
                z-index: 2;
            }

            /* The Card: Geometrically spaced from center */
            .crm-timeline-card {
                box-sizing: border-box;
                position: relative;
                width: calc(50% - 32px); /* Leaves exactly 32px gap from center line */
                background: var(--card-bg, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 10px;
                padding: 16px 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                z-index: 2;
            }

            /* The Connectors: Visual attachment arrows pointing to the marker */
            .crm-timeline-card::before {
                content: '';
                position: absolute;
                top: 21px;
                width: 0;
                height: 0;
                border-style: solid;
            }
            .crm-timeline-card::after {
                content: '';
                position: absolute;
                top: 22px;
                width: 0;
                height: 0;
                border-style: solid;
            }

            /* Left Card Arrow */
            .crm-timeline-item.left .crm-timeline-card::before {
                right: -9px;
                border-width: 7px 0 7px 9px;
                border-color: transparent transparent transparent var(--border-color, #e2e8f0);
            }
            .crm-timeline-item.left .crm-timeline-card::after {
                right: -7px;
                border-width: 6px 0 6px 8px;
                border-color: transparent transparent transparent var(--card-bg, #ffffff);
            }

            /* Right Card Arrow */
            .crm-timeline-item.right .crm-timeline-card::before {
                left: -9px;
                border-width: 7px 9px 7px 0;
                border-color: transparent var(--border-color, #e2e8f0) transparent transparent;
            }
            .crm-timeline-item.right .crm-timeline-card::after {
                left: -7px;
                border-width: 6px 8px 6px 0;
                border-color: transparent var(--card-bg, #ffffff) transparent transparent;
            }

            /* --- Readability & Typography (Timeline) --- */
            .crm-timeline-card .card-header {
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-color, #1e293b);
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .crm-timeline-card .feed-time {
                font-size: 0.75rem;
                color: var(--text-muted, #94a3b8);
                font-weight: 400;
            }
            .crm-timeline-card .card-body {
                font-size: 0.9rem;
                line-height: 1.6;
                color: var(--text-secondary, #475569);
                margin-bottom: 12px;
                word-break: break-word;
                overflow-wrap: anywhere; /* Safety: strict overflow containment */
            }
            .crm-timeline-card .card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px dashed var(--border-color, #e2e8f0);
                padding-top: 10px;
                font-size: 0.8rem;
            }
            .crm-timeline-card .footer-meta {
                color: var(--text-muted, #64748b);
            }
            .crm-timeline-card .footer-actions {
                display: flex;
                gap: 8px;
            }

            /* --- Right Panel Structure & Typography --- */
            .interaction-form-section {
                background-color: var(--secondary-bg, #f8fafc);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 24px;
                height: fit-content;
            }
            
            .interaction-form-section h3 {
                font-size: 1.1rem;
                margin-bottom: 1.2rem !important;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color, #e2e8f0);
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
                .crm-timeline-content::before {
                    left: 20px;
                }
                .crm-timeline-item.left, .crm-timeline-item.right {
                    justify-content: flex-end;
                }
                .crm-timeline-card {
                    width: calc(100% - 52px); /* Accommodate offset line */
                }
                .crm-timeline-marker {
                    left: 20px !important;
                }
                .crm-timeline-item.left .crm-timeline-card::before,
                .crm-timeline-item.right .crm-timeline-card::before {
                    left: -9px;
                    right: auto;
                    border-width: 7px 9px 7px 0;
                    border-color: transparent var(--border-color, #e2e8f0) transparent transparent;
                }
                .crm-timeline-item.left .crm-timeline-card::after,
                .crm-timeline-item.right .crm-timeline-card::after {
                    left: -7px;
                    right: auto;
                    border-width: 6px 8px 6px 0;
                    border-color: transparent var(--card-bg, #ffffff) transparent transparent;
                }
                #discussion-pane, #activity-pane {
                    height: auto;
                    max-height: 500px;
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

        form.scrollIntoView({ behavior: 'smooth' });
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

        const form = _container.querySelector('#new-interaction-form');
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
        form.reset();
        form.querySelector('#interaction-edit-rowIndex').value = '';
        form.querySelector('#interaction-submit-btn').textContent = '💾 新增紀錄';

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        form.querySelector('#interaction-time').value = now.toISOString().slice(0, 16);

        form.removeEventListener('submit', _handleSubmit);
        form.addEventListener('submit', _handleSubmit);

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
        showForEditing,
        confirmDelete
    };
})();