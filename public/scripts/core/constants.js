// public/scripts/core/constants.js

window.CRM_APP = window.CRM_APP || {};

// 1. 頁面配置定義
window.CRM_APP.pageConfig = {
    'dashboard': { title: '儀表板', subtitle: '以機會為核心的客戶關係管理平台', loaded: false },
    'contacts': { title: '潛在客戶管理', subtitle: '管理所有來自名片或其他來源的潛在客戶', loaded: false },
    'opportunities': { title: '機會案件管理', subtitle: '追蹤與管理所有進行中的機會案件', loaded: false },
    'sales-analysis': { title: '成交與金額分析', subtitle: '檢視已完成機會的績效指標與趨勢', loaded: false },
    'announcements': { title: '佈告欄管理', subtitle: '新增與管理團隊的公告訊息', loaded: false },
    'companies': { title: '公司管理', subtitle: '檢視與管理所有客戶公司', loaded: false },
    'interactions': { title: '互動總覽', subtitle: '檢視所有機會案件的互動紀錄', loaded: false },
    'weekly-business': { title: '週間業務總覽', subtitle: '檢視所有週次的業務摘要', loaded: false },
    'weekly-detail': { title: '週間業務詳情', subtitle: '檢視特定週次的業務紀錄', loaded: true },
    'events': { title: '事件紀錄列表', subtitle: '查看所有機會案件的詳細事件報告', loaded: false },
    'company-details': { title: '公司詳細資料', subtitle: '查看公司的完整關聯資訊', loaded: true },
    'opportunity-details': { title: '機會詳細資料', subtitle: '檢視機會的所有關聯資訊', loaded: true },
    
    // ★★★ 【新增】商品成本管理頁面 ★★★
    'products': { title: '商品成本管理', subtitle: '檢視市場商品成本與定價策略 (機密)', loaded: false },

    // ★★★ 【新增】內部運營頁面 ★★★
    'internal-ops': { title: '進度追蹤', subtitle: '內部運營與專案進度管理', loaded: false }
};
// 2. 下拉選單元素 ID 與 Config Key 的對應
window.CRM_APP.dropdownMappings = {
    'opportunity-type': '機會種類',
    'upgrade-opportunity-type': '機會種類',
    'current-stage': '機會階段',
    'upgrade-current-stage': '機會階段',
    'opportunity-source': '機會來源',
    'assignee': '團隊成員',
    'upgrade-assignee': '團隊成員',
    'interaction-event-type': '互動類型',
    'map-opportunity-filter': '機會種類',
    'edit-opportunity-type': '機會種類',
    'edit-opportunity-source': '機會來源',
    'edit-current-stage': '機會階段',
    'edit-assignee': '團隊成員'
};

// 3. 全域狀態初始化
window.CRM_APP.systemConfig = {};
window.CRM_APP.currentUser = '';
window.CRM_APP.formTemplates = {};
window.CRM_APP.pageModules = {};