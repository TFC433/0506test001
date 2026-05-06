// public/scripts/opportunities/opportunities.js
/**
 * 職責：管理「機會案件列表頁」的篩選、列表渲染與操作
 * @version 8.5.0 (Phase 9 - Metadata Decoupling)
 * @date 2026-04-15
 * @description 
 * - [PHASE 9] Replaced expensive `page=0` full-dataset fetch with dedicated lightweight `metadata/years` endpoint.
 * - [PHASE 9-C] Implemented Incremental Append Pagination (limit 50) to drastically reduce first-load payload and DOM render cost.
 * - [Hierarchy Fix Patch] Reordered top controls to strictly follow: Tabs -> Dropdowns -> Search -> Status/Count -> Table.
 */

// ==================== 全域變數 (此頁面專用) ====================
let opportunitiesData = []; // Maintained strictly as an empty default wrapper to prevent undefined variable crashes

// 篩選與排序狀態
let opportunitiesListFilters = { 
    year: 'all', 
    type: 'all', 
    source: 'all', 
    time: 'all', 
    stage: 'all'
};
let currentOppSort = { field: 'effectiveLastActivity', direction: 'desc' };

// [Phase 9-C] Pagination State
let currentOppPage = 1;
const OPP_PAGE_LIMIT = 50;

// ==================== 主要功能函式 ====================

/**
 * 載入並渲染所有機會案件頁面
 * @param {string} [query=''] - 搜尋關鍵字
 */
