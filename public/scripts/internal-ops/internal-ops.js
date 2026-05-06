// public/scripts/internal-ops/internal-ops.js
/**
 * public/scripts/internal-ops/internal-ops.js
 * 內部運營與進度追蹤 前端模組 - 頁面核心與模態框外殼 (Phase 4.8)
 * @version 1.8.9
 * @date 2026-04-24
 * @changelog
 * - [1.8.9] UI Fix Patch: Removed extra inline padding from internal-ops-container to fix double padding issue and align page width with other modules.
 * - [1.8.8] UI Polish Patch: Renamed Dev Projects section title to "開發 / 支援案件追蹤".
 * - [1.8.7] Debug Patch: Injected focused trace logs for dp-status to monitor data flow consistency from config to submit payload.
 * - [1.8.6] Debug Patch: Hardened dp-status restore logic with string trimming.
 * - [1.8.5] Logic Patch: Aligned dp-status modal population strictly with dp-devStage, removing all fallback and legacy "(保留)" logic.
 * - [1.8.4] Cleanup Patch: Removed stale DOM reference (dp-progress-val) in openDevProjectModal causing TypeError on modal open.
 * - [1.8.3] UI/Data-Control Patch: Made "開發狀態" (Status) fully controlled by System Config in Dev Projects modal.
 * - [1.8.2] UI Patch: Modal UX upgrades - Made Assignee required with default placeholder, synced progress slider.
 * - [1.8.1] UI Patch: Enhanced Dev Projects Opportunity selector with frontend keyword filtering.
 * - [1.8.0] UI/Data-Wiring Patch (Phase A): Upgraded Dev Projects UX. Implemented opportunity select mapping.
 * - [1.7.8] UI Patch: Renamed Dev Project modal labels.
 * - [1.7.7] Refactor (Phase 1): Split render responsibilities into separate module files.
 * @description 負責進度追蹤頁面的 DOM 建立、共用拉取邏輯與 CRUD 模態框事件處理。
 */

function hexToRgb(hex) {
    if (!hex) return null;
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    if (isNaN(bigint)) return null;
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}
window.hexToRgb = hexToRgb;

