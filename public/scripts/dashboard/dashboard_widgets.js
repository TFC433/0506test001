/**
 * public/scripts/dashboard/dashboard_widgets.js
 * @version 1.4.6
 * @date 2026-04-29
 * @changelog
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

        if (typeof Highcharts === 'undefined') return;

        const viewLabel = currentView === 'cumulative' ? '（累積）' : '（月增）';

        Highcharts.chart('trend-chart-container', {
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
                    visible: false,
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
                /* 浮動資訊卡片 Tooltip 樣式 */
                .custom-tooltip {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    padding: 12px;
                    border-radius: 8px;
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
                    color: var(--primary-color);
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

                .text-success { color: #10b981; font-weight: 600; }
                .text-danger { color: #ef4444; font-weight: 600; }
            `;
            document.head.appendChild(style);
        }
    }
};

window.DashboardWidgets = DashboardWidgets;