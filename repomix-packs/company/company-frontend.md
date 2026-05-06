This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: public/scripts/companies/*.js, public/styles/modules/layout.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/scripts/companies/companies.js
public/scripts/companies/company-details-events.js
public/scripts/companies/company-details-ui.js
public/scripts/companies/company-list.js
public/styles/modules/layout.css
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/scripts/companies/companies.js">
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
</file>

<file path="public/scripts/companies/company-details-events.js">
/**
 * public/scripts/companies/company-details-events.js
 * 職責：處理「公司詳細資料頁」的所有使用者互動事件
 * * @version 7.9.0 (Phase 8: Switch to ID-based Operations)
 * * @description 
 * * 1. [Contract] Save, Delete, Generate AI 改為使用 companyId。
 * * 2. [UX] 支援 ID 基礎的頁面導航與刷新。
 */

let _currentCompanyInfo = null;
let _detailsContainer = null;

// =============================================
// 初始化與事件委派
// =============================================

function initializeCompanyEventListeners(companyInfo) {
    _currentCompanyInfo = companyInfo;
    
    // 尋找主容器 (相容舊版 ID 與新版佈局)
    _detailsContainer = document.getElementById('page-company-details') || document.body;

    // 清除舊監聽並綁定新監聽 (防止重複綁定)
    _detailsContainer.removeEventListener('click', handleCompanyDetailsAction);
    _detailsContainer.removeEventListener('submit', handleCompanyDetailsSubmit);
    
    _detailsContainer.addEventListener('click', handleCompanyDetailsAction);
    _detailsContainer.addEventListener('submit', handleCompanyDetailsSubmit);
    
    // console.log('✅ [CompanyEvents] Events Initialized');
}

function handleCompanyDetailsAction(e) {
    // 尋找最近的帶有 data-action 的按鈕
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const payload = btn.dataset;

    // 防止事件冒泡影響其他元件
    // e.stopPropagation(); 

    switch (action) {
        // --- 編輯與 UI ---
        case 'edit-mode':
            toggleCompanyEditMode(payload.enabled === 'true');
            break;
        case 'generate-profile':
            generateCompanyProfile();
            break;
        
        // --- 刪除操作 ---
        case 'delete-company':
            confirmDeleteCompany();
            break;
        case 'delete-opp': 
            confirmDeleteOppInDetails(payload.rowIndex, payload.name);
            break;
        
        // --- 聯絡人操作 ---
        case 'edit-contact':
            try {
                // 安全解析 JSON
                const contact = JSON.parse(payload.contact);
                showEditContactModal(contact);
            } catch (err) { 
                console.error('解析聯絡人資料失敗', err); 
                if(window.showNotification) showNotification('資料錯誤，無法編輯', 'error');
            }
            break;
        
        // --- 導航 (v7 Router 相容) ---
        case 'navigate':
             e.preventDefault();
             if (window.CRM_APP && payload.page) {
                 const params = payload.params ? JSON.parse(payload.params) : {};
                 if (window.CRM_APP.navigateTo) {
                     window.CRM_APP.navigateTo(payload.page, params);
                 }
             }
             break;
    }
}

function handleCompanyDetailsSubmit(e) {
    // 攔截表單提交，改用 AJAX 處理
    if (e.target.id === 'company-edit-form') {
        saveCompanyInfo(e);
    } else if (e.target.id === 'edit-contact-form') {
        handleSaveContact(e);
    }
}

// =============================================
// 核心邏輯實作
// =============================================

/**
 * 切換 檢視/編輯 模式
 * @param {boolean} isEditing 
 * @param {object|null} aiData - AI 生成的暫存資料
 */
function toggleCompanyEditMode(isEditing, aiData = null) {
    const container = document.getElementById('company-info-card-container');
    if (!container) return;

    // 合併資料 (若有 AI 生成內容)
    let dataToRender = aiData ? { ..._currentCompanyInfo, ...aiData } : _currentCompanyInfo;

    if (typeof renderCompanyInfoCard === 'function') {
        // 重新渲染卡片區域
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderCompanyInfoCard(dataToRender, isEditing);
        container.replaceWith(tempDiv.firstElementChild);
    } else {
        console.error('❌ 找不到 renderCompanyInfoCard 函式');
    }
}

/**
 * 儲存公司資料 (PUT)
 * 使用 skipRefresh: true 以保持在當前頁面並手動更新 DOM
 */
