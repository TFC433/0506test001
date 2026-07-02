// public/scripts/sales/sales-analysis.js
/**
 * @version 1.8.1 (UI Semantic Patch)
 * @date 2026-04-21
 * @changelog
 * - [UI Semantic Patch] Passed isAllHistory flag to dynamically change Trend Chart title when in "歷史全資料" mode.
 * - [UI Enhancement] Added Monthly Trend Chart (Area Chart) utilizing frontend displayedDeals.
 */

// 輔助函式：使用本地時區格式化日期為 YYYY-MM-DD
function formatDateLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 輔助函式：計算成交月份趨勢 (件數)
function calculateMonthlyTrend(deals, isAllHistory = false) {
    const toMonthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const parseWonMonth = deal => {
        if (!deal || !deal.wonDate) return null;
        const date = new Date(deal.wonDate);
        if (isNaN(date.getTime())) return null;
        return new Date(date.getFullYear(), date.getMonth(), 1);
    };
    const addMonth = date => new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const makeBucket = label => ({ label, count: 0, amount: 0 });

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let startMonth;
    let endMonth;

    if (isAllHistory) {
        const validMonths = (deals || []).map(parseWonMonth).filter(Boolean);
        startMonth = validMonths.length
            ? validMonths.reduce((earliest, date) => date < earliest ? date : earliest, validMonths[0])
            : currentMonth;
        endMonth = currentMonth;
    } else {
        const currentYear = now.getFullYear();
        startMonth = new Date(currentYear, 0, 1);
        endMonth = new Date(currentYear, 11, 1);
    }

    const trendMap = new Map();
    for (let cursor = startMonth; cursor <= endMonth; cursor = addMonth(cursor)) {
        trendMap.set(toMonthKey(cursor), makeBucket(toMonthKey(cursor)));
    }

    (deals || []).forEach(deal => {
        const wonMonth = parseWonMonth(deal);
        if (!wonMonth) return;
        const key = toMonthKey(wonMonth);
        if (trendMap.has(key)) {
            trendMap.get(key).count += 1;
            trendMap.get(key).amount += deal.numericValue || 0;
        }
    });

    return Array.from(trendMap.values());
}

// 全域狀態管理
let salesAnalysisData = null; 
let salesStartDate = null;
let salesEndDate = null;
let allWonDeals = [];         
let displayedDeals = [];      
let currentSalesModelFilter = 'all';
let salesChartMetrics = {
    type: 'count',
    source: 'count'
};
window.SalesAnalysisChartMetrics = salesChartMetrics;

// 列表狀態
let currentSortState = { field: 'wonDate', direction: 'desc' };
let currentPage = 1;
let rowsPerPage = 100;
let currentListOpportunityTypeTab = 'all';

/**
 * 入口函數
 */
async function loadSalesAnalysisPage(startDateISO, endDateISO) {
    const container = document.getElementById('page-sales-analysis');
    if (!container) return;

    if (startDateISO === undefined && endDateISO === undefined) {
        const now = new Date();
        salesStartDate = formatDateLocal(new Date(now.getFullYear(), 0, 1));
        salesEndDate = formatDateLocal(new Date(now.getFullYear(), 11, 31));
    } else if (startDateISO === null && endDateISO === null) {
        salesStartDate = '';
        salesEndDate = '';
    } else {
        salesStartDate = startDateISO || '';
        salesEndDate = endDateISO || '';
    }

    currentSalesModelFilter = 'all';

    // 1. 注入 CSS
    SalesAnalysisComponents.injectStyles();

    // 2. 渲染基礎骨架
    container.innerHTML = SalesAnalysisComponents.getMainLayout(salesStartDate, salesEndDate);

    const refreshBtn = document.getElementById('sales-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshSalesAnalysis);

    // 3. 獲取數據
    await fetchAndRenderSalesData(salesStartDate, salesEndDate);
}

// 快速過濾日期選擇
window.setQuickDate = function(range) {
    const now = new Date();
    let start = '';
    let end = '';
    const todayStr = formatDateLocal(now); 
    
    if (range === 'ytd') {
        start = formatDateLocal(new Date(now.getFullYear(), 0, 1)); 
        end = formatDateLocal(new Date(now.getFullYear(), 11, 31));
    } else if (range === '30d') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        start = formatDateLocal(thirtyDaysAgo); 
        end = todayStr;
    } else if (range === 'all') {
        start = '';
        end = '';
    }

    const startInput = document.getElementById('sales-start-date');
    const endInput = document.getElementById('sales-end-date');
    if(startInput) startInput.value = start;
    if(endInput) endInput.value = end;
    
    refreshSalesAnalysis();
};

