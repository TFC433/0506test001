// public/scripts/sales/sales-analysis-components.js
/**
 * @version 1.5.1 (UI Semantic Patch)
 * @date 2026-04-21
 * @changelog
 * - [UI Semantic Patch] Updated renderAllCharts to conditionally display "歷史月份分布 (件數)" when in All History mode.
 * - [Task 1] Merged all active KPIs into a single responsive flex row.
 */

const SalesAnalysisComponents = {
    _icons: {
        money: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
        check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        avg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>`,
        cycle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
    },

    injectStyles: function() {
        const styleId = 'sales-analysis-custom-style';
        let style = document.getElementById(styleId);
        
        if (style) {
            document.head.appendChild(style);
            return;
        }

        style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #page-sales-analysis .stat-card.solid-fill { border-left: none !important; color: white !important; transition: transform 0.2s ease; }
            #page-sales-analysis .stat-card.solid-fill:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15); }
            #page-sales-analysis .stat-card.solid-fill.solid-green:hover { background-color: #10b981 !important; }
            #page-sales-analysis .stat-card.solid-fill.solid-teal:hover { background-color: #0d9488 !important; }
            #page-sales-analysis .stat-card.solid-fill.solid-blue:hover { background-color: #3b82f6 !important; }
            #page-sales-analysis .stat-card.solid-fill.solid-purple:hover { background-color: #8b5cf6 !important; }
            #page-sales-analysis .stat-card.solid-fill .stat-label, 
            #page-sales-analysis .stat-card.solid-fill .stat-number, 
            #page-sales-analysis .stat-card.solid-fill .stat-icon { color: white !important; }
            #page-sales-analysis .stat-card.solid-fill .stat-icon { background: rgba(255, 255, 255, 0.2) !important; }
            #page-sales-analysis .solid-green { background-color: #10b981 !important; }
            #page-sales-analysis .solid-teal { background-color: #0d9488 !important; }
            #page-sales-analysis .solid-blue { background-color: #3b82f6 !important; }
            #page-sales-analysis .solid-purple { background-color: #8b5cf6 !important; }
            #page-sales-analysis .stat-card.orange { border-left-color: #f97316; }
            .sales-chip { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.85rem; color: white; white-space: nowrap; }
            .type-chip { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 0.85rem; color: white; white-space: nowrap; }
            .channel-chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; border: 1px solid #e5e7eb; background-color: #f9fafb; color: #374151; }
            .custom-select-control { background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
            .sortable-header { cursor: pointer; user-select: none; }
            .sort-icon { margin-left: 4px; font-size: 0.8em; color: #9ca3af; }
            .pagination-container { display: flex; align-items: center; justify-content: center; gap: 15px; }
            .page-btn { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background-color: white; cursor: pointer; }
            
            @media (min-width: 1000px) { 
                .three-charts-row { display: grid !important; grid-template-columns: 2fr 1fr 1fr !important; gap: 16px; }
            }
        `;
        document.head.appendChild(style);
    },

    getMainLayout: function(start, end) {
        const formatDateLocal = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const sVal = start || '';
        const eVal = end || '';
        const rangeText = (start && end) ? `${start} - ${end}` : '歷史全資料';

        const now = new Date();
        const todayStr = formatDateLocal(now);
        const ytdStr = formatDateLocal(new Date(now.getFullYear(), 0, 1));
        const thirtyDate = new Date();
        thirtyDate.setDate(thirtyDate.getDate() - 30);
        const thirtyStr = formatDateLocal(thirtyDate);

        let activeRange = 'custom';
        if (sVal === '' && eVal === '') activeRange = 'all';
        else if (sVal === ytdStr && eVal === todayStr) activeRange = 'ytd';
        else if (sVal === thirtyStr && eVal === todayStr) activeRange = '30d';

        const btnClass = (range) => range === activeRange ? 'action-btn primary quick-date-btn' : 'action-btn secondary quick-date-btn';

        return `
            <div class="dashboard-widget">
                <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 10px 15px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <h2 class="widget-title" style="margin: 0;">績效概覽</h2>
                        <span id="sales-date-range-display" style="color: var(--text-muted); font-size: 0.85rem;">資料期間：${rangeText}</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <div style="display: flex; gap: 6px;">
                            <button class="${btnClass('all')}" style="padding: 4px 10px; font-size: 0.85rem;" onclick="window.setQuickDate('all')">歷史全資料</button>
                            <button class="${btnClass('ytd')}" style="padding: 4px 10px; font-size: 0.85rem;" onclick="window.setQuickDate('ytd')">YTD</button>
                            <button class="${btnClass('30d')}" style="padding: 4px 10px; font-size: 0.85rem;" onclick="window.setQuickDate('30d')">最近30天</button>
                        </div>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <input type="date" id="sales-start-date" style="width: 140px; padding: 4px 8px; font-size: 0.85rem; border: 1px solid var(--border-color); border-radius: 4px; background: #fff;" value="${sVal}">
                            <span style="color: var(--text-muted); font-size: 0.85rem;">-</span>
                            <input type="date" id="sales-end-date" style="width: 140px; padding: 4px 8px; font-size: 0.85rem; border: 1px solid var(--border-color); border-radius: 4px; background: #fff;" value="${eVal}">
                        </div>
                        <button id="sales-refresh-btn" class="action-btn primary" style="padding: 4px 12px; font-size: 0.85rem;">查詢</button>
                    </div>
                </div>
                <div id="sales-overview-content" class="widget-content"><div class="loading show"><div class="spinner"></div></div></div>
                <div id="sales-kpi-content" style="display: none;"></div>
            </div>
            
            <div id="sales-charts-container" style="margin-top: 24px; display:block;"></div>
            
            <div class="dashboard-widget" style="margin-top: 24px;">
                <div class="widget-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; padding-bottom: 15px; border-bottom: 1px solid var(--border-color); gap: 15px;">
                    <div style="display: flex; align-items: baseline; gap: 15px;">
                        <h2 class="widget-title">成交案件列表</h2>
                        <span style="font-size: 0.9rem; color: var(--text-muted);">共 <span id="deals-count-display">0</span> 筆</span>
                    </div>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <div id="rows-per-page-container" style="display:flex; gap: 5px; align-items:center;">
                             <span style="font-size:0.85rem; color:var(--text-muted);">每頁顯示：</span>
                             <div id="rows-per-page-buttons" style="display:flex; gap:5px;"></div>
                        </div>
                        <select id="sales-model-filter" class="custom-select-control" style="padding: 4px 8px; font-size: 0.85rem;" onchange="handleSalesModelFilterChange()"><option value="all">全部商流</option></select>
                    </div>
                </div>
                
                <div id="won-deals-content" class="widget-content" style="padding: 0;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding: 0 10px 15px 10px;">
                    <div style="flex: 1;"></div>
                    <div id="pagination-container" class="pagination-container" style="display: none; flex: 1; justify-content: center;">
                        <button class="page-btn" onclick="changePage(-1)" id="btn-prev-page">上一頁</button>
                        <span class="page-info" id="page-info-display"></span>
                        <button class="page-btn" onclick="changePage(1)" id="btn-next-page">下一頁</button>
                    </div>
                    <div style="flex: 1; display: flex; justify-content: flex-end;">
                        <button class="action-btn secondary" style="padding: 4px 10px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px;" onclick="exportSalesToCSV()">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            匯出 CSV
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderSalesOverviewAndKpis: function(ov, kpis) {
        const container = document.getElementById('sales-overview-content');
        if(!container) return;

        const fmtM = v => (v||0).toLocaleString('zh-TW', {style:'currency', currency:'TWD', minimumFractionDigits:0});
        
        container.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 16px;"> 
                <div class="stat-card solid-fill solid-green" style="flex: 3; min-width: 200px;"><div class="stat-header"><div class="stat-icon">${this._icons.money}</div><div class="stat-label">總成交金額</div></div><div class="stat-number">${fmtM(ov.totalWonValue)}</div></div>
                <div class="stat-card blue" style="flex: 2; min-width: 150px;"><div class="stat-header"><div class="stat-icon" style="background:var(--accent-blue);">${this._icons.check}</div><div class="stat-label">總成交案件數</div></div><div class="stat-number">${ov.totalWonDeals} 件</div></div>
                <div class="stat-card solid-fill solid-teal" style="flex: 1.5; min-width: 100px;"><div class="stat-header"><div class="stat-label">直販</div></div><div class="stat-number">${kpis.direct} 家</div></div>
                <div class="stat-card solid-fill solid-blue" style="flex: 1.5; min-width: 100px;"><div class="stat-header"><div class="stat-label">SI販售</div></div><div class="stat-number">${kpis.si} 家</div></div>
                <div class="stat-card solid-fill solid-purple" style="flex: 1.5; min-width: 100px;"><div class="stat-header"><div class="stat-label">MTB販售</div></div><div class="stat-number">${kpis.mtb} 家</div></div>
            </div>`;
    },

    // [Semantic UI Patch] 根據 isAllHistory 切換顯示標題
    renderAllCharts: function(typeData, sourceData, productData, channelData, trendData, isAllHistory = false) {
        const container = document.getElementById('sales-charts-container');
        if (!container) return;
        
        const trendTitle = isAllHistory ? '歷史月份分布 (件數)' : '每月成交趨勢 (件數)';
        
        container.innerHTML = `
            <div class="three-charts-row">
                <div class="dashboard-widget"><div class="widget-header"><h2 class="widget-title">${trendTitle}</h2></div><div id="chart-area-trend" style="height: 300px;"></div></div>
                <div class="dashboard-widget"><div class="widget-header"><h2 class="widget-title">成交類型 (依金額計)</h2></div><div id="chart-pie-type" style="height: 300px;"></div></div>
                <div class="dashboard-widget"><div class="widget-header"><h2 class="widget-title">成交來源 (依金額計)</h2></div><div id="chart-pie-source" style="height: 300px;"></div></div>
            </div>
        `;

        setTimeout(() => {
            if (typeof createThemedChart !== 'function') return;
            
            const currentMonth = new Date().getMonth(); 
            createThemedChart('chart-area-trend', {
                chart: { type: 'area', margin: [20, 15, 30, 40] },
                title: { text: '' },
                xAxis: { 
                    categories: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
                    plotBands: [{
                        from: currentMonth - 0.5,
                        to: currentMonth + 0.5,
                        color: 'rgba(59, 130, 246, 0.08)',
                        label: { text: '本月', style: { color: '#9ca3af', fontSize: '10px' }, y: 15 }
                    }]
                },
                yAxis: { title: { text: '' }, allowDecimals: false },
                legend: { enabled: false },
                tooltip: { pointFormat: '<b>{point.y} 件</b>' },
                plotOptions: { 
                    area: { 
                        fillColor: 'rgba(59, 130, 246, 0.2)', 
                        lineColor: '#3b82f6', 
                        lineWidth: 2,
                        marker: { radius: 3, fillColor: '#3b82f6' }
                    } 
                },
                series: [{ name: '成交件數', data: (trendData || []).map(d => d.count) }]
            });

            const pieOpt = (name, data) => ({
                chart: { type: 'pie', margin: [0, 0, 0, 0] }, title: { text: '' }, 
                tooltip: { pointFormat: '<b>{point.percentage:.1f}%</b> ({point.y:,.0f})' },
                plotOptions: { pie: { dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.percentage:.1f} %', distance: 10 }, showInLegend: true } },
                legend: { align: 'center', verticalAlign: 'bottom', layout: 'horizontal', itemStyle: { fontSize: '10px' } },
                series: [{ name, data }]
            });

            createThemedChart('chart-pie-type', pieOpt('類型', typeData));
            createThemedChart('chart-pie-source', pieOpt('來源', sourceData));
        }, 50);
    },

    renderWonDealsTable: function(deals, page, perPage, sortState, modelColors, typeColors) {
        const container = document.getElementById('won-deals-content');
        if (!container) return;
        if (!deals.length) { container.innerHTML = '<div class="alert alert-info" style="margin:20px;text-align:center;">此分頁沒有資料</div>'; return; }

        const getIcon = (f) => sortState.field === f ? (sortState.direction === 'asc' ? '↑' : '↓') : '↕';
        const getCls = (f) => sortState.field === f ? 'sortable-header active' : 'sortable-header';

        let html = `<div class="table-container" style="overflow-x:auto;"><table class="data-table sticky-header"><thead><tr style="white-space:nowrap;">
            <th>項次</th><th class="${getCls('wonDate')}" onclick="handleSortTable('wonDate')">成交日期 ${getIcon('wonDate')}</th>
            <th>機會種類</th><th>機會名稱</th><th>終端客戶</th><th>銷售模式</th><th>主要通路</th><th>階段</th>
            <th style="text-align:right;" class="${getCls('numericValue')}" onclick="handleSortTable('numericValue')">機會價值 ${getIcon('numericValue')}</th><th>負責業務</th></tr></thead><tbody>`;

        deals.forEach((d, i) => {
            const idx = ((page - 1) * perPage) + i + 1;
            const modelHtml = d.salesModel ? `<span class="sales-chip" style="background:${modelColors[d.salesModel] || '#6b7280'}">${d.salesModel}</span>` : '-';
            const typeHtml = d.opportunityType ? `<span class="type-chip" style="background:${typeColors[d.opportunityType] || '#6b7280'}">${d.opportunityType}</span>` : '-';
            const chanHtml = (d.channelDetails || d.salesChannel || '-') === '-' ? '-' : `<span class="channel-chip">${d.channelDetails || d.salesChannel}</span>`;
            
            html += `<tr><td>${idx}</td><td>${new Date(d.wonDate).toLocaleDateString()}</td><td>${typeHtml}</td>
                <td><a href="#" class="text-link" onclick="event.preventDefault();CRM_APP.navigateTo('opportunity-details',{opportunityId:'${d.opportunityId}'})"><strong>${d.opportunityName}</strong></a></td>
                <td>${d.customerCompany || '-'}</td><td>${modelHtml}</td><td>${chanHtml}</td>
                <td><span class="status-badge status-won">${d.currentStage}</span></td>
                <td style="text-align:right;font-weight:600;">$${(d.numericValue||0).toLocaleString()}</td><td>${d.assignee || '-'}</td></tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    },

    initSalesModelFilterOptions: function(deals) {
        const select = document.getElementById('sales-model-filter');
        if (!select) return;
        const models = [...new Set(deals.map(d => d.salesModel).filter(Boolean))];
        select.innerHTML = '<option value="all">通路 - 篩選</option>' + models.sort().map(m => `<option value="${m}">${m}</option>`).join('');
    },

    initPaginationOptions: function(options, current) {
        const container = document.getElementById('rows-per-page-buttons');
        if (!container) return;
        const fixedOptions = [50, 100, 500];
        container.innerHTML = fixedOptions.map(opt => 
            `<button class="action-btn ${opt === current ? 'primary' : 'secondary'}" style="padding: 4px 8px; font-size: 0.8rem;" onclick="handleRowsPerPageChange(${opt})">${opt}</button>`
        ).join('');
    },

    updatePaginationControls: function(current, totalCount, perPage) {
        const container = document.getElementById('pagination-container');
        if (!container || totalCount === 0) { if(container) container.style.display = 'none'; return; }
        container.style.display = 'flex';
        const totalPages = Math.ceil(totalCount / perPage) || 1;
        document.getElementById('page-info-display').textContent = `第 ${current} 頁 / 共 ${totalPages} 頁`;
        document.getElementById('btn-prev-page').disabled = current === 1;
        document.getElementById('btn-next-page').disabled = current === totalPages;
    }
};