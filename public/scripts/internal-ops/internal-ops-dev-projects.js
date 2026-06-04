// public/scripts/internal-ops/internal-ops-dev-projects.js
/**
 * @version 1.0.17
 * @date 2026-05-07
 * @changelog
 * - [1.0.17] UI Patch: Tokenized Dev Projects inline table controls, progress tracks, and muted text for Internal Ops operational contrast.
 * - [1.0.16] UI Layout Tuning Patch: column width tuning (fixed devStage/status), limit collaborators display (<=2 +N), font-size reduction for text heavy cols, strictly no layout logic changes.
 * - [1.0.15] UI Polish Patch: implemented conditional operation column. column appears in operation mode only. toggle moved to top control. strictly no data changes, sorting logic preserved.
 * - [1.0.14] UI Polish Patch: merge assignee and collaborators into a single "人員" column with a schedule-like label/value layout. Implemented conditional collaborators row so it hides when empty. strictly no data changes.
 * - [1.0.13] UI polish patch: Renamed header to "案件名稱", add sort affordance (↕), enforce nowrap + ellipsis for case name and opportunity cells. strictly no logic changes.
 * - [1.0.12] Feature Patch: Implemented clickable header sorting from scratch for Dev Projects. Uses System Config 'order' field for accurate sorting. Removed Notes column to optimize layout. No backend changes.
 * - [1.0.11] Removed safe debug console logs from getConfigColor function.
 * - [1.0.10] UI Revert Patch: Reverted Dev Projects list display to the simpler baseline reference style.
 * - [1.0.9] UI Polish Patch: Moved record count to the right, fixed schedule column truncation.
 * - [1.0.8] UI Stabilization Patch: Applied table-layout fixed, defined key column widths, enforced ellipsis.
 * - [1.0.7] UI Stabilization Patch: Isolated CSS scope, enforced nowrap table layout.
 * - [1.0.6] Typography Polish: Stabilized list readability by scaling down schedule dates.
 * - [1.0.5] Debug Patch: Injected safe tracing logs into getConfigColor.
 * - [1.0.4] Polish Patch: Improved Dev Projects list readability.
 * - [1.0.3] Logic Patch: Replaced naive theoretical progress calculation with a working-days-based calculation.
 * - [1.0.2] Phase A: Added hyperlinked Opportunity routing.
 * - [1.0.1] UI Patch: Renamed labels, merged schedule columns, refined strict fixed-width progress rendering, replaced row actions with header toggle.
 * - [1.0.0] Extracted from internal-ops.js Phase 4.8
 * @description 負責「開發案件追蹤」區塊的資料渲染與局部互動邏輯
 */

// frontend sort state
if (typeof window.__devProjectsSortState === 'undefined') {
    window.__devProjectsSortState = {
        field: null,
        direction: 'asc'
    };
}

if (typeof window.__devProjectsEditId === 'undefined') {
    window.__devProjectsEditId = null;
}

window.editInlineDevProject = function(devId) {
    window.__devProjectsEditId = devId;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.cancelInlineDevProject = function() {
    window.__devProjectsEditId = null;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.saveInlineDevProject = async function(devId) {
    const getFieldValue = (field) => {
        const input = document.getElementById(`dev-inline-${field}-${devId}`);
        return input ? input.value : '';
    };

    const progressRaw = parseInt(getFieldValue('progress'), 10);
    const progressValue = isNaN(progressRaw) ? 0 : Math.min(Math.max(progressRaw, 0), 100);
    const payload = {
        productName: getFieldValue('productName'),
        featureName: getFieldValue('featureName'),
        devStage: getFieldValue('devStage'),
        status: getFieldValue('status'),
        progress: `${progressValue}%`,
        startDate: getFieldValue('startDate'),
        estCompletionDate: getFieldValue('estCompletionDate')
    };

    try {
        const url = `/api/internal-ops/dev-projects/${devId}`;
        let res;
        if (typeof authedFetch === 'function') {
            res = await authedFetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json());
        }

        if (!res || res.success === false) {
            throw new Error(res?.error || 'save failed');
        }

        window.__devProjectsEditId = null;
        if (typeof window.fetchAndRenderSection === 'function') {
            window.fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderDevProjects, 'internal-ops-dev-projects-content');
        } else {
            const container = document.getElementById('internal-ops-dev-projects-content');
            if (container) {
                const refreshed = await (typeof authedFetch === 'function'
                    ? authedFetch('/api/internal-ops/dev-projects')
                    : fetch('/api/internal-ops/dev-projects').then(r => r.json()));
                const dataArray = Array.isArray(refreshed) ? refreshed : (refreshed && refreshed.success ? refreshed.data : null);
                if (dataArray) container.innerHTML = window.renderDevProjects(dataArray);
            }
        }
    } catch (err) {
        console.error('[DevProjects] Inline save failed:', err);
        alert('儲存失敗: ' + err.message);
    }
};

