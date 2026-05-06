// public/scripts/internal-ops/internal-ops-dev-projects.js
/**
 * @version 1.0.16
 * @date 2026-04-24
 * @changelog
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
        return `<span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:600; background:${colorSet.bgLight}; color:${colorSet.text}; border: 1px solid ${colorSet.border}; white-space: nowrap;">${text}</span>`;
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
                if (diff <= -10) cueHtml = `<span style="color:#c62828; font-size:0.75rem; font-weight: bold; white-space: nowrap;">落後</span>`;
                else if (diff >= 10) cueHtml = `<span style="color:#2e7d32; font-size:0.75rem; font-weight: bold; white-space: nowrap;">超前</span>`;
            }
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; color: #6b7280; width: 28px; flex-shrink: 0; text-align: right; white-space: nowrap;">實際</span>
                    <div style="width: 70px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                        <div style="width: ${clampedAVal}%; height: 100%; background: ${aColor.text};"></div>
                    </div>
                    <span style="color:${aColor.text}; font-size: 0.8rem; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0;">${actualProgressText}</span>
                    <span style="width: 30px; flex-shrink: 0;"></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; color: #6b7280; width: 28px; flex-shrink: 0; text-align: right; white-space: nowrap;">理論</span>
                    <div style="width: 70px; height: 6px; background: ${tProgText === '-' ? 'transparent' : '#f3f4f6'}; border: ${tProgText === '-' ? 'none' : '1px dashed #d1d5db'}; border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                        <div style="width: ${clampedTVal}%; height: 100%; background: #9ca3af;"></div>
                    </div>
                    <span style="color: ${tProgText === '-' ? '#9ca3af' : '#6b7280'}; font-size: 0.8rem; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0;">${tProgText}</span>
                    <span style="width: 30px; flex-shrink: 0; text-align: left;">${cueHtml}</span>
                </div>
            </div>
        `;
    }

    const rows = sortedData.map((item, index) => {
        const scheduleHtml = `
            <div style="display: flex; flex-direction: column; gap: 4px; min-width: 110px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; gap: 8px;">
                    <span style="color: #9ca3af; white-space: nowrap;">開始</span>
                    <span style="color: #6b7280; white-space: nowrap;">${item.startDate || '-'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; gap: 8px;">
                    <span style="color: #9ca3af; white-space: nowrap;">預計完成</span>
                    <span style="color: #6b7280; white-space: nowrap;">${item.estCompletionDate || '-'}</span>
                </div>
            </div>
        `;

        const actionHtml = window.__isDevActionMode ? `
            <div style="display: flex; gap: 12px; justify-content: center;">
                <span style="cursor:pointer;" onclick="window.openDevProjectModal('${item.devId}')" title="編輯">✏️</span>
                <span style="cursor:pointer;" onclick="window.deleteDevProject('${item.devId}')" title="刪除">🗑️</span>
            </div>
        ` : '';

        let oppHtml = '-';
        if (item.assigneeCode && item.projectName) {
            oppHtml = `<a href="#" title="${item.projectName || ''}" style="color: #1976d2; text-decoration: none; font-weight: 600;" onclick="event.preventDefault(); window.CRM_APP.navigateTo('opportunity-details', {opportunityId: '${item.assigneeCode}'})">${item.projectName}</a>`;
        } else if (item.projectName) {
            oppHtml = `<strong title="${item.projectName || ''}">${item.projectName}</strong>`;
        }

        let personnelHtml = `<div style="display:flex; flex-direction:column; gap:4px; min-width:120px;">`;
        const assigneeText = item.assigneeName || '-';
        personnelHtml += `
            <div style="display:grid; grid-template-columns:64px 1fr; column-gap:8px; font-size:0.8rem;">
                <span style="color:#9ca3af; white-space:nowrap;">負責人</span>
                <span style="color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${assigneeText}">${assigneeText}</span>
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
                        <span style="color:#9ca3af; white-space:nowrap;">協作成員</span>
                        <span style="color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fullJoinedNames}">${displayNames}</span>
                    </div>
                `;
            }
        }
        personnelHtml += `</div>`;

        // remove notes column visually
        return `
        <tr>
            <td>${index + 1}</td>
            <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; font-size: 0.85rem;" title="${item.productName || ''}">${item.productName || '-'}</td>
            <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; font-size: 0.85rem;">${oppHtml}</td>
            <td style="font-size: 0.85rem;">${item.featureName || '-'}</td>
            <td>${personnelHtml}</td>
            <td style="width: 100px;">${getStageBadge(item.devStage || '-')}</td>
            <td style="width: 90px;">${getStatusBadge(item.status || '-')}</td>
            <td>${scheduleHtml}</td>
            <td>${getCombinedProgressHtml(item.progress, item.startDate, item.estCompletionDate)}</td>
            ${window.__isDevActionMode ? `<td style="vertical-align: middle; text-align: center;">${actionHtml}</td>` : ''}
        </tr>
    `}).join('');

    const getSortIcon = (field) => {
        if (window.__devProjectsSortState.field !== field) return ' ↕';
        return window.__devProjectsSortState.direction === 'asc' ? ' ↑' : ' ↓';
    };

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
            <div style="font-size: 0.9rem; color: #6b7280; font-weight: 500;">共 ${data.length} 筆</div>
            <button onclick="window.toggleDevTableActions()" class="internal-ops-btn" style="padding: 4px 10px; font-size: 0.8rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #374151; font-weight: 500; border-radius: 4px;">
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
                    <th onclick="window.handleDevProjectSort('devStage', event)" style="width: 100px; cursor:pointer; user-select:none;" title="點擊依開發階段排序">開發階段<span style="color:#1976d2;">${getSortIcon('devStage')}</span></th>
                    <th onclick="window.handleDevProjectSort('status', event)" style="width: 90px; cursor:pointer; user-select:none;" title="點擊依狀態排序">狀態<span style="color:#1976d2;">${getSortIcon('status')}</span></th>
                    <th>開發時程</th>
                    <th>進度</th>
                    ${window.__isDevActionMode ? '<th style="width: 70px; text-align: center;">操作</th>' : ''}
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};