// File: public/scripts/events/events.js
// views/scripts/events.js (重構後的主控制器)

/**
 * @version 1.0.6
 * @date 2026-03-17
 * @purpose [UI Alignment Patch] Hide empty dashboard container to remove ghost margin-bottom and fix excessive vertical gap.
 */

// 全域變數，用於跨模組共享數據
let eventLogPageData = {
    eventList: [],
    chartData: {} // 保留結構以符合後端合約
};

/**
 * 載入並渲染事件紀錄頁面的主函式
 * 這是此頁面的唯一入口點
 */
async function loadEventLogsPage() {
    const dashboardContainer = document.getElementById('event-log-dashboard-container');
    const listContainer = document.getElementById('event-log-list-container');
    
    // 清除/隱藏儀表板區塊，並顯示列表載入畫面
    if(dashboardContainer) {
        dashboardContainer.innerHTML = '';
        dashboardContainer.style.display = 'none';
    }
    
    if(listContainer) listContainer.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入紀錄中...</p></div>';
    
    try {
        // 一次性獲取所有頁面需要的資料 (維持 API Contract 不變)
        const result = await authedFetch('/api/events/dashboard');
        if (!result.success) throw new Error(result.details || '讀取資料失敗');
        
        // [Phase 8 Fix] Robust Data Normalization
        const rawData = result.data || {};
        
        eventLogPageData = {
            eventList: Array.isArray(rawData) ? rawData : (Array.isArray(rawData.eventList) ? rawData.eventList : []),
            chartData: rawData.chartData || {}
        };

        // 僅渲染列表 (圖表渲染已移除)
        if (typeof renderEventLogList === 'function') {
            renderEventLogList(listContainer, eventLogPageData.eventList);
        } else if (listContainer) {
            listContainer.innerHTML = '<div class="alert alert-error">列表渲染元件遺失</div>';
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('❌ 載入事件紀錄頁面失敗:', error);
            if(listContainer) listContainer.innerHTML = `<div class="alert alert-error">讀取事件列表失敗: ${error.message}</div>`;
        }
    }
}

// ==================== 快捷方式與模組註冊 ====================

// 為了讓系統中其他地方的按鈕（如頁首）可以呼叫，保留全域函式
function showEventLogForCreation() {
    // 呼叫彈窗管理模組的函式
    if (typeof showEventLogFormModal === 'function') {
        showEventLogFormModal();
    } else {
        console.warn('showEventLogFormModal is not defined');
    }
}

// 輔助函式：供其他模組呼叫
function showEventLogModalByOpp(opportunityId, opportunityName) {
    if (typeof showEventLogFormModal === 'function') {
        showEventLogFormModal({ opportunityId, opportunityName });
    } else {
        console.warn('showEventLogFormModal is not defined');
    }
}

// 向主應用程式註冊此模組
if (window.CRM_APP) {
    window.CRM_APP.pageModules.events = loadEventLogsPage;
}