async function loadOpportunities(query = '') {
    const container = document.getElementById('page-opportunities');
    if (!container) return;

    // 1. 渲染頁面骨架 
    container.innerHTML = `
        <div id="opportunities-list-root">
            <div class="dashboard-widget">
                
                <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                    <div style="display: flex; align-items: baseline; gap: 15px;">
                        <h2 class="widget-title" style="margin: 0;">機會總覽</h2>
                    </div>
                    <div id="opportunity-type-tabs" class="opportunity-tabs" style="display: flex; gap: 4px; background: var(--bg-hover, #f1f5f9); padding: 4px; border-radius: 8px; overflow-x: auto;">
                        <button class="tab-btn active" data-action="switch-type-tab" data-value="all" style="background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s; white-space: nowrap;">全部</button>
                    </div>
                </div>

                <div id="opportunity-action-bar" style="padding: 1.5rem 1.5rem 0.5rem;">
                    
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <div id="opportunity-list-filters" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <select id="opp-year-filter" class="form-select-sm" data-filter="year"><option value="all">所有年份</option></select>
                            <select id="opp-source-filter" class="form-select-sm" data-filter="source"><option value="all">所有來源</option></select>
                            <select id="opp-time-filter" class="form-select-sm" data-filter="time">
                                <option value="all">活動日期 (全部)</option>
                                <option value="7">近 7 天</option>
                                <option value="30">近 30 天</option>
                                <option value="90">近 90 天</option>
                            </select>
                            <select id="opp-stage-filter" class="form-select-sm" data-filter="stage"><option value="all">所有階段</option></select>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 1rem; flex-wrap: wrap;">
                        <div style="flex: 1; max-width: 400px;">
                            <input type="text" class="search-box" id="opportunities-list-search" placeholder="搜尋機會名稱或客戶公司..." style="width: 100%;" value="${query}">
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem; min-height: 24px;">
                        <div id="opportunities-filter-status" style="display: none; align-items: center; gap: 8px;">
                            <span id="opportunities-filter-text" style="font-size: 0.85rem; font-weight: 600; color: var(--accent-blue);"></span>
                            <button class="action-btn small danger" data-action="clear-filters" style="padding: 2px 8px;">清除</button>
                        </div>
                        
                        <div id="opportunities-count-display" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500; margin-left: auto;">共 0 筆</div>
                    </div>
                </div>

                <div id="opportunities-page-content" class="widget-content" style="padding: 0;">
                    <div class="loading show"><div class="spinner"></div><p>載入機會資料中...</p></div>
                </div>
            </div>
        </div>
    `;

    // 2. 綁定事件委派
    container.removeEventListener('click', handleOpportunitiesClick);
    container.addEventListener('click', handleOpportunitiesClick);
    
    // 綁定搜尋事件
    const searchInput = document.getElementById('opportunities-list-search');
    if (searchInput) {
        searchInput.removeEventListener('keyup', handleOpportunitiesSearch);
        searchInput.addEventListener('keyup', handleOpportunitiesSearch);
    }

    try {
        // [Phase 9 Note] Replaced expensive page=0 payload with dedicated lightweight metadata call
        const [yearsResult, systemConfigResult] = await Promise.all([
            authedFetch(`/api/opportunities/metadata/years`), 
            authedFetch(`/api/config`)
        ]);

        if (systemConfigResult) {
            window.CRM_APP = window.CRM_APP || {};
            window.CRM_APP.systemConfig = systemConfigResult;
            
            renderOpportunityTypeTabs(systemConfigResult['機會種類'] || []);
            populateOppFilterOptions('opp-source-filter', systemConfigResult['機會來源'], '所有來源');
            populateOppFilterOptions('opp-stage-filter', systemConfigResult['機會階段'], '所有階段');
            
            document.querySelectorAll('#opportunity-list-filters select').forEach(select => {
                select.addEventListener('change', handleOppFilterDropdownChange);
            });
        }

        const yearFilter = document.getElementById('opp-year-filter');
        if (yearFilter && yearsResult && yearsResult.success && Array.isArray(yearsResult.data)) {
            const sortedYears = yearsResult.data;
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = `${y} 年`;
                yearFilter.appendChild(opt);
            });
            yearFilter.value = opportunitiesListFilters.year;
        }

        opportunitiesData = []; // Clear old dataset entirely from DOM memory.

        // Reset page and execute initial render
        currentOppPage = 1;
        fetchAndRenderOpportunitiesTable(false);

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('❌ 載入機會案件頁面失敗:', error);
            const contentEl = document.getElementById('opportunities-page-content');
            if (contentEl) contentEl.innerHTML = `<div class="alert alert-error">載入資料失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 統一事件處理器 (Centralized Event Handler)
 */
function handleOpportunitiesClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const payload = btn.dataset;

    switch (action) {
        case 'switch-type-tab':
            opportunitiesListFilters.type = payload.value;
            renderOpportunityTypeTabs(window.CRM_APP?.systemConfig?.['機會種類'] || []);
            currentOppPage = 1;
            fetchAndRenderOpportunitiesTable(false);
            break;
        case 'sort':
            handleOppSort(payload.field);
            break;
        case 'delete-opp':
            confirmDeleteOpportunity(payload.oppId, payload.name);
            break;
        case 'clear-filters':
            clearAllOppFilters();
            break;
        case 'load-more-opps':
            currentOppPage++;
            fetchAndRenderOpportunitiesTable(true);
            break;
        case 'navigate':
            e.preventDefault();
            let params = {};
            if (payload.params) {
                try {
                    params = JSON.parse(payload.params);
                } catch (err) {
                    console.error('解析導航參數失敗', err);
                }
            }
            CRM_APP.navigateTo(payload.page, params);
            break;
    }
}

function renderOpportunityTypeTabs(options = []) {
    const tabsContainer = document.getElementById('opportunity-type-tabs');
    if (!tabsContainer) return;
    
    const tabs = [{ value: 'all', label: '全部' }];
    options.forEach(opt => tabs.push({ value: opt.value, label: opt.note || opt.value }));
    
    let html = '';
    tabs.forEach(t => {
        const isActive = opportunitiesListFilters.type === t.value;
        const style = isActive 
            ? `background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s; white-space: nowrap;` 
            : `background: transparent; border: none; padding: 8px 16px; font-weight: 500; color: var(--text-muted); border-radius: 6px; box-shadow: none; cursor: pointer; transition: all 0.2s; white-space: nowrap;`;
        
        html += `<button class="tab-btn ${isActive ? 'active' : ''}" data-action="switch-type-tab" data-value="${t.value}" style="${style}">${t.label}</button>`;
    });
    
    tabsContainer.innerHTML = html;
}

function populateOppFilterOptions(selectId, options, defaultText) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = `<option value="all">${defaultText}</option>` + 
        (options || []).map(opt => `<option value="${opt.value}">${opt.note || opt.value}</option>`).join('');
}

function handleOppFilterDropdownChange(e) {
    const filterKey = e.target.dataset.filter;
    opportunitiesListFilters[filterKey] = e.target.value;
    currentOppPage = 1;
    fetchAndRenderOpportunitiesTable(false); 
}

function clearAllOppFilters() {
    opportunitiesListFilters = { 
        year: 'all', type: 'all', source: 'all', time: 'all', stage: 'all' 
    };
    
    document.querySelectorAll('#opportunity-list-filters select').forEach(select => {
        select.value = 'all';
    });

    renderOpportunityTypeTabs(window.CRM_APP?.systemConfig?.['機會種類'] || []);

    currentOppPage = 1;
    fetchAndRenderOpportunitiesTable(false);
}

/**
 * [Phase 9-C] Incremental Append Table Fetching
 */
async function fetchAndRenderOpportunitiesTable(isAppend = false) {
    const listContent = document.getElementById('opportunities-page-content');
    const filterStatus = document.getElementById('opportunities-filter-status');
    const filterText = document.getElementById('opportunities-filter-text');
    const countDisplay = document.getElementById('opportunities-count-display');
    const query = document.getElementById('opportunities-list-search')?.value.trim() || '';

    if (!listContent) return;

    const activeFiltersCount = Object.entries(opportunitiesListFilters).filter(([k, v]) => k !== 'type' && v !== 'all' && v !== undefined).length;
    if (activeFiltersCount > 0) {
        if (filterStatus) filterStatus.style.display = 'flex';
        if (filterText) filterText.textContent = `已套用 ${activeFiltersCount} 個篩選`;
    } else {
        if (filterStatus) filterStatus.style.display = 'none';
    }

    if (!isAppend) {
        currentOppPage = 1;
        listContent.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入機會資料中...</p></div>';
    } else {
        const btn = document.getElementById('btn-load-more-opps');
        if (btn) {
            btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:var(--accent-blue);margin-right:8px;display:inline-block;vertical-align:middle;"></div>載入中...';
            btn.disabled = true;
        }
    }

    try {
        const params = new URLSearchParams();
        params.append('page', currentOppPage);
        params.append('limit', OPP_PAGE_LIMIT); 
        if (query) params.append('q', query);
        
        if (currentOppSort.field) {
            params.append('sortField', currentOppSort.field);
            params.append('sortDirection', currentOppSort.direction);
        }

        const keyMapping = { 'type': 'type', 'source': 'source', 'stage': 'stage' };

        for (const [key, value] of Object.entries(opportunitiesListFilters)) {
            if (value !== 'all' && value !== undefined) {
                const apiParam = keyMapping[key] || key;
                params.append(apiParam, value);
            }
        }

        const result = await authedFetch(`/api/opportunities?${params.toString()}`);
        
        const tableData = result.data || result || [];
        const totalCount = result.total !== undefined ? result.total : tableData.length;

        if (countDisplay) countDisplay.innerHTML = `共 ${totalCount} 筆`;

        if (!isAppend) {
            listContent.innerHTML = renderOpportunitiesTable(tableData);
        } else {
            const tbody = listContent.querySelector('.opp-list-table tbody');
            if (tbody) {
                tbody.insertAdjacentHTML('beforeend', renderOpportunityRows(tableData));
            }
            const oldBtnContainer = document.getElementById('opp-load-more-container');
            if (oldBtnContainer) oldBtnContainer.remove();
        }

        // Render Load More button if there's more data
        if (currentOppPage * OPP_PAGE_LIMIT < totalCount) {
            listContent.insertAdjacentHTML('beforeend', `
                <div id="opp-load-more-container" style="text-align: center; padding: 20px;">
                    <button id="btn-load-more-opps" class="action-btn secondary" data-action="load-more-opps" style="padding: 8px 24px; border-radius: 20px; font-weight: 600;">
                        載入更多 (${Math.min(currentOppPage * OPP_PAGE_LIMIT, totalCount)} / ${totalCount})
                    </button>
                </div>
            `);
        }

    } catch (error) {
        console.error('Fetch table data failed:', error);
        if (!isAppend) {
            listContent.innerHTML = `<div class="alert alert-error">載入表格失敗: ${error.message}</div>`;
        } else {
            const btn = document.getElementById('btn-load-more-opps');
            if (btn) {
                btn.innerHTML = '載入失敗，請重試';
                btn.disabled = false;
            }
        }
    }
}

function handleOpportunitiesSearch(event) {
    handleSearch(() => {
        currentOppPage = 1;
        fetchAndRenderOpportunitiesTable(false);
    });
}

function handleOppSort(field) {
    if (currentOppSort.field === field) {
        currentOppSort.direction = currentOppSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentOppSort.field = field;
        currentOppSort.direction = 'desc'; 
    }
    currentOppPage = 1;
    fetchAndRenderOpportunitiesTable(false);
}

function renderOpportunitiesTable(opportunities) {
    const styleId = 'opportunity-list-upgraded-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .opp-list-container { width: 100%; overflow-x: auto; background: var(--card-bg, #fff); }
            .opp-list-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
            .opp-list-table th { padding: 12px 16px; text-align: left; background: var(--glass-bg); color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
            .opp-list-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); vertical-align: middle; font-size: 0.95rem; color: var(--text-main); }
            .opp-list-table tr:not(.locked):hover { background-color: var(--glass-bg); }
            
            .opp-list-table tr.locked { background-color: var(--bg-locked); color: var(--text-locked); }
            .opp-list-table tr.locked td { color: var(--text-locked); }

            .opp-type-chip { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; color: white; white-space: nowrap; font-weight: 500; }
            .opp-sales-chip { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 0.8rem; color: white; white-space: nowrap; font-weight: 500; }
            .opp-channel-chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid #e5e7eb; background-color: #f9fafb; color: #374151; white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
            .opp-status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #f3f4f6; color: #4b5563; }
            
            .opp-list-table th.sortable { cursor: pointer; transition: color 0.2s; }
            .opp-list-table th.sortable:hover { color: var(--accent-blue); }
            .opp-sort-icon { margin-left: 4px; font-size: 0.8em; opacity: 0.5; }

            .col-idx { width: 60px; text-align: center !important; color: var(--text-muted); font-weight: 600; }
            .col-actions { width: 80px; text-align: center !important; }
            .btn-mini-delete { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 6px; border-radius: 4px; transition: all 0.2s; }
            .btn-mini-delete:hover { color: #ef4444; background: #fee2e2; }
        `;
        document.head.appendChild(style);
    }

    if (!opportunities || opportunities.length === 0) {
        return '<div class="alert alert-info" style="margin:2rem; text-align:center;">暫無符合條件的機會案件資料</div>';
    }

    const renderSortHeader = (field, label) => {
        let icon = '↕';
        if (currentOppSort.field === field) icon = currentOppSort.direction === 'asc' ? '↑' : '↓';
        return `<th class="sortable" data-action="sort" data-field="${field}">${label} <span class="opp-sort-icon">${icon}</span></th>`;
    };

    let html = `<div class="opp-list-container"><table class="opp-list-table"><thead><tr>
                    <th class="col-idx">項次</th>
                    ${renderSortHeader('effectiveLastActivity', '最後活動')}
                    <th>機會種類</th>
                    ${renderSortHeader('opportunityName', '機會名稱')}
                    ${renderSortHeader('customerCompany', '客戶公司')}
                    <th>銷售模式</th>
                    <th>主要通路</th>
                    <th>階段</th>
                    <th class="col-actions">操作</th>
                </tr></thead><tbody>`;

    html += renderOpportunityRows(opportunities);
    
    return html + '</tbody></table></div>';
}

