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