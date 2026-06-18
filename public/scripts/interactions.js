// views/scripts/interactions.js

/**
 * 載入並渲染所有互動紀錄頁面的主函式
 * @param {number} [page=1] - 要載入的頁碼
 * @param {string} [query=''] - 搜尋關鍵字
 */
let currentInteractionOverviewTab = 'crm';
let currentInteractionOverviewQuery = '';

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
        { id: 'activity', label: '使用者活動' }
    ];

    return `
        <div class="action-buttons-container" style="margin-bottom: 1rem;">
            ${tabs.map(tab => {
                const activeStyle = tab.id === activeTab ? 'border-color: var(--accent-blue); color: var(--text-primary);' : '';
                return `<button type="button" class="action-btn small secondary" style="${activeStyle}" data-interactions-tab="${tab.id}">${tab.label}</button>`;
            }).join('')}
        </div>
    `;
}

function renderInteractionOverviewShell(query = '', activeTab = 'crm') {
    const isCrmTab = activeTab === 'crm';

    return `
        <div class="dashboard-widget">
            <div class="widget-header">
                <h2 class="widget-title">所有互動紀錄</h2>
            </div>
            ${renderInteractionOverviewTabs(activeTab)}
            ${isCrmTab ? `
                <div class="search-pagination" style="padding: 0 1.5rem 1rem;">
                    <input type="text" class="search-box" id="all-interactions-search" placeholder="搜尋內容、機會名稱、記錄人..." value="${query}">
                    <div class="pagination" id="all-interactions-pagination"></div>
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

async function loadAllInteractionsPage(page = 1, query = '') {
    const container = document.getElementById('page-interactions');
    if (!container) return;

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