function buildColorSet(hex) {
    let rgb = hexToRgb(hex);
    if (!rgb) {
        hex = '#616161';
        rgb = hexToRgb(hex);
    }
    if (!rgb) return null;

    return {
        text: hex,
        bgLight: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`,
        bgMid: `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`,
        border: `rgba(${rgb.r},${rgb.g},${rgb.b},0.28)`
    };
}
window.buildColorSet = buildColorSet;

window.loadInternalOpsPage = async function(params) {
    const pageContainer = document.getElementById('page-internal-ops');
    if (!pageContainer) return;

    if (!pageContainer.querySelector('.internal-ops-container')) {
        pageContainer.innerHTML = `
            <div class="internal-ops-container dashboard-grid-flexible" style="display: flex; flex-direction: column; gap: 24px;">
                
                <div class="dashboard-widget internal-ops-widget" style="width: 100%;">
                    <div class="widget-header internal-ops-header">
                        <h2 class="widget-title">開發 / 支援案件追蹤</h2>
                        <button class="action-btn primary btn-sm" onclick="openDevProjectModal()">
                            <span class="btn-text">新增</span>
                        </button>
                    </div>
                    <div class="widget-content internal-ops-content no-pad" id="internal-ops-dev-projects-content" style="overflow-x: auto;">
                    </div>
                </div>

                <div class="dashboard-widget internal-ops-widget" style="width: 100%;">
                    <div class="widget-header internal-ops-header">
                        <h2 class="widget-title">團隊成員負荷</h2>
                    </div>
                    <div class="widget-content internal-ops-content with-pad" id="internal-ops-team-workload-content" style="overflow-x: auto;">
                    </div>
                </div>

                <div class="dashboard-widget internal-ops-widget" style="width: 100%;">
                    <div class="widget-header internal-ops-header">
                        <h2 class="widget-title">訂閱制管理</h2>
                        <button class="action-btn primary btn-sm" onclick="alert('TODO: 新增訂閱紀錄 開發中')">
                            <span class="btn-text">新增</span>
                        </button>
                    </div>
                    <div class="widget-content internal-ops-content no-pad" id="internal-ops-subscriptions-content" style="overflow-x: auto;">
                    </div>
                </div>

            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .internal-ops-widget { background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow: hidden; }
            .internal-ops-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background: #fff; }
            .internal-ops-header h2 { margin: 0; font-size: 1.1rem; color: #111827; font-weight: 600; }
            .internal-ops-content.no-pad { padding: 0; }
            .internal-ops-content.with-pad { padding: 20px; }
            
            .internal-ops-table { width: 100%; border-collapse: collapse; min-width: 900px; }
            .internal-ops-table th { background-color: #f9fafb; font-weight: 600; color: #4b5563; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 0.85rem; letter-spacing: 0.02em; }
            .internal-ops-table td { padding: 12px 20px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 0.9rem; color: #374151; vertical-align: middle; }
            .internal-ops-table tr:last-child td { border-bottom: none; }
            .internal-ops-table tr:hover { background-color: #f3f4f6; }
            
            .member-workload-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
            .member-workload-header { background: #f9fafb; padding: 14px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; transition: background-color 0.2s; }
            .member-workload-header:hover { background: #f3f4f6; }
            .member-workload-header h3 { margin: 0; font-size: 1.05rem; color: #111827; display: flex; align-items: center; font-weight: 600; }
            .toggle-icon { transition: transform 0.2s ease-in-out; margin-right: 8px; flex-shrink: 0; color: #6b7280; }
            
            .internal-ops-actions { display: flex; gap: 8px; }
            .internal-ops-btn { padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #374151; font-weight: 500; transition: all 0.2s; }
            .internal-ops-btn:hover { background: #f3f4f6; }
            .progress-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }

            .collab-checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 0; max-height: 80px; overflow-y: auto; }
            .collab-label { font-size: 0.85rem; display: flex; align-items: center; gap: 4px; cursor: pointer; background: #f9fafb; border: 1px solid #e5e7eb; padding: 4px 8px; border-radius: 4px; }
            .collab-label:hover { background: #f3f4f6; }
        `;
        pageContainer.appendChild(style);

        const modalHtml = `
            <div id="internal-ops-team-workload-modal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;">
                <div style="background: #fff; padding: 24px; border-radius: 8px; width: 500px; max-width: 90%;">
                    <h3 id="tw-modal-title" style="margin-top: 0; margin-bottom: 16px;">新增任務</h3>
                    <form id="tw-modal-form" onsubmit="submitTeamWorkload(event)">
                        <input type="hidden" id="tw-workId" />
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">成員名稱 *</label>
                            <select id="tw-memberName" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"></select>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">任務標題 *</label>
                            <input type="text" id="tw-taskTitle" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">任務類型</label>
                            <select id="tw-taskType" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"></select>
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">狀態</label>
                                <select id="tw-status" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                                    <option value="未開始">未開始</option>
                                    <option value="進行中">進行中</option>
                                    <option value="卡關">卡關</option>
                                    <option value="已完成">已完成</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">進度 (%)</label>
                                <input type="number" id="tw-progress" min="0" max="100" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">開始日期</label>
                                <input type="date" id="tw-startDate" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                            </div>
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">預計截止日期</label>
                                <input type="date" id="tw-dueDate" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                            </div>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">備註</label>
                            <textarea id="tw-notes" rows="2" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"></textarea>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" onclick="closeTeamWorkloadModal()" class="internal-ops-btn" style="padding: 8px 16px;">取消</button>
                            <button type="submit" class="action-btn primary" style="padding: 8px 16px; border: none; background: #1976d2; color: #fff; border-radius: 4px; cursor: pointer;">儲存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        pageContainer.insertAdjacentHTML('beforeend', modalHtml);

        const devProjectModalHtml = `
            <div id="internal-ops-dev-project-modal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;">
                <div style="background: #fff; padding: 24px; border-radius: 8px; width: 600px; max-width: 90%;">
                    <h3 id="dp-modal-title" style="margin-top: 0; margin-bottom: 16px;">新增開發案件</h3>
                    <form id="dp-modal-form" onsubmit="submitDevProject(event)">
                        <input type="hidden" id="dp-devId" />
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">開發案件名稱 *</label>
                            <input type="text" id="dp-productName" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">關聯機會</label>
                            <input type="text" id="dp-projectSearch" placeholder="🔍 搜尋機會名稱或客戶..." style="width: 100%; padding: 6px 8px; margin-bottom: 6px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem;" oninput="window.filterDevProjectOpportunities()" />
                            <select id="dp-projectName" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"></select>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">關聯功能</label>
                            <input type="text" id="dp-featureName" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">負責人 *</label>
                                <select id="dp-assigneeName" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"></select>
                            </div>
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">開發階段</label>
                                <select id="dp-devStage" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"></select>
                            </div>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">協作成員</label>
                            <div id="dp-collaborators-container" class="collab-checkbox-group">
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">狀態</label>
                                <select id="dp-status" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">實際進度</label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="range" id="dp-progress-slider" min="0" max="100" step="1" value="0" style="flex: 1;" oninput="document.getElementById('dp-progress').value = this.value" />
                                    <div style="display: flex; align-items: center;">
                                        <input type="number" id="dp-progress" min="0" max="100" value="0" style="width: 50px; padding: 4px 6px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; text-align: right;" oninput="let v = parseInt(this.value)||0; v = Math.min(Math.max(v,0),100); this.value = v; document.getElementById('dp-progress-slider').value = v;" />
                                        <span style="margin-left: 4px; font-weight: 600; color: #1976d2;">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">開始日期</label>
                                <input type="date" id="dp-startDate" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                            </div>
                            <div style="flex: 1;">
                                <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">預計完成日</label>
                                <input type="date" id="dp-estCompletionDate" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;" />
                            </div>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600;">備註</label>
                            <textarea id="dp-notes" rows="2" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"></textarea>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" onclick="closeDevProjectModal()" class="internal-ops-btn" style="padding: 8px 16px;">取消</button>
                            <button type="submit" class="action-btn primary" style="padding: 8px 16px; border: none; background: #1976d2; color: #fff; border-radius: 4px; cursor: pointer;">儲存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        pageContainer.insertAdjacentHTML('beforeend', devProjectModalHtml);
    }

    if (!window.__systemConfig) {
        try {
            const configRes = await (typeof authedFetch === 'function' ? authedFetch('/api/config') : fetch('/api/config').then(r => r.json()));
            window.__systemConfig = configRes || {};
        } catch (err) {
            console.error('[Internal Ops] Failed to fetch system config:', err);
            window.__systemConfig = {};
        }
    }

    await Promise.all([
        fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderTeamWorkload, 'internal-ops-team-workload-content'),
        fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderDevProjects, 'internal-ops-dev-projects-content'),
        fetchAndRenderSection('/api/internal-ops/subscription-ops', window.renderSubscriptions, 'internal-ops-subscriptions-content')
    ]);
};

async function fetchAndRenderSection(endpoint, renderFn, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="loading show" style="padding: 20px;"><div class="spinner"></div><p style="text-align: center; margin-top: 10px;">載入中...</p></div>';
    
    try {
        const res = await (typeof authedFetch === 'function' ? authedFetch(endpoint) : fetch(endpoint).then(r => r.json()));
        const dataArray = Array.isArray(res) ? res : (res && res.success ? res.data : null);
        
        if (dataArray) {
            if (dataArray.length > 0 && typeof renderFn === 'function') {
                container.innerHTML = renderFn(dataArray);
            } else if (dataArray.length === 0) {
                container.innerHTML = '<p style="padding: 30px; color: #888; text-align: center;">目前沒有資料</p>';
            } else {
                console.warn('[Internal Ops] Render function missing or invalid data.');
            }
        } else {
            container.innerHTML = '<p style="padding: 30px; color: #d32f2f; text-align: center;">載入失敗: ' + (res && res.error ? res.error : '無效的資料格式或未知的錯誤') + '</p>';
        }
    } catch (err) {
        console.error(`[Internal Ops] Fetch error for ${endpoint}:`, err);
        container.innerHTML = '<p style="padding: 30px; color: #d32f2f; text-align: center;">發生錯誤：' + err.message + '</p>';
    }
}
window.fetchAndRenderSection = fetchAndRenderSection;

// ==========================================
// Dev Projects CRUD Helper Functions
// ==========================================

window.__internalOpsOpportunities = [];

window.renderOpportunityOptions = function(data) {
    const oppSelect = document.getElementById('dp-projectName');
    if (!oppSelect) return;
    const currentVal = oppSelect.value;
    
    if (data.length > 0) {
        oppSelect.innerHTML = '<option value="">-- 選擇關聯機會 --</option>' + 
            data.map(o => {
                const dName = o.opportunityName || '未命名機會';
                const cName = o.customerCompany ? ` (${o.customerCompany})` : '';
                return `<option value="${o.opportunityId}" data-name="${dName}">${dName}${cName}</option>`;
            }).join('');
    } else {
        oppSelect.innerHTML = '<option value="">(無符合的商機)</option>';
    }
    
    if (currentVal && Array.from(oppSelect.options).some(opt => opt.value === currentVal)) {
        oppSelect.value = currentVal;
    }
};

window.filterDevProjectOpportunities = function() {
    const keyword = (document.getElementById('dp-projectSearch').value || '').toLowerCase();
    if (!keyword) {
        window.renderOpportunityOptions(window.__internalOpsOpportunities || []);
        return;
    }
    const filtered = (window.__internalOpsOpportunities || []).filter(o => {
        const name = (o.opportunityName || '').toLowerCase();
        const comp = (o.customerCompany || '').toLowerCase();
        return name.includes(keyword) || comp.includes(keyword);
    });
    window.renderOpportunityOptions(filtered);
};

async function populateDevProjectDropdowns() {
    const assigneeSelect = document.getElementById('dp-assigneeName');
    const devStageSelect = document.getElementById('dp-devStage');
    const collabContainer = document.getElementById('dp-collaborators-container');
    const oppSelect = document.getElementById('dp-projectName');
    const statusSelect = document.getElementById('dp-status');

    try {
        const configRes = await (typeof authedFetch === 'function' ? authedFetch('/api/config') : fetch('/api/config').then(r => r.json()));
        const config = configRes || {};

        const members = config['團隊成員'] || [];
        if (members.length > 0) {
            assigneeSelect.innerHTML = '<option value="" disabled selected>請選擇</option>' + members.map(m => `<option value="${m.value}">${m.note}</option>`).join('');
            
            collabContainer.innerHTML = members.map((m, idx) => `
                <label class="collab-label">
                    <input type="checkbox" value="${m.value}" class="dp-collab-chk">
                    ${m.value}
                </label>
            `).join('');
        } else {
            assigneeSelect.innerHTML = '<option value="">(無可用成員)</option>';
            collabContainer.innerHTML = '<span style="color:#9ca3af; font-size:0.8rem;">(無可用成員)</span>';
        }

        const stages = config['開發階段'] || [];
        if (stages.length > 0) {
            devStageSelect.innerHTML = stages.map(s => `<option value="${s.value}">${s.note}</option>`).join('');
            devStageSelect.value = stages[0].value;
        } else {
            const fallbackStages = ['規劃中', '開發中', '測試中', '已上線'];
            devStageSelect.innerHTML = fallbackStages.map(s => `<option value="${s}">${s}</option>`).join('');
        }

        const statuses = config['開發狀態'] || [];
        // [DEBUG LOG A] Dropdown population
        console.log('[STATUS][CONFIG]', statuses);
        if (statuses.length > 0) {
            statusSelect.innerHTML = statuses.map(s => `<option value="${s.value}">${s.note}</option>`).join('');
            statusSelect.value = statuses[0].value;
        }

        const oppRes = await (typeof authedFetch === 'function' ? authedFetch('/api/opportunities') : fetch('/api/opportunities').then(r => r.json()));
        const oppData = Array.isArray(oppRes) ? oppRes : (oppRes && oppRes.data ? oppRes.data : []);
        
        window.__internalOpsOpportunities = oppData;
        window.renderOpportunityOptions(oppData);
        
    } catch (err) {
        console.error('[Internal Ops] Dev Project Dropdowns load error:', err);
        assigneeSelect.innerHTML = '<option value="">(載入失敗)</option>';
        devStageSelect.innerHTML = '<option value="">(載入失敗)</option>';
        oppSelect.innerHTML = '<option value="">(商機載入失敗)</option>';
        statusSelect.innerHTML = '<option value="">(載入失敗)</option>';
    }
}

window.openDevProjectModal = function(devId = null) {
    const form = document.getElementById('dp-modal-form');
    form.reset();
    document.getElementById('dp-devId').value = '';
    document.getElementById('dp-modal-title').textContent = '新增開發案件';
    
    const slider = document.getElementById('dp-progress-slider');
    const numInput = document.getElementById('dp-progress');
    if(slider) slider.value = 0;
    if(numInput) numInput.value = 0;
    
    const searchInput = document.getElementById('dp-projectSearch');
    if (searchInput) searchInput.value = '';

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('dp-startDate').value = today;

    populateDevProjectDropdowns().then(() => {
        if (devId && window.__internalOpsDevProjectsData) {
            const item = window.__internalOpsDevProjectsData.find(data => data.devId === devId);
            if (item) {
                document.getElementById('dp-modal-title').textContent = '編輯開發案件';
                document.getElementById('dp-devId').value = item.devId;
                
                const assigneeSelect = document.getElementById('dp-assigneeName');
                if (item.assigneeName) {
                    const option = Array.from(assigneeSelect.options).find(opt => opt.value === item.assigneeName || opt.text === item.assigneeName);
                    if (option) assigneeSelect.value = option.value;
                }

                const devStageSelect = document.getElementById('dp-devStage');
                if (item.devStage) {
                    const option = Array.from(devStageSelect.options).find(opt => opt.value === item.devStage || opt.text === item.devStage);
                    if (option) devStageSelect.value = option.value;
                }

                const statusSelect = document.getElementById('dp-status');
                if (item.status) {
                    // [DEBUG LOG B] Modal open
                    console.log('[STATUS][EDIT LOAD]', item.status);
                    
                    const val = (item.status || '').trim();
                    const option = Array.from(statusSelect.options).find(opt => 
                        (opt.value || '').trim() === val || 
                        (opt.text || '').trim() === val
                    );
                    
                    if (option) {
                        statusSelect.value = option.value;
                    } else {
                        console.warn('[dp-status] no match for:', item.status);
                    }
                }

                const oppSelect = document.getElementById('dp-projectName');
                if (item.assigneeCode) { 
                    const oppOpt = Array.from(oppSelect.options).find(opt => opt.value === item.assigneeCode);
                    if (oppOpt) {
                        oppSelect.value = item.assigneeCode;
                    } else if (item.projectName) { 
                        oppSelect.innerHTML += `<option value="${item.assigneeCode}" data-name="${item.projectName}" selected>${item.projectName}</option>`;
                        oppSelect.value = item.assigneeCode;
                    }
                } else if (item.projectName) { 
                     const oppOptName = Array.from(oppSelect.options).find(opt => opt.getAttribute('data-name') === item.projectName || opt.text === item.projectName);
                     if (oppOptName) {
                         oppSelect.value = oppOptName.value;
                     } else {
                         oppSelect.innerHTML += `<option value="" data-name="${item.projectName}" selected>${item.projectName} (無ID)</option>`;
                     }
                }

                if (item.collaborators) {
                    const selectedCollabs = item.collaborators.split('｜').map(s => s.trim());
                    const checkboxes = document.querySelectorAll('.dp-collab-chk');
                    checkboxes.forEach(chk => {
                        if (selectedCollabs.includes(chk.value)) {
                            chk.checked = true;
                        }
                    });
                }
                
                document.getElementById('dp-productName').value = item.productName || '';
                document.getElementById('dp-featureName').value = item.featureName || '';
                
                const pVal = parseInt((item.progress || '').replace('%', ''), 10) || 0;
                if(numInput) numInput.value = pVal;
                if(slider) slider.value = pVal;

                document.getElementById('dp-startDate').value = item.startDate || '';
                document.getElementById('dp-estCompletionDate').value = item.estCompletionDate || '';
                document.getElementById('dp-notes').value = item.notes || '';
            }
        }
    });

    document.getElementById('internal-ops-dev-project-modal').style.display = 'flex';
};

window.closeDevProjectModal = function() {
    document.getElementById('internal-ops-dev-project-modal').style.display = 'none';
};

window.submitDevProject = async function(event) {
    event.preventDefault();
    
    const devId = document.getElementById('dp-devId').value;
    const progressRaw = document.getElementById('dp-progress').value;

    const oppSelect = document.getElementById('dp-projectName');
    const selectedOpportunityId = oppSelect.value;
    const selectedOption = oppSelect.options[oppSelect.selectedIndex];
    const selectedOpportunityName = (selectedOption && selectedOption.value !== '') ? (selectedOption.getAttribute('data-name') || selectedOption.text) : '';

    const collabCheckboxes = document.querySelectorAll('.dp-collab-chk:checked');
    const collabsJoined = Array.from(collabCheckboxes).map(c => c.value).join('｜');
    
    // [DEBUG LOG C] Submit
    const submittedStatus = document.getElementById('dp-status').value;
    console.log('[STATUS][SUBMIT]', { selectedValue: submittedStatus });

    const data = {
        productCode: '', 
        productName: document.getElementById('dp-productName').value,
        
        projectName: selectedOpportunityName,
        assigneeCode: selectedOpportunityId, 
        
        featureName: document.getElementById('dp-featureName').value,
        assigneeName: document.getElementById('dp-assigneeName').value,
        
        collaborators: collabsJoined,
        
        devStage: document.getElementById('dp-devStage').value,
        status: submittedStatus,
        progress: progressRaw ? progressRaw + '%' : '',
        priority: '', 
        startDate: document.getElementById('dp-startDate').value,
        estCompletionDate: document.getElementById('dp-estCompletionDate').value,
        actualCompletionDate: '', 
        dependencies: '', 
        notes: document.getElementById('dp-notes').value,
        isActive: true, 
        sortOrder: 999 
    };

    const method = devId ? 'PUT' : 'POST';
    const url = devId ? `/api/internal-ops/dev-projects/${devId}` : '/api/internal-ops/dev-projects';

    try {
        let res;
        if (typeof authedFetch === 'function') {
            res = await authedFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(r => r.json());
        }

        if (res && res.success !== false && !res.error) {
            closeDevProjectModal();
            fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderDevProjects, 'internal-ops-dev-projects-content');
            fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderTeamWorkload, 'internal-ops-team-workload-content');
        } else {
            alert('儲存失敗: ' + (res.error || '未知錯誤'));
        }
    } catch (e) {
        console.error(e);
        alert('儲存發生錯誤: ' + e.message);
    }
};

window.deleteDevProject = async function(devId) {
    if (!confirm('確定要刪除這筆開發案件嗎？')) return;
    
    try {
        const url = `/api/internal-ops/dev-projects/${devId}`;
        let res;
        
        if (typeof authedFetch === 'function') {
            res = await authedFetch(url, { method: 'DELETE' });
        } else {
            res = await fetch(url, { method: 'DELETE' }).then(r => r.json());
        }
        
        if (res && res.success !== false && !res.error) {
            fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderDevProjects, 'internal-ops-dev-projects-content');
            fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderTeamWorkload, 'internal-ops-team-workload-content');
        } else {
            alert('刪除失敗: ' + (res.error || '未知錯誤'));
        }
    } catch (e) {
        console.error(e);
        alert('刪除發生錯誤: ' + e.message);
    }
};

// ==========================================
// Team Workload CRUD Helper Functions
// ==========================================

function populateTeamWorkloadDropdowns() {
    const memberSelect = document.getElementById('tw-memberName');
    const taskTypeSelect = document.getElementById('tw-taskType');

    return (typeof authedFetch === 'function'
        ? authedFetch('/api/config')
        : fetch('/api/config').then(r => r.json()))
        .then(config => {
            const members = (config && config['團隊成員']) ? config['團隊成員'] : [];

            if (members.length > 0) {
                memberSelect.innerHTML = members.map(m =>
                    `<option value="${m.value}">${m.note}</option>`
                ).join('');
                if (members.length > 0) {
                    memberSelect.value = members[0].value;
                }
            } else {
                memberSelect.innerHTML = '<option value="">(無可用成員)</option>';
            }

            const taskTypes = (config && config['任務類型']) ? config['任務類型'] : [];

            if (taskTypes.length > 0) {
                taskTypeSelect.innerHTML = taskTypes.map(t =>
                    `<option value="${t.value}">${t.note}</option>`
                ).join('');
            } else {
                const fallback = ['開發', '測試', '設計', '維運'];
                taskTypeSelect.innerHTML = fallback.map(t =>
                    `<option value="${t}">${t}</option>`
                ).join('');
            }
        })
        .catch(err => {
            console.error('[Internal Ops] config load error:', err);
            memberSelect.innerHTML = '<option value="">(載入失敗)</option>';
        });
}

window.openTeamWorkloadModal = function(workId = null) {
    const form = document.getElementById('tw-modal-form');
    form.reset();
    document.getElementById('tw-workId').value = '';
    document.getElementById('tw-modal-title').textContent = '新增任務';

    const dropdownPromise = populateTeamWorkloadDropdowns();

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('tw-startDate').value = today;

    if (workId && window.__internalOpsTeamWorkloadData) {
        const item = window.__internalOpsTeamWorkloadData.find(data => data.workId === workId);
        if (item) {
            document.getElementById('tw-modal-title').textContent = '編輯任務';
            document.getElementById('tw-workId').value = item.workId;
            
            dropdownPromise.then(() => {
                const memberSelect = document.getElementById('tw-memberName');
                const taskTypeSelect = document.getElementById('tw-taskType');

                if (item.memberName) {
                    const option = Array.from(memberSelect.options)
                        .find(opt => opt.value === item.memberName || opt.text === item.memberName);
                    if (option) memberSelect.value = option.value;
                }

                if (item.taskType) {
                    const option = Array.from(taskTypeSelect.options)
                        .find(opt => opt.value === item.taskType || opt.text === item.taskType);
                    if (option) taskTypeSelect.value = option.value;
                }
            });
            
            document.getElementById('tw-taskTitle').value = item.taskTitle || '';
            document.getElementById('tw-status').value = item.status || '未開始';
            document.getElementById('tw-progress').value = (item.progress || '').replace('%', '');
            document.getElementById('tw-startDate').value = item.startDate || '';
            document.getElementById('tw-dueDate').value = item.dueDate || '';
            document.getElementById('tw-notes').value = item.notes || '';
        }
    }

    document.getElementById('internal-ops-team-workload-modal').style.display = 'flex';
};

window.closeTeamWorkloadModal = function() {
    document.getElementById('internal-ops-team-workload-modal').style.display = 'none';
};

window.submitTeamWorkload = async function(event) {
    event.preventDefault();
    
    const workId = document.getElementById('tw-workId').value;
    const progressRaw = document.getElementById('tw-progress').value;
    
    const data = {
        memberName: document.getElementById('tw-memberName').value,
        taskTitle: document.getElementById('tw-taskTitle').value,
        taskType: document.getElementById('tw-taskType').value,
        status: document.getElementById('tw-status').value,
        progress: progressRaw ? progressRaw + '%' : '',
        startDate: document.getElementById('tw-startDate').value,
        dueDate: document.getElementById('tw-dueDate').value,
        notes: document.getElementById('tw-notes').value
    };

    const method = workId ? 'PUT' : 'POST';
    const url = workId ? `/api/internal-ops/team-workload/${workId}` : '/api/internal-ops/team-workload';

    try {
        let res;
        if (typeof authedFetch === 'function') {
            res = await authedFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(r => r.json());
        }

        if (res && res.success !== false && !res.error) { 
            closeTeamWorkloadModal();
            fetchAndRenderSection('/api/internal-ops/team-workload', window.renderTeamWorkload, 'internal-ops-team-workload-content');
        } else {
            alert('儲存失敗: ' + (res.error || '未知錯誤'));
        }
    } catch (e) {
        console.error(e);
        alert('儲存發生錯誤: ' + e.message);
    }
};

window.deleteTeamWorkload = async function(workId) {
    if (!confirm('確定要刪除這筆工作紀錄嗎？')) return;
    
    try {
        const url = `/api/internal-ops/team-workload/${workId}`;
        let res;
        
        if (typeof authedFetch === 'function') {
            res = await authedFetch(url, { method: 'DELETE' });
        } else {
            res = await fetch(url, { method: 'DELETE' }).then(r => r.json());
        }
        
        if (res && res.success !== false && !res.error) {
            fetchAndRenderSection('/api/internal-ops/team-workload', window.renderTeamWorkload, 'internal-ops-team-workload-content');
        } else {
            alert('刪除失敗: ' + (res.error || '未知錯誤'));
        }
    } catch (e) {
        console.error(e);
        alert('刪除發生錯誤: ' + e.message);
    }
};