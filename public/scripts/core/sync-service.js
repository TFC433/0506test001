// public/scripts/core/sync-service.js
// 職責：處理寫入後的局部視圖刷新 (View Refresh Utility)
// (Refactored Phase 2: Obsolete global polling logic removed completely)

window.CRM_APP = window.CRM_APP || {};

const SyncService = {
    /**
     * 核心：寫入後的視圖刷新邏輯 (Fallback/Alternative version)
     */
    async refreshCurrentView(successMessage = '資料重整中...') {
        console.log('[Sync] 執行視圖刷新...');

        // 1. 失效所有列表頁面的快取 (若存在快取機制)
        if (window.CRM_APP.pageConfig) {
            for (const key in window.CRM_APP.pageConfig) {
                const isListPage = !key.includes('-details') && key !== 'weekly-detail';
                if (isListPage) {
                    window.CRM_APP.pageConfig[key].loaded = false;
                }
            }
        }

        // 2. 獲取當前頁面與參數
        const hash = window.location.hash.substring(1);
        const [pageName, paramsString] = hash.split('?');
        let params = {};
        if (paramsString) params = Object.fromEntries(new URLSearchParams(paramsString));

        // 3. 重新導航 (觸發模組的 loadFn)
        try {
            await window.CRM_APP.navigateTo(pageName || 'dashboard', params, false);
        } catch (err) {
            if (typeof showNotification === 'function') {
                showNotification(`刷新失敗: ${err.message}`, 'error');
            } else {
                console.error('[Sync] 刷新失敗:', err);
            }
        }
    }
};

// 導出全域函式 (若 main.js 已經宣告了更完整的版本，此處可能作為後備方案)
window.CRM_APP.refreshCurrentView = SyncService.refreshCurrentView.bind(SyncService);