window.handleDevProjectSort = function(field, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (window.__devProjectsSortState.field === field) {
        window.__devProjectsSortState.direction = window.__devProjectsSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        window.__devProjectsSortState.field = field;
        window.__devProjectsSortState.direction = 'asc';
    }

    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.toggleDevTableActions = function() {
    window.__isDevActionMode = !window.__isDevActionMode;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.renderDevProjects = function(data) {
    window.__internalOpsDevProjectsData = data; 

    // config-driven sort order helper
    const sysConfig = window.__systemConfig || {};
    const hasActionColumn = window.__isDevActionMode || window.__devProjectsEditId;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function renderInlineTextInput(devId, field, value) {
        return `<input id="dev-inline-${field}-${devId}" class="dev-inline-input" type="text" value="${escapeHtml(value || '')}">`;
    }

    function renderInlineDateInput(devId, field, value) {
        return `<input id="dev-inline-${field}-${devId}" class="dev-inline-input" type="date" value="${escapeHtml(value || '')}">`;
    }

    function renderInlineProgressInput(devId, value) {
        const numericValue = parseInt(String(value || '').replace('%', ''), 10);
        const safeValue = isNaN(numericValue) ? 0 : Math.min(Math.max(numericValue, 0), 100);
        return `<input id="dev-inline-progress-${devId}" class="dev-inline-input dev-inline-number" type="number" min="0" max="100" value="${safeValue}">`;
    }

    function renderInlineSelect(devId, field, value, configKey) {
        const configList = Array.isArray(sysConfig[configKey]) ? sysConfig[configKey] : [];
        const options = [];
        const seen = new Set();

        if (value) {
            options.push({ value, label: value });
            seen.add(value);
        }

        configList.forEach(item => {
            const optionValue = item.value || item.note || '';
            const optionLabel = item.note || item.value || '';
            if (!optionValue || seen.has(optionValue)) return;
            options.push({ value: optionValue, label: optionLabel });
            seen.add(optionValue);
        });

        return `
            <select id="dev-inline-${field}-${devId}" class="dev-inline-input">
                ${options.map(option => `<option value="${escapeHtml(option.value)}" ${option.value === value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
            </select>
        `;
    }

    function getSortOrder(type, val) {
        if (!val) return 9999;
        const list = sysConfig[type] || [];
        const match = list.find(i => i.value === val || i.note === val);
        // legacy fallback = 9999
        return match?.order ?? 9999;
    }

    // single active sort mode, no backend changes
    const sortedData = [...data];

    if (window.__devProjectsSortState.field) {
        sortedData.sort((a, b) => {
            let orderA = 9999;
            let orderB = 9999;

            if (window.__devProjectsSortState.field === 'devStage') {
                orderA = getSortOrder('開發階段', a.devStage);
                orderB = getSortOrder('開發階段', b.devStage);
            }

            if (window.__devProjectsSortState.field === 'status') {
                orderA = getSortOrder('開發狀態', a.status);
                orderB = getSortOrder('開發狀態', b.status);
            }

            if (orderA === orderB) return 0;
            
            const diff = orderA - orderB;
            return window.__devProjectsSortState.direction === 'asc' ? diff : -diff;
        });
    }

    // [Logic Preserved] Config mapping and trace logs
    function getConfigColor(type, text, fallbackHex) {
        if (!text || text === '-') {
            return window.buildColorSet(fallbackHex);
        }
        
        const list = window.__systemConfig[type] || [];
        
        list.forEach(i => {
        });

        const item = list.find(i => {
            const match = (i.note === text || i.value === text);
            return match;
        });

        if (item && item.style) {
            return window.buildColorSet(item.style);
        }
        return window.buildColorSet(fallbackHex);
    }

    function getBadgeHtml(text, colorSet) {
        if (!text || text === '-') return '-';
        return `<span style="display:inline-block; padding:2px 7px; border-radius:5px; font-size:0.75rem; font-weight:600; background:${colorSet.bgLight}; color:${colorSet.text}; border: 1px solid ${colorSet.border}; white-space: nowrap;">${text}</span>`;
    }

    function getStatusBadge(status) {
        let fallbackHex = '#616161';
        switch(status) {
            case '進行中': fallbackHex = '#1976d2'; break;
            case '卡關': fallbackHex = '#c62828'; break;
            case '已完成': fallbackHex = '#2e7d32'; break;
            case '暫停': fallbackHex = '#f9a825'; break;
        }
        const colorSet = getConfigColor('開發狀態', status, fallbackHex);
        return getBadgeHtml(status, colorSet);
    }

    function getStageBadge(stage) {
        let fallbackHex = '#616161';
        switch(stage) {
            case '開發中': fallbackHex = '#1976d2'; break;
            case '測試中': fallbackHex = '#6a1b9a'; break;
            case '已上線': fallbackHex = '#2e7d32'; break;
        }
        const colorSet = getConfigColor('開發階段', stage, fallbackHex);
        return getBadgeHtml(stage, colorSet);
    }

    // [Logic Preserved] Working days calculation
    function calculateWorkingDays(startDate, endDate) {
        let count = 0;
        let cur = new Date(startDate);
        cur.setHours(0, 0, 0, 0);
        let end = new Date(endDate);
        end.setHours(0, 0, 0, 0);

        while (cur <= end) {
            const day = cur.getDay();
            if (day !== 0 && day !== 6) {
                count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    }

    function calculateTheoreticalProgress(startStr, endStr) {
        if (!startStr || !endStr) return null;

        const start = new Date(startStr);
        const end = new Date(endStr);
        const now = new Date();

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;

        if (now < start) return 0;
        if (now > end) return 100;

        const totalWorkingDays = calculateWorkingDays(start, end);
        if (totalWorkingDays === 0) {
            return (now >= start) ? 100 : 0;
        }

        const elapsedWorkingDays = calculateWorkingDays(start, now);
        const prog = Math.round((elapsedWorkingDays / totalWorkingDays) * 100);
        
        return Math.min(Math.max(prog, 0), 100);
    }

    // [Display Reverted] Progress block simplified, removed wrapper classes, kept 0.8rem typography
    function getCombinedProgressHtml(actualProgressText, startDate, estDate) {
        if (!actualProgressText) actualProgressText = '0%';
        const aVal = parseInt(actualProgressText.replace('%', ''), 10) || 0;
        const clampedAVal = Math.min(Math.max(aVal, 0), 100);
        let aHex;
        if (aVal < 30) aHex = '#616161';
        else if (aVal > 70) aHex = '#2e7d32';
        else aHex = '#1976d2';
        const aColor = window.buildColorSet(aHex);

        let tProg = 0;
        let clampedTVal = 0;
        let cueHtml = '';
        let tProgText = '-';
        
        if (startDate && estDate) {
            const start = new Date(startDate).setHours(0,0,0,0);
            const end = new Date(estDate).setHours(23,59,59,999);
            const now = new Date().setHours(0,0,0,0);

            if (!isNaN(start) && !isNaN(end) && start < end) {
                if (now >= end) tProg = 100;
                else if (now > start) tProg = Math.round(((now - start) / (end - start)) * 100);
                
                clampedTVal = Math.min(Math.max(tProg, 0), 100);
                tProgText = `${tProg}%`;
                
                const diff = aVal - tProg;
                if (diff <= -10) cueHtml = `<span style="color:var(--accent-red); font-size:0.75rem; font-weight: bold; white-space: nowrap;">落後</span>`;
                else if (diff >= 10) cueHtml = `<span style="color:var(--accent-green); font-size:0.75rem; font-weight: bold; white-space: nowrap;">超前</span>`;
            }
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted); width: 28px; flex-shrink: 0; text-align: right; white-space: nowrap;">實際</span>
                    <div style="width: 70px; height: 6px; background: var(--glass-bg); border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                        <div style="width: ${clampedAVal}%; height: 100%; background: ${aColor.text};"></div>
                    </div>
                    <span style="color:${aColor.text}; font-size: 0.8rem; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0;">${actualProgressText}</span>
                    <span style="width: 30px; flex-shrink: 0;"></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted); width: 28px; flex-shrink: 0; text-align: right; white-space: nowrap;">理論</span>
                    <div style="width: 70px; height: 6px; background: ${tProgText === '-' ? 'transparent' : 'var(--glass-bg)'}; border: ${tProgText === '-' ? 'none' : '1px dashed var(--border-color)'}; border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                        <div style="width: ${clampedTVal}%; height: 100%; background: var(--text-muted);"></div>
                    </div>
                    <span style="color: ${tProgText === '-' ? 'var(--text-muted)' : 'var(--text-secondary)'}; font-size: 0.8rem; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0;">${tProgText}</span>
                    <span style="width: 30px; flex-shrink: 0; text-align: left;">${cueHtml}</span>
                </div>
            </div>
        `;
    }

    const rows = sortedData.map((item, index) => {
        const isEditing = window.__devProjectsEditId === item.devId;
        const scheduleHtml = `
            <div style="display: flex; flex-direction: column; gap: 4px; min-width: 110px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; gap: 8px;">
                    <span style="color: var(--text-muted); white-space: nowrap;">開始</span>
                    <span style="color: var(--text-secondary); white-space: nowrap;">${item.startDate || '-'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; gap: 8px;">
                    <span style="color: var(--text-muted); white-space: nowrap;">預計完成</span>
                    <span style="color: var(--text-secondary); white-space: nowrap;">${item.estCompletionDate || '-'}</span>
                </div>
            </div>
        `;

        const editScheduleHtml = `
            <div style="display: flex; flex-direction: column; gap: 6px; min-width: 110px;">
                ${renderInlineDateInput(item.devId, 'startDate', item.startDate)}
                ${renderInlineDateInput(item.devId, 'estCompletionDate', item.estCompletionDate)}
            </div>
        `;

        let actionHtml = '';
        if (isEditing) {
            actionHtml = `
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <button type="button" class="dev-inline-action primary" onclick="window.saveInlineDevProject('${item.devId}')">儲存</button>
                    <button type="button" class="dev-inline-action" onclick="window.cancelInlineDevProject()">取消</button>
                </div>
            `;
        } else if (window.__isDevActionMode) {
            actionHtml = `
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <button type="button" class="dev-inline-action" onclick="window.editInlineDevProject('${item.devId}')">編輯</button>
                    <button type="button" class="dev-inline-action danger" onclick="window.deleteDevProject('${item.devId}')">刪除</button>
                </div>
            `;
        }

        let oppHtml = '<span class="internal-ops-muted-badge">-</span>';
        if (item.assigneeCode && item.projectName) {
            oppHtml = `<a href="#" title="${item.projectName || ''}" style="color: var(--accent-blue); text-decoration: none; font-weight: 600;" onclick="event.preventDefault(); window.CRM_APP.navigateTo('opportunity-details', {opportunityId: '${item.assigneeCode}'})">${item.projectName}</a>`;
        } else if (item.projectName) {
            oppHtml = `<strong title="${item.projectName || ''}" style="font-weight:600; color:var(--text-secondary);">${item.projectName}</strong>`;
        }

        let personnelHtml = `<div style="display:flex; flex-direction:column; gap:4px; min-width:120px;">`;
        const assigneeText = item.assigneeName || '-';
        personnelHtml += `
            <div style="display:grid; grid-template-columns:64px 1fr; column-gap:8px; font-size:0.8rem;">
                <span style="color:var(--text-muted); white-space:nowrap;">負責人</span>
                <span style="color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${assigneeText}">${assigneeText}</span>
            </div>
        `;

        if (item.collaborators) {
            const names = item.collaborators.split('｜').map(s => s.trim()).filter(Boolean);
            if (names.length > 0) {
                const fullJoinedNames = names.join('、');
                let displayNames = fullJoinedNames;
                if (names.length > 2) {
                    displayNames = names.slice(0, 2).join('、') + ` +${names.length - 2}`;
                }
                personnelHtml += `
                    <div style="display:grid; grid-template-columns:64px 1fr; column-gap:8px; font-size:0.8rem;">
                        <span style="color:var(--text-muted); white-space:nowrap;">協作成員</span>
                        <span style="color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fullJoinedNames}">${displayNames}</span>
                    </div>
                `;
            }
        }
        personnelHtml += `</div>`;

        // remove notes column visually
        return `
        <tr>
            <td>${index + 1}</td>
            <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; font-size: 0.85rem;" title="${item.productName || ''}">${isEditing ? renderInlineTextInput(item.devId, 'productName', item.productName) : (item.productName || '-')}</td>
            <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; font-size: 0.85rem;">${oppHtml}</td>
            <td style="font-size: 0.85rem;">${isEditing ? renderInlineTextInput(item.devId, 'featureName', item.featureName) : (item.featureName || '-')}</td>
            <td>${personnelHtml}</td>
            <td style="width: 100px;">${isEditing ? renderInlineSelect(item.devId, 'devStage', item.devStage || '', '開發階段') : getStageBadge(item.devStage || '-')}</td>
            <td style="width: 90px;">${isEditing ? renderInlineSelect(item.devId, 'status', item.status || '', '開發狀態') : getStatusBadge(item.status || '-')}</td>
            <td>${isEditing ? editScheduleHtml : scheduleHtml}</td>
            <td>${isEditing ? renderInlineProgressInput(item.devId, item.progress) : getCombinedProgressHtml(item.progress, item.startDate, item.estCompletionDate)}</td>
            ${hasActionColumn ? `<td style="vertical-align: middle; text-align: center;">${actionHtml}</td>` : ''}
        </tr>
    `}).join('');

    const getSortIcon = (field) => {
        if (window.__devProjectsSortState.field !== field) return ' ↕';
        return window.__devProjectsSortState.direction === 'asc' ? ' ↑' : ' ↓';
    };

    return `
        <style>
            .dev-inline-input {
                width: 100%;
                min-width: 0;
                box-sizing: border-box;
                padding: 4px 6px;
                border: 1px solid var(--border-color);
                border-radius: 5px;
                background: var(--card-bg);
                color: var(--text-primary);
                font-size: 0.8rem;
                line-height: 1.2;
            }
            .dev-inline-number {
                width: 58px;
                text-align: right;
            }
            .dev-inline-action {
                padding: 4px 8px;
                border: 1px solid var(--border-color);
                border-radius: 5px;
                background: var(--card-bg);
                color: var(--text-secondary);
                font-size: 0.78rem;
                line-height: 1.2;
                cursor: pointer;
            }
            .dev-inline-action.primary {
                border-color: var(--accent-blue);
                background: var(--accent-blue);
                color: #fff;
            }
            .dev-inline-action.danger {
                color: var(--accent-red);
            }
        </style>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 8px 12px 0;">
            <div style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;">共 ${data.length} 筆</div>
            <button onclick="window.toggleDevTableActions()" class="internal-ops-btn">
                ${window.__isDevActionMode ? '結束操作' : '操作模式'}
            </button>
        </div>
        <table class="internal-ops-table">
            <thead>
                <tr>
                    <th style="width: 50px;">#</th>
                    <th>案件名稱</th>
                    <th>關聯機會</th>
                    <th>關聯功能</th>
                    <th>人員</th>
                    <th onclick="window.handleDevProjectSort('devStage', event)" style="width: 100px; cursor:pointer; user-select:none;" title="點擊依開發階段排序">開發階段<span style="color:var(--accent-blue);">${getSortIcon('devStage')}</span></th>
                    <th onclick="window.handleDevProjectSort('status', event)" style="width: 90px; cursor:pointer; user-select:none;" title="點擊依狀態排序">狀態<span style="color:var(--accent-blue);">${getSortIcon('status')}</span></th>
                    <th>開發時程</th>
                    <th>進度</th>
                    ${hasActionColumn ? '<th style="width: 100px; text-align: center;">操作</th>' : ''}
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};