function renderOpportunityRows(opportunities) {
    let html = '';
    const systemConfig = window.CRM_APP?.systemConfig || {};
    const stageNotes = new Map((systemConfig['機會階段'] || []).map(s => [s.value, s.note || s.value]));
    const typeColors = new Map((systemConfig['機會種類'] || []).map(t => [t.value, t.color]));
    const modelColors = new Map((systemConfig['銷售模式'] || []).map(m => [m.value, m.color]));

    opportunities.forEach((opp, index) => {
        const stageName = stageNotes.get(opp.currentStage) || opp.currentStage || '-';
        const typeColor = typeColors.get(opp.opportunityType) || '#9ca3af';
        const modelColor = modelColors.get(opp.salesModel) || '#6b7280';
        
        const channelText = opp.salesChannel || '-';
        const lastActivityDate = opp.effectiveLastActivity ? new Date(opp.effectiveLastActivity).toLocaleDateString('zh-TW') : '-';

        const oppParams = JSON.stringify({ opportunityId: opp.opportunityId }).replace(/"/g, '&quot;');
        const safeOppName = (opp.opportunityName || '').replace(/"/g, '&quot;');

        // Calculate absolute row index spanning across pages
        const absoluteIdx = (currentOppPage - 1) * OPP_PAGE_LIMIT + index + 1;

        html += `
            <tr>
                <td class="col-idx">${absoluteIdx}</td>
                <td style="white-space:nowrap;">${lastActivityDate}</td>
                <td><span class="opp-type-chip" style="background:${typeColor}">${opp.opportunityType || '未分類'}</span></td>
                <td style="min-width:180px;">
                    <a href="#" class="text-link" 
                       data-action="navigate" 
                       data-page="opportunity-details" 
                       data-params="${oppParams}">
                        <strong>${opp.opportunityName || '(未命名)'}</strong>
                    </a>
                </td>
                <td style="min-width:150px;">
                    <span style="color:var(--text-secondary);">${opp.customerCompany || '-'}</span>
                </td>
                <td><span class="opp-sales-chip" style="background:${modelColor}">${opp.salesModel || '-'}</span></td>
                <td><span class="opp-channel-chip" title="${channelText}">${channelText}</span></td>
                <td><span class="opp-status-badge">${stageName}</span></td>
                <td class="col-actions">
                    <button class="btn-mini-delete" title="刪除案件" 
                            data-action="delete-opp" 
                            data-opp-id="${opp.opportunityId}" 
                            data-name="${safeOppName}">
                        <svg style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg>
                    </button>
                </td>
            </tr>`;
    });

    return html;
}

async function confirmDeleteOpportunity(oppId, opportunityName) {
    if (!oppId) { showNotification('無法刪除：缺少必要的紀錄 ID。', 'error'); return; }
    const message = `您確定要"永久刪除"\n機會案件 "${opportunityName || '(未命名)'}" 嗎？\n此操作無法復原！`;
    showConfirmDialog(message, async () => {
        showLoading('正在刪除...');
        try {
            const result = await authedFetch(`/api/opportunities/${oppId}`, { method: 'DELETE' });
            if (result.success) {
                currentOppPage = 1;
                fetchAndRenderOpportunitiesTable(false);
            } else { throw new Error(result.details || '刪除操作失敗'); }
        } catch (error) { if (error.message !== 'Unauthorized') console.error('刪除失敗:', error); }
        finally { hideLoading(); }
    });
}

async function loadFollowUpPage() {
    const container = document.getElementById('page-follow-up');
    if (!container) return;
    
    container.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入待追蹤清單中...</p></div>';
    
    container.removeEventListener('click', handleOpportunitiesClick);
    container.addEventListener('click', handleOpportunitiesClick);

    try {
        const result = await authedFetch('/api/dashboard');
        if (!result.success || !result.data) throw new Error(result.error || '無法獲取資料');
        const followUpFullList = (result.data.followUpList || []).sort((a, b) => (a.effectiveLastActivity || 0) - (b.effectiveLastActivity || 0));
        if (followUpFullList.length === 0) {
            container.innerHTML = '<div class="alert alert-success" style="padding: 2rem; text-align: center;">🎉 太棒了！目前沒有需要追蹤的機會案件。</div>';
        } else {
            const thresholdDays = window.CRM_APP?.systemConfig?.FOLLOW_UP?.DAYS_THRESHOLD || 7;
            container.innerHTML = `<div class="dashboard-widget"><div class="widget-header"><h2 class="widget-title">待追蹤案件 (${followUpFullList.length})</h2></div><div class="widget-content"><div class="alert alert-warning">⚠️ 已超過 ${thresholdDays} 天未有新活動。</div>${renderOpportunitiesTable(followUpFullList)}</div></div>`;
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') container.innerHTML = '<div class="alert alert-error">載入待追蹤清單失敗。</div>';
    }
}

if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules.opportunities = loadOpportunities;
    window.CRM_APP.pageModules['follow-up'] = loadFollowUpPage;
}