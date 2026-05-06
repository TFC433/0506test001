// File: public/scripts/dashboard/dashboard.js
// ============================================================================
// File: public/scripts/dashboard/dashboard.js
// ============================================================================
/**
 * public/scripts/dashboard/dashboard.js
 * @version 3.4.4
 * @date 2026-04-29
 * @changelog
 * - [PHASE T2.1] Dashboard Phase T2.1 Trend Widget final semantics alignment.
 * - [PHASE T2] Official release of Dashboard Trend Widget with Cumulative view.
 * - [PHASE T1/T1.1] Replaced announcement widget with KPI Trend Widget.
 * - removed unfinished dashboard analytical range UI from production
 * - preserved backend range capability for future use
 * - stabilized dashboard for archive/release
 * - [PHASE D-2] analytical dashboard range filter UI added (Rolled back)
 * - [PHASE D-2] UI wired to backend safe-range API (Rolled back)
 * - [PHASE D-2] operational widgets intentionally left unaffected
 * - RAW contacts dashboard stats made non-blocking
 * - dashboard initial render no longer waits for Google Sheet contact stats
 * - Phase 8.10 - Mutation-Driven Stale Refresh Strategy
 * @description Dashboard UI Controller. 
 * * [Performance Fix] Removed redundant client-side fetch of /api/interactions/all. 
 * * effectiveLastActivity is now strictly sourced from backend SQL aggregation with strict null/NaN guarding.
 * * [Performance Fix] Added SPA loaded flag setter to prevent redundant re-fetches on route navigation.
 * * [Architecture Fix] Added markStale() to support mutation-driven dashboard invalidation without breaking fast SPA navigation.
 */

