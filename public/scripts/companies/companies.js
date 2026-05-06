/**
 * public/scripts/companies/companies.js
 * 職責：載入公司詳細資料頁的數據，並協調UI渲染與事件綁定模組
 * * @version 7.6.2 (Phase 8: ID Guard & Layout Fix)
 * * @date 2026-02-10
 * * @description 
 * * 1. [Fix] Added null check for companyInfo.
 * * 2. [Layout] Wrapped Event section in dashboard-widget grid-col-12.
 * * 3. [Contract] Enforced ID-based API calls.
 */

/**
 * 載入並渲染公司詳細資料頁面的主函式
 * @param {string} companyId - 公司 ID (UUID)
 */
async function loadCompanyDetailsPage(companyId) {
    const container = document.getElementById('page-company-details');
    // ID 通常不需要解碼，但保留以防萬一
    const safeId = decodeURIComponent(companyId);
    
    // 若找不到專屬容器，嘗試尋找通用容器 (v7.0 相容)
    const targetContainer = container || document.getElementById('page-content') || document.body;

    targetContainer.innerHTML = `<div class="loading show" style="padding-top: 100px;"><div class="spinner"></div><p>正在載入公司資料...</p></div>`;

    try {
        // [Contract Fix] 使用 ID 呼叫 API
        const result = await authedFetch(`/api/companies/${safeId}/details`);
        if (!result.success) throw new Error(result.error || '無法載入公司資料');

        // 從解構賦值中移除 interactions (依照 0109 邏輯)
        const { companyInfo, contacts = [], opportunities = [], potentialContacts = [], eventLogs = [] } = result.data;
        
        // [Guard] 檢查 companyInfo 是否存在
        if (!companyInfo) {
            console.error('[CompanyDetails] companyInfo is null for ID:', safeId);
            targetContainer.innerHTML = `<div class="alert alert-error" style="margin: 20px;">
                <strong>資料錯誤</strong>：找不到 ID 為「${safeId}」的公司資料，可能已被刪除。
            </div>`;
            return;
        }

        // 1. 設定頁面標題
        const titleEl = document.getElementById('page-title');
        const subtitleEl = document.getElementById('page-subtitle');
        if (titleEl) titleEl.textContent = companyInfo.companyName;
        if (subtitleEl) subtitleEl.textContent = '公司詳細資料與關聯活動';

        // 2. 渲染頁面骨架 (垂直瀑布流 - 0109 結構)
        // [UI Fix] 將 Event 區塊包裹在 dashboard-widget grid-col-12 中以對齊 Grid
        targetContainer.innerHTML = `
            ${typeof renderCompanyInfoCard === 'function' ? renderCompanyInfoCard(companyInfo) : '<div class="alert alert-error">UI渲染函式缺失</div>'}

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div id="tab-content-company-events" class="tab-content active"></div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">相關機會案件 (${opportunities.length})</h2></div>
                <div class="widget-content">${typeof renderCompanyOpportunitiesTable === 'function' ? renderCompanyOpportunitiesTable(opportunities) : ''}</div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">已建檔聯絡人 (${contacts.length})</h2></div>
                <div class="widget-content">${typeof renderCompanyContactsTable === 'function' ? renderCompanyContactsTable(contacts) : ''}</div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">潛在聯絡人 (${potentialContacts.length})</h2></div>
                <div id="potential-contacts-container" class="widget-content"></div>
            </div>
        `;
        
        // 3. 初始化並渲染各個模組
        // 若 OpportunityEvents 存在則初始化
        const OE = window.OpportunityEvents || (typeof OpportunityEvents !== 'undefined' ? OpportunityEvents : null);
        if (OE) {
            OE.init(eventLogs, { companyId: companyInfo.companyId, companyName: companyInfo.companyName });
        }
        
        if (window.PotentialContactsManager) {
            PotentialContactsManager.render({
                containerSelector: '#potential-contacts-container',
                potentialContacts: potentialContacts, 
                comparisonList: contacts, 
                comparisonKey: 'name',
                context: 'company'
            });
        }

        // 4. 綁定所有互動事件 (0109 邏輯)
        if (typeof initializeCompanyEventListeners === 'function') {
            initializeCompanyEventListeners(companyInfo);
        }
        
        // 5. 更新下拉選單 (若 CRM_APP 存在)
        if (window.CRM_APP && typeof CRM_APP.updateAllDropdowns === 'function') {
            CRM_APP.updateAllDropdowns();
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('載入公司詳細資料失敗:', error);
            const titleEl = document.getElementById('page-title');
            if (titleEl) titleEl.textContent = '錯誤';
            targetContainer.innerHTML = `<div class="alert alert-error">載入公司資料失敗: ${error.message}</div>`;
        }
    }
}

// 向主應用程式註冊此模組管理的頁面載入函式 (v7.0 Router 整合)
window.loadCompanyDetailsPage = loadCompanyDetailsPage;
if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    // 註冊兩個可能的名稱以防萬一
    window.CRM_APP.pageModules['company-details'] = loadCompanyDetailsPage;
}