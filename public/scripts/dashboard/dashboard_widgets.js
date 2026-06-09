/**
 * public/scripts/dashboard/dashboard_widgets.js
 * @version 1.4.7
 * @date 2026-05-07
 * @changelog
 * - Phase A operational SaaS migration: routed KPI trend chart through shared chart theme and removed light-only tooltip styling.
 * - Dashboard Phase T3-Revenue Visual Final Polish
 * - Restore legend to top-center position
 * - Move "成交金額" legend item to the end (legendIndex: 99)
 * - Hide revenue column by default (visible: false)
 * - Demote revenue column to background (opacity, padding, zIndex)
 * - Elevate line series priority and adjust styling (lineWidth, fillOpacity)
 * - Add formatted revenue tooltip (thousands separator)
 * - Reorder series for correct visual layering
 */

const DashboardWidgets = {
    _latestTrendChartOption: null,
    _trendPreviewChart: null,

    /**
     * 渲染儀表板上方的統計數字卡片
     * @param {Object} stats - 統計資料物件
     */
    renderStats(stats = {}) {
        const updateText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // 1. 基礎數據更新
        updateText('contacts-count', stats.contactsCount || 0);
        this._updateTrend('contacts-trend', stats.contactsCountMonth);

        updateText('opportunities-count', stats.opportunitiesCount || 0);
        this._updateTrend('opportunities-trend', stats.opportunitiesCountMonth);
        
        updateText('event-logs-count', stats.eventLogsCount || 0);
        this._updateTrend('event-logs-trend', stats.eventLogsCountMonth);

        updateText('won-count', stats.wonCount || 0);
        this._updateTrend('won-trend', stats.wonCountMonth);

        // 2. MTU 統計與浮動資訊卡片 (Tooltip)
        updateText('mtu-count', stats.mtuCount || 0);
        this._updateTrend('mtu-trend', stats.mtuCountMonth);
        
        // 若有 MTU 詳細資料，則渲染浮動視窗
        if (stats.mtuDetails) {
            this._setupLazyTooltip('mtu', 'mtu-count', stats.mtuDetails);
        }

        updateText('si-count', stats.siCount || 0);
        this._updateTrend('si-trend', stats.siCountMonth);
        
        if (stats.siDetails) {
            this._setupLazyTooltip('si', 'si-count', stats.siDetails);
        }
        
        // 確保樣式存在
        this._ensureStyles();
    },

    _updateTrend(id, value) {
        const el = document.getElementById(id);
        if (!el) return;

        const num = Number(value);
        if (Number.isNaN(num) || value === null || value === undefined) {
            el.textContent = '';
            el.className = 'stat-trend';
            return;
        }

        if (num > 0) {
            el.textContent = `▲ 本月 +${num}`;
            el.className = 'stat-trend trend-positive';
        } else if (num < 0) {
            el.textContent = `▼ 本月 ${num}`;
            el.className = 'stat-trend trend-negative';
        } else {
            el.textContent = `本月 0`;
            el.className = 'stat-trend trend-neutral';
        }
    },

    _companyActivityDetailsCache: { mtu: null, si: null },

    _setupLazyTooltip(type, elementId, details) {
        const countEl = document.getElementById(elementId);
        if (!countEl) return;

        // 找到卡片容器 (.stat-card)
        const card = countEl.closest('.stat-card');
        if (!card) return;

        // 清除舊的 Tooltip
        const oldTooltip = card.querySelector('.custom-tooltip');
        if (oldTooltip) oldTooltip.remove();

        const title = type === 'mtu' ? 'MTU 拜訪概況' : 'SI 拜訪概況';
        const totalTarget = details.totalMtu !== undefined ? details.totalMtu : details.totalSi;

        // 建立 Tooltip HTML
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-header">${title}</div>
            <div class="tooltip-row">
                <span>總目標家數:</span> <strong>${totalTarget}</strong>
            </div>
            <div class="tooltip-row">
                <span>已互動:</span> <span class="text-success">${details.activeCount}</span>
            </div>
            <div class="tooltip-row">
                <span>未互動:</span> <span class="text-danger">${details.inactiveCount}</span>
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-subtitle">${details.inactiveCount > 0 ? '未互動名單 (載入中...)' : '<span class="text-success">🎉 全部皆已互動！</span>'}</div>
            <ul class="tooltip-list" id="lazy-list-${type}"></ul>
        `;

        // 將卡片設為 relative 以便定位
        card.style.position = 'relative';
        card.style.cursor = 'pointer'; 
        card.appendChild(tooltip);

        if (details.inactiveCount > 0) {
            let hasHovered = false;
            card.addEventListener('mouseenter', async () => {
                if (hasHovered) return;
                hasHovered = true;
                
                const listEl = tooltip.querySelector(`#lazy-list-${type}`);
                const subtitleEl = tooltip.querySelector('.tooltip-subtitle');
                
                if (this._companyActivityDetailsCache[type]) {
                    this._renderTooltipList(listEl, subtitleEl, this._companyActivityDetailsCache[type]);
                    return;
                }
                
                try {
                    const res = await authedFetch(`/api/dashboard/company-activity-details?type=${type}`);
                    if (res.success && res.data) {
                        this._companyActivityDetailsCache[type] = res.data;
                        this._renderTooltipList(listEl, subtitleEl, res.data);
                    } else {
                        throw new Error('Fetch failed');
                    }
                } catch (e) {
                    subtitleEl.textContent = '未互動名單 (載入失敗)';
                    listEl.innerHTML = '<li class="text-danger">名單載入失敗</li>';
                    hasHovered = false; // Allow retry on next hover
                }
            });
        }
    },

    _renderTooltipList(listEl, subtitleEl, data) {
        const maxDisplay = 5;
        const inactiveListHtml = data.inactiveNames.slice(0, maxDisplay)
            .map(name => `<li>❌ ${name}</li>`).join('');
        const remainingCount = data.inactiveNames.length - maxDisplay;
        const moreHtml = remainingCount > 0 ? `<li class="more">...還有 ${remainingCount} 家</li>` : '';
        
        subtitleEl.textContent = `未互動名單 (前 ${maxDisplay} 筆):`;
        listEl.innerHTML = inactiveListHtml + moreHtml;
    },

    _currentTrendData: null,

    /**
     * 渲染 KPI 趨勢分析 Widget
     */
    renderTrendWidget(data, mode, viewType) {
        // 確保在傳入 null 觸發更新時能安全重用舊有資料
        if (data !== null && data !== undefined) {
            this._currentTrendData = data;
        }
        if (!this._currentTrendData) return;

        const trendData = this._currentTrendData;
        
        // 模式解析：傳入 mode -> select value -> 預設 'ytd' / 'monthly'
        const currentMode = mode || document.getElementById('trend-mode-select')?.value || 'ytd';
        const currentView = viewType || document.getElementById('trend-view-select')?.value || 'monthly';
        
        let categories = [];
        let oppData = [];
        let eventData = [];
        let wonData = [];
        let revenueData = [];

        let oppAcc = 0;
        let eventAcc = 0;
        let wonAcc = 0;
        let revenueAcc = 0;

        if (currentMode === 'ytd') {
            // YTD 模式：固定 1 到 12 月
            const year = trendData.currentYear;
            const currentMonth = trendData.currentMonth;

            for (let i = 1; i <= 12; i++) {
                const monthStr = String(i).padStart(2, '0');
                const key = `${year}-${monthStr}`;
                categories.push(`${i}月`);
                
                const oppVal = trendData.opportunities[key] || 0;
                const eventVal = trendData.events[key] || 0;
                const wonVal = (trendData.won && trendData.won[key]) || 0;
                const revenueVal = (trendData.revenue && trendData.revenue[key]) || 0;

                // 未來的月份維持 null (無論是每月新增或累積總量)，確保線條不會掉到 0 或延伸至未來
                if (i > currentMonth) {
                    oppData.push(null);
                    eventData.push(null);
                    wonData.push(null);
                    revenueData.push(null);
                } else if (currentView === 'cumulative') {
                    oppAcc += oppVal;
                    eventAcc += eventVal;
                    wonAcc += wonVal;
                    revenueAcc += revenueVal;
                    oppData.push(oppAcc);
                    eventData.push(eventAcc);
                    wonData.push(wonAcc);
                    revenueData.push(revenueAcc);
                } else {
                    oppData.push(oppVal);
                    eventData.push(eventVal);
                    wonData.push(wonVal);
                    revenueData.push(revenueVal);
                }
            }
        } else {
            // 全資料模式：從最早資料的月份延伸至當前月份
            let allKeys = new Set([
                ...Object.keys(trendData.opportunities), 
                ...Object.keys(trendData.events),
                ...Object.keys(trendData.won || {}),
                ...Object.keys(trendData.revenue || {})
            ]);
            
            // 修復排序：依據數值比較年份與月份，確保時間軸先後正確
            let sortedKeys = Array.from(allKeys).sort((a, b) => {
                const [yearA, monthA] = a.split('-').map(Number);
                const [yearB, monthB] = b.split('-').map(Number);
                return yearA !== yearB ? yearA - yearB : monthA - monthB;
            });
            
            if (sortedKeys.length === 0) {
                const currentMonthStr = String(trendData.currentMonth).padStart(2, '0');
                sortedKeys.push(`${trendData.currentYear}-${currentMonthStr}`);
            }
            
            const [startYear, startMonth] = sortedKeys[0].split('-').map(Number);
            const endYear = trendData.currentYear;
            const endMonth = trendData.currentMonth;
            
            let currY = startYear;
            let currM = startMonth;
            
            while (currY < endYear || (currY === endYear && currM <= endMonth)) {
                const key = `${currY}-${String(currM).padStart(2, '0')}`;
                categories.push(key);
                
                const oppVal = trendData.opportunities[key] || 0;
                const eventVal = trendData.events[key] || 0;
                const wonVal = (trendData.won && trendData.won[key]) || 0;
                const revenueVal = (trendData.revenue && trendData.revenue[key]) || 0;

                if (currentView === 'cumulative') {
                    oppAcc += oppVal;
                    eventAcc += eventVal;
                    wonAcc += wonVal;
                    revenueAcc += revenueVal;
                    oppData.push(oppAcc);
                    eventData.push(eventAcc);
                    wonData.push(wonAcc);
                    revenueData.push(revenueAcc);
                } else {
                    oppData.push(oppVal);
                    eventData.push(eventVal);
                    wonData.push(wonVal);
                    revenueData.push(revenueVal);
                }

                currM++;
                if (currM > 12) { currM = 1; currY++; }
            }
        }

        if (typeof createEChartsThemedChart !== 'function') {
            console.warn('[DashboardWidgets] createEChartsThemedChart unavailable; skipped trend chart render.');
            return;
        }

        {
        const viewLabel = currentView === 'cumulative' ? '（累積）' : '（月增）';
        const rootStyle = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColorPrimary = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a');
        const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
        const borderColor = rootStyle.getPropertyValue('--border-color').trim() || (isDark ? '#334155' : '#cbd5e1');
        const cardBg = rootStyle.getPropertyValue('--card-bg').trim() || (isDark ? '#1e293b' : '#ffffff');
        const formatNumber = value => value === null || value === undefined ? '-' : Number(value || 0).toLocaleString();

        const formatCompactMoney = value => {
            const amount = Number(value || 0);
            if (Math.abs(amount) >= 100000000) return `${(amount / 100000000).toFixed(1).replace(/\.0$/, '')}億`;
            if (Math.abs(amount) >= 10000) return `${(amount / 10000).toFixed(1).replace(/\.0$/, '')}萬`;
            return amount.toLocaleString();
        };

        const trendOption = {
            color: ['#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross', lineStyle: { color: borderColor, opacity: 0.55 } },
                backgroundColor: cardBg,
                borderColor,
                textStyle: { color: textColorPrimary },
                formatter: params => {
                    const rows = Array.isArray(params) ? params : [params];
                    const title = rows[0] ? rows[0].axisValueLabel : '';
                    const lines = rows.map(item => {
                        const isRevenue = item.seriesName && item.seriesName.indexOf('成交金額') === 0;
                        const value = item.value === null || item.value === undefined ? '-' : formatNumber(item.value);
                        const suffix = isRevenue || value === '-' ? '' : ' 件';
                        return `${item.marker || ''}${item.seriesName}: <b>${value}${suffix}</b>`;
                    });
                    return [title].concat(lines).join('<br/>');
                }
            },
            legend: {
                top: 16,
                type: 'plain',
                textStyle: { color: textColorPrimary, fontSize: 13, fontWeight: 400 },
                data: [
                    `機會案件${viewLabel}`,
                    `事件紀錄${viewLabel}`,
                    `成交案件${viewLabel}`,
                    `成交金額${viewLabel}`
                ]
            },
            grid: { top: 64, right: 16, bottom: 12, left: 16, containLabel: true },
            xAxis: {
                type: 'category',
                data: categories,
                boundaryGap: true,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: borderColor } },
                axisLabel: {
                    color: textColorMuted,
                    interval: currentMode === 'all' ? 0 : (categories.length > 18 ? Math.ceil(categories.length / 12) - 1 : 0),
                    rotate: currentMode === 'all' && categories.length > 18 ? 45 : 0
                }
            },
            yAxis: [
                {
                    show: true,
                    type: 'value',
                    name: '',
                    min: 0,
                    position: 'left',
                    nameTextStyle: { color: textColorMuted },
                    axisLine: { show: false, lineStyle: { color: borderColor } },
                    axisTick: { show: false },
                    axisLabel: { show: false, color: textColorMuted, formatter: value => formatNumber(value) },
                    splitLine: { lineStyle: { color: borderColor, type: 'dashed', opacity: isDark ? 0.25 : 0.35 } }
                },
                {
                    show: true,
                    type: 'value',
                    name: '',
                    min: 0,
                    position: 'right',
                    nameTextStyle: { color: textColorMuted },
                    axisLine: { show: false, lineStyle: { color: borderColor } },
                    axisTick: { show: false },
                    axisLabel: { show: false, color: textColorMuted, formatter: value => formatCompactMoney(value) },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: `成交金額${viewLabel}`,
                    type: 'bar',
                    data: revenueData,
                    yAxisIndex: 1,
                    itemStyle: { color: 'rgba(59, 130, 246, 0.35)', borderRadius: [3, 3, 0, 0] },
                    barMaxWidth: 22,
                    z: 1
                },
                {
                    name: `機會案件${viewLabel}`,
                    type: 'line',
                    data: oppData,
                    yAxisIndex: 0,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: '#10b981' },
                    areaStyle: { color: 'rgba(16, 185, 129, 0.10)' },
                    z: 3
                },
                {
                    name: `事件紀錄${viewLabel}`,
                    type: 'line',
                    data: eventData,
                    yAxisIndex: 0,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: '#f59e0b' },
                    areaStyle: { color: 'rgba(245, 158, 11, 0.08)' },
                    z: 3
                },
                {
                    name: `成交案件${viewLabel}`,
                    type: 'line',
                    data: wonData,
                    yAxisIndex: 0,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 3, color: '#8b5cf6' },
                    areaStyle: { color: 'rgba(139, 92, 246, 0.10)' },
                    z: 4
                }
            ]
        };

        this._latestTrendChartOption = trendOption;
        this._ensureTrendPreviewControls();
        createEChartsThemedChart('trend-chart-container', trendOption);

        // 注入樣式
        this._ensureStyles();
        return;
        }

        if (typeof Highcharts === 'undefined') return;

        const viewLabel = currentView === 'cumulative' ? '（累積）' : '（月增）';

        const renderChart = typeof createThemedChart === 'function'
            ? createThemedChart
            : (elementId, options) => Highcharts.chart(elementId, options);

        renderChart('trend-chart-container', {
            chart: { type: 'areaspline', backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
            title: { text: null },
            xAxis: { categories: categories, crosshair: true },
            yAxis: [
                { title: { text: null }, min: 0, labels: { enabled: false } },
                { title: { text: null }, min: 0, labels: { enabled: false }, opposite: true }
            ],
            tooltip: { shared: true },
            plotOptions: {
                areaspline: { 
                    fillOpacity: 0.2, 
                    marker: { enabled: false, symbol: 'circle', radius: 3, states: { hover: { enabled: true } } } 
                }
            },
            series: [
                { 
                    name: `成交金額${viewLabel}`, 
                    type: 'column', 
                    data: revenueData, 
                    color: '#3b82f6', 
                    yAxis: 1,
                    zIndex: 0,
                    opacity: 0.35,
                    pointPadding: 0.2,
                    groupPadding: 0.3,
                    borderWidth: 0,
                    legendIndex: 99,
                    tooltip: {
                        pointFormatter: function () {
                            return '<span style="color:' + this.series.color + '">●</span> ' +
                                   this.series.name + ': <b>' +
                                   (this.y ? this.y.toLocaleString() : '0') +
                                   '</b><br/>';
                        }
                    }
                },
                { name: `機會案件${viewLabel}`, data: oppData, color: '#10b981', yAxis: 0, zIndex: 3 },
                { name: `事件紀錄${viewLabel}`, data: eventData, color: '#f59e0b', yAxis: 0, zIndex: 3, fillOpacity: 0.1 },
                { name: `成交案件${viewLabel}`, data: wonData, color: '#8b5cf6', yAxis: 0, zIndex: 3, lineWidth: 3 }
            ],
            credits: { enabled: false },
            legend: { align: 'center', verticalAlign: 'top', borderWidth: 0 }
        });
        
        // 注入樣式
        this._ensureStyles();
    },

    _ensureTrendPreviewControls() {
        const chartEl = document.getElementById('trend-chart-container');
        if (!chartEl) return;

        const widget = chartEl.closest('.dashboard-widget');
        const header = widget ? widget.querySelector('.widget-header') : null;
        const modeSelect = document.getElementById('trend-mode-select');
        const viewSelect = document.getElementById('trend-view-select');
        const controlsHost = modeSelect && modeSelect.parentElement ? modeSelect.parentElement : header;

        if (controlsHost && modeSelect && viewSelect) {
            controlsHost.classList.add('dashboard-trend-controls');
            modeSelect.style.display = 'none';
            viewSelect.style.display = 'none';

            let quickControls = document.getElementById('dashboard-trend-quick-controls');
            if (!quickControls) {
                quickControls = document.createElement('div');
                quickControls.id = 'dashboard-trend-quick-controls';
                quickControls.className = 'trend-tab-filter';

                const createTabButton = item => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'trend-filter-tab';
                    button.dataset.group = item.group;
                    button.dataset.value = item.value;
                    button.textContent = item.label;
                    button.setAttribute('aria-pressed', 'false');
                    button.addEventListener('click', () => {
                        if (item.group === 'mode') {
                            modeSelect.value = item.value;
                            this.renderTrendWidget(null, item.value, null);
                        } else {
                            viewSelect.value = item.value;
                            this.renderTrendWidget(null, null, item.value);
                        }
                    });
                    return button;
                };

                [
                    {
                        label: '時間範圍',
                        items: [
                            { group: 'mode', value: 'ytd', label: '今年業績' },
                            { group: 'mode', value: 'all', label: '歷史全資料' }
                        ]
                    },
                    {
                        label: '顯示方式',
                        items: [
                            { group: 'view', value: 'monthly', label: '每月新增' },
                            { group: 'view', value: 'cumulative', label: '累積總量' }
                        ]
                    }
                ].forEach(group => {
                    const label = document.createElement('span');
                    label.className = 'trend-tab-label';
                    label.textContent = group.label;
                    const list = document.createElement('div');
                    list.className = 'trend-tab-list';
                    group.items.forEach(item => list.appendChild(createTabButton(item)));
                    quickControls.appendChild(label);
                    quickControls.appendChild(list);
                });

                controlsHost.appendChild(quickControls);
            }

            quickControls.querySelectorAll('.trend-filter-tab').forEach(button => {
                const active = button.dataset.group === 'mode'
                    ? button.dataset.value === modeSelect.value
                    : button.dataset.value === viewSelect.value;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        const expandButtonHost = document.getElementById('dashboard-trend-quick-controls') || controlsHost || header;
        if (expandButtonHost && !document.getElementById('dashboard-trend-expand-btn')) {
            if (header) header.classList.add('dashboard-trend-header');
            const button = document.createElement('button');
            button.id = 'dashboard-trend-expand-btn';
            button.type = 'button';
            button.className = 'dashboard-trend-expand-btn';
            button.title = '放大業務趨勢分析';
            button.setAttribute('aria-label', '放大業務趨勢分析');
            button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"></path><path d="M21 3l-7 7"></path><path d="M9 21H3v-6"></path><path d="M3 21l7-7"></path></svg>';
            button.addEventListener('click', () => this.openTrendPreview());
            expandButtonHost.appendChild(button);
        } else if (expandButtonHost) {
            const button = document.getElementById('dashboard-trend-expand-btn');
            if (button && button.parentElement !== expandButtonHost) {
                expandButtonHost.appendChild(button);
            }
        }

        if (!document.getElementById('dashboard-trend-preview-modal')) {
            const modal = document.createElement('div');
            modal.id = 'dashboard-trend-preview-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-hidden', 'true');
            modal.setAttribute('aria-labelledby', 'dashboard-trend-preview-title');
            modal.innerHTML = `
                <div class="dashboard-trend-preview-dialog">
                    <div class="dashboard-trend-preview-header">
                        <h2 id="dashboard-trend-preview-title">業務趨勢分析</h2>
                        <button type="button" class="dashboard-trend-preview-close" title="關閉預覽" aria-label="關閉預覽">×</button>
                    </div>
                    <div id="dashboard-trend-preview-container"></div>
                </div>
            `;
            modal.addEventListener('click', event => {
                if (event.target === modal) this.closeTrendPreview();
            });
            modal.querySelector('.dashboard-trend-preview-close').addEventListener('click', () => this.closeTrendPreview());
            document.body.appendChild(modal);
        }
    },

    openTrendPreview() {
        const modal = document.getElementById('dashboard-trend-preview-modal');
        const chartEl = document.getElementById('dashboard-trend-preview-container');
        const option = this._latestTrendChartOption;
        if (!modal || !chartEl || !option || typeof createEChartsThemedChart !== 'function') return;

        this.closeTrendPreview();
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');

        requestAnimationFrame(() => {
            this._trendPreviewChart = createEChartsThemedChart('dashboard-trend-preview-container', option);
            if (this._trendPreviewChart) this._trendPreviewChart.resize();
        });
    },

    closeTrendPreview() {
        const modal = document.getElementById('dashboard-trend-preview-modal');
        const chartEl = document.getElementById('dashboard-trend-preview-container');

        if (chartEl) {
            if (chartEl._echartsResizeHandler) {
                window.removeEventListener('resize', chartEl._echartsResizeHandler);
                chartEl._echartsResizeHandler = null;
            }
            const existingChart = window.echarts && window.echarts.getInstanceByDom(chartEl);
            if (existingChart) existingChart.dispose();
            chartEl.innerHTML = '';
        }

        this._trendPreviewChart = null;
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
    },

    renderSubscriptionAlerts(alerts = [], state = {}) {
        const marquee = document.getElementById('subscription-alerts-marquee');
        const track = marquee ? marquee.querySelector('.subscription-alerts-marquee-track') : null;
        if (!marquee || !track) return;

        this._ensureStyles();

        if (state.loading) {
            marquee.classList.add('is-empty');
            track.textContent = '載入提醒中...';
            return;
        }

        if (state.error) {
            marquee.classList.add('is-empty');
            track.textContent = '續約提醒暫時無法載入';
            return;
        }

        if (!Array.isArray(alerts) || alerts.length === 0) {
            marquee.classList.add('is-empty');
            track.textContent = '\u76ee\u524d\u7121\u8a02\u95b1\u5230\u671f\u63d0\u9192';
            return;
        }

        marquee.classList.remove('is-empty');

        const TEXT_UNSPECIFIED_PRODUCT = '\u672a\u6307\u5b9a\u5546\u54c1';
        const TEXT_UNRESOLVED_PRODUCT = '\u672a\u89e3\u6790\u5546\u54c1';
        const TEXT_OVERDUE = '\u5df2\u903e\u671f';
        const TEXT_DUE_TODAY = '\u4eca\u5929\u5230\u671f';
        const TEXT_WITHIN_30 = '30\u5929\u5167';
        const TEXT_WITHIN_60 = '60\u5929\u5167';
        const TEXT_WITHIN_90 = '90\u5929\u5167';
        const TEXT_WITHIN_180 = '180\u5929\u5167';
        const TEXT_OVER_180 = '180\u5929\u4ee5\u4e0a';
        const TEXT_REMAINING_PREFIX = '\u5269';
        const TEXT_OVERDUE_PREFIX = '\u903e\u671f';
        const TEXT_DAY_UNIT = '\u5929';
        const TEXT_SEPARATOR = '\u3000\u3000\uff5c\u3000\u3000';

        const escapeHtml = value => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const getDaysText = daysRemaining => {
            const days = Number(daysRemaining);
            if (Number.isNaN(days)) return '-';
            if (days < 0) return `${TEXT_OVERDUE_PREFIX} ${Math.abs(days)} ${TEXT_DAY_UNIT}`;
            if (days === 0) return TEXT_DUE_TODAY;
            return `${TEXT_REMAINING_PREFIX} ${days} ${TEXT_DAY_UNIT}`;
        };

        const getBadge = daysRemaining => {
            const days = Number(daysRemaining);
            if (Number.isNaN(days)) return { label: TEXT_WITHIN_90, tier: 'mild' };
            if (days < 0) return { label: TEXT_OVERDUE, tier: 'critical' };
            if (days === 0) return { label: TEXT_DUE_TODAY, tier: 'critical' };
            if (days <= 30) return { label: TEXT_WITHIN_30, tier: 'strong' };
            if (days <= 60) return { label: TEXT_WITHIN_60, tier: 'medium' };
            if (days <= 90) return { label: TEXT_WITHIN_90, tier: 'mild' };
            if (days <= 180) return { label: TEXT_WITHIN_180, tier: 'low' };
            return { label: TEXT_OVER_180, tier: 'low' };
        };

        const html = alerts.map(item => {
            const badge = getBadge(item.daysRemaining);
            const opportunityName = item.displayOpportunityName || item.customerName || '-';
            const productName = item.displayProductName || item.subscriptionItemName || TEXT_UNSPECIFIED_PRODUCT;
            const daysText = getDaysText(item.daysRemaining);
            return `<span class="subscription-alert-marquee-item"><span class="subscription-alert-badge is-${badge.tier}">${escapeHtml(badge.label)}</span><span>${escapeHtml(opportunityName)}</span><span>${escapeHtml(productName)}</span><span>${escapeHtml(daysText)}</span></span>`;
        }).join(`<span class="subscription-alert-separator">${TEXT_SEPARATOR}</span>`);

        track.innerHTML = html;
    },

    /**
     * 渲染最新動態列表
     * @param {Array} feedData - 動態資料列表
     * @returns {string} HTML 字串 (僅回傳字串，由 Controller 注入 DOM)
     */
    renderActivityFeed(feedData) {
        if (!feedData || feedData.length === 0) return '<div class="alert alert-info">尚無最新動態</div>';
        
        const iconMap = { '系統事件': '⚙️', '會議討論': '📅', '事件報告': '📝', '電話聯繫': '📞', '郵件溝通': '📧', 'new_contact': '👤' };
        let html = '<ul class="activity-feed-list">';
        
        feedData.forEach(item => {
            html += `<li class="activity-feed-item">`;
            if (item.type === 'interaction') {
                const i = item.data;
                let contextLink = i.contextName || '系統活動';
                // 產生連結
                if (i.opportunityId) {
                    contextLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${i.opportunityId}' })">${i.contextName}</a>`;
                } else if (i.companyId && i.contextName !== '系統活動' && i.contextName !== '未知公司' && i.contextName !== '未指定') {
                    const encodedCompanyName = encodeURIComponent(i.contextName);
                    contextLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('company-details', { companyName: '${encodedCompanyName}' })">${i.contextName}</a>`;
                }
                
                // 處理連結內容的 markdown 格式
                let summaryHTML = i.contentSummary || '';
                const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9]+)\)/g;
                summaryHTML = summaryHTML.replace(linkRegex, (fullMatch, text, eventId) => {
                    const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
                });

                html += `<div class="feed-icon">${iconMap[i.eventType] || '🔔'}</div>
                         <div class="feed-content">
                            <div class="feed-text"><strong>${i.recorder}</strong> 在 <strong>${contextLink}</strong> ${i.eventTitle ? `建立了${i.eventTitle}` : `新增了一筆${i.eventType}`}</div>
                            <div class="feed-summary">${summaryHTML}</div>
                            <div class="feed-time">${formatDateTime(i.interactionTime)}</div>
                         </div>`;
            } else if (item.type === 'new_contact') {
                const c = item.data;
                const creator = c.userNickname ? `<strong>${c.userNickname}</strong> 新增了潛在客戶:` : `<strong>新增潛在客戶:</strong>`;
                html += `<div class="feed-icon">${iconMap['new_contact']}</div>
                         <div class="feed-content">
                            <div class="feed-text">${creator} ${c.name || '(無姓名)'}</div>
                            <div class="feed-summary">🏢 ${c.company || '(無公司資訊)'}</div>
                            <div class="feed-time">${formatDateTime(c.createdTime)}</div>
                         </div>`;
            }
            html += `</li>`;
        });
        html += '</ul>';
        return html;
    },

    _ensureStyles() {
        if (!document.getElementById('dashboard-widget-styles')) {
            const style = document.createElement('style');
            style.id = 'dashboard-widget-styles';
            style.innerHTML = `
                .subscription-alerts-marquee {
                    display: flex; align-items: center; gap: 8px; flex: 1 1 0; min-width: 0; max-width: 100%;
                    height: 30px; padding: 4px 10px; border: 1px solid rgba(124, 112, 163, 0.24); border-radius: 4px;
                    background: rgba(245, 244, 250, 0.92); color: #3f3a56; cursor: pointer; overflow: hidden;
                }
                .page-header { min-width: 0; max-width: 100%; }
                .page-header .header-content { flex: 1 1 auto; min-width: 0; max-width: 100%; overflow: hidden; }
                .page-header .dashboard-title-block { flex: 0 0 auto; min-width: fit-content; }
                .page-header .header-actions { flex: 0 0 auto; }
                .subscription-alerts-marquee:hover { background: rgba(239, 237, 247, 0.96); border-color: rgba(124, 112, 163, 0.36); color: #312d46; }
                .subscription-alerts-marquee-label {
                    flex: 0 0 auto; color: #554c73; font-size: 0.78rem; font-weight: 700; white-space: nowrap;
                }
                .subscription-alerts-marquee-viewport { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; }
                .subscription-alerts-marquee-track {
                    display: inline-block; min-width: 100%; padding-left: 100%; color: #3f3a56;
                    font-size: 0.82rem; line-height: 1.2; white-space: nowrap; animation: subscriptionMarquee 18s linear infinite;
                }
                .subscription-alert-marquee-item { display: inline-flex; align-items: center; gap: 8px; }
                .subscription-alert-separator { color: rgba(85, 76, 115, 0.48); }
                .subscription-alert-badge {
                    display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 3px;
                    font-size: 0.72rem; line-height: 18px; font-weight: 700; border: 1px solid transparent;
                }
                .subscription-alert-badge.is-critical { color: #8f2434; background: rgba(244, 63, 94, 0.13); border-color: rgba(244, 63, 94, 0.22); }
                .subscription-alert-badge.is-strong { color: #935b11; background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.24); }
                .subscription-alert-badge.is-medium { color: #5c4b91; background: rgba(139, 92, 246, 0.12); border-color: rgba(139, 92, 246, 0.20); }
                .subscription-alert-badge.is-mild { color: #256372; background: rgba(14, 165, 233, 0.11); border-color: rgba(14, 165, 233, 0.18); }
                .subscription-alert-badge.is-low { color: #586070; background: rgba(100, 116, 139, 0.10); border-color: rgba(100, 116, 139, 0.16); }
                .subscription-alerts-marquee:hover .subscription-alerts-marquee-track { animation-play-state: paused; }
                .subscription-alerts-marquee.is-empty .subscription-alerts-marquee-track {
                    padding-left: 0; animation: none; color: rgba(85, 76, 115, 0.72);
                }
                @keyframes subscriptionMarquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-100%); }
                }
                @media (max-width: 900px) {
                    .page-header .header-content { flex-wrap: wrap; overflow: visible; }
                    .subscription-alerts-marquee { flex-basis: 100%; max-width: 100%; width: 100%; }
                }
                @media (max-width: 768px) {
                    .page-header .dashboard-title-block { min-width: 0; }
                }
                .dashboard-trend-header { display: flex; align-items: center; gap: 8px; }
                .dashboard-trend-controls { display: flex !important; align-items: center; justify-content: flex-end; gap: 6px !important; flex-wrap: nowrap; min-width: 0; }
                .trend-tab-filter { display: inline-flex; align-items: center; gap: var(--spacing-2, 6px); flex-wrap: nowrap; white-space: nowrap; }
                .trend-tab-label { font-size: 0.8rem; color: var(--text-muted); line-height: 1.2; flex: 0 0 auto; }
                .trend-tab-list { display: inline-flex; align-items: center; gap: var(--spacing-1, 4px); flex-wrap: nowrap; }
                .trend-filter-tab {
                    min-height: 24px; padding: 3px 8px; border-radius: 2px;
                    border: 1px solid var(--border-color); background: var(--primary-bg, transparent);
                    color: var(--text-secondary, var(--text-muted)); font-size: 12px; line-height: 1.2; cursor: pointer;
                }
                .trend-filter-tab:hover { background: var(--secondary-bg, rgba(148, 163, 184, 0.08)); color: var(--text-primary); }
                .trend-filter-tab.is-active {
                    background: color-mix(in srgb, var(--accent-blue) 10%, transparent);
                    border-color: color-mix(in srgb, var(--accent-blue) 40%, var(--border-color));
                    color: var(--accent-blue); font-weight: 600;
                }
                .dashboard-trend-expand-btn { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); border-radius: 2px; background: var(--primary-bg, transparent); color: var(--text-muted); cursor: pointer; flex: 0 0 auto; margin-left: 0; }
                .dashboard-trend-expand-btn:hover { color: var(--text-primary); background: var(--hover-bg, rgba(148, 163, 184, 0.08)); }
                .dashboard-trend-expand-btn svg { width: 14px; height: 14px; }
                #dashboard-trend-preview-modal { position: fixed; inset: 0; z-index: 2000; display: none; align-items: center; justify-content: center; padding: 24px; background: rgba(15, 23, 42, 0.42); }
                #dashboard-trend-preview-modal.show { display: flex; }
                .dashboard-trend-preview-dialog { width: min(1080px, 96vw); background: var(--card-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18); overflow: hidden; }
                .dashboard-trend-preview-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
                #dashboard-trend-preview-title { margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-primary); }
                .dashboard-trend-preview-close { width: 30px; height: 30px; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1; }
                .dashboard-trend-preview-close:hover { color: var(--text-primary); background: var(--hover-bg, rgba(148, 163, 184, 0.08)); }
                #dashboard-trend-preview-container { height: min(560px, 70vh); padding: 8px 16px 18px; }

                /* 浮動資訊卡片 Tooltip 樣式 */
                .custom-tooltip {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-lg);
                    padding: 12px;
                    border-radius: var(--rounded-sm);
                    width: 220px;
                    z-index: 1000;
                    margin-top: 10px;
                    font-size: 0.85rem;
                    text-align: left;
                    color: var(--text-primary);
                }
                
                /* 三角形箭頭 */
                .custom-tooltip::before {
                    content: '';
                    position: absolute;
                    top: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 0 6px 6px 6px;
                    border-style: solid;
                    border-color: transparent transparent var(--border-color) transparent;
                }

                .stat-card:hover .custom-tooltip {
                    display: block;
                    animation: tooltipFadeIn 0.2s ease-out;
                }

                @keyframes tooltipFadeIn {
                    from { opacity: 0; transform: translate(-50%, 5px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }

                .tooltip-header {
                    font-weight: 700;
                    margin-bottom: 8px;
                    text-align: center;
                    color: var(--accent-blue);
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 4px;
                }

                .tooltip-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }

                .tooltip-divider {
                    height: 1px;
                    background: var(--border-color);
                    margin: 8px 0;
                }

                .tooltip-subtitle {
                    font-weight: 600;
                    margin-bottom: 4px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .tooltip-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    max-height: 150px;
                    overflow-y: auto;
                }

                .tooltip-list li {
                    padding: 2px 0;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .tooltip-list li.more {
                    color: var(--text-muted);
                    font-style: italic;
                    text-align: center;
                    margin-top: 4px;
                }

                .text-success { color: var(--accent-green); font-weight: 600; }
                .text-danger { color: var(--accent-red); font-weight: 600; }
            `;
            document.head.appendChild(style);
        }
    }
};

window.DashboardWidgets = DashboardWidgets;