function refreshSalesAnalysis() {
    const startDateInput = document.getElementById('sales-start-date');
    const endDateInput = document.getElementById('sales-end-date');
    if (!startDateInput || !endDateInput) return;

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (startDate === '' && endDate === '') {
        document.getElementById('sales-overview-content').innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
        document.getElementById('sales-kpi-content').innerHTML = '';
        document.getElementById('won-deals-content').innerHTML = '<div class="loading show" style="padding: 20px;"><div class="spinner"></div></div>';
        loadSalesAnalysisPage(null, null);
    } 
    else if (startDate && endDate) {
        if (startDate <= endDate) {
            document.getElementById('sales-overview-content').innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            document.getElementById('sales-kpi-content').innerHTML = '';
            document.getElementById('won-deals-content').innerHTML = '<div class="loading show" style="padding: 20px;"><div class="spinner"></div></div>';
            loadSalesAnalysisPage(startDate, endDate);
        } else {
            showNotification('開始日期不能大於結束日期', 'warning');
        }
    } else {
        showNotification('請選擇有效的開始和結束日期', 'warning');
    }
}

async function fetchAndRenderSalesData(startDate, endDate) {
    try {
        const sParam = startDate ?? '';
        const eParam = endDate ?? '';
        currentSalesModelFilter = 'all';
        const mParam = 'all';

        const result = await authedFetch(`/api/sales-analysis?startDate=${sParam}&endDate=${eParam}&salesModel=${encodeURIComponent(mParam)}`);
        if (!result.success || !result.data) throw new Error(result.error || '無法獲取分析數據');
        
        salesAnalysisData = result.data;
        
        allWonDeals = salesAnalysisData.allWonDeals || [];
        
        SalesAnalysisComponents.initPaginationOptions([50, 100, 500], rowsPerPage);

        displayedDeals = [...(salesAnalysisData.wonDeals || [])];
        sortDeals(currentSortState.field, currentSortState.direction, true);

        // [Semantic UI Patch] 偵測是否為全歷史資料
        const isAllHistory = (sParam === '' && eParam === '');
        const trendData = calculateMonthlyTrend(displayedDeals, isAllHistory);
        const typeChartData = salesChartMetrics.type === 'count'
            ? SalesAnalysisHelper.calculateGroupCountStats(displayedDeals, 'opportunityType')
            : salesAnalysisData.byType || [];
        const sourceChartData = salesChartMetrics.source === 'count'
            ? SalesAnalysisHelper.calculateGroupCountStats(displayedDeals, 'opportunitySource')
            : salesAnalysisData.bySource || [];

        if (salesAnalysisData.overview && salesAnalysisData.kpis && salesAnalysisData.byType) {
            SalesAnalysisComponents.renderSalesOverviewAndKpis(salesAnalysisData.overview, salesAnalysisData.kpis);
            SalesAnalysisComponents.renderAllCharts(
                typeChartData,
                sourceChartData,
                salesAnalysisData.byProduct || [], 
                salesAnalysisData.byChannel || [],
                trendData,
                isAllHistory // 傳遞全歷史標記
            );
        } else {
            console.warn('[Sales Analysis] Backend SSOT data incomplete, falling back to local computation.');
            updateDashboard(displayedDeals);
        }

        renderPaginatedTable();

    } catch (error) {
        console.error('載入失敗:', error);
        document.getElementById('sales-charts-container').innerHTML = `<div class="alert alert-error">載入失敗: ${error.message}</div>`;
    }
}

function sortDeals(field, direction, sortDisplayedOnly = false) {
    const targetArray = sortDisplayedOnly ? displayedDeals : allWonDeals;
    targetArray.sort((a, b) => {
        let valA, valB;
        if (field === 'wonDate') {
            valA = a.wonDate ? new Date(a.wonDate).getTime() : 0;
            valB = b.wonDate ? new Date(b.wonDate).getTime() : 0;
        } else if (field === 'numericValue') {
            valA = a.numericValue || 0;
            valB = b.numericValue || 0;
        } else return 0;
        return direction === 'asc' ? valA - valB : valB - valA;
    });
    if (!sortDisplayedOnly) displayedDeals = [...allWonDeals];
}

function getOpportunityTypeTabValue(deal) {
    return (deal && deal.opportunityType) || '未分類';
}

