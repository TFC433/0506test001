// public/scripts/internal-ops/internal-ops-team-workload.js
/**
 * @version 1.0.11
 * @date 2026-04-22
 * @changelog
 * - [1.0.11] UI Cleanup Patch: Cleaned up Team Workload header area. Removed top filter bar and overload tag for visual clarity. Subtitle moved closer to title, global toggle repositioned cleanly. Workload sorting and all core logic perfectly preserved.
 * - [1.0.10] Feature & UI Polish Patch: Added lightweight frontend filter state and overload indicator.
 * - [1.0.9] UI Polish & Phase B Patch: Applied final UI polish (Part A) and lightweight progress annotation (Part B).
 * - [1.0.8] UI Polish Patch (Phase A): Refined visual style, removed background tint.
 * - [1.0.7] UI Enhancement Patch: Dashboard-style layout with workload sorting and global toggle.
 * - [1.0.6] UI Restructure Patch: Converted expanded view to pill-based task lists.
 * - [1.0.5] UI Compression Patch: Compressed cards into a high-density 3-layer format.
 * - [1.0.4] UI Polish Patch: Converted member cards into a vertical layout.
 * - [1.0.3] UI Polish Patch: Upgraded raw table view to a productized card layout.
 * - [1.0.2] Workload Logic Patch: Upgraded workload calculation to a weighted task-based system.
 * - [1.0.1] Config-Driven Patch: Replaced hardcoded logic with System Config-driven logic.
 * - [1.0.0] Extracted from internal-ops.js Phase 4.8
 * @description 負責「團隊成員負荷」區塊的資料渲染與局部互動邏輯
 */

// --- [UI cleanup only] default collapsed ---
if (typeof window.__workloadExpanded === 'undefined') {
    window.__workloadExpanded = false;
}

window.toggleAllWorkload = function() {
    window.__workloadExpanded = !window.__workloadExpanded;
    const bodies = document.querySelectorAll('.team-workload-scope .member-body');
    const btn = document.getElementById('tw-global-toggle-btn');
    bodies.forEach(body => {
        body.style.display = window.__workloadExpanded ? 'block' : 'none';
    });
    if (btn) {
        btn.textContent = window.__workloadExpanded ? '收合任務' : '展開任務';
    }
};