const dashboardManager = {
    // 狀態變數
    kanbanRawData: {},
    processedOpportunities: [], 
    availableYears: [], 

    /**
     * 標記儀表板資料為過期 (Stale)
     * 當發生會影響統計的資料變更 (如新增/編輯/刪除事件) 時呼叫此函式，
     * 使得下次進入儀表板時能觸發重新整理，而不破壞 SPA 快速切換的機制。
     */
    markStale() {
        if (window.CRM_APP && window.CRM_APP.pageConfig && window.CRM_APP.pageConfig['dashboard']) {
            window.CRM_APP.pageConfig['dashboard'].loaded = false;
            console.log('⚠️ [Dashboard] 已標記為過期 (Stale)，下次進入將重新載入');
        }
    },

    /**
     * 初始化與刷新儀表板資料
     * @param {boolean} force - 是否強制從後端刷新 (忽略快取)
     */
    async refresh(force = false) {
        console.log(`🔄 [Dashboard] 執行儀表板刷新... (強制: ${force})`);
        
        // 呼叫 UI 管家顯示全域 Loading
        if (window.DashboardUI) DashboardUI.showGlobalLoading('正在同步儀表板資料...');

        // Note: Backend range filtering is supported via ?range=, ?start=, ?end=
        // but UI controls have been removed for stabilization.
        const dashboardApiUrl = force ? `/api/dashboard?t=${Date.now()}` : '/api/dashboard';

        try {
            // 1. 併發請求資料 (已移除贅餘的 interactions/all 請求)
            const [dashboardResult] = await Promise.all([
                authedFetch(dashboardApiUrl)
            ]);

            if (!dashboardResult.success) throw new Error(dashboardResult.details || '獲取儀表板資料失敗');

            const data = dashboardResult.data;
            this.kanbanRawData = data.kanbanData || {};
            
            // 2. 資料處理：計算年份 (effectiveLastActivity 已由後端提供)
            const allOpportunities = Object.values(this.kanbanRawData).flatMap(stage => stage.opportunities);
            const yearSet = new Set();
            
            this.processedOpportunities = allOpportunities.map(item => {
                // 安全防呆：嚴格檢查是否為 null, undefined 或 NaN，避免誤判有效數值
                if (typeof item.effectiveLastActivity !== 'number' || Number.isNaN(item.effectiveLastActivity)) {
                    item.effectiveLastActivity = new Date(item.lastUpdateTime || item.createdTime).getTime();
                }
                
                const year = item.createdTime ? new Date(item.createdTime).getFullYear() : null;
                item.creationYear = year;
                if(year) yearSet.add(year);
                
                return item;
            });
            this.availableYears = Array.from(yearSet).sort((a, b) => b - a); 

            // 3. 呼叫子模組進行渲染
            
            // A. 基礎 Widgets
            if (window.DashboardWidgets) {
                DashboardWidgets.renderStats(data.stats);
                
                // 渲染業務趨勢分析圖表
                if (data.trendData) {
                    DashboardWidgets.renderTrendWidget(data.trendData, 'ytd', 'monthly');
                }
                
                const activityWidget = document.querySelector('#activity-feed-widget .widget-content');
                if (activityWidget) {
                    activityWidget.innerHTML = DashboardWidgets.renderActivityFeed(data.recentActivity || []);
                }
            }

            // B. 週間業務 (Weekly)
            if (window.DashboardWeekly) {
                DashboardWeekly.render(data.weeklyBusiness || [], data.thisWeekInfo);
            }

            // C. 看板 (Kanban)
            if (window.DashboardKanban) {
                // Fix Initialization Race Condition
                DashboardKanban.init((forceRefresh) => this.refresh(forceRefresh));
                
                // 更新資料並渲染
                DashboardKanban.update(
                    this.processedOpportunities, 
                    this.kanbanRawData, 
                    this.availableYears
                );
            }

            // D. 地圖 (Map)
            if (window.mapManager) {
                await window.mapManager.update();
            }

            // 標記為已載入，遵循 SPA 快取機制避免路由切換時重複請求，並清除 Stale 狀態
            if (window.CRM_APP && window.CRM_APP.pageConfig && window.CRM_APP.pageConfig['dashboard']) {
                window.CRM_APP.pageConfig['dashboard'].loaded = true;
            }

            // [PHASE C-2.4] Non-blocking fetch for slow RAW contacts stats (不受範圍過濾影響)
            authedFetch('/api/dashboard/contacts-stats').then(res => {
                if (res.success && res.data) {
                    const elCount = document.getElementById('contacts-count');
                    if (elCount) elCount.textContent = res.data.total;
                    if (window.DashboardWidgets && typeof window.DashboardWidgets._updateTrend === 'function') {
                        window.DashboardWidgets._updateTrend('contacts-trend', res.data.month);
                    }
                }
            }).catch(err => console.error('[Dashboard] 載入潛在客戶統計失敗:', err));

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                console.error("[Dashboard] 刷新儀表板時發生錯誤:", error);
                showNotification("儀表板刷新失敗", "error");
            }
        } finally {
            if (window.DashboardUI) DashboardUI.hideGlobalLoading();
            console.log('✅ [Dashboard] 儀表板刷新完成');
        }
    },
    
    /**
     * 強制重新整理 (清除快取並重載)
     */
    forceRefresh: async function() {
        if (window.DashboardUI) DashboardUI.showGlobalLoading('正在強制同步所有資料...');
        let currentPageName = 'dashboard'; 
        let currentPageParams = {};

        try {
            const currentHash = window.location.hash.substring(1);
            if (currentHash && window.CRM_APP.pageConfig[currentHash.split('?')[0]]) {
                const [pageName, paramsString] = currentHash.split('?');
                currentPageName = pageName;
                if (paramsString) {
                    try {
                        currentPageParams = Object.fromEntries(new URLSearchParams(paramsString));
                        Object.keys(currentPageParams).forEach(key => {
                            currentPageParams[key] = decodeURIComponent(currentPageParams[key]);
                        });
                    } catch (e) {
                        console.warn(`[Dashboard] 解析 forceRefresh 的 URL 參數失敗: ${paramsString}`, e);
                        currentPageParams = {};
                    }
                }
            }
            
            await authedFetch('/api/cache/invalidate', { method: 'POST' });
            showNotification('後端快取已清除，正在重新載入...', 'info');

            Object.keys(window.CRM_APP.pageConfig).forEach(key => {
                 if (!key.includes('-details')) { 
                     window.CRM_APP.pageConfig[key].loaded = false;
                 }
            });

            await this.refresh(true);

            showNotification('所有資料已強制同步！正在重新整理目前頁面...', 'success');

            await new Promise(resolve => setTimeout(resolve, 150));
            await window.CRM_APP.navigateTo(currentPageName, currentPageParams, false);

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                console.error("[Dashboard] 強制刷新失敗:", error);
                showNotification("強制刷新失敗，請稍後再試。", "error");
            }
            if (window.DashboardUI) DashboardUI.hideGlobalLoading();
        } finally {
            if (window.DashboardUI) DashboardUI.hideGlobalLoading();
        }
    },

    /**
     * 觸發本地開發用的佈局網格輔助線
     */
    toggleLayoutGrid() {
        const grid = document.querySelector('.dashboard-grid-flexible');
        if (grid) {
            grid.classList.toggle('debug-grid');
        }
    }
};

window.dashboardManager = dashboardManager;

if (typeof CRM_APP === 'undefined') {
    window.CRM_APP = { systemConfig: {} };
}

// ============================================================================
// Environment-Specific Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const devToggleBtn = document.getElementById('dev-layout-toggle-btn');
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (devToggleBtn && isLocalDev) {
        devToggleBtn.style.display = '';
    }
});