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