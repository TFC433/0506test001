// public/scripts/sales/sales-analysis-components.js
/**
 * @version 1.5.1 (UI Semantic Patch)
 * @date 2026-04-21
 * @changelog
 * - [UI Semantic Patch] Updated renderAllCharts to conditionally display "歷史月份分布 (件數)" when in All History mode.
 * - [Task 1] Merged all active KPIs into a single responsive flex row.
 */

const SalesAnalysisComponents = {
    _latestEChartsOptions: {},
    _previewChart: null,
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
            .sales-chart-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .sales-chart-expand-btn { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; flex: 0 0 auto; }
            .sales-chart-expand-btn:hover { color: var(--text-primary); background: var(--hover-bg, rgba(148, 163, 184, 0.08)); }
            .sales-chart-expand-btn svg { width: 14px; height: 14px; }
            #sales-chart-preview-modal { position: fixed; inset: 0; z-index: 2000; display: none; align-items: center; justify-content: center; padding: 24px; background: rgba(15, 23, 42, 0.42); }
            #sales-chart-preview-modal.show { display: flex; }
            .sales-chart-preview-dialog { width: min(980px, 96vw); background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18); overflow: hidden; }
            .sales-chart-preview-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
            #sales-chart-preview-title { margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-primary); }
            .sales-chart-preview-close { width: 30px; height: 30px; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1; }
            .sales-chart-preview-close:hover { color: var(--text-primary); background: var(--hover-bg, rgba(148, 163, 184, 0.08)); }
            #sales-chart-preview-container { height: min(500px, 68vh); padding: 8px 14px 16px; }
            
            .three-charts-row { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .three-charts-row > .dashboard-widget { min-width: 0; }
            @media (min-width: 1000px) { 
                .three-charts-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
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
        const yearEndStr = formatDateLocal(new Date(now.getFullYear(), 11, 31));
        const thirtyDate = new Date();
        thirtyDate.setDate(thirtyDate.getDate() - 30);
        const thirtyStr = formatDateLocal(thirtyDate);

        let activeRange = 'custom';
        if (sVal === '' && eVal === '') activeRange = 'all';
        else if (sVal === ytdStr && eVal === yearEndStr) activeRange = 'ytd';
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
                            <button class="${btnClass('ytd')}" style="padding: 4px 10px; font-size: 0.85rem;" onclick="window.setQuickDate('ytd')">今年業績</button>
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
                    </div>
                </div>
                <div id="opportunity-type-tabs" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; padding: 0 0 12px 0;"></div>
                
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
            <div id="sales-chart-preview-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="sales-chart-preview-title" onclick="if(event.target === this) SalesAnalysisComponents.closeChartPreview()">
                <div class="sales-chart-preview-dialog">
                    <div class="sales-chart-preview-header">
                        <h2 id="sales-chart-preview-title">圖表預覽</h2>
                        <button type="button" class="sales-chart-preview-close" title="關閉預覽" aria-label="關閉預覽" onclick="SalesAnalysisComponents.closeChartPreview()">×</button>
                    </div>
                    <div id="sales-chart-preview-container"></div>
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
    renderAllCharts: function(typeData, sourceData, productData, channelData, trendData, isAllHistory = false, metricState) {
        const container = document.getElementById('sales-charts-container');
        if (!container) return;
        
        const trendTitle = isAllHistory ? '歷史成交趨勢（件數 / 金額）' : '每月成交趨勢（件數 / 金額）';
        const activeMetrics = {
            type: 'count',
            source: 'count',
            ...(window.SalesAnalysisChartMetrics || {}),
            ...(metricState || {})
        };
        const metricToggleHtml = (chartKey) => {
            const activeMetric = activeMetrics[chartKey] || 'count';
            const btnClass = (metric) => `action-btn ${activeMetric === metric ? 'primary' : 'secondary'}`;
            return `
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button type="button" class="${btnClass('count')}" style="padding: 4px 10px; font-size: 0.8rem;" onclick="handleSalesChartMetricChange('${chartKey}', 'count')">件數</button>
                    <button type="button" class="${btnClass('amount')}" style="padding: 4px 10px; font-size: 0.8rem;" onclick="handleSalesChartMetricChange('${chartKey}', 'amount')">金額</button>
                </div>
            `;
        };
        const typeTitle = `成交類型 (${activeMetrics.type === 'count' ? '依件數計' : '依金額計'})`;
        const sourceTitle = `成交來源 (${activeMetrics.source === 'count' ? '依件數占比' : '依金額占比'})`;
        
        container.innerHTML = `
            <div class="three-charts-row">
                <div class="dashboard-widget"><div class="widget-header sales-chart-header"><h2 class="widget-title">${trendTitle}</h2><button type="button" class="sales-chart-expand-btn" title="放大成交趨勢圖表" aria-label="放大成交趨勢圖表" onclick="SalesAnalysisComponents.openChartPreview('trend', '${trendTitle}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"></path><path d="M21 3l-7 7"></path><path d="M9 21H3v-6"></path><path d="M3 21l7-7"></path></svg></button></div><div id="chart-area-trend" style="height: 300px;"></div></div>
                <div class="dashboard-widget"><div class="widget-header sales-chart-header"><h2 class="widget-title">${typeTitle}</h2><div style="display: flex; gap: 6px; align-items: center;">${metricToggleHtml('type')}<button type="button" class="sales-chart-expand-btn" title="放大成交類型圖表" aria-label="放大成交類型圖表" onclick="SalesAnalysisComponents.openChartPreview('type', '${typeTitle}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"></path><path d="M21 3l-7 7"></path><path d="M9 21H3v-6"></path><path d="M3 21l7-7"></path></svg></button></div></div><div id="chart-pie-type" style="height: 300px;"></div></div>
                <div class="dashboard-widget"><div class="widget-header sales-chart-header"><h2 class="widget-title">${sourceTitle}</h2><div style="display: flex; gap: 6px; align-items: center;">${metricToggleHtml('source')}<button type="button" class="sales-chart-expand-btn" title="放大成交來源圖表" aria-label="放大成交來源圖表" onclick="SalesAnalysisComponents.openChartPreview('source', '${sourceTitle}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"></path><path d="M21 3l-7 7"></path><path d="M9 21H3v-6"></path><path d="M3 21l7-7"></path></svg></button></div></div><div id="chart-pie-source" style="height: 300px;"></div></div>
            </div>
        `;

        setTimeout(() => {
            if (typeof createEChartsThemedChart !== 'function') return;

            const escapeChartText = value => String(value || '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[ch]);
            const formatMoneyCompact = value => {
                const amount = Number(value || 0);
                if (Math.abs(amount) >= 100000000) return `${(amount / 100000000).toFixed(1).replace(/\.0$/, '')}億`;
                if (Math.abs(amount) >= 10000) return `${(amount / 10000).toFixed(1).replace(/\.0$/, '')}萬`;
                return amount.toLocaleString();
            };
            const formatMetricValue = (value, metric) => {
                const numericValue = Number(value || 0);
                return metric === 'count' ? `${numericValue.toLocaleString()} 件` : formatMoneyCompact(numericValue);
            };

            const trendBarOpt = data => {
                const rows = data || [];
                const rootStyle = getComputedStyle(document.documentElement);
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const textColorPrimary = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a');
                const textColorSecondary = rootStyle.getPropertyValue('--text-secondary').trim() || (isDark ? '#cbd5e1' : '#475569');
                const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
                const borderColor = rootStyle.getPropertyValue('--border-color').trim() || (isDark ? '#334155' : '#cbd5e1');
                const cardBg = rootStyle.getPropertyValue('--card-bg').trim() || (isDark ? '#1e293b' : '#ffffff');
                const trendColor = isDark ? '#7dd3fc' : '#3b82f6';
                const amountColor = isDark ? 'rgba(196, 181, 253, 0.58)' : 'rgba(167, 139, 250, 0.42)';

                return {
                    legend: {
                        show: true,
                        top: 0,
                        right: 8,
                        textStyle: { color: textColorSecondary }
                    },
                    grid: {
                        top: 36,
                        right: 48,
                        bottom: rows.length > 12 ? 56 : 34,
                        left: 12,
                        containLabel: true
                    },
                    xAxis: {
                        type: 'category',
                        data: rows.map(item => item.label),
                        axisTick: { show: false },
                        axisLine: {
                            lineStyle: { color: borderColor }
                        },
                        axisLabel: {
                            color: textColorMuted,
                            rotate: 45,
                            interval: 0,
                            fontSize: 11,
                            margin: 10
                        }
                    },
                    yAxis: [
                        {
                            type: 'value',
                            minInterval: 1,
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: {
                                show: false
                            },
                            splitLine: {
                                lineStyle: { color: borderColor, type: 'dashed', opacity: isDark ? 0.28 : 0.38 }
                            }
                        },
                        {
                            type: 'value',
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: {
                                show: false
                            },
                            splitLine: { show: false }
                        }
                    ],
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'cross',
                            lineStyle: { type: 'dashed' },
                            label: { show: false }
                        },
                        backgroundColor: cardBg,
                        borderColor,
                        textStyle: { color: textColorPrimary },
                        formatter: params => {
                            const items = Array.isArray(params) ? params : [params];
                            const label = items[0] ? items[0].name : '';
                            const countItem = items.find(item => item.seriesName === '成交件數');
                            const amountItem = items.find(item => item.seriesName === '成交金額');
                            const countValue = countItem ? Number(countItem.value || 0) : 0;
                            const amountValue = amountItem ? Number(amountItem.value || 0) : 0;
                            return `${escapeChartText(label)}<br/>成交件數：<b>${countValue.toLocaleString()}</b> 件<br/>成交金額：<b>${formatMoneyCompact(amountValue)}</b>`;
                        }
                    },
                    series: [
                        {
                            name: '成交件數',
                            type: 'line',
                            yAxisIndex: 0,
                            data: rows.map(item => item.count),
                            smooth: false,
                            symbol: 'circle',
                            showSymbol: true,
                            symbolSize: 6,
                            lineStyle: {
                                width: 3,
                                color: trendColor
                            },
                            areaStyle: {
                                color: isDark ? 'rgba(125, 211, 252, 0.16)' : 'rgba(59, 130, 246, 0.14)'
                            },
                            itemStyle: {
                                color: trendColor
                            },
                            z: 4
                        },
                        {
                            name: '成交金額',
                            type: 'bar',
                            yAxisIndex: 1,
                            data: rows.map(item => item.amount || 0),
                            barMaxWidth: 18,
                            itemStyle: {
                                color: amountColor,
                                borderRadius: [3, 3, 0, 0]
                            },
                            z: 1
                        }
                    ]
                };
            };
            const sumValues = data => (data || []).reduce((sum, item) => sum + Number(item.y || 0), 0);

            const typeDonutOpt = (name, data, metric) => {
                const realTotal = sumValues(data);
                const roseData = (data || []).map(item => {
                    const realValue = Number(item.y || 0);
                    const realPercent = realTotal ? (realValue / realTotal) * 100 : 0;
                    const displayValue = realTotal > 0 && realPercent > 0 && realPercent < 3
                        ? realTotal * 0.03
                        : realValue;

                    return {
                        name: item.name,
                        value: displayValue,
                        realValue,
                        realPercent,
                        percentLabel: `${realPercent.toFixed(1)}%`
                    };
                });

                return {
                    color: ['#4f8ef7', '#36b37e', '#f59e42', '#8b5cf6', '#e86f7d', '#14b8a6'],
                    legend: { show: false },
                    tooltip: {
                        formatter: params => {
                            const safeName = escapeChartText(params.name);
                            const realValue = params.data && params.data.realValue !== undefined ? params.data.realValue : params.value;
                            const realPercent = params.data && params.data.realPercent !== undefined ? params.data.realPercent : params.percent;
                            return `${params.marker || ''}${safeName}<br/><b>${formatMetricValue(realValue, metric)}</b><br/>${realPercent.toFixed(2)}%`;
                        }
                    },
                    series: [{
                        name,
                        type: 'pie',
                        radius: ['26%', '76%'],
                        center: ['50%', '52%'],
                        minShowLabelAngle: 8,
                        padAngle: 1,
                        label: {
                            show: true,
                            formatter: params => `${params.name}\n${params.data && params.data.percentLabel ? params.data.percentLabel : `${params.percent.toFixed(1)}%`}`,
                            overflow: 'break',
                            width: 86
                        },
                        labelLine: {
                            show: true,
                            length: 14,
                            length2: 10,
                            minTurnAngle: 45
                        },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowColor: 'rgba(15, 23, 42, 0.18)'
                            }
                        },
                        data: roseData
                    }]
                };
            };

            const sourceBarOpt = (data, metric) => {
                const sourceItems = (data || []).map(item => ({
                    name: item.name,
                    y: Number(item.y || 0)
                })).sort((a, b) => b.y - a.y);
                const totalSourceAmount = sumValues(sourceItems);
                const rankedItems = sourceItems.length > 7
                    ? sourceItems.slice(0, 6).concat({
                        name: '其他',
                        y: sourceItems.slice(6).reduce((sum, item) => sum + item.y, 0)
                    })
                    : sourceItems;
                const sourceChartData = rankedItems.map(item => {
                    const realValue = Number(item.y || 0);
                    const realPercent = totalSourceAmount > 0 ? (realValue / totalSourceAmount) * 100 : 0;
                    return {
                        name: item.name,
                        value: realPercent,
                        realValue,
                        realPercent
                    };
                });
                const rootStyle = getComputedStyle(document.documentElement);
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const textColorPrimary = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a');
                const textColorSecondary = rootStyle.getPropertyValue('--text-secondary').trim() || (isDark ? '#cbd5e1' : '#475569');
                const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
                const borderColor = rootStyle.getPropertyValue('--border-color').trim() || (isDark ? '#334155' : '#cbd5e1');
                const cardBg = rootStyle.getPropertyValue('--card-bg').trim() || (isDark ? '#1e293b' : '#ffffff');

                return {
                    legend: { show: false },
                    grid: {
                        top: 12,
                        right: 18,
                        bottom: 28,
                        left: 8,
                        containLabel: true
                    },
                    xAxis: {
                        type: 'value',
                        min: 0,
                        max: 100,
                        axisLabel: {
                            formatter: value => `${Number(value).toFixed(0)}%`,
                            color: textColorMuted
                        },
                        axisLine: {
                            lineStyle: { color: borderColor }
                        },
                        axisTick: {
                            lineStyle: { color: borderColor }
                        },
                        splitLine: {
                            lineStyle: { color: borderColor, type: 'dashed', opacity: isDark ? 0.28 : 0.38 }
                        }
                    },
                    yAxis: {
                        type: 'category',
                        inverse: true,
                        data: rankedItems.map(item => item.name),
                        axisTick: { show: false },
                        axisLine: {
                            lineStyle: { color: borderColor }
                        },
                        axisLabel: {
                            width: 86,
                            overflow: 'truncate',
                            color: textColorSecondary
                        }
                    },
                    tooltip: {
                        trigger: 'item',
                        backgroundColor: cardBg,
                        borderColor,
                        textStyle: { color: textColorPrimary },
                        formatter: params => {
                            const realValue = params.data && params.data.realValue !== undefined ? params.data.realValue : 0;
                            const realPercent = params.data && params.data.realPercent !== undefined ? params.data.realPercent : Number(params.value || 0);
                            return `${params.marker || ''}${escapeChartText(params.name)}<br/>${metric === 'count' ? '件數' : '金額'}：<b>${formatMetricValue(realValue, metric)}</b><br/>占比：${realPercent.toFixed(1)}%`;
                        }
                    },
                    series: [{
                        name: '來源',
                        type: 'bar',
                        data: sourceChartData,
                        barMaxWidth: 18,
                        showBackground: true,
                        backgroundStyle: {
                            color: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.14)',
                            borderRadius: [0, 4, 4, 0]
                        },
                        itemStyle: {
                            borderRadius: [0, 4, 4, 0],
                            color: isDark ? '#7dd3fc' : '#3b82f6'
                        },
                        label: {
                            show: true,
                            position: 'right',
                            color: textColorSecondary,
                            formatter: params => {
                                const realPercent = params.data && params.data.realPercent !== undefined ? params.data.realPercent : Number(params.value || 0);
                                return `${realPercent.toFixed(1)}%`;
                            }
                        }
                    }]
                };
            };

            const trendOption = trendBarOpt(trendData);
            const typeOption = typeDonutOpt('類型', typeData, activeMetrics.type);
            const sourceOption = sourceBarOpt(sourceData, activeMetrics.source);
            this._latestEChartsOptions = {
                trend: trendOption,
                type: typeOption,
                source: sourceOption
            };

            createEChartsThemedChart('chart-area-trend', trendOption);
            createEChartsThemedChart('chart-pie-type', typeOption);
            createEChartsThemedChart('chart-pie-source', sourceOption);
        }, 50);
    },

    openChartPreview: function(chartKey, title) {
        const modal = document.getElementById('sales-chart-preview-modal');
        const titleEl = document.getElementById('sales-chart-preview-title');
        const chartEl = document.getElementById('sales-chart-preview-container');
        const option = this._latestEChartsOptions && this._latestEChartsOptions[chartKey];

        if (!modal || !titleEl || !chartEl || !option || !window.echarts) return;

        this.closeChartPreview();
        titleEl.textContent = title || '圖表預覽';
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');

        requestAnimationFrame(() => {
            if (typeof createEChartsThemedChart !== 'function') return;
            this._previewChart = createEChartsThemedChart('sales-chart-preview-container', option);
            if (this._previewChart) {
                this._previewChart.resize();
            }
        });
    },

    closeChartPreview: function() {
        const modal = document.getElementById('sales-chart-preview-modal');
        const chartEl = document.getElementById('sales-chart-preview-container');

        if (chartEl) {
            if (chartEl._echartsResizeHandler) {
                window.removeEventListener('resize', chartEl._echartsResizeHandler);
                chartEl._echartsResizeHandler = null;
            }
            const existingChart = window.echarts && window.echarts.getInstanceByDom(chartEl);
            if (existingChart) existingChart.dispose();
            chartEl.innerHTML = '';
        }

        this._previewChart = null;
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
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
            <th style="text-align:right;" class="${getCls('numericValue')}" onclick="handleSortTable('numericValue')">機會價值 ${getIcon('numericValue')}</th><th>機會來源</th></tr></thead><tbody>`;

        deals.forEach((d, i) => {
            const idx = ((page - 1) * perPage) + i + 1;
            const modelHtml = d.salesModel ? `<span class="sales-chip" style="background:${modelColors[d.salesModel] || '#6b7280'}">${d.salesModel}</span>` : '-';
            const typeHtml = d.opportunityType ? `<span class="type-chip" style="background:${typeColors[d.opportunityType] || '#6b7280'}">${d.opportunityType}</span>` : '-';
            const channelDisplay = SalesAnalysisHelper.isDirectSalesModel(d.salesModel) ? '-' : (d.channelDetails || d.salesChannel || '-');
            const chanHtml = channelDisplay === '-' ? '-' : `<span class="channel-chip">${channelDisplay}</span>`;
            
            html += `<tr><td>${idx}</td><td>${new Date(d.wonDate).toLocaleDateString()}</td><td>${typeHtml}</td>
                <td><a href="#" class="text-link" onclick="event.preventDefault();CRM_APP.navigateTo('opportunity-details',{opportunityId:'${d.opportunityId}'})"><strong>${d.opportunityName}</strong></a></td>
                <td>${d.customerCompany || '-'}</td><td>${modelHtml}</td><td>${chanHtml}</td>
                <td><span class="status-badge status-won">${d.currentStage}</span></td>
                <td style="text-align:right;font-weight:600;">$${(d.numericValue||0).toLocaleString()}</td><td>${d.opportunitySource || '-'}</td></tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    },

    renderOpportunityTypeTabs: function(tabs, activeValue) {
        const container = document.getElementById('opportunity-type-tabs');
        if (!container) return;

        const escapeHtml = value => String(value || '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[ch]);

        container.innerHTML = (tabs || []).map(tab => {
            const isActive = tab.value === activeValue;
            const encodedValue = encodeURIComponent(tab.value);
            return `<button type="button" class="action-btn ${isActive ? 'primary' : 'secondary'}" style="padding: 4px 10px; font-size: 0.8rem;" onclick="handleListOpportunityTypeTabChange(decodeURIComponent('${encodedValue}'))">${escapeHtml(tab.label)} (${tab.count})</button>`;
        }).join('');
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