window.renderTeamWorkload = function(data) {
    window.__internalOpsTeamWorkloadData = data; 
    
    if (!data || data.length === 0) return '';

    // --- [UI cleanup only] subtitle moved closer to title safely ---
    setTimeout(() => {
        const container = document.getElementById('internal-ops-team-workload-content');
        if (container) {
            const header = container.previousElementSibling;
            if (header) {
                const title = header.querySelector('.widget-title');
                if (title && !title.querySelector('.tw-subtitle')) {
                    title.insertAdjacentHTML('beforeend', '<span class="tw-subtitle" style="font-size:0.85rem; color:#6b7280; font-weight:normal; margin-left:12px;">依任務角色與狀態加權計算負荷分數</span>');
                }
            }
        }
    }, 0);

    // --- [logic preserved] Helpers ---
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

    // --- [logic preserved] Grouping & Setup ---
    const groups = {};

    data.forEach(item => {
        const main = (item.assigneeName || '未指派').trim();
        if (!groups[main]) groups[main] = { main: 0, collab: 0, tasks: [] };
        groups[main].main++;
        groups[main].tasks.push({ ...item, _role: '主負責人' });

        if (item.collaborators) {
            const parts = String(item.collaborators).split('｜');
            parts.forEach(name => {
                const n = name.trim();
                if (!n) return;
                if (item.assigneeName && n === item.assigneeName.trim()) return;

                if (!groups[n]) groups[n] = { main: 0, collab: 0, tasks: [] };
                groups[n].collab++;
                groups[n].tasks.push({ ...item, _role: '協作者' });
            });
        }
    });

    const memberNames = Object.keys(groups);
    
    // --- [logic preserved] Config-driven workload setup ---
    let maxLoad = 6;
    let roleWeights = { '主負責人': 1, '協作者': 0.5 };
    let statusWeights = {};
    let loadLevels = [
        { value: '負荷低', threshold: 50, color: '#2e7d32' },
        { value: '負荷中', threshold: 83, color: '#f9a825' },
        { value: '負荷高', threshold: 100, color: '#c62828' }
    ];

    const sysConfig = window.__systemConfig || {};

    if (sysConfig['負荷設定']) {
        const mlItem = sysConfig['負荷設定'].find(i => i.value === '最大負荷件數');
        if (mlItem && !isNaN(parseFloat(mlItem.note))) {
            maxLoad = parseFloat(mlItem.note);
        }
    }

    if (sysConfig['負荷計分']) {
        const mwItem = sysConfig['負荷計分'].find(i => i.value === '主負責佔分');
        if (mwItem && !isNaN(parseFloat(mwItem.note))) {
            roleWeights['主負責人'] = parseFloat(mwItem.note);
        }
        const cwItem = sysConfig['負荷計分'].find(i => i.value === '協作佔分');
        if (cwItem && !isNaN(parseFloat(cwItem.note))) {
            roleWeights['協作者'] = parseFloat(cwItem.note);
        }
    }

    if (sysConfig['狀態負荷權重']) {
        sysConfig['狀態負荷權重'].forEach(i => {
            if (!isNaN(parseFloat(i.note))) {
                statusWeights[i.value] = parseFloat(i.note);
            }
        });
    }

    if (sysConfig['負荷量表'] && sysConfig['負荷量表'].length > 0) {
        const parsedLevels = sysConfig['負荷量表']
            .map(i => ({
                value: i.value,
                threshold: parseFloat(i.note),
                color: i.style || '#616161'
            }))
            .filter(i => !isNaN(i.threshold))
            .sort((a, b) => a.threshold - b.threshold);
        
        if (parsedLevels.length > 0) {
            loadLevels = parsedLevels;
        }
    }

    // --- [logic preserved] pre-calculate to enable sorting ---
    const memberCardsData = memberNames.map(member => {
        const groupData = groups[member];
        const tasks = groupData.tasks;
        
        tasks.sort((a, b) => {
            if (a._role !== b._role) {
                return a._role === '主負責人' ? -1 : 1;
            }
            if (!a.estCompletionDate) return 1;
            if (!b.estCompletionDate) return -1;
            return new Date(a.estCompletionDate) - new Date(b.estCompletionDate);
        });

        let loadScore = 0;

        tasks.forEach(t => {
            const rWeight = roleWeights[t._role] !== undefined ? roleWeights[t._role] : (t._role === '主負責人' ? 1 : 0.5);
            const sWeight = statusWeights[t.status] !== undefined ? statusWeights[t.status] : 1;
            loadScore += (rWeight * sWeight);

            // pre-calculate theoretical progress logic
            const tProg = calculateTheoreticalProgress(t.startDate, t.estCompletionDate);
            if (tProg !== null) {
                const actualProg = parseInt((t.progress || '').replace('%', ''), 10) || 0;
                if (actualProg - tProg <= -10) {
                    t._isBehind = true;
                } else if (actualProg - tProg >= 10) {
                    t._isAhead = true;
                }
            }
        });

        const percentageRaw = maxLoad > 0 ? (loadScore / maxLoad) * 100 : 0;
        
        let barHex = loadLevels[loadLevels.length - 1].color;
        let levelName = loadLevels[loadLevels.length - 1].value;

        for (const level of loadLevels) {
            if (percentageRaw <= level.threshold) {
                barHex = level.color;
                levelName = level.value;
                break;
            }
        }

        return { member, groupData, tasks, loadScore, percentageRaw, barHex, levelName };
    });

    // --- [logic preserved] sorting by workload ---
    memberCardsData.sort((a, b) => b.percentageRaw - a.percentageRaw);

    // --- [UI cleanup only] removed top filter bar, global toggle repositioned ---
    let html = `
        <div style="display: flex; justify-content: flex-start; margin-bottom: 16px;">
            <button id="tw-global-toggle-btn" class="internal-ops-btn" onclick="window.toggleAllWorkload()">
                ${window.__workloadExpanded ? '收合任務' : '展開任務'}
            </button>
        </div>
        <div class="team-workload-scope" style="display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start;">
        <style>
            .team-workload-scope .member-card {
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
                transition: box-shadow 0.2s ease, border-color 0.2s ease;
                width: 100%;
                max-width: 320px;
                flex: 1 1 260px;
                background-color: #ffffff;
            }
            .team-workload-scope .member-card:hover {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                border-color: #d1d5db;
            }
            .team-workload-scope .member-header {
                padding: 16px 20px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                background: transparent;
                gap: 8px;
            }
            .team-workload-scope .member-body {
                border-top: 1px solid rgba(0,0,0,0.05);
                background: transparent;
                padding: 16px 20px;
            }
            .team-workload-scope .member-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin: 0;
                font-size: 1.15rem;
                color: #111827;
                font-weight: 700;
                width: 100%;
            }
            .team-workload-scope .task-pill {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 0.8rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
                border: 1px solid transparent;
            }
            .team-workload-scope .task-pill-main {
                background: #eef2ff;
                border-color: #dbeafe;
                color: #374151;
            }
            .team-workload-scope .task-pill-collab {
                background: #f9fafb;
                border-color: #e5e7eb;
                color: #374151;
            }
        </style>
    `;

    if (memberCardsData.length === 0) {
        html += `<div style="width:100%; padding:30px; text-align:center; color:#9ca3af; font-size:0.9rem;">目前沒有資料</div>`;
    }

    memberCardsData.forEach(cardData => {
        const { member, groupData, tasks, loadScore, percentageRaw, barHex, levelName } = cardData;
        const totalTasks = groupData.main + groupData.collab;

        const barWidth = Math.min(percentageRaw, 100).toFixed(0);
        const workloadPercentText = percentageRaw.toFixed(0);

        const workloadBarHtml = `
            <div style="display: flex; flex-direction: column; width: 100%; gap: 4px;" title="負荷狀態: ${levelName}&#10;分數: ${loadScore.toFixed(1)}&#10;比例: ${workloadPercentText}%">
                <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden; display: flex;">
                    <div style="width: ${barWidth}%; height: 100%; background: ${barHex}; transition: width 0.4s ease-out;"></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 0.95rem; font-weight: 600; color: #374151;">
                        總共任務 ${totalTasks}
                    </div>
                    <div style="font-size: 0.8rem; color: #6b7280;">
                        （主負責 ${groupData.main}；協作 ${groupData.collab}）
                    </div>
                </div>
            </div>
        `;

        const mainTasks = tasks.filter(t => t._role === '主負責人');
        const collabTasks = tasks.filter(t => t._role === '協作者');

        const renderPill = (t, type) => {
            const name = t.productName || t.projectName || '-';
            const safeName = name.replace(/"/g, '&quot;');
            
            let cueHtml = '';
            if (t._isBehind) {
                cueHtml = `<span style="font-size: 0.75rem; font-weight: 600; color: #c62828;">落後</span>`;
            } else if (t._isAhead) {
                cueHtml = `<span style="font-size: 0.75rem; font-weight: 600; color: #2e7d32;">超前</span>`;
            }

            return `
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <span class="task-pill task-pill-${type}" title="${safeName}">${name}</span>
                    ${cueHtml}
                </div>
            `;
        };

        let mainHtml = '<span style="color: #9ca3af; font-size: 0.85rem;">無</span>';
        if (mainTasks.length > 0) {
            mainHtml = `<div style="display: flex; flex-wrap: wrap; gap: 8px;">${mainTasks.map(t => renderPill(t, 'main')).join('')}</div>`;
        }

        let collabHtml = '<span style="color: #9ca3af; font-size: 0.85rem;">無</span>';
        if (collabTasks.length > 0) {
            collabHtml = `<div style="display: flex; flex-wrap: wrap; gap: 8px;">${collabTasks.map(t => renderPill(t, 'collab')).join('')}</div>`;
        }

        // --- [UI cleanup only] removed overload tag ---
        html += `
            <div class="member-card" style="border-left: 4px solid ${barHex};">
                <div class="member-header">
                    <h3 class="member-title">
                        <span style="display: flex; align-items: center;">${member}</span>
                        <span style="font-size: 1.6rem; font-weight: 800; color: ${barHex}; line-height: 1; font-variant-numeric: tabular-nums;">${workloadPercentText}%</span>
                    </h3>
                    ${workloadBarHtml}
                </div>
                <div class="member-body" style="display: ${window.__workloadExpanded ? 'block' : 'none'};">
                    <div style="margin-bottom: 12px;">
                        <h4 style="font-size: 0.85rem; font-weight: 600; color: #374151; margin: 0 0 8px 0;">主負責任務</h4>
                        ${mainHtml}
                    </div>
                    <div style="border-top: 1px solid #f3f4f6; padding-top: 12px;">
                        <h4 style="font-size: 0.85rem; font-weight: 600; color: #374151; margin: 0 0 8px 0;">協作任務</h4>
                        ${collabHtml}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
};