async function saveCompanyInfo(event) {
    event.preventDefault();
    const form = document.getElementById('company-edit-form');
    if (!form) return;

    const formData = new FormData(form);
    const updateData = Object.fromEntries(formData.entries());
    // [Contract Fix] 使用 companyId 更新
    const companyId = _currentCompanyInfo.companyId; 
    
    if (!updateData.companyName || updateData.companyName.trim() === '') {
        if(window.showNotification) showNotification('公司名稱為必填項目', 'warning');
        return;
    }

    // UI Loading State
    const saveBtn = form.querySelector('.btn-save');
    const originalBtnContent = saveBtn ? saveBtn.innerHTML : '💾 儲存';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>儲存中...</span>';
    }

    try {
        // [Contract Fix] skipRefresh: true -> 我們自己處理 UI 更新，不讓 api.js 刷新頁面
        const result = await authedFetch(`/api/companies/${companyId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
            headers: { 'Content-Type': 'application/json' },
            skipRefresh: true 
        });

        if (result.success) {
            // 1. 顯示成功通知 (依賴 company-details-ui.js 修復的容器)
            if(window.showNotification) showNotification('公司資料已更新', 'success');
            else alert('公司資料已更新');
            
            // 2. 更新本地快取
            _currentCompanyInfo = { ..._currentCompanyInfo, ...updateData };

            // 3. 判斷是否改名 (保持 SPA 體驗)
            // 雖然現在用 ID，但為了 URL 美觀，若 Router 支援仍可更新 URL
            if (updateData.companyName !== _currentCompanyInfo.companyName) {
                // do nothing strictly for ID routing unless we want to update displayed URL
            }

            toggleCompanyEditMode(false);

        } else {
            throw new Error(result.error || '儲存失敗');
        }
    } catch (error) {
        console.error('儲存失敗:', error);
        if(window.showNotification) showNotification('儲存失敗: ' + error.message, 'error');
        else alert('儲存失敗: ' + error.message);
    } finally {
        // 還原按鈕狀態
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnContent;
        }
    }
}

/**
 * AI 生成簡介
 */
async function generateCompanyProfile() {
    const input = document.getElementById('company-keywords-input');
    const keywords = input ? input.value : '';
    
    // 暫存當前使用者已輸入的表單資料
    const form = document.getElementById('company-edit-form');
    let currentInputData = {};
    if (form) {
        const currentFormData = new FormData(form);
        currentInputData = Object.fromEntries(currentFormData.entries());
    }

    if(typeof showLoading === 'function') showLoading('AI 正在撰寫簡介並查找資料...');
    
    try {
        // [Contract Fix] 使用 companyId 呼叫
        const companyId = _currentCompanyInfo.companyId;
        
        // [Critical] AI 生成是中間狀態，絕對不能刷新頁面
        const result = await authedFetch(`/api/companies/${companyId}/generate-profile`, {
            method: 'POST',
            body: JSON.stringify({ userKeywords: keywords }),
            skipRefresh: true 
        });

        if (result.success && result.data) {
            // 準備 AI 更新的欄位
            const aiUpdates = {};
            if (result.data.introduction) aiUpdates.introduction = result.data.introduction;
            if (result.data.phone) aiUpdates.phone = result.data.phone;
            if (result.data.address) aiUpdates.address = result.data.address;
            if (result.data.county) aiUpdates.county = result.data.county;

            // 合併：原資料 + 使用者手動輸入 + AI 新生成
            const mergedData = { ..._currentCompanyInfo, ...currentInputData, ...aiUpdates };
            
            // 重新渲染編輯模式並填入資料
            toggleCompanyEditMode(true, mergedData);
            
            if(window.showNotification) showNotification('AI 簡介與聯絡資訊已生成！', 'success');
        } else {
            throw new Error(result.message || '生成失敗');
        }
    } catch (error) {
        if(window.showNotification) showNotification('AI 生成失敗: ' + error.message, 'error');
    } finally {
        if(typeof hideLoading === 'function') hideLoading();
    }
}

/**
 * 刪除公司
 */
async function confirmDeleteCompany() {
    if (!_currentCompanyInfo) return;
    const name = _currentCompanyInfo.companyName;
    const companyId = _currentCompanyInfo.companyId;

    const message = `確定要刪除「${name}」嗎？此操作無法復原。`;
    
    const performDelete = async () => {
        if(typeof showLoading === 'function') showLoading('刪除中...');
        try {
            // [Contract Fix] 使用 companyId 刪除
            const result = await authedFetch(`/api/companies/${companyId}`, { 
                method: 'DELETE',
                skipRefresh: true
            });
            
            if (result.success) {
                if(window.showNotification) showNotification('公司已刪除', 'success');
                
                // 延遲跳轉，讓使用者看到通知
                setTimeout(() => {
                    if (window.router) window.router.push('/companies');
                    else if (window.CRM_APP && window.CRM_APP.navigateTo) window.CRM_APP.navigateTo('companies');
                    else window.location.hash = '#/companies';
                }, 1000);
            } else {
                if(window.showNotification) showNotification('刪除失敗: ' + (result.error || '未知錯誤'), 'error');
            }
        } catch (e) {
            if(window.showNotification) showNotification('刪除請求失敗', 'error');
        } finally {
            if(typeof hideLoading === 'function') hideLoading();
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(message, performDelete);
    } else if (confirm(message)) {
        performDelete();
    }
}

/**
 * 刪除機會案件 (在詳細頁中)
 */
async function confirmDeleteOppInDetails(rowIndex, oppName) {
    if (!rowIndex) return;
    const message = `確定要刪除機會「${oppName || '(未命名)'}」嗎？`;

    const doDelete = async () => {
        if(typeof showLoading === 'function') showLoading('正在刪除機會...');
        try {
            const result = await authedFetch(`/api/opportunities/${rowIndex}`, { 
                method: 'DELETE',
                skipRefresh: true
            });

            if (result.success) {
                if(window.showNotification) showNotification('刪除成功', 'success');
                
                // 刷新頁面以更新列表
                setTimeout(() => {
                    if (window.loadCompanyDetailsPage) {
                        // [Contract Fix] 傳遞 ID
                        window.loadCompanyDetailsPage(_currentCompanyInfo.companyId);
                    } else {
                        window.location.reload();
                    }
                }, 500);
            } else {
                if(window.showNotification) showNotification('刪除失敗: ' + (result.error || '未知錯誤'), 'error');
            }
        } catch (e) {
            if(window.showNotification) showNotification('刪除請求失敗', 'error');
        } finally {
            if(typeof hideLoading === 'function') hideLoading();
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(message, doDelete);
    } else if (confirm(message)) {
        doDelete();
    }
}

// =============================================
// 聯絡人編輯 Modal 相關
// =============================================

function showEditContactModal(contact) {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'edit-contact-modal-container';
    modalContainer.innerHTML = `
        <div id="edit-contact-modal" class="modal" style="display: block; z-index: 3050;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2 class="modal-title">編輯聯絡人: ${contact.name}</h2>
                    <button class="close-btn" id="btn-close-contact-modal">&times;</button>
                </div>
                <form id="edit-contact-form">
                    <input type="hidden" id="edit-contact-id" value="${contact.contactId}">
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">部門</label><input type="text" class="form-input" id="edit-contact-department" value="${contact.department || ''}"></div>
                        <div class="form-group"><label class="form-label">職位</label><input type="text" class="form-input" id="edit-contact-position" value="${contact.position || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">手機</label><input type="tel" class="form-input" id="edit-contact-mobile" value="${contact.mobile || ''}"></div>
                        <div class="form-group"><label class="form-label">公司電話</label><input type="tel" class="form-input" id="edit-contact-phone" value="${contact.phone || ''}"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="edit-contact-email" value="${contact.email || ''}"></div>
                    <button type="submit" class="submit-btn">💾 儲存變更</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modalContainer);

    // 綁定關閉按鈕
    document.getElementById('btn-close-contact-modal').addEventListener('click', closeEditContactModal);
}

function closeEditContactModal() {
    const el = document.getElementById('edit-contact-modal-container');
    if (el) el.remove();
}

async function handleSaveContact(e) {
    e.preventDefault();
    const id = document.getElementById('edit-contact-id').value;
    const data = {
        department: document.getElementById('edit-contact-department').value,
        position: document.getElementById('edit-contact-position').value,
        mobile: document.getElementById('edit-contact-mobile').value,
        phone: document.getElementById('edit-contact-phone').value,
        email: document.getElementById('edit-contact-email').value,
    };
    
    if(typeof showLoading === 'function') showLoading('更新中...');
    
    try {
        await authedFetch(`/api/contacts/${id}`, { 
            method: 'PUT', 
            body: JSON.stringify(data),
            skipRefresh: true 
        });
        
        if(window.showNotification) showNotification('聯絡人已更新', 'success');
        closeEditContactModal();
        
        // 重新載入頁面 (聯絡人更新較複雜，建議重整)
        setTimeout(() => {
            if (window.loadCompanyDetailsPage) {
                window.loadCompanyDetailsPage(_currentCompanyInfo.companyId);
            } else {
                window.location.reload();
            }
        }, 500);
    } catch(e) { 
        console.error(e); 
        if(window.showNotification) showNotification('更新失敗', 'error');
    } finally {
        if(typeof hideLoading === 'function') hideLoading();
    }
}

// Export
window.initializeCompanyEventListeners = initializeCompanyEventListeners;
</file>

<file path="public/scripts/companies/company-details-ui.js">
/**
 * public/scripts/companies/company-details-ui.js
 * 職責：渲染「公司詳細資料頁」的所有UI元件
 * * @version 7.8.0 (Final: Restore Container & Styles)
 * * @description 
 * * 1. 自動檢測並修復缺失的 #toast-container。
 * * 2. 注入 Toast CSS 樣式，確保通知可見。
 * * 3. 鎖定表單 name 屬性 (companyType, customerStage) 對接後端 Writer。
 * * 4. 完美還原 0109 Bento Grid 視覺設計。
 */

/**
 * 為新的公司資訊卡片注入專屬樣式 (含 Toast 通知樣式與容器檢查)
 */
function _injectStylesForInfoCard() {
    // --- [Critical Fix] 確保 Toast 容器存在 ---
    // 這一步是讓 ui.js 的 showNotification 能找到家的關鍵
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
        // console.log('✅ [UI] Restored missing #toast-container');
    }

    const styleId = 'company-info-card-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* --- 0109 Bento Grid Styles --- */
        .company-info-wrapper { background-color: var(--secondary-bg, #f8fafc); border: 1px solid var(--border-color); border-radius: 24px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .main-section-title { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; margin-left: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .company-bento-grid { display: flex; flex-direction: column; gap: 16px; }
        .header-row { display: flex; gap: 16px; align-items: stretch; }
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .info-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .bento-card { background-color: var(--primary-bg, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; padding: 20px 24px; display: flex; flex-direction: column; justify-content: center; transition: all 0.2s ease-in-out; box-shadow: 0 1px 2px rgba(0,0,0,0.03); position: relative; }
        .bento-card.read-mode:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
        .bento-label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .bento-value { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.4; word-break: break-word; font-family: inherit; }
        .name-card { flex: 1; padding: 24px 32px; justify-content: center; }
        .company-title-text { font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.2; }
        .bento-card-solid { border: none; color: white; }
        .bento-card-solid .bento-label { color: rgba(255, 255, 255, 0.85); }
        .bento-card-solid .bento-value { font-size: 1.4rem; font-weight: 700; color: white; }
        .bg-royal-blue { background-color: #1d4ed8; }
        .bg-violet { background-color: #7c3aed; }
        .bg-emerald { background-color: #059669; }
        .header-btn-container { flex: 0 0 140px; display: flex; flex-direction: column; gap: 8px; }
        .action-btn-base { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 100%; border-radius: 16px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; border: 1px solid transparent; }
        .btn-edit { background: linear-gradient(135deg, #f97316, #ea580c); border-color: #c2410c; color: white; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3); }
        .btn-edit:hover { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(249, 115, 22, 0.4); }
        .btn-save { background: linear-gradient(135deg, #10b981, #059669); border-color: #047857; color: white; flex: 2; }
        .btn-save:hover { background: linear-gradient(135deg, #34d399, #10b981); }
        .btn-cancel { background: white; border-color: var(--border-color); color: var(--text-secondary); flex: 1; font-size: 0.9rem; }
        .btn-cancel:hover { background: var(--secondary-bg); color: var(--text-primary); }
        .input-title-edit { font-size: 1.8rem; font-weight: 700; color: var(--text-primary); width: 100%; border: none; border-bottom: 2px solid var(--accent-orange); background: transparent; padding: 4px 0; outline: none; transition: border-color 0.2s; }
        .input-title-edit:focus { border-bottom-color: #c2410c; }
        .input-card-edit { width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 12px; font-size: 0.95rem; background-color: var(--secondary-bg); color: var(--text-primary); outline: none; margin-top: 4px; box-sizing: border-box; }
        .input-card-edit:focus { border-color: var(--accent-blue); background-color: white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .bento-card-solid .input-card-edit { background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: white; }
        .bento-card-solid .input-card-edit option { color: black; }
        .bento-card-solid .input-card-edit:focus { background-color: rgba(255, 255, 255, 1); color: var(--text-primary); }
        @media (max-width: 900px) { .header-row { flex-direction: column; } .header-btn-container { width: 100%; flex-direction: row; height: 50px; } .stats-row, .info-row { grid-template-columns: 1fr; } }

        /* --- [CRITICAL FIX] Toast Notification Styles --- */
        /* 確保通知能顯示在最上層，且有正確的視覺樣式 */
        #toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999 !important; /* 強制覆蓋所有 Modal (z-index ~3000) */
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none; /* 讓點擊穿透 */
        }
        .toast {
            min-width: 250px;
            padding: 12px 20px;
            background: #fff;
            color: #333;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            border-left: 4px solid #3b82f6;
            pointer-events: auto; /* 恢復 Toast 可互動性 */
        }
        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }
        .toast-success { border-left-color: #22c55e; }
        .toast-error { border-left-color: #ef4444; }
        .toast-warning { border-left-color: #f59e0b; }
        .toast-info { border-left-color: #3b82f6; }
    `;
    document.head.appendChild(style);
}

function renderCompanyInfoCard(companyInfo, isEditing = false) {
    _injectStylesForInfoCard(); // 每次渲染時確保樣式與容器存在

    if (!companyInfo) return `<div class="alert alert-warning">找不到公司基本資料</div>`;
    if (companyInfo.isPotential) return _renderPotentialCard();

    if (isEditing) {
        return _renderEditMode(companyInfo);
    } else {
        return _renderViewMode(companyInfo);
    }
}

function _renderPotentialCard() {
    return `
    <div class="company-info-wrapper" id="company-info-card-container">
         <div class="main-section-title">公司基本資料 (潛在)</div>
         <div class="alert alert-info" style="margin:0;">此公司來自潛在客戶名單，尚未建立正式檔案。</div>
    </div>`;
}

function _renderViewMode(info) {
    const type = info.companyType || '-';
    const stage = info.customerStage || '-';
    const rating = info.engagementRating || '-';
    const phone = info.phone || '-';
    const county = info.county || '-';
    const address = info.address || '-';
    const intro = info.introduction || '(尚無公司簡介)';

    return `
        <div class="company-info-wrapper" id="company-info-card-container">
            <div class="main-section-title">公司核心資訊</div>
            
            <div class="company-bento-grid">
                <div class="header-row">
                    <div class="bento-card read-mode name-card">
                        <div class="bento-label">公司名稱</div>
                        <h1 class="company-title-text">${info.companyName}</h1>
                    </div>
                    <div class="header-btn-container">
                        <div class="action-btn-base btn-edit" data-action="edit-mode" data-enabled="true" title="編輯公司資訊">
                            <span>編輯</span>
                            <svg style="width:18px;height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="bento-card bento-card-solid bg-royal-blue read-mode">
                        <div class="bento-label">公司類型</div>
                        <div class="bento-value">${type}</div>
                    </div>
                    <div class="bento-card bento-card-solid bg-violet read-mode">
                        <div class="bento-label">客戶階段</div>
                        <div class="bento-value">${stage}</div>
                    </div>
                    <div class="bento-card bento-card-solid bg-emerald read-mode">
                        <div class="bento-label">互動評級</div>
                        <div class="bento-value">${rating}</div>
                    </div>
                </div>

                <div class="info-row">
                    <div class="bento-card read-mode">
                        <div class="bento-label">電話</div>
                        <div class="bento-value">${phone}</div>
                    </div>
                    <div class="bento-card read-mode">
                        <div class="bento-label">縣市</div>
                        <div class="bento-value">${county}</div>
                    </div>
                    <div class="bento-card read-mode">
                        <div class="bento-label">地址</div>
                        <div class="bento-value">${address}</div>
                    </div>
                </div>

                <div class="bento-card read-mode">
                    <div class="bento-label">業務簡介</div>
                    <div class="bento-value" style="white-space: pre-wrap; font-weight: 500;">${intro}</div>
                </div>
            </div>
        </div>
    `;
}

function _renderEditMode(info) {
    const getOptions = (key, selectedValue) => {
        if (!window.CRM_APP?.systemConfig?.[key]) return '<option value="">無選項</option>';
        return window.CRM_APP.systemConfig[key].map(opt => 
            `<option value="${opt.value}" ${opt.value === selectedValue ? 'selected' : ''}>${opt.note || opt.value}</option>`
        ).join('');
    };

    const cities = ["臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣"];
    const cityOptions = cities.map(c => `<option value="${c}" ${c === info.county ? 'selected' : ''}>${c}</option>`).join('');

    return `
        <div class="company-info-wrapper" id="company-info-card-container" style="border-color: var(--accent-orange); box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);">
            <div class="main-section-title" style="color: var(--accent-orange);">公司資料編輯中...</div>
            
            <form id="company-edit-form" class="company-bento-grid">
                
                <div class="header-row">
                    <div class="bento-card name-card">
                        <div class="bento-label">公司名稱 *</div>
                        <input type="text" name="companyName" class="input-title-edit" value="${info.companyName}" required>
                    </div>
                    
                    <div class="header-btn-container">
                        <button type="submit" class="action-btn-base btn-save" data-action="save-company">
                            <span>💾 儲存</span>
                        </button>
                        <button type="button" class="action-btn-base btn-cancel" data-action="edit-mode" data-enabled="false">
                            <span>取消</span>
                        </button>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="bento-card bento-card-solid bg-royal-blue">
                        <div class="bento-label">公司類型</div>
                        <select name="companyType" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${getOptions('公司類型', info.companyType)}
                        </select>
                    </div>
                    <div class="bento-card bento-card-solid bg-violet">
                        <div class="bento-label">客戶階段</div>
                        <select name="customerStage" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${getOptions('客戶階段', info.customerStage)}
                        </select>
                    </div>
                    <div class="bento-card bento-card-solid bg-emerald">
                        <div class="bento-label">互動評級</div>
                        <select name="engagementRating" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${getOptions('互動評級', info.engagementRating)}
                        </select>
                    </div>
                </div>

                <div class="info-row">
                    <div class="bento-card">
                        <div class="bento-label">電話</div>
                        <input type="text" name="phone" class="input-card-edit" value="${info.phone || ''}">
                    </div>
                    <div class="bento-card">
                        <div class="bento-label">縣市</div>
                        <select name="county" class="input-card-edit">
                            <option value="">請選擇</option>
                            ${cityOptions}
                        </select>
                    </div>
                    <div class="bento-card">
                        <div class="bento-label">地址</div>
                        <input type="text" name="address" class="input-card-edit" value="${info.address || ''}">
                    </div>
                </div>

                <div class="bento-card">
                    <div class="bento-label">業務簡介</div>
                    <textarea name="introduction" class="input-card-edit" rows="5" placeholder="輸入業務簡介...">${info.introduction || ''}</textarea>
                    
                    <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="company-keywords-input" class="input-card-edit" style="margin:0; flex:1;" placeholder="輸入關鍵字由 AI 自動撰寫...">
                        <button type="button" class="action-btn-base btn-edit" style="width: auto; padding: 0 16px; height: 38px; font-size: 0.9rem;" data-action="generate-profile">
                            ✨ AI 生成
                        </button>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                     <button type="button" class="action-btn danger small" data-action="delete-company">🗑️ 刪除此公司</button>
                </div>

            </form>
        </div>
    `;
}

function renderCompanyContactsTable(contacts) {
    if (!contacts || contacts.length === 0) return '<div class="alert alert-info" style="text-align:center;">該公司尚無已建檔的聯絡人</div>';
    
    let tableHTML = `<table class="data-table"><thead><tr><th>姓名</th><th>職位</th><th>部門</th><th>手機</th><th>公司電話</th><th>Email</th><th>操作</th></tr></thead><tbody>`;
    contacts.forEach(contact => {
        // 安全處理 JSON 字串，避免引號破壞 HTML
        const contactJson = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        tableHTML += `<tr>
            <td data-label="姓名"><strong>${contact.name || '-'}</strong></td>
            <td data-label="職位">${contact.position || '-'}</td>
            <td data-label="部門">${contact.department || '-'}</td>
            <td data-label="手機">${contact.mobile || '-'}</td>
            <td data-label="公司電話">${contact.phone || '-'}</td>
            <td data-label="Email">${contact.email || '-'}</td>
            <td data-label="操作">
                <button class="action-btn small warn" data-action="edit-contact" data-contact='${contactJson}'>✏️ 編輯</button>
            </td>
        </tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}

function renderCompanyOpportunitiesTable(opportunities) {
    if (!opportunities || opportunities.length === 0) return '<div class="alert alert-info" style="text-align:center;">該公司尚無相關機會案件</div>';
    
    // 如果有全域渲染函式，優先使用
    if (typeof renderOpportunitiesTable === 'function') return renderOpportunitiesTable(opportunities);
    
    return '<div class="alert alert-warning">表格渲染函式不可用</div>';
}

function renderCompanyInteractionsTab(interactions, companyInfo) {
    // 預留介面，目前不需要回傳內容，避免覆蓋既有邏輯
}

function renderCompanyFullDetails(companyInfo) {
    return ''; // 預留介面
}

// Export functions to global scope
window.renderCompanyInfoCard = renderCompanyInfoCard;
window.renderCompanyContactsTable = renderCompanyContactsTable;
window.renderCompanyOpportunitiesTable = renderCompanyOpportunitiesTable;
</file>

<file path="public/scripts/companies/company-list.js">
/**
 * public/scripts/companies/company-list.js
 * 職責：管理「公司總覽列表頁」
 * * @version 7.7.0 (Phase 10: Backend Opportunity Counting)
 * * @date 2026-04-15
 * * @description 
 * * 1. [PATCH] Removed heavy frontend dependency on /api/opportunities?page=0 payload.
 * * 2. [PATCH] Consumes backend-provided opportunityCount natively.
 * * 3. [Fix] handleCompanyListClick: Navigation payload must use companyId.
 * * 4. [Fix] submitQuickCreateCompany: Navigation after create uses companyId.
 * * 5. [Contract] All operations (delete, navigate) use companyId exclusively.
 * * 6. [Patch] Added dashboardManager.markStale() on successful mutations (create, delete).
 */

// ==================== 全域變數 ====================
let allCompaniesData = [];
let companyListFilters = { type: 'all' };
let currentSort = { field: 'lastActivity', direction: 'desc' };

// ==================== 1. 動態樣式注入 ====================
function _injectCompanyListStyles() {
    if (document.getElementById('company-list-upgraded-styles')) return;

    const style = document.createElement('style');
    style.id = 'company-list-upgraded-styles';
    style.innerHTML = `
        /* Table Styles */
        .comp-list-container { width: 100%; overflow-x: auto; background: var(--card-bg, #fff); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .comp-list-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .comp-list-table th { padding: 12px 16px; text-align: left; background: var(--glass-bg, #f8fafc); color: var(--text-secondary, #64748b); font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid var(--border-color, #e2e8f0); white-space: nowrap; }
        .comp-list-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; font-size: 0.95rem; color: var(--text-main, #334155); }
        .comp-list-table tr:hover { background-color: var(--glass-bg, #f8fafc); }
        
        /* Badges & Chips */
        .comp-type-chip { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; color: white; font-weight: 500; }
        .comp-status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: white; }
        .comp-opp-count { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #f3f4f6; color: #1f2937; font-weight: 700; font-size: 0.85rem; }
        
        /* Sortable Header */
        .comp-list-table th.sortable { cursor: pointer; user-select: none; transition: color 0.2s; }
        .comp-list-table th.sortable:hover { color: var(--accent-blue, #2563eb); }
        
        /* Buttons */
        .btn-mini-delete { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 6px; border-radius: 4px; transition: all 0.2s; }
        .btn-mini-delete:hover { color: #ef4444; background: #fee2e2; }
        
        /* Links */
        .text-link { color: var(--accent-blue, #2563eb); text-decoration: none; font-weight: 500; }
        .text-link:hover { text-decoration: underline; }

        /* Toast Notification Styles */
        #toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            min-width: 250px;
            padding: 12px 20px;
            background: #fff;
            color: #333;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            border-left: 4px solid #3b82f6;
        }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast-success { border-left-color: #22c55e; }
        .toast-error { border-left-color: #ef4444; }
        .toast-warning { border-left-color: #f59e0b; }
        .toast-info { border-left-color: #3b82f6; }
    `;
    document.head.appendChild(style);
}

// ==================== 2. 核心功能：刪除邏輯 ====================
async function executeDeleteCompany(companyId, companyName) {
    if (!companyId) return;
    const name = companyName || '此公司';
    
    const confirmFunc = window.showConfirmDialog || window.confirmAction || window.confirm;
    
    const doDelete = async () => {
        await performDeleteAPI(companyId);
    };

    if (typeof confirmFunc === 'function' && window.showConfirmDialog) {
        showConfirmDialog(`確定要永久刪除公司「${name}」及其所有關聯資料嗎？`, doDelete);
    } else {
        if (confirm(`(系統提示) 確定要刪除「${name}」嗎？此操作無法復原。`)) {
             doDelete();
        }
    }
}

async function performDeleteAPI(companyId) {
    if (typeof showLoading === 'function') showLoading('正在刪除...');
    
    try {
        const res = await authedFetch(`/api/companies/${companyId}`, { method: 'DELETE' });
        
        const toastFunc = window.showNotification || window.showToast;

        if (res.success) {
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }
            
            if(toastFunc) toastFunc('刪除成功', 'success');
            else alert('刪除成功');
            await loadCompaniesListPage(); 
        } else {
            throw new Error(res.error || '刪除失敗');
        }
    } catch (e) {
        console.error('[Delete Error]', e);
        const toastFunc = window.showNotification || window.showToast;
        if (e.message !== 'Unauthorized') {
            const msg = `刪除失敗: ${e.message}`;
            if(toastFunc) toastFunc(msg, 'error');
            else alert(msg);
        }
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

// ==================== 3. 主頁面載入 ====================
async function loadCompaniesListPage() {
    const container = document.getElementById('page-companies');
    if (!container) return;

    _injectCompanyListStyles();

    container.onclick = handleCompanyListClick;
    container.onkeydown = handleCompanyListKeydown;

    container.innerHTML = `
        <div id="company-list-root">
            <div class="dashboard-widget">
                
                <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                    <div style="display: flex; align-items: baseline; gap: 15px;">
                        <h2 class="widget-title" style="margin: 0;">公司總覽</h2>
                    </div>
                    <div id="company-type-tabs" class="companies-tabs" style="display: flex; gap: 4px; background: var(--bg-hover, #f1f5f9); padding: 4px; border-radius: 8px;">
                        <button class="tab-btn active" data-action="switch-type-tab" data-value="all" style="background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s;">全部</button>
                    </div>
                </div>
                
                <div id="company-action-bar" style="padding: 1.5rem 1.5rem 0.5rem;">
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 1rem; flex-wrap: wrap;">
                        <div style="flex: 1; max-width: 400px;">
                            <input type="text" class="search-box" id="company-list-search" placeholder="搜尋公司名稱..." style="width: 100%;">
                        </div>
                        <button class="action-btn primary" data-action="toggle-quick-create" data-show="true" id="btn-toggle-create" style="font-size: 0.95rem; padding: 8px 18px; flex-shrink: 0; white-space: nowrap; font-weight: 600; display: inline-flex; justify-content: center; align-items: center;">
                            + 快速新增公司
                        </button>
                    </div>

                    <div style="margin-bottom: 0.5rem;display: flex; justify-content: flex-end;">
                        <div id="companies-count-display" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">共 0 筆</div>
                    </div>

                </div>

                <div id="company-quick-create-card" style="display: none; margin: 0 1.5rem 1.5rem; padding: 1.25rem; background-color: var(--secondary-bg); border: 2px solid var(--accent-blue); border-radius: var(--rounded-lg); box-shadow: 0 4px 12px rgba(0,0,0,0.1); animation: slideDown 0.3s ease-out;">
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <div style="font-weight: 700; color: var(--accent-blue); display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;">
                            <span style="font-size: 1.2rem;">🏢</span> 新增公司
                        </div>
                        <input type="text" id="quick-create-name-input" class="form-input" placeholder="請輸入完整公司名稱" style="flex-grow: 1; min-width: 250px; background: var(--primary-bg);">
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="action-btn secondary small" data-action="toggle-quick-create" data-show="false">取消</button>
                            <button class="action-btn primary small" data-action="submit-quick-create">🚀 建立並前往</button>
                        </div>
                    </div>
                </div>

                <div id="companies-list-content" class="widget-content" style="padding: 0;">
                    <div class="loading show"><div class="spinner"></div><p>載入公司列表中...</p></div>
                </div>
            </div>
        </div>
    `;

    try {
        // [PATCH Phase 10] Removed explicit opportunity fetch. opportunityCount is now baked into the /api/companies payload.
        const [listResult, systemConfigResult] = await Promise.all([
            authedFetch(`/api/companies`), 
            authedFetch(`/api/config`) 
        ]);

        if (systemConfigResult) {
            window.CRM_APP = window.CRM_APP || {};
            window.CRM_APP.systemConfig = systemConfigResult;
            
            renderCompanyTypeTabs(systemConfigResult['公司類型'] || []);
        }

        if (listResult.success) {
            // Mapping loop removed. Straight assignment of fully formed backend DTO.
            allCompaniesData = listResult.data || [];
            
            filterAndRenderCompanyList();

            const searchInput = document.getElementById('company-list-search');
            if (searchInput) searchInput.addEventListener('keyup', handleCompanyListSearch);
        } else {
             throw new Error(listResult.error || '無法獲取公司列表');
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            const contentDiv = document.getElementById('companies-list-content');
            if (contentDiv) contentDiv.innerHTML = `<div class="alert alert-error">載入公司列表失敗: ${error.message}</div>`;
        }
    }
}

// ==================== 4. 事件處理與輔助函式 ====================

function handleCompanyListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const payload = btn.dataset;
    e.stopPropagation();

    switch (action) {
        case 'switch-type-tab': 
            companyListFilters.type = payload.value;
            document.querySelectorAll('#company-type-tabs .tab-btn').forEach(tBtn => {
                const isActive = tBtn.dataset.value === companyListFilters.type;
                tBtn.style.background = isActive ? 'white' : 'transparent';
                tBtn.style.fontWeight = isActive ? '600' : '500';
                tBtn.style.color = isActive ? 'var(--accent-blue)' : 'var(--text-muted)';
                tBtn.style.boxShadow = isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
                if (isActive) tBtn.classList.add('active');
                else tBtn.classList.remove('active');
            });
            filterAndRenderCompanyList(); 
            break;
        case 'sort': handleCompanySort(payload.field); break;
        case 'toggle-quick-create': toggleQuickCreateCard(payload.show === 'true'); break;
        case 'submit-quick-create': submitQuickCreateCompany(); break;
        case 'delete-company': executeDeleteCompany(payload.id, payload.name).catch(console.error); break;
        case 'navigate':
            e.preventDefault();
            let params = {};
            if (payload.params) {
                try { params = JSON.parse(payload.params); } catch (err) { }
            }
            
            const targetId = params.companyId || payload.id;
            
            if (window.CRM_APP && window.CRM_APP.navigateTo && targetId) {
                CRM_APP.navigateTo(payload.page, { companyId: targetId });
            } else if (window.router && targetId) {
                window.router.push(`/companies/${encodeURIComponent(targetId)}/details`);
            } else {
                console.error('[Navigation] Missing companyId for company details');
            }
            break;
    }
}

function handleCompanyListKeydown(e) {
    if (e.target.id === 'quick-create-name-input' && e.key === 'Enter') submitQuickCreateCompany();
}

function filterAndRenderCompanyList() {
    const query = document.getElementById('company-list-search')?.value.toLowerCase() || '';
    const { type } = companyListFilters;
    const countDisplay = document.getElementById('companies-count-display');

    let filtered = allCompaniesData.filter(c => {
        const nameMatch = query ? (c.companyName || '').toLowerCase().includes(query) : true;
        const typeMatch = type === 'all' ? true : c.companyType === type;
        return nameMatch && typeMatch;
    });

    filtered.sort((a, b) => {
        let valA = a[currentSort.field];
        let valB = b[currentSort.field];
        const valAStr = String(valA || '');
        const valBStr = String(valB || '');
        
        if (currentSort.field === 'lastActivity') {
             const tA = new Date(valA || 0).getTime();
             const tB = new Date(valB || 0).getTime();
             return currentSort.direction === 'asc' ? tA - tB : tB - tA;
        }
        
        return currentSort.direction === 'asc' 
            ? valAStr.localeCompare(valBStr, 'zh-Hant') 
            : valBStr.localeCompare(valAStr, 'zh-Hant');
    });

    if (countDisplay) countDisplay.innerHTML = `共 ${filtered.length} 筆`;
    const listContent = document.getElementById('companies-list-content');
    if (listContent) listContent.innerHTML = renderCompaniesTable(filtered);
}

function renderCompaniesTable(companies) {
    if (!companies.length) return '<div class="alert alert-info" style="margin:2rem; text-align:center;">找不到符合條件的公司資料</div>';

    const systemConfig = window.CRM_APP?.systemConfig || {};
    const typeColors = new Map((systemConfig['公司類型'] || []).map(t => [t.value, t.color]));
    const stageColors = new Map((systemConfig['客戶階段'] || []).map(t => [t.value, t.color]));
    const ratingColors = new Map((systemConfig['互動評級'] || []).map(t => [t.value, t.color]));

    const renderSortHeader = (field, label) => {
        let icon = '↕';
        if (currentSort.field === field) icon = currentSort.direction === 'asc' ? '↑' : '↓';
        return `<th class="sortable" data-action="sort" data-field="${field}">${label} <span>${icon}</span></th>`;
    };

    let html = `<div class="comp-list-container"><table class="comp-list-table"><thead><tr>
                    <th style="width:60px;text-align:center;">項次</th>
                    ${renderSortHeader('lastActivity', '最後活動')}
                    <th>公司類型</th>
                    ${renderSortHeader('companyName', '公司名稱')}
                    ${renderSortHeader('opportunityCount', '機會數')}
                    <th>客戶階段</th>
                    <th>互動評級</th>
                    <th style="width:80px;text-align:center;">操作</th>
                </tr></thead><tbody>`;

    companies.forEach((c, i) => {
        const typeColor = typeColors.get(c.companyType) || '#9ca3af';
        const stageColor = stageColors.get(c.customerStage) || '#6b7280';
        const ratingColor = ratingColors.get(c.engagementRating) || '#6b7280';
        
        const navParams = JSON.stringify({ 
            companyId: c.companyId
        }).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
        
        const safeName = (c.companyName || '').replace(/"/g, '&quot;');

        html += `
            <tr>
                <td style="text-align:center;color:var(--text-muted);">${i + 1}</td>
                <td style="white-space:nowrap;">${c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '-'}</td>
                <td><span class="comp-type-chip" style="background:${typeColor}">${c.companyType || '未分類'}</span></td>
                <td>
                    <a href="#" class="text-link" data-action="navigate" data-page="company-details" data-params="${navParams}" data-id="${c.companyId}">
                        <strong>${c.companyName || '-'}</strong>
                    </a>
                </td>
                <td style="text-align:center;"><span class="comp-opp-count">${c.opportunityCount || 0}</span></td>
                <td><span class="comp-status-badge" style="background:${stageColor}">${c.customerStage || '-'}</span></td>
                <td><span class="comp-status-badge" style="background:${ratingColor}">${c.engagementRating || '-'}</span></td>
                <td style="text-align:center;">
                    <button class="btn-mini-delete" title="刪除公司" data-action="delete-company" data-id="${c.companyId}" data-name="${safeName}">
                        🗑️
                    </button>
                </td>
            </tr>`;
    });
    return html + '</tbody></table></div>';
}

function toggleQuickCreateCard(show) {
    const card = document.getElementById('company-quick-create-card');
    const input = document.getElementById('quick-create-name-input');
    const btn = document.getElementById('btn-toggle-create');
    if (!card) return;
    if (show) {
        card.style.display = 'block';
        if(btn) btn.style.display = 'none';
        if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
    } else {
        card.style.display = 'none';
        if(btn) btn.style.display = 'flex';
    }
}

async function submitQuickCreateCompany() {
    const input = document.getElementById('quick-create-name-input');
    const name = input?.value.trim();
    const toastFunc = window.showNotification || window.showToast;
    
    if (!name) { 
        if(toastFunc) toastFunc('請輸入公司名稱', 'warning'); 
        else alert('請輸入公司名稱');
        if(input) input.focus(); 
        return; 
    }
    
    if (typeof showLoading === 'function') showLoading('建立中...');
    try {
        const res = await authedFetch('/api/companies', { method: 'POST', body: JSON.stringify({ companyName: name }) });
        if (typeof hideLoading === 'function') hideLoading();
        
        if (res.success) {
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

            if(toastFunc) toastFunc('建立成功！', 'success');
            else alert('建立成功！');
            
            toggleQuickCreateCard(false);
            if (window.CRM_APP && window.CRM_APP.navigateTo) {
                CRM_APP.navigateTo('company-details', { 
                    companyId: res.data.companyId 
                });
            } else if (window.router) {
                window.router.push(`/companies/${encodeURIComponent(res.data.companyId)}/details`);
            }
        } else if (res.reason === 'EXISTS') {
            if(confirm(`公司「${name}」已存在，是否直接前往查看？`)) {
                if (window.CRM_APP && window.CRM_APP.navigateTo && res.data.companyId) {
                    CRM_APP.navigateTo('company-details', { 
                        companyId: res.data.companyId 
                    });
                }
            }
        } else { 
            if(toastFunc) toastFunc(res.error || '建立失敗', 'error'); 
            else alert(res.error || '建立失敗');
        }
    } catch (e) { 
        if (typeof hideLoading === 'function') hideLoading();
        if (e.message !== 'Unauthorized') {
            const msg = '建立失敗: ' + e.message;
            if(toastFunc) toastFunc(msg, 'error'); 
            else alert(msg);
        }
    }
}

function renderCompanyTypeTabs(options = []) {
    const tabsContainer = document.getElementById('company-type-tabs');
    if (!tabsContainer) return;
    
    const tabs = [{ value: 'all', label: '全部' }];
    options.forEach(opt => tabs.push({ value: opt.value, label: opt.note || opt.value }));
    
    let html = '';
    tabs.forEach(t => {
        const isActive = companyListFilters.type === t.value;
        const style = isActive 
            ? `background: white; border: none; padding: 8px 16px; font-weight: 600; color: var(--accent-blue); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s;` 
            : `background: transparent; border: none; padding: 8px 16px; font-weight: 500; color: var(--text-muted); border-radius: 6px; box-shadow: none; cursor: pointer; transition: all 0.2s;`;
        
        html += `<button class="tab-btn ${isActive ? 'active' : ''}" data-action="switch-type-tab" data-value="${t.value}" style="${style}">${t.label}</button>`;
    });
    
    tabsContainer.innerHTML = html;
}

function handleCompanyListSearch() { 
    if (typeof handleSearch === 'function') handleSearch(() => filterAndRenderCompanyList()); 
    else filterAndRenderCompanyList();
}
function handleCompanySort(f) { if (currentSort.field === f) { currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc'; } else { currentSort.field = f; currentSort.direction = 'desc'; } filterAndRenderCompanyList(); }

// Router Registration
window.loadCompaniesPage = loadCompaniesListPage;
if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules.companies = loadCompaniesListPage;
    console.log('✅ [CompanyList] Module registered');
}
</file>

<file path="public/styles/modules/layout.css">
/* File: public/styles/modules/layout.css */
/*
 * File Path: public/styles/modules/layout.css
 * Version: 1.1.38
 * Date: 2026-04-29
 * Changelog: 
 * - (v1.1.38) Dashboard Phase T2.1 - Trend Widget final semantics alignment.
 * - (v1.1.37) Dashboard Phase T2 - Official release of Dashboard Trend Widget with Cumulative view.
 * - (v1.1.36) Dashboard Phase T1/T1.1 - Added KPI Trend Widget styles.
 * - (v1.1.35) Dashboard Phase 3 - Upgrade KPI cards with visual accents, subtle hover interaction, spacing hierarchy, and trend typography.
 * - (v1.1.34) Dashboard Phase 2-B - Tune dashboard tokens for business KPI and information-feed balance.
 * - (v1.1.33) Dashboard Phase 2-A - Introduce local dashboard design tokens.
 * - (v1.1.32) Dashboard Phase 1.9-E - Balance 6/6 layout and compact announcement widget.
 * - (v1.1.31) Dashboard Phase 1.9-D - Restore fixed 3x2 KPI grid with no-overflow guard.
 * - (v1.1.30) Dashboard Phase 1.9-C - Fix stats-grid grid span conflict for KPI announcement two-column layout.
 * - (v1.1.29) Dashboard Phase 1.9-B - Adaptive KPI grid to preserve 3-column layout without breaking container width.
 * - (v1.1.28) Dashboard Phase 1.9 - KPI and announcement two-column top layout.
 * - (v1.1.27) Dashboard Phase 1.8 - Sharp dashboard blocks and half-width KPI cards.
 * - (v1.1.26) Dashboard Phase 1.7 - Sharp compact KPI cards and temporary announcement removal.
 * - (v1.1.25) Dashboard Phase 1.6 - Restore KPI grid and slim stat cards.
 * - (v1.1.24) Dashboard Phase 1.5 - Density & Alignment Polish.
 * - (v1.1.23) Dashboard Phase 1 - Industry Layout Structure (Section headers & KPI row).
 * - (v1.1.22) Dashboard Layout Debug Grid overlay.
 * - (v1.1.21) Centralized sidebar width variables.
 * - (v1.1.20) Header Icon Final Polish: removed remaining button feel and standardized icon control behavior.
 * - (v1.1.19) Header Polish V2 final format regeneration
 * - (v1.1.19) Removed system icon button feel
 * - (v1.1.19) Refined header typography
 * - (v1.1.19) Scoped compact primary header actions
 * - (v1.1.18) Header Polish V2: removed system icon button feel and refined header typography.
 * - (v1.1.17) Header Polish V2: refined ghost icon controls and scoped compact header primary actions.
 * - (v1.1.16) Header Refinement Patch: Added .header-ghost-btn for system controls and adjusted .header-action-group-user margin-left to spacing-4.
 * - (v1.1.15) Header Hierarchy Patch: Implemented product-grade header grouping with distinct user identity zone using margin-left separation.
 * - (v1.1.14) Header User Identity Patch: Implemented strict two-line flex layout with 2px gap, removed margin hacks, and normalized text line styles.
 * - (v1.1.13) Header User Identity Spacing Patch: Increased gap to 12px and refined 2-line identity text styles.
 * - (v1.1.5) Restored subtle border-bottom to .page-header to provide separation during scrolling.
 * - (v1.1.5) Removed border-top from #page-content-container. Ensured border-left defines the left boundary.
 * - (v1.1.4) Added border-left to #page-content-container to complete the content boundary.
 * - (v1.1.3) Removed border-bottom from .page-header to seamlessly unify it with the app shell.
 * - (v1.1.3) Added a very subtle border-top to #page-content-container.
 * - (v1.1.2) Added flex layout to .header-content > div to place title and subtitle inline.
 * - (v1.1.1) Modified .page-header padding to reduce height and align left edge with sidebar.
 * - (v1.1.0) Modified .main-content to set padding: 0. Modified .page-header to sticky app bar.
 */

/* ==================== modules/layout.css ==================== */

/* 應用程式佈局 */
.app-layout {
    display: flex;
    min-height: 100vh;
    position: relative;
}

/* 主要內容區域 */
.main-content {
    flex: 1; 
    margin-left: var(--sidebar-width);
    background: var(--primary-bg); 
    min-height: 100vh;
    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
}

/* ========== 收合狀態下主內容區的樣式 ========== */
.app-layout.sidebar-collapsed .main-content {
    margin-left: var(--sidebar-collapsed-width);
}

.page-header {
    background: var(--secondary-bg);
    border-bottom: 1px solid rgba(148, 163, 184, 0.25);
    padding: var(--spacing-2) var(--spacing-6) var(--spacing-2) var(--spacing-3);
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: var(--spacing-5);
    border-radius: 0;
    box-shadow: none;
    margin: 0;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content { 
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-4);
    min-width: 0;
    flex: 1;
}

.header-content > div {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: nowrap;
    min-width: 0;
}

.header-content h1 {
    font-size: calc(var(--font-size-xl) + 2px);
    font-weight: 700; 
    margin-bottom: 0;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.page-subtitle { 
    color: var(--text-secondary); 
    font-size: 13px; 
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.header-actions {
    display: flex;
    gap: var(--spacing-5);
    flex-wrap: wrap;
    align-items: center;
    margin-left: auto;
}

.header-action-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex-wrap: nowrap;
}

.header-action-group-primary .action-btn {
    height: 32px;
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 14px;
}

.header-action-group-primary .action-btn svg {
    width: 16px;
    height: 16px;
}

.header-action-group-user {
    margin-left: var(--spacing-4);
}

.header-ghost-btn {
    padding: 6px;
    width: 30px;
    min-width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: transparent;
    border: none !important;
    box-shadow: none !important;
    outline: none;
    transform: none;
}

.header-ghost-btn:hover {
    background: rgba(148, 163, 184, 0.08);
    transform: none;
    opacity: 1;
}

.header-ghost-btn svg {
    width: 16px;
    height: 16px;
    display: block;
}

#page-content-container {
    padding: var(--spacing-7, 28px);
    border-left: 1px solid rgba(148, 163, 184, 0.25);
}

/* 儀表板網格 */
.dashboard-grid-flexible {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--spacing-5);
}

.grid-col-3 { grid-column: span 3; }
.grid-col-4 { grid-column: span 4; }
.grid-col-5 { grid-column: span 5; }
.grid-col-6 { grid-column: span 6; }
.grid-col-7 { grid-column: span 7; }
.grid-col-8 { grid-column: span 8; }
.grid-col-12 { grid-column: span 12; }

.dashboard-widget {
    background: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-xl);
    padding: var(--spacing-6);
    box-shadow: var(--shadow-md);
    display: flex;
    flex-direction: column;
}

.widget-header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    margin-bottom: var(--spacing-5);
    flex-shrink: 0;
}

.widget-title { 
    font-size: var(--font-size-lg); 
    font-weight: 700; 
    color: var(--text-primary); 
    margin: 0; 
}

.widget-content { 
    flex-grow: 1;
    min-height: 1px;
}

/* ==================== Dashboard Layout Debug Grid ==================== */
.dashboard-grid-flexible.debug-grid {
    position: relative;
}

.dashboard-grid-flexible.debug-grid::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 999;
    background-image: repeating-linear-gradient(
        to right,
        transparent 0%,
        transparent calc(100% / 12 - 1px),
        rgba(148, 163, 184, 0.15) calc(100% / 12 - 1px),
        rgba(148, 163, 184, 0.15) calc(100% / 12)
    );
}

/* ==================== Header User Area Consolidation ==================== */

.header-actions .action-btn.danger {
    display: none !important;
}

.header-actions .user-info {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 4px 6px;
    border-radius: 0; 
    cursor: pointer;
    background: transparent;
    transition: opacity 0.2s ease;
}

.header-actions .user-info:hover {
    opacity: 0.8;
    background: transparent;
}

.header-actions .user-info svg {
    flex-shrink: 0;
    margin-left: 4px;
    opacity: 0.6;
}

/* ==================== Session User Avatar Styles ==================== */

.user-avatar {
    width: 38px;
    height: 38px;
    margin-right: 12px; 
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
    background-color: var(--glass-bg);
    background-size: 70%;
    background-repeat: no-repeat;
    background-position: center;
    border: 1px solid rgba(148, 163, 184, 0.15); 
}

/* ==================== Header User Identity Block Styles ==================== */

.user-identity-text {
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.15;
    min-width: 0;
    gap: 2px;
}

.user-identity-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    margin: 0;
}

.user-identity-account {
    font-size: 12px;
    color: var(--text-secondary);
    opacity: 0.65;
    white-space: nowrap;
    margin: 0;
}

/* ==================== Header User Dropdown ==================== */

.user-dropdown-container {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.user-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 160px;
    background: var(--secondary-bg);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 6px;
    z-index: 200;
    display: none;
}

.user-dropdown-container.open .user-dropdown-menu {
    display: block;
}

.user-dropdown-menu .user-dropdown-item {
    width: 100%;
    display: flex !important;
    align-items: center;
    justify-content: flex-start;
    margin: 0;
    padding: 8px 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
    text-align: left;
    height: auto;
    backdrop-filter: none;
}

.user-dropdown-menu .user-dropdown-item:hover {
    background: var(--glass-bg);
}

.user-dropdown-menu .user-dropdown-item.danger {
    color: var(--accent-red);
}

/* ==================== Dashboard Sharp & Dual-Column Layout (Phase 2-B) ==================== */

#page-dashboard {
    --dashboard-card-radius: 0;
    --dashboard-kpi-card-padding: 16px 18px;
    --dashboard-kpi-icon-size: 30px;
    --dashboard-kpi-number-size: 36px;
    --dashboard-kpi-number-line-height: 1.05;
    --dashboard-kpi-label-size: 14px;
    --dashboard-kpi-trend-size: 13px;
    --dashboard-announcement-title-size: 14px;
    --dashboard-announcement-body-size: 12px;
    --dashboard-announcement-item-padding: 7px 10px;
    --dashboard-announcement-max-height: 250px;
}

/* Sharp edges for all dashboard blocks */
#page-dashboard .dashboard-widget {
    border-radius: var(--dashboard-card-radius);
}

/* Fix stats-grid grid span conflict (cite: Phase 1.9-C) */
#page-dashboard .dashboard-grid-flexible > .stats-grid.grid-col-6 {
    grid-column: span 6;
}

/* Fixed 3x2 KPI Grid with Balance (cite: Phase 1.9-E) */
#page-dashboard .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-5);
    min-width: 0;
}

/* Compact Announcement Widget (cite: Phase 1.9-E) */
#page-dashboard #announcement-widget {
    max-height: var(--dashboard-announcement-max-height);
    overflow: hidden;
}

#page-dashboard #announcement-widget .widget-header {
    margin-bottom: 8px;
}

#page-dashboard #announcement-widget .widget-title {
    font-size: var(--dashboard-announcement-title-size);
}

#page-dashboard #announcement-widget .widget-content {
    overflow-y: auto;
    min-height: 0;
    font-size: var(--dashboard-announcement-body-size);
}

#page-dashboard #announcement-widget button,
#page-dashboard #announcement-widget .action-btn,
#page-dashboard #announcement-widget a {
    font-size: var(--dashboard-announcement-body-size);
}

#page-dashboard #announcement-widget .announcement-item,
#page-dashboard #announcement-widget .announcement-card,
#page-dashboard #announcement-widget .announcement-content {
    padding: var(--dashboard-announcement-item-padding);
}

/* Compact KPI Card Styles & Overflow Guard (cite: Phase 1.9-E) */
#page-dashboard .stat-card {
    padding: var(--dashboard-kpi-card-padding);
    min-height: auto;
    border-radius: var(--dashboard-card-radius);
    box-shadow: var(--shadow-md);
    width: 100%;
    min-width: 0;
    overflow: hidden;
    transition: transform 120ms ease, box-shadow 120ms ease;
}

#page-dashboard .stat-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}

#page-dashboard .stat-label,
#page-dashboard .stat-number,
#page-dashboard .stat-trend {
    min-width: 0;
    white-space: nowrap;
}

#page-dashboard .stat-header {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
}

#page-dashboard .stat-icon {
    width: var(--dashboard-kpi-icon-size);
    height: var(--dashboard-kpi-icon-size);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
}

#page-dashboard .stat-icon svg {
    width: 18px;
    height: 18px;
}

#page-dashboard .stat-label {
    font-size: var(--dashboard-kpi-label-size);
    font-weight: 500;
    opacity: 0.85;
    color: var(--text-secondary);
}

#page-dashboard .stat-number {
    font-size: var(--dashboard-kpi-number-size);
    line-height: var(--dashboard-kpi-number-line-height);
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--text-primary);
}

#page-dashboard .stat-trend {
    margin-top: 4px;
    font-size: var(--dashboard-kpi-trend-size);
    font-weight: 500;
    opacity: 0.9;
}

#page-dashboard .stat-trend.trend-positive { color: #10b981; }
#page-dashboard .stat-trend.trend-negative { color: #ef4444; }
#page-dashboard .stat-trend.trend-neutral { color: #94a3b8; }

/* KPI Card Colors & Accents */
#page-dashboard .stat-card.blue { border-top: 2px solid #3b82f6; }
#page-dashboard .stat-card.blue .stat-icon { background: rgba(59, 130, 246, 0.7); color: #3b82f6; }

#page-dashboard .stat-card.green { border-top: 2px solid #10b981; }
#page-dashboard .stat-card.green .stat-icon { background: rgba(16, 185, 129, 0.7); color: #10b981; }

#page-dashboard .stat-card.orange { border-top: 2px solid #f97316; }
#page-dashboard .stat-card.orange .stat-icon { background: rgba(249, 115, 22, 0.7); color: #f97316; }

#page-dashboard .stat-card.purple { border-top: 2px solid #8b5cf6; }
#page-dashboard .stat-card.purple .stat-icon { background: rgba(139, 92, 246, 0.7); color: #8b5cf6; }

#page-dashboard .stat-card.cyan { border-top: 2px solid #06b6d4; }
#page-dashboard .stat-card.cyan .stat-icon { background: rgba(6, 182, 212, 0.7); color: #06b6d4; }

#page-dashboard .stat-card.teal { border-top: 2px solid #14b8a6; }
#page-dashboard .stat-card.teal .stat-icon { background: rgba(20, 184, 166, 0.7); color: #14b8a6; }

/* ==================== KPI Trend Widget (Phase T1/T1.1/T2/T2.1) ==================== */
#kpi-trend-widget {
    display: flex;
    flex-direction: column;
}
#kpi-trend-widget .widget-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
}
#trend-chart-container {
    width: 100%;
    height: 100%;
    min-height: 280px;
}
</file>

</files>