function getOpportunityTypeTabs(deals) {
    const counts = new Map();
    (deals || []).forEach(deal => {
        const key = getOpportunityTypeTabValue(deal);
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const typeTabs = Array.from(counts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));

    return [{ value: 'all', label: '全部', count: (deals || []).length }].concat(typeTabs);
}

function getListFilteredDeals() {
    if (currentListOpportunityTypeTab === 'all') return displayedDeals;
    return displayedDeals.filter(deal => getOpportunityTypeTabValue(deal) === currentListOpportunityTypeTab);
}

function updateDashboard(deals) {
    if (typeof SalesAnalysisHelper.calculateOverview !== 'function') return;

    const overview = SalesAnalysisHelper.calculateOverview(deals);
    const kpis = SalesAnalysisHelper.calculateKpis(deals);
    SalesAnalysisComponents.renderSalesOverviewAndKpis(overview, kpis);

    const typeData = SalesAnalysisHelper.calculateGroupStats(deals, 'opportunityType', 'value');
    const sourceData = SalesAnalysisHelper.calculateGroupStats(deals, 'opportunitySource', 'value');
    const productData = SalesAnalysisHelper.calculateProductStats(deals);
    const channelData = SalesAnalysisHelper.calculateChannelStats(deals);
    
    // [Semantic UI Patch] 降級模式亦偵測是否為全歷史資料
    const isAllHistory = (salesStartDate === '' && salesEndDate === '');
    const trendData = calculateMonthlyTrend(deals, isAllHistory);

    SalesAnalysisComponents.renderAllCharts(
        salesChartMetrics.type === 'count' ? SalesAnalysisHelper.calculateGroupCountStats(deals, 'opportunityType') : typeData,
        salesChartMetrics.source === 'count' ? SalesAnalysisHelper.calculateGroupCountStats(deals, 'opportunitySource') : sourceData,
        productData,
        channelData,
        trendData,
        isAllHistory,
        salesChartMetrics
    );
}

function renderPaginatedTable() {
    const tabs = getOpportunityTypeTabs(displayedDeals);
    if (currentListOpportunityTypeTab !== 'all' && !tabs.some(tab => tab.value === currentListOpportunityTypeTab)) {
        currentListOpportunityTypeTab = 'all';
        currentPage = 1;
    }

    SalesAnalysisComponents.renderOpportunityTypeTabs(tabs, currentListOpportunityTypeTab);
    const listFilteredDeals = getListFilteredDeals();
    const totalPages = Math.ceil(listFilteredDeals.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const countDisplay = document.getElementById('deals-count-display');
    if (countDisplay) countDisplay.textContent = listFilteredDeals.length;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const pageDeals = listFilteredDeals.slice(startIndex, startIndex + rowsPerPage);

    SalesAnalysisComponents.renderWonDealsTable(
        pageDeals, 
        currentPage, 
        rowsPerPage, 
        currentSortState,
        salesAnalysisData.salesModelColors || {},
        salesAnalysisData.eventTypeColors || {}
    );
    SalesAnalysisComponents.updatePaginationControls(currentPage, listFilteredDeals.length, rowsPerPage);
}

window.handleListOpportunityTypeTabChange = function(value) {
    currentListOpportunityTypeTab = value || 'all';
    currentPage = 1;
    renderPaginatedTable();
};

window.handleSortTable = function(field) {
    if (currentSortState.field === field) {
        currentSortState.direction = currentSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortState.field = field;
        currentSortState.direction = 'desc';
    }
    sortDeals(currentSortState.field, currentSortState.direction, true);
    renderPaginatedTable();
};

window.handleRowsPerPageChange = function(value) {
    if (value) {
        rowsPerPage = parseInt(value);
        currentPage = 1; 
        SalesAnalysisComponents.initPaginationOptions([50, 100, 500], rowsPerPage);
        renderPaginatedTable();
    }
};

window.handleSalesChartMetricChange = function(chartKey, metric) {
    if (!['type', 'source'].includes(chartKey) || !['count', 'amount'].includes(metric)) return;
    if (salesChartMetrics[chartKey] === metric) return;

    salesChartMetrics = {
        ...salesChartMetrics,
        [chartKey]: metric
    };
    window.SalesAnalysisChartMetrics = salesChartMetrics;

    const typeAmountData = salesAnalysisData && Array.isArray(salesAnalysisData.byType)
        ? salesAnalysisData.byType
        : SalesAnalysisHelper.calculateGroupStats(displayedDeals, 'opportunityType', 'value');
    const sourceAmountData = salesAnalysisData && Array.isArray(salesAnalysisData.bySource)
        ? salesAnalysisData.bySource
        : SalesAnalysisHelper.calculateGroupStats(displayedDeals, 'opportunitySource', 'value');
    const typeData = salesChartMetrics.type === 'count'
        ? SalesAnalysisHelper.calculateGroupCountStats(displayedDeals, 'opportunityType')
        : typeAmountData;
    const sourceData = salesChartMetrics.source === 'count'
        ? SalesAnalysisHelper.calculateGroupCountStats(displayedDeals, 'opportunitySource')
        : sourceAmountData;
    const productData = salesAnalysisData && Array.isArray(salesAnalysisData.byProduct)
        ? salesAnalysisData.byProduct
        : SalesAnalysisHelper.calculateProductStats(displayedDeals);
    const channelData = salesAnalysisData && Array.isArray(salesAnalysisData.byChannel)
        ? salesAnalysisData.byChannel
        : SalesAnalysisHelper.calculateChannelStats(displayedDeals);
    const isAllHistory = (salesStartDate === '' && salesEndDate === '');
    const trendData = calculateMonthlyTrend(displayedDeals, isAllHistory);

    SalesAnalysisComponents.renderAllCharts(typeData, sourceData, productData, channelData, trendData, isAllHistory, salesChartMetrics);
};

window.changePage = function(delta) {
    const totalPages = Math.ceil(getListFilteredDeals().length / rowsPerPage);
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPaginatedTable();
    }
};

window.exportSalesToCSV = function() {
    const csvContent = SalesAnalysisHelper.generateCSV(displayedDeals);
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `成交案件分析_${salesStartDate || '全部'}_至_${salesEndDate || '全部'}.csv`;
    link.click();
    showNotification(`已開始下載 CSV`, 'success');
};

if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules['sales-analysis'] = loadSalesAnalysisPage;
}
