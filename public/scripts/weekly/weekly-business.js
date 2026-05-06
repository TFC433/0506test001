/**
 * ============================================================================
 * File: weekly-business.js
 * Version: v8.0.1 
 * Date: 2026-03-12
 * Author: Gemini (Assisted)
 *
 * Change Log:
 * - [Phase 8] Remove legacy rowIndex from WeeklyBusiness UI write path
 * - UI behavior unchanged
 * - Operation key unified to recordId
 * - [Patch] Added dashboardManager.markStale() on successful mutations
 * ============================================================================
 */

/* [v7.0.3][2026-01-23] Weekly UI Safe-Parse + Weekday-Only Patch */
// views/scripts/weekly-business.js
// 職責：管理週間業務的列表、詳情雙日曆顯示、編輯與互動
// 修補：
// 1) data-* attribute 內的 JSON 統一 encodeURIComponent(JSON.stringify)
// 2) 讀取時 decodeURIComponent + JSON.parse
// 3) 只渲染週一~週五，避免六日 undefined

let currentWeekData = null;
let allWeeksSummary = [];

function _safeEncode(obj) {
    try {
        return encodeURIComponent(JSON.stringify(obj));
    } catch (e) {
        console.error('[Weekly] _safeEncode failed:', e);
        return '';
    }
}

function _safeDecode(str) {
    try {
        if (!str) return null;
        return JSON.parse(decodeURIComponent(str));
    } catch (e) {
        console.error('[Weekly] _safeDecode failed:', e, 'raw=', str);
        return null;
    }
}

async function loadWeeklyBusinessPage() {
    // 檢查是否有從儀表板跳轉的 weekId
    const targetWeekId = sessionStorage.getItem('navigateToWeekId');
    if (targetWeekId) {
        sessionStorage.removeItem('navigateToWeekId');
        await CRM_APP.navigateTo('weekly-detail', { weekId: targetWeekId });
        return;
    }

    const container = document.getElementById('page-weekly-business');
    if (!container) return;

    container.innerHTML = `<div class="loading show"><div class="spinner"></div><p>載入週次列表中...</p></div>`;

    // 移除舊的監聽器 (防止重複綁定) 並綁定新的
    container.removeEventListener('click', handleWeeklyPageClick);
    container.addEventListener('click', handleWeeklyPageClick);

    try {
        const result = await authedFetch(`/api/business/weekly/summary`);
        if (!result.success) throw Error(result.error);

        allWeeksSummary = result.data || [];
        renderWeekListPage();
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            container.innerHTML = `<div class="alert alert-error">載入週次列表失敗: ${error.message}</div>`;
        }
    }
}

// --- 事件委派核心處理器 (Centralized Event Handler) ---

function handleWeeklyPageClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const payload = btn.dataset;

    switch (action) {
        case 'show-add-week-modal':
            showAddWeekModal();
            break;

        case 'navigate-detail':
            CRM_APP.navigateTo('weekly-detail', { weekId: payload.weekId });
            break;

        case 'navigate-back':
            CRM_APP.navigateTo('weekly-business');
            break;

        case 'open-editor': {
            // [Fix] Safe decode
            const dayInfo = _safeDecode(payload.dayInfo);
            const theme = _safeDecode(payload.theme);
            const entry = payload.entry ? _safeDecode(payload.entry) : null;

            if (!dayInfo || !theme) {
                console.error('解析編輯資料失敗：dayInfo/theme 為 null', { payload });
                return;
            }
            openWeeklyBusinessEditorPanel(dayInfo, theme, entry);
            break;
        }
    }
}

// --- 渲染邏輯 ---

function renderWeekListPage() {
    const container = document.getElementById('page-weekly-business');

    const today = new Date();
    const currentMonth = today.toLocaleString('zh-TW', { month: 'long' });
    const weekOfMonth = Math.ceil(today.getDate() / 7);
    const todayInfo = `<p class="current-date-info">今天是：${today.toLocaleDateString('zh-TW')}，${currentMonth}第 ${weekOfMonth} 週</p>`;

    let html = `
        <div class="dashboard-widget">
            <div class="widget-header">
                <div>
                    <h2 class="widget-title">週間業務總覽</h2>
                    ${todayInfo}
                </div>
                <button class="action-btn primary" data-action="show-add-week-modal">＋ 編輯/新增週次紀錄</button>
            </div>
            <div class="widget-content">
    `;

    const currentWeekId = getWeekIdForDate(new Date());

    if (allWeeksSummary.length === 0) {
        html += '<div class="alert alert-info" style="text-align:center;">尚無任何業務週報，請點擊右上角新增</div>';
    } else {
        html += '<div class="week-list">';
        allWeeksSummary.forEach(week => {
            const isCurrent = week.id === currentWeekId;
            const currentWeekLabel = isCurrent ? '<span class="current-week-label">(本週)</span>' : '';

            html += `
                <div class="week-list-item ${isCurrent ? 'current-week' : ''}"
                     data-action="navigate-detail"
                     data-week-id="${week.id}">
                    <div class="week-info">
                        <div class="week-title">${week.title} ${currentWeekLabel}</div>
                        <div class="week-daterange">${week.dateRange}</div>
                    </div>
                    <div class="week-entry-count">${week.summaryCount} 筆摘要</div>
                    <div class="week-arrow">›</div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div></div>';
    container.innerHTML = html;

    _injectWeeklyStyles();
}

async function navigateToWeeklyDetail(weekId) {
    const container = document.getElementById('page-weekly-business');

    container.removeEventListener('click', handleWeeklyPageClick);
    container.addEventListener('click', handleWeeklyPageClick);

    container.innerHTML = `<div class="loading show"><div class="spinner"></div><p>正在載入 ${weekId} 的週報詳情中...</p></div>`;

    try {
        const result = await authedFetch(`/api/business/weekly/details/${weekId}`);
        if (!result.success) throw new Error(result.error || `無法載入 ${weekId} 的資料`);

        currentWeekData = result.data;

        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = '週間業務詳情';

        renderWeeklyDetailView();
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            container.innerHTML = `<div class="alert alert-error">載入週報詳情失敗: ${error.message}</div>`;
        }
    }
}

function renderWeeklyDetailView() {
    const container = document.getElementById('page-weekly-business');

    const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
    const pageTitle = (systemConfig['頁面標題']?.find(item => item.value === '週間業務標題')?.note) || '週間業務重點摘要';
    const themes = systemConfig['週間業務主題'] || [{ value: 'IoT', note: 'IoT' }, { value: 'DT', note: 'DT' }];

    // [Fix] 僅保留週一~週五
    const weekDays = (currentWeekData.days || []).filter(d => Number(d.dayIndex) <= 5);

    const daysData = {};
    weekDays.forEach(day => {
        daysData[day.dayIndex] = {};
        themes.forEach(theme => {
            daysData[day.dayIndex][theme.value] =
                (currentWeekData.entries || []).filter(e => e.day == day.dayIndex && e.category === theme.value);
        });
    });

    let newWeekNotice =
        (currentWeekData.entries || []).length === 0
            ? `<div class="alert alert-info">這是新的空白週報，請點擊下方的「+」幽靈卡片來建立第一筆內容。</div>`
            : '';

    const prevWeekId = getAdjacentWeekId(currentWeekData.id, -1);
    const nextWeekId = getAdjacentWeekId(currentWeekData.id, 1);
    const todayString = new Date().toISOString().split('T')[0];

    let html = `
        <div class="dashboard-widget">
            <div class="widget-header">
                <div>
                    <h2 class="widget-title">${pageTitle}</h2>
                    <p style="color: var(--text-secondary); margin-top: 5px; font-size: 1.2rem; font-weight: 600;">${currentWeekData.title} ${currentWeekData.dateRange}</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="action-btn secondary" data-action="navigate-detail" data-week-id="${prevWeekId}">< 上一週</button>
                    <button class="action-btn secondary" data-action="navigate-back">返回總覽</button>
                    <button class="action-btn secondary" data-action="navigate-detail" data-week-id="${nextWeekId}">下一週 ></button>
                </div>
            </div>
            <div class="widget-content">
                ${newWeekNotice}
                <div class="weekly-detail-grid">
                    <div class="grid-header"></div>
                    ${themes.map(theme => `<div class="grid-header ${theme.value.toLowerCase()}">${theme.note}</div>`).join('')}

                    ${weekDays.map(dayInfo => {
                        const isHoliday = !!dayInfo.holidayName;
                        const holidayClass = isHoliday ? 'is-holiday' : '';
                        const holidayNameHtml = isHoliday ? `<span class="holiday-name">${dayInfo.holidayName}</span>` : '';
                        const isToday = dayInfo.date === todayString;
                        const todayClass = isToday ? 'is-today' : '';
                        const todayIndicator = isToday ? '<span class="today-indicator">今天</span>' : '';

                        return `
                            <div class="grid-day-label ${holidayClass} ${todayClass}">
                                ${['週一', '週二', '週三', '週四', '週五'][dayInfo.dayIndex - 1]}<br>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">(${dayInfo.displayDate})</span>
                                ${holidayNameHtml}
                                ${todayIndicator}
                            </div>

                            ${themes.map(theme => {
                                let calendarEventsHtml = '';
                                if (theme.value === 'IoT' && dayInfo.dxCalendarEvents?.length > 0) {
                                    calendarEventsHtml =
                                        `<div class="calendar-events-list">` +
                                        dayInfo.dxCalendarEvents.map(evt => `<div class="calendar-text-item" title="DX行程">📅 ${evt.summary}</div>`).join('') +
                                        `<div class="calendar-separator"></div></div>`;
                                }
                                if (theme.value === 'DT' && dayInfo.atCalendarEvents?.length > 0) {
                                    calendarEventsHtml =
                                        `<div class="calendar-events-list">` +
                                        dayInfo.atCalendarEvents.map(evt => `<div class="calendar-text-item" title="AT行程">📅 ${evt.summary}</div>`).join('') +
                                        `<div class="calendar-separator"></div></div>`;
                                }

                                return `
                                    <div class="grid-cell ${holidayClass} ${todayClass} ${theme.value.toLowerCase()}" id="cell-${dayInfo.dayIndex}-${theme.value}">
                                        ${calendarEventsHtml}
                                        ${renderCellContent(daysData[dayInfo.dayIndex][theme.value] || [], dayInfo, theme)}
                                    </div>
                                `;
                            }).join('')}
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
    _injectDetailStyles();
}

function renderCellContent(entries, dayInfo, theme) {
    // [Fix] Safe encode for data attributes
    const dayInfoStr = _safeEncode(dayInfo);
    const themeStr = _safeEncode(theme);

    let contentHtml = (entries || []).map(entry => {
        if (!entry || !entry.recordId) return '';

        const entryStr = _safeEncode(entry);
        const categoryClass = entry.category ? `category-${entry.category.toLowerCase()}` : '';

        const topicDisplay = entry['theme'] || entry['主題'] || '無主題';
        const summaryDisplay = entry['summary'] || entry['重點摘要'] || '';

        return `
            <div class="entry-card-read ${categoryClass}" id="entry-${entry.recordId}">
                <button class="action-btn small warn edit-btn"
                        data-action="open-editor"
                        data-day-info="${dayInfoStr}"
                        data-theme="${themeStr}"
                        data-entry="${entryStr}">✏️</button>
                <div class="entry-card-topic">${topicDisplay}</div>
                <div class="entry-card-participants">👤 ${entry['participants'] || entry['參與人員'] || '無'}</div>
                ${summaryDisplay ? `<div class="entry-card-summary">${summaryDisplay}</div>` : ''}
            </div>
        `;
    }).join('');

    contentHtml += `
        <div class="entry-card-ghost"
             data-action="open-editor"
             data-day-info="${dayInfoStr}"
             data-theme="${themeStr}"
             title="新增紀錄">
            <span class="ghost-plus">+</span>
        </div>
    `;
    return contentHtml;
}

// --- 側邊面板處理 (Side Panel) ---

function openWeeklyBusinessEditorPanel(dayInfo, theme, entry) {
    const isNew = !entry;
    const panelContainer = document.getElementById('slide-out-panel-container');
    const backdrop = document.getElementById('panel-backdrop');

    let participantsTags = '';
    const currentParticipants = entry?.['participants'] || entry?.['參與人員'] || '';
    const selectedParticipants = isNew ? new Set() : new Set(currentParticipants.split(',').map(p => p.trim()).filter(Boolean));

    const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
    if (systemConfig['團隊成員']) {
        participantsTags += `<div class="participants-tags-container">`;
        systemConfig['團隊成員'].forEach(member => {
            const checked = selectedParticipants.has(member.note) ? 'checked' : '';
            participantsTags += `
                <label class="participant-tag">
                    <input type="checkbox" name="participants" value="${member.note}" ${checked}>
                    <span class="tag-text">${member.note}</span>
                </label>
            `;
        });
        participantsTags += `</div>`;
    }

    const topicValue = isNew ? '' : (entry?.['theme'] || entry?.['主題'] || '');
    const summaryValue = isNew ? '' : (entry?.['summary'] || entry?.['重點摘要'] || '');
    const todoValue = isNew ? '' : (entry?.['todo'] || entry?.['待辦事項'] || '');

    const panelHTML = `
        <div class="slide-out-panel" id="weekly-business-editor-panel">
            <div class="panel-header">
                <h2 class="panel-title">${isNew ? '新增' : '編輯'}紀錄</h2>
                <button class="close-btn" id="btn-close-panel">&times;</button>
            </div>
            <div class="panel-content">
                <form id="wb-panel-form">
                    <p style="background:var(--primary-bg); padding: 8px; border-radius: 4px; margin-bottom: 1rem;">
                        <strong>日期:</strong> ${dayInfo.date} (${theme.note})
                    </p>
                    <input type="hidden" name="recordId" value="${isNew ? '' : (entry?.recordId || '')}">
                    <input type="hidden" name="date" value="${dayInfo.date}">
                    <input type="hidden" name="category" value="${theme.value}">
                    <div class="form-group">
                        <label class="form-label">主題 *</label>
                        <input type="text" name="theme" class="form-input" required value="${topicValue}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">參與人員 (點擊選取)</label>
                        ${participantsTags}
                    </div>
                    <div class="form-group">
                        <label class="form-label">重點摘要</label>
                        <textarea name="summary" class="form-textarea" rows="5">${summaryValue}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">待辦事項</label>
                        <textarea name="todo" class="form-textarea" rows="3">${todoValue}</textarea>
                    </div>
                    <div class="btn-group">
                        ${(!isNew && entry) ? `<button type="button" class="action-btn danger" style="margin-right: auto;" id="btn-delete-entry">刪除</button>` : ''}
                        <button type="button" class="action-btn secondary" id="btn-cancel-panel">取消</button>
                        <button type="submit" class="submit-btn">儲存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    panelContainer.innerHTML = panelHTML;

    document.getElementById('wb-panel-form').addEventListener('submit', handleSaveWeeklyEntry);
    document.getElementById('btn-close-panel').addEventListener('click', closeWeeklyBusinessEditorPanel);
    document.getElementById('btn-cancel-panel').addEventListener('click', closeWeeklyBusinessEditorPanel);

    const deleteBtn = document.getElementById('btn-delete-entry');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            confirmDeleteWeeklyBusinessEntry(entry.recordId, topicValue);
        });
    }

    requestAnimationFrame(() => {
        if (backdrop) backdrop.classList.add('is-open');
        const editorPanel = document.getElementById('weekly-business-editor-panel');
        if (editorPanel) editorPanel.classList.add('is-open');
    });
    if (backdrop) backdrop.onclick = closeWeeklyBusinessEditorPanel;
}

function closeWeeklyBusinessEditorPanel() {
    const panel = document.getElementById('weekly-business-editor-panel');
    const backdrop = document.getElementById('panel-backdrop');
    if (panel) panel.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
}

async function handleSaveWeeklyEntry(event) {
    event.preventDefault();
    const form = event.target;

    const recordId = form.querySelector('[name="recordId"]').value;
    const isNew = !recordId;

    const selectedParticipants = Array.from(form.querySelectorAll('[name="participants"]:checked')).map(cb => cb.value);

    const entryData = {
        date: form.querySelector('[name="date"]').value,
        category: form.querySelector('[name="category"]').value,
        theme: form.querySelector('[name="theme"]').value,
        participants: selectedParticipants.join(','),
        summary: form.querySelector('[name="summary"]').value,
        todo: form.querySelector('[name="todo"]').value
    };

    if (!entryData.theme) {
        showNotification('主題為必填項目', 'warning');
        return;
    }

    showLoading('正在儲存...');
    try {
        const url = isNew ? '/api/business/weekly' : `/api/business/weekly/${recordId}`;
        const method = isNew ? 'POST' : 'PUT';
        const result = await authedFetch(url, { method, body: JSON.stringify(entryData) });
        if (!result.success) throw new Error(result.error || '儲存失敗');

        if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
            window.dashboardManager.markStale();
        }

        closeWeeklyBusinessEditorPanel();
        navigateToWeeklyDetail(currentWeekData.id);
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`儲存失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// --- 輔助函式 (Utility) ---

function getWeekIdForDate(d) {
    if (!(d instanceof Date)) {
        try {
            d = new Date(d);
            if (isNaN(d.getTime())) throw new Error();
        } catch {
            d = new Date();
            console.warn("Invalid date passed to getWeekIdForDate, using current date.");
        }
    }
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getAdjacentWeekId(currentWeekId, direction) {
    const [year, week] = currentWeekId.split('-W').map(Number);
    const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    d.setUTCDate(d.getUTCDate() + (7 * direction));
    return getWeekIdForDate(d);
}

function confirmDeleteWeeklyBusinessEntry(recordId, topic) {
    const message = `您確定要永久刪除這筆業務紀錄嗎？\n\n主題：${topic}`;
    showConfirmDialog(message, async () => {
        showLoading('正在刪除...');
        try {
            const result = await authedFetch(`/api/business/weekly/${recordId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }

                closeWeeklyBusinessEditorPanel();
                navigateToWeeklyDetail(currentWeekData.id);
            } else {
                throw new Error(result.details || '刪除失敗');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`刪除失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    });
}

// --- Modal 處理 (Dynamic Binding) ---

async function showAddWeekModal() {
    const today = new Date();
    const prevWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const currentWeekId = getWeekIdForDate(today);

    const existingWeekIds = new Set(allWeeksSummary.map(w => w.id));

    const weekOptions = [
        { id: getWeekIdForDate(prevWeek), label: '上一週' },
        { id: currentWeekId, label: '本週' },
        { id: getWeekIdForDate(nextWeek), label: '下一週' }
    ];

    let optionsHtml = '';
    weekOptions.forEach(opt => {
        const disabled = existingWeekIds.has(opt.id);
        const selected = opt.id === currentWeekId ? 'selected' : '';
        optionsHtml += `<option value="${opt.id}" ${disabled ? 'disabled' : ''} ${selected}>${opt.label} ${disabled ? '(已有紀錄)' : ''}</option>`;
    });

    const modalContainer = document.getElementById('modal-container');
    const existingModal = document.getElementById('add-week-modal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="add-week-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">選擇週次</h2>
                    <button class="close-btn" id="btn-close-week-modal">&times;</button>
                </div>
                <div class="form-group">
                    <label class="form-label">請選擇要編輯或新增紀錄的週次：</label>
                    <div class="select-wrapper">
                        <select id="add-week-select" class="form-select">${optionsHtml}</select>
                    </div>
                </div>
                <button class="submit-btn" id="btn-confirm-add-week">前往</button>
            </div>
        </div>
    `;
    modalContainer.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btn-close-week-modal').addEventListener('click', () => document.getElementById('add-week-modal')?.remove());
    document.getElementById('btn-confirm-add-week').addEventListener('click', confirmAddWeek);
}

function confirmAddWeek() {
    const select = document.getElementById('add-week-select');
    if (!select) return;
    const selectedWeekId = select.value;
    if (selectedWeekId) {
        document.getElementById('add-week-modal')?.remove();
        CRM_APP.navigateTo('weekly-detail', { weekId: selectedWeekId });
    }
}

// --- 樣式注入函式 ---

function _injectWeeklyStyles() {
    if (!document.getElementById('weekly-business-styles')) {
        const style = document.createElement('style');
        style.id = 'weekly-business-styles';
        style.innerHTML = `
            .current-date-info { color: var(--text-primary); margin-top: 5px; font-size: 1.1rem; font-weight: 600; }
            .week-list-item { display: flex; align-items: center; padding: 1.25rem 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background-color 0.2s ease; border-left: 4px solid transparent; }
            .week-list-item:hover { background-color: var(--glass-bg); }
            .week-list-item.current-week { border-left-color: var(--accent-green); background-color: rgba(34, 197, 94, 0.05); }
            .week-info { flex: 1; }
            .week-title { font-weight: 600; }
            .current-week-label { color: var(--accent-green); font-size: 0.85em; font-weight: 700; margin-left: 8px; }
            .week-daterange { color: var(--text-muted); font-size: 0.9rem; margin-top: 4px; }
            .week-entry-count { font-size: 0.9rem; background: var(--primary-bg); padding: 4px 10px; border-radius: 1rem; }
            .week-arrow { font-size: 1.5rem; color: var(--text-muted); margin-left: 1rem; }
        `;
        document.head.appendChild(style);
    }
}

function _injectDetailStyles() {
    if (!document.getElementById('weekly-detail-styles')) {
        const style = document.createElement('style');
        style.id = 'weekly-detail-styles';
        style.innerHTML = `
            .weekly-detail-grid { display: grid; grid-template-columns: 100px repeat(2, 1fr); gap: 8px; }
            .grid-header, .grid-day-label { padding: 10px; font-weight: 600; text-align: center; background-color: var(--primary-bg); border-radius: 8px; line-height: 1.4; position: relative; }
            .grid-cell { background-color: var(--primary-bg); border-radius: 8px; padding: 10px; min-height: 120px; display: flex; flex-direction: column; gap: 8px; }

            .grid-day-label.is-holiday { background: color-mix(in srgb, var(--accent-green) 10%, var(--primary-bg)); }
            .holiday-name { display: block; font-size: 0.75rem; font-weight: 700; color: var(--accent-green); margin-top: 4px; }
            .grid-cell.is-holiday { background: color-mix(in srgb, var(--accent-green) 10%, var(--primary-bg)); }

            .grid-day-label.is-today { background: color-mix(in srgb, var(--accent-blue) 10%, var(--primary-bg)); border: 1px solid var(--accent-blue); }
            .today-indicator { display: block; font-size: 0.8rem; font-weight: 700; color: var(--accent-blue); margin-top: 4px; }
            .grid-cell.is-today { background: color-mix(in srgb, var(--accent-blue) 10%, var(--primary-bg)); border: 1px solid var(--accent-blue); }

            .grid-header.iot { background-color: var(--accent-blue); color: white; }
            .grid-header.dt { background-color: var(--accent-purple); color: white; }

            .entry-card-read { position: relative; background: var(--secondary-bg); padding: 8px; border-radius: 4px; border-left: 3px solid var(--accent-blue); margin-bottom: 0; }
            .entry-card-read.category-iot { border-left-color: var(--accent-blue); }
            .entry-card-read.category-dt { border-left-color: var(--accent-purple); }

            .grid-cell.is-holiday .entry-card-read {
                border-left-color: var(--accent-green);
                background: color-mix(in srgb, var(--accent-green) 5%, var(--secondary-bg));
            }

            .entry-card-read .edit-btn { position: absolute; top: 5px; right: 5px; display: none; padding: 2px 6px; }
            .entry-card-read:hover .edit-btn { display: block; }

            .entry-card-topic { font-weight: 600; font-size: 1.0rem; margin-bottom: 2px; line-height: 1.4; }
            .entry-card-participants { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
            .entry-card-summary { font-size: 0.85rem; white-space: pre-wrap; margin-top: 5px; color: var(--text-secondary); }

            .entry-card-ghost {
                margin-top: auto;
                border: 2px dashed var(--border-color);
                border-radius: 4px;
                min-height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                background-color: rgba(255, 255, 255, 0.02);
                opacity: 0.6;
            }
            .entry-card-ghost:hover {
                background-color: var(--glass-bg);
                border-color: var(--accent-blue);
                opacity: 1;
                transform: translateY(-2px);
                box-shadow: var(--shadow-sm);
            }
            .ghost-plus {
                font-size: 1.4rem;
                font-weight: 300;
                color: var(--text-muted);
                transition: color 0.2s ease;
                line-height: 1;
                margin-top: -2px;
            }
            .entry-card-ghost:hover .ghost-plus { color: var(--accent-blue); }

            .participants-tags-container { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 0; }
            .participant-tag { display: inline-flex; cursor: pointer; user-select: none; }
            .participant-tag input[type="checkbox"] { display: none; }
            .tag-text {
                padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 20px;
                background-color: var(--secondary-bg); color: var(--text-secondary); font-size: 0.9rem;
                font-weight: 500; transition: all 0.2s ease;
            }
            .participant-tag:hover .tag-text { background-color: var(--glass-bg); border-color: var(--accent-blue); }
            .participant-tag input[type="checkbox"]:checked + .tag-text {
                background-color: var(--accent-blue); color: white; border-color: var(--accent-blue);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .calendar-events-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
            .calendar-text-item { display: block; font-size: 0.85rem; color: #94a3b8; font-weight: 700; padding: 2px 4px; line-height: 1.4; }
            .calendar-separator { height: 1px; background-color: var(--border-color); margin: 6px 0; opacity: 0.5; }
        `;
        document.head.appendChild(style);
    }
}

if (window.CRM_APP) {
    window.CRM_APP.pageModules['weekly-business'] = loadWeeklyBusinessPage;
    window.CRM_APP.pageModules['weekly-detail'] = navigateToWeeklyDetail;
}