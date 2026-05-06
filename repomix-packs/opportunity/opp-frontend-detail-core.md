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
- Only files matching these patterns are included: public/views/opportunity-detail.html, public/scripts/opportunities/opportunity-details.js, public/scripts/opportunities/opportunity-details-events.js, public/scripts/opportunities/details/opportunity-info-view.js, public/scripts/opportunities/details/opportunity-details-components.js, public/styles/modules/layout.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/scripts/opportunities/details/opportunity-details-components.js
public/scripts/opportunities/details/opportunity-info-view.js
public/scripts/opportunities/opportunity-details-events.js
public/scripts/opportunities/opportunity-details.js
public/styles/modules/layout.css
public/views/opportunity-detail.html
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/scripts/opportunities/details/opportunity-details-components.js">
// ============================================================================
// File: public/scripts/opportunities/details/opportunity-details-components.js
// ============================================================================
// public/scripts/opportunity-details/opportunity-details-components.js
// 職責：整合機會詳細頁面組件，處理編輯邏輯與資料存取
// * @version 1.1.2 (Phase 8.6A Perf Patch)
// * @date 2026-03-11
// (依賴 OpportunityInfoView 進行顯示模式渲染)

function _injectStylesForOppInfoCard() {
    const styleId = 'opportunity-info-card-container-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* 容器基礎樣式 */
        .opportunity-info-card {
            background-color: var(--secondary-bg);
            padding: var(--spacing-6);
            border-radius: var(--rounded-xl);
            border: 1px solid var(--border-color);
            margin-bottom: var(--spacing-6);
            transition: all 0.3s ease;
        }
        /* 編輯模式專用樣式 (保留原本邏輯) */
        .info-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .editing .info-card-header {
            padding-bottom: var(--spacing-4);
            margin-bottom: var(--spacing-4);
            border-bottom: 1px solid var(--border-color);
        }
        .edit-form-columns { display: flex; gap: var(--spacing-8); align-items: flex-start; }
        .form-col { flex: 1; display: flex; flex-direction: column; gap: var(--spacing-5); min-width: 0; }
        @media (max-width: 900px) { .edit-form-columns { flex-direction: column; gap: var(--spacing-6); } }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 500; }
        .form-input, .form-select, .form-textarea {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: var(--rounded-md);
            background: var(--primary-bg);
            color: var(--text-primary);
            font-size: var(--font-size-base);
        }
        .form-input:read-only, .form-select:disabled, .form-input:disabled { 
            background-color: var(--secondary-bg); 
            cursor: not-allowed; 
            opacity: 0.7; 
            color: var(--text-muted); 
            border-color: var(--border-color);
        }
        .pills-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .info-option-pill {
            padding: 6px 14px; border-radius: var(--rounded-full); font-size: 0.85rem; border: 1px solid var(--border-color);
            cursor: pointer; background: var(--primary-bg); color: var(--text-muted); transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 6px; user-select: none;
        }
        .info-option-pill:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
        .info-option-pill.selected {
            background: color-mix(in srgb, var(--accent-blue) 15%, transparent); color: var(--accent-blue);
            border-color: var(--accent-blue); font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .pill-quantity { display: inline-block; padding: 0px 6px; font-size: 0.75rem; font-weight: 700; background-color: var(--accent-blue); color: white; border-radius: var(--rounded-md); }
        .spec-category-group { margin-bottom: 8px; }
        .spec-category-title { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }
        .spec-pills-wrapper { display: flex; flex-wrap: wrap; gap: 8px; }
        .manual-override-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; margin-top: 4px; }
        .notes-section { margin-top: var(--spacing-6); padding-top: var(--spacing-4); border-top: 1px solid var(--border-color); }
    `;
    document.head.appendChild(style);
}

const OpportunityInfoCard = (() => {
    let _currentOpp = null;
    let _isCascadingInitialized = false; // [Phase 8.6A] Lazy Load Tracker

    async function _getCompanyList() {
        if (window.CRM_APP && window.CRM_APP.companyList && window.CRM_APP.companyList.length > 0) return window.CRM_APP.companyList;
        try {
            const response = await authedFetch('/api/companies');
            if (response.success) {
                if (window.CRM_APP) window.CRM_APP.companyList = response.data;
                return response.data;
            }
        } catch (e) { console.error('獲取公司列表失敗', e); }
        return [];
    }

    function render(opp) {
        _currentOpp = opp;
        _isCascadingInitialized = false; // Reset on re-render

        _injectStylesForOppInfoCard();
        const container = document.getElementById('opportunity-info-card-container');
        if (!container) return;

        // 【修改點】直接呼叫 OpportunityInfoView 來產生顯示模式 HTML
        const displayModeHtml = OpportunityInfoView 
            ? OpportunityInfoView.render(opp) 
            : '<div class="alert alert-error">View Module Missing</div>';

        container.innerHTML = `
            <div id="opportunity-info-display-mode">
                ${displayModeHtml}
            </div>
            <div id="opportunity-info-edit-mode" style="display: none;">
                </div>
        `;

        // 預先生成編輯表單，以便切換時使用
        _generateEditFormHTML(opp).then(html => {
            const editContainer = document.getElementById('opportunity-info-edit-mode');
            if (editContainer) {
                editContainer.innerHTML = html;
                // [Phase 8.6A PERF] Removed eager _initCascadingLogic(opp) to prevent duplicate companyList fetch.
            }
        });
    }

    // [Phase 8.6A PERF] Lazy Initialization Entry Point
    async function ensureCascadingLogic(opp) {
        if (_isCascadingInitialized) return;
        await _initCascadingLogic(opp);
        _isCascadingInitialized = true;
    }

    // ================== 以下為編輯模式邏輯 ==================

    function _renderPillsGroup(configKey, currentValue, fieldId) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const options = systemConfig[configKey] || [];
        
        let pillsHtml = '';
        options.forEach(opt => {
            const isSelected = opt.value === currentValue;
            pillsHtml += `
                <span class="info-option-pill single-select ${isSelected ? 'selected' : ''}" 
                      data-value="${opt.value}" 
                      data-field-target="${fieldId}"
                      onclick="OpportunityInfoCardEvents.handleSingleSelectClick(this)">
                    ${opt.note || opt.value}
                </span>
            `;
        });
        
        return `
            <div class="pills-container single-select-container">
                ${pillsHtml}
                <input type="hidden" id="edit-${fieldId}" value="${currentValue || ''}">
            </div>
        `;
    }

    function _renderCustomPillsGroup(options, currentValue, fieldId, clickHandler) {
        let pillsHtml = '';
        options.forEach(opt => {
            const isSelected = opt === currentValue;
            pillsHtml += `
                <span class="info-option-pill single-select ${isSelected ? 'selected' : ''}" 
                      data-value="${opt}" 
                      data-field-target="${fieldId}"
                      onclick="${clickHandler}(this)">
                    ${opt}
                </span>
            `;
        });
        
        return `
            <div class="pills-container single-select-container">
                ${pillsHtml}
                <input type="hidden" id="edit-${fieldId}" value="${currentValue || ''}">
            </div>
        `;
    }

    function _renderSpecsGroup(opp) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const specsConfig = systemConfig['可能下單規格'] || [];
        
        let specQuantities = new Map();
        try {
            const parsed = JSON.parse(opp.potentialSpecification);
            if (parsed && typeof parsed === 'object') specQuantities = new Map(Object.entries(parsed));
        } catch (e) {}

        const groups = new Map();
        specsConfig.forEach(spec => {
            const cat = spec.category || '其他';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(spec);
        });

        let html = '<div id="spec-pills-container" class="form-group">';
        groups.forEach((items, category) => {
            let pillsHtml = '';
            items.forEach(spec => {
                const quantity = specQuantities.get(spec.value) || 0;
                const isSelected = specQuantities.has(spec.value);
                let qtyHtml = '';
                if (isSelected && spec.value3 === 'allow_quantity' && quantity > 0) {
                    qtyHtml = `<span class="pill-quantity" data-spec-id="${spec.value}">(x${quantity})</span>`;
                }
                pillsHtml += `
                    <span class="info-option-pill ${isSelected ? 'selected' : ''}" 
                          data-spec-id="${spec.value}" 
                          title="${spec.note}">
                        ${spec.note || spec.value}
                        ${qtyHtml}
                    </span>
                `;
            });
            html += `
                <div class="spec-category-group">
                    <div class="spec-category-title">▼ ${category}</div>
                    <div class="spec-pills-wrapper">${pillsHtml}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    async function _generateEditFormHTML(opp) {
        const salesModel = opp.salesModel || '直接販售';
        const isManualValue = opp.opportunityValueType === 'manual';
        
        const rawValue = opp.opportunityValue;
        const formattedValue = String(rawValue !== null && rawValue !== undefined ? rawValue : '0').replace(/,/g, '');
        
        const salesModelOptions = ['直接販售', '經由SI販售', '經由MTB販售'];
        
        const createdDate = opp.createdTime ? opp.createdTime.split('T')[0] : '';
        const expectedDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '';

        const initSalesChannel = opp.salesChannel || opp.channelDetails || '';

        return `
            <div class="info-card-header">
                <h2 class="widget-title" style="margin: 0;">編輯核心資訊</h2>
                <div style="display: flex; gap: 8px;">
                    <button class="action-btn small secondary" onclick="OpportunityInfoCardEvents.toggleEditMode(false)">取消</button>
                    <button class="action-btn small primary" onclick="OpportunityInfoCardEvents.save()">💾 儲存</button>
                </div>
            </div>

            <div class="edit-form-columns">
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">機會名稱</label>
                        <input type="text" id="edit-opportunity-name" class="form-input" value="${opp.opportunityName || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">銷售模式</label>
                        ${_renderCustomPillsGroup(salesModelOptions, salesModel, 'sales-model', 'OpportunityInfoCardEvents.handleSalesModelPillClick')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">終端客戶 (客戶公司)</label>
                        <select id="edit-customer-company" class="form-select" onchange="OpportunityInfoCardEvents.handleCustomerChange(this.value)">
                            <option value="">載入中...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">終端窗口 (聯絡人)</label>
                        <select id="edit-main-contact" class="form-select">
                            <option value="">載入中...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">主要通路/下單方 (公司選擇)</label>
                        <select id="edit-channel-details" class="form-select" onchange="OpportunityInfoCardEvents.handleChannelChange(this.value)">
                            <option value="">載入中...</option>
                        </select>
                        <input type="hidden" id="edit-sales-channel" value="${initSalesChannel}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">通路窗口 (聯絡人)</label>
                        <select id="edit-channel-contact" class="form-select">
                            <option value="">-- 請先選擇通路公司 --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會價值</label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input type="text" id="edit-opportunity-value" class="form-input" 
                                   value="${formattedValue}" ${isManualValue ? '' : 'disabled'} style="flex:1;">
                        </div>
                        <label class="manual-override-label">
                            <input type="checkbox" id="value-manual-override-checkbox" 
                                   onchange="OpportunityInfoCardEvents.handleManualOverride(this)"
                                   ${isManualValue ? 'checked' : ''}>
                            手動覆蓋自動計算
                        </label>
                    </div>

                    <div class="form-group">
                        <label class="form-label">負責業務</label>
                        ${_renderPillsGroup('團隊成員', opp.assignee, 'assignee')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會種類</label>
                        ${_renderPillsGroup('機會種類', opp.opportunityType, 'opportunity-type')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">設備規模</label>
                        ${_renderPillsGroup('設備規模', opp.deviceScale, 'device-scale')}
                    </div>
                </div>

                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">下單機率</label>
                        ${_renderPillsGroup('下單機率', opp.orderProbability, 'order-probability')}
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">建立機會日期</label>
                        <input type="date" id="edit-created-time" class="form-input" 
                               value="${createdDate}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">預計結案日</label>
                        <input type="date" id="edit-expected-close-date" class="form-input" 
                               value="${expectedDate}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">目前階段</label>
                        ${_renderPillsGroup('機會階段', opp.currentStage, 'current-stage')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會來源</label>
                        ${_renderPillsGroup('機會來源', opp.opportunitySource, 'opportunity-source')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">可能下單規格 (複選)</label>
                        ${_renderSpecsGroup(opp)}
                    </div>
                </div>
            </div>

            <div class="notes-section">
                <div class="form-group">
                    <label class="form-label">備註</label>
                    <textarea id="edit-notes" class="form-textarea" rows="3">${opp.notes || ''}</textarea>
                </div>
            </div>
        `;
    }

    async function _initCascadingLogic(opp) {
        const companies = await _getCompanyList();
        
        // 1. 初始化「終端客戶」下拉選單
        const customerSelect = document.getElementById('edit-customer-company');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">-- 請選擇 --</option>';
            companies.forEach(c => {
                const option = document.createElement('option');
                option.value = c.companyName;
                option.text = c.companyName;
                if (c.companyName === opp.customerCompany) option.selected = true;
                customerSelect.add(option);
            });
        }

        // 3. 連動邏輯 (銷售模式 -> 通路列表)
        await handleSalesModelChange(opp.salesModel || '直接販售', false);
    }

    async function handleSalesModelChange(modelValue, resetValue = true) {
        const channelSelect = document.getElementById('edit-channel-details');
        const channelContactSelect = document.getElementById('edit-channel-contact');
        const customerSelect = document.getElementById('edit-customer-company');
        
        if (!channelSelect || !customerSelect) return;

        const currentCustomer = customerSelect.value;
        const savedChannelDetails = _currentOpp ? (_currentOpp.channelDetails || '') : '';
        const companies = await _getCompanyList();
        
        channelSelect.innerHTML = '';
        
        if (modelValue === '直接販售') {
            const option = document.createElement('option');
            option.value = currentCustomer;
            option.text = currentCustomer ? `${currentCustomer} (直販)` : '-- 同終端客戶 --';
            option.selected = true;
            channelSelect.add(option);
            
            channelSelect.disabled = true; 

            if (channelContactSelect) {
                channelContactSelect.innerHTML = '<option value="">-- 不適用 --</option>';
                channelContactSelect.disabled = true;
            }

        } else {
            channelSelect.disabled = false;

            const typeKeyword = modelValue.includes('SI') ? 'SI' : (modelValue.includes('MTB') ? 'MTB' : '');
            let filteredCompanies = companies.filter(c => {
                const type = (c.companyType || c.type || '').toUpperCase();
                return type.includes(typeKeyword);
            });
            if (filteredCompanies.length === 0 && companies.length > 0) filteredCompanies = companies;

            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.text = "-- 請選擇合作夥伴 --";
            channelSelect.add(defaultOption);

            filteredCompanies.forEach(c => {
                const option = document.createElement('option');
                option.value = c.companyName;
                option.text = c.companyName;
                
                if (!resetValue && c.companyName === savedChannelDetails) {
                    option.selected = true;
                }
                channelSelect.add(option);
            });
            
            if (!resetValue && savedChannelDetails && !filteredCompanies.some(c => c.companyName === savedChannelDetails)) {
                 const option = document.createElement('option');
                 option.value = savedChannelDetails;
                 option.text = savedChannelDetails + ' (非清單)';
                 option.selected = true;
                 channelSelect.add(option);
            }
            
            if (channelContactSelect && resetValue) {
                channelContactSelect.innerHTML = '<option value="">-- 請先選擇通路公司 --</option>';
                channelContactSelect.disabled = true; 
            }
        }
    }

    return { render, handleSalesModelChange, ensureCascadingLogic };
})();

// OpportunityAssociatedOpps 保持不變
const OpportunityAssociatedOpps = (() => {
    async function _handleRemoveParentLink(opportunityId, rowIndex) {
        showConfirmDialog('您確定要移除此母機會關聯嗎？', async () => {
            showLoading('正在移除關聯...');
            try {
                const result = await authedFetch(`/api/opportunities/${opportunityInfo.opportunityId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ parentOpportunityId: '', modifier: getCurrentUser() })
                });
                if (!result.success) throw new Error(result.error || '移除失敗');
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`移除關聯失敗: ${error.message}`, 'error');
            } finally { hideLoading(); }
        });
    }

    function render(details) {
        const container = document.getElementById('associated-opportunities-list');
        const addButton = document.getElementById('add-associated-opportunity-btn');
        if (!container || !addButton) return;
        const { opportunityInfo, parentOpportunity, childOpportunities } = details;
        let html = '';
        addButton.style.display = 'flex'; 
        addButton.onclick = () => showLinkOpportunityModal(opportunityInfo.opportunityId, opportunityInfo.rowIndex);
        if (parentOpportunity) {
            html += `<div class="summary-item" style="margin-bottom: 1rem;"><span class="summary-label">母機會</span><div style="display: flex; align-items: center; gap: 10px;"><span class="summary-value" style="font-size: 1rem;"><a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${parentOpportunity.opportunityId}' })">${parentOpportunity.opportunityName}</a></span><button class="action-btn small danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="OpportunityAssociatedOpps._handleRemoveParentLink('${opportunityInfo.opportunityId}', ${opportunityInfo.rowIndex})" title="移除母機會關聯">移除</button></div></div>`;
            addButton.textContent = '✏️ 變更母機會';
        } else { addButton.textContent = '+ 設定母機會'; }
        if (childOpportunities && childOpportunities.length > 0) {
            html += `<div class="summary-item"><span class="summary-label">子機會 (${childOpportunities.length})</span></div><ul style="list-style: none; padding-left: 1rem; margin-top: 0.5rem;">`;
            childOpportunities.forEach(child => { html += `<li style="margin-bottom: 0.5rem;"><a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${child.opportunityId}' })">${child.opportunityName}</a></li>`; });
            html += `</ul>`;
        }
        if (!parentOpportunity && (!childOpportunities || childOpportunities.length === 0)) html = '<div class="alert alert-info">尚無關聯機會。</div>';
        container.innerHTML = html;
    }
    return { render, _handleRemoveParentLink };
})();
</file>

<file path="public/scripts/opportunities/details/opportunity-info-view.js">
// public/scripts/opportunities/details/opportunity-info-view.js
// -------------------------------------------------------------------------
// 檔案職責：專門負責「機會核心資訊」的純顯示模式 (Read-Only UI)
// UI 風格：Final Polish + Bento Grid Optimization
// 修改紀錄：[2026-03-02] Phase 8 Patch: 
// 1. Safe JSON parsing for specifications to prevent console warnings
// 2. Support both Object and String formats for potentialSpecification
// -------------------------------------------------------------------------

const OpportunityInfoView = (() => {

    function _injectStyles() {
        const styleId = 'opportunity-info-view-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- 基礎容器 --- */
            .opp-view-container {
                display: flex;
                flex-direction: column;
                gap: 16px; /* 統一主要間距 */
                width: 100%;
                box-sizing: border-box;
                position: relative;
            }

            /* --- 全域區塊標題 --- */
            .main-section-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-muted);
                margin-bottom: -8px;
                margin-left: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            /* 中間插入的標題間距 */
            .mid-section-title {
                margin-top: 4px;
                margin-bottom: -8px;
            }

            /* --- 通用卡片基底 (應用 Bento 圓角與互動) --- */
            .layer-card {
                background-color: var(--primary-bg, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 2px 4px rgba(0,0,0,0.04); /* 柔和初始陰影 */
                padding: 20px;
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            
            /* ★ Bento Style: 懸停浮起效果 */
            .layer-card:hover {
                transform: translateY(-3px); 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
            }
            
            /* 針對沒有 Padding 的 split card 移除 hover 效果，避免衝突 */
            .card-split-royal-blue:hover {
                transform: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            }

            /* 統一標題樣式 (預設灰色) */
            .unified-label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1.2;
            }

            /* 內部卡片標題 (預設灰色) */
            .inner-card-title {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* ==========================================================================
               Row 1: 頂部資訊列
               ========================================================================== */
            .header-separate-row {
                display: flex;
                gap: 16px; /* 統一間距 */
                align-items: stretch;
                width: 100%;
            }
            .header-card-name {
                flex: 70; 
                justify-content: center;
                align-items: flex-start;
                gap: 6px;
                padding: 20px 24px;
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                transition: all 0.3s;
            }
            .header-card-name:hover {
                transform: translateY(-3px); /* 跟隨 Bento 效果 */
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .name-title {
                font-size: 1.8rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.2;
                margin: 0;
            }
            .header-card-mini {
                flex: 10;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 12px 4px;
                gap: 4px;
                min-width: 0;
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                transition: all 0.3s;
            }
            .header-card-mini:hover {
                transform: translateY(-3px); /* 跟隨 Bento 效果 */
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .header-card-action-btn {
                flex: 10;
                align-items: center;
                justify-content: center;
                padding: 0;
                /* 保持橘色風格，但圓角加大 */
                background: linear-gradient(135deg, #f97316, #ea580c);
                border: 1px solid #c2410c;
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);
                display: flex;
                flex-direction: column;
                gap: 6px;
                cursor: pointer;
                transition: transform 0.1s, box-shadow 0.2s;
                text-align: center;
                color: white;
                font-weight: 700;
                text-decoration: none;
            }
            .header-card-action-btn:hover {
                transform: translateY(-4px); /* 加大浮動距離，更像按鈕 */
                box-shadow: 0 8px 15px rgba(249, 115, 22, 0.4);
                background: linear-gradient(135deg, #fb923c, #f97316);
            }
            .header-card-action-btn:active { transform: translateY(0); }
            .edit-btn-content {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 0.85rem;
                letter-spacing: 1px;
            }
            .edit-icon-svg { width: 14px; height: 14px; stroke-width: 3; }
            .mini-header-value {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.3;
                word-break: break-word; 
            }

            /* ==========================================================================
               Row 2: 關鍵指標
               ========================================================================== */
            .stats-grid-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px; /* 統一間距 */
                width: 100%;
            }
            .big-stat-card {
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                padding: 24px 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                justify-content: flex-start;
                align-items: flex-start;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            /* ★ Bento Style: 懸停浮起效果 */
            .big-stat-card:hover {
                transform: translateY(-3px); 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
            }

            /* 特殊樣式：翡翠綠金幣卡 (Saturated Emerald) */
            .card-style-green {
                background-color: #059669; /* Emerald 600 */
                border: 1px solid #047857; /* Emerald 700 */
                color: white; /* 全白文字 */
            }
            .card-style-green .unified-label {
                color: rgba(255, 255, 255, 0.9); 
                border-bottom-color: rgba(255, 255, 255, 0.3);
            }
            .card-style-green .stat-value {
                color: #ffffff;
            }
            
            .stat-value {
                font-size: 1.4rem;
                font-weight: 700;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            .stat-value.val-money { 
                font-size: 2rem; 
                font-family: 'Roboto Mono', monospace; 
                letter-spacing: -1px; 
            }

            /* ==========================================================================
               Row 3: 三欄並列
               ========================================================================== */
            .triple-col-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 16px; /* 統一間距 */
                align-items: stretch;
                width: 100%;
            }
            .triple-col-row .layer-card { height: 100%; }

            /* ★ 商流卡片：寶藍色分層設計 (Royal Blue Split Card) */
            .card-split-royal-blue {
                padding: 0 !important; 
                border: 1px solid #1d4ed8; /* Blue 700 Border */
                overflow: hidden;
                background-color: white;
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
            }
            
            /* 上半部：寶藍色標頭 */
            .split-card-header {
                background-color: #1d4ed8; /* Blue 700 (Royal Blue) */
                color: white;
                padding: 16px;
                text-align: center;
                border-bottom: 1px solid #1e40af;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                flex: 0 0 auto;
                min-height: 50px;
            }
            .split-header-text {
                font-size: 1.2rem;
                font-weight: 700;
                letter-spacing: 0.5px;
            }

            /* 下半部：白底內容 (Body) */
            .split-card-body {
                background-color: white;
                padding: 16px 20px;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 12px;
            }

            .split-target-name {
                font-size: 1.3rem; 
                font-weight: 700;
                color: var(--text-primary);
                text-align: center;
                line-height: 1.2;
            }
            
            .split-contact-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 0.95rem;
                color: var(--text-primary);
                flex-wrap: wrap;
                width: 100%;
                padding-top: 8px;
                border-top: 1px dashed var(--border-color);
            }
            
            .contact-prefix {
                color: var(--text-muted);
                font-weight: 500;
            }

            /* 職稱 Badge (淡藍膠囊) */
            .job-title-badge {
                display: inline-block;
                background-color: #eff6ff; 
                color: #1e40af; 
                font-size: 0.75rem;
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 600;
                border: 1px solid #dbeafe;
                margin-left: 4px;
            }

            /* Col 2: 規格 (Blue Active Style) */
            .specs-tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-content: flex-start;
            }
            .spec-tag {
                display: inline-flex;
                align-items: center;
                color: var(--accent-blue, #2563eb);
                border: 1px solid var(--accent-blue, #2563eb);
                background-color: color-mix(in srgb, var(--accent-blue, #2563eb) 10%, transparent);
                padding: 4px 10px;
                border-radius: 6px; 
                font-size: 0.9rem;
                font-weight: 700;
                line-height: 1.4;
            }
            .spec-qty-text {
                margin-left: 4px;
                opacity: 0.9;
                font-family: monospace; 
                font-weight: 700;
            }

            /* Col 3: 關鍵日期 */
            .dates-content {
                display: flex;
                flex-direction: column;
                gap: 12px;
                height: 100%;
                justify-content: flex-start; 
            }
            .date-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 8px;
                border-bottom: 1px dashed var(--border-color);
            }
            .date-row:last-child { border-bottom: none; padding-bottom: 0; }
            .date-key { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
            .date-val { font-size: 0.95rem; color: var(--text-primary); font-weight: 600; font-family: monospace; }

            /* Row 4: 備註 */
            .notes-text-clean {
                font-size: 1rem;
                color: var(--text-primary);
                line-height: 1.6;
                white-space: pre-wrap;
                padding: 0;
            }

            /* RWD */
            @media (max-width: 900px) {
                .header-separate-row { flex-direction: column; gap: 16px; } /* 統一間距 */
                .header-card-name, .header-card-mini, .header-card-action-btn { flex: auto; width: 100%; padding: 16px; align-items: flex-start; justify-content: flex-start; text-align: left; }
                .header-card-action-btn { align-items: center; justify-content: center; background: var(--accent-orange); } 
                .stats-grid-row { grid-template-columns: repeat(2, 1fr); gap: 16px; } /* 統一間距 */
                .triple-col-row { grid-template-columns: 1fr; gap: 16px; } /* 統一間距 */
            }
        `;
        document.head.appendChild(style);
    }

    // 輔助：查找規格設定
    function _getSpecConfig(specName) {
        if (!window.CRM_APP || !window.CRM_APP.systemConfig) return null;
        const config = window.CRM_APP.systemConfig;
        for (const key in config) {
            if (Array.isArray(config[key])) {
                const found = config[key].find(item => item.value === specName);
                if (found) return found;
            }
        }
        return null;
    }

    function render(opp) {
        _injectStyles();

        // Phase 8 Compatibility Helper: read first available key (new DTO vs legacy UI)
        const getFirst = (obj, keys, fallback = '') => {
            const source = obj || {};
            for (const k of keys || []) {
                const v = source[k];
                if (v === null || v === undefined) continue;
                if (typeof v === 'string') {
                    const t = v.trim();
                    if (t !== '') return t;
                    continue;
                }
                return v;
            }
            return fallback;
        };

        // 1. 商流邏輯
        const salesModel = getFirst(opp, ['salesModel'], '直接販售') || '直接販售';
        const isDirect = salesModel === '直接販售';
        
        const customerCompany = getFirst(opp, ['customerCompany'], '');
        const channelDetails = getFirst(opp, ['channelDetails'], '');
        const salesChannel = getFirst(opp, ['salesChannel'], '');

        const targetName = isDirect
            ? (customerCompany || '未指定客戶')
            : (channelDetails || salesChannel || '未指定通路');

        const mainContact = getFirst(opp, ['mainContact'], '');
        const channelContact = getFirst(opp, ['channelContact'], '');
        const targetContactName = isDirect ? mainContact : channelContact;

        // 【修改】直接從 opp 物件中獲取職稱，無需前端複雜查找
        const targetTitle = getFirst(opp, ['mainContactJobTitle'], '');
        const titleHtml = targetTitle ? `<span class="job-title-badge">${targetTitle}</span>` : '';

        // 2. 規格 Tags 生成
        let specsContent = '<span style="color:var(--text-muted); font-style:italic; padding:4px;">(尚未指定規格)</span>';
        
        let parsed = {};
        const rawSpec = opp.potentialSpecification;

        // [Forensics Fix] Robust Type Check & Parse for Specs
        // Rule: Object -> use; String -> parse; Error/Empty -> {}
        if (rawSpec) {
            if (typeof rawSpec === 'object') {
                parsed = rawSpec;
            } else if (typeof rawSpec === 'string') {
                const trimmed = rawSpec.trim();
                if (trimmed) {
                    try {
                        parsed = JSON.parse(trimmed);
                    } catch (e) {
                        // Silent failure for invalid JSON to prevent console spam
                    }
                }
            }
        }

        if (parsed && typeof parsed === 'object') {
            const entries = Object.entries(parsed);
            if (entries.length > 0) {
                specsContent = entries.map(([name, qty]) => {
                    const configItem = _getSpecConfig(name);
                    const isCountable = configItem && configItem.value3 === 'allow_quantity';
                    
                    let displayHtml = name;
                    if (isCountable && qty && qty > 0) {
                        displayHtml += `<span class="spec-qty-text">(${qty})</span>`;
                    }
                    
                    return `<div class="spec-tag">${displayHtml}</div>`;
                }).join('');
            }
        }

        // 3. 數值與日期
        // [Phase 7 SQL Type Safety Fix] Ensure value is string before replace, use Number()
        const rawValue = opp.opportunityValue;
        const cleanVal = (rawValue !== null && rawValue !== undefined) ? String(rawValue).replace(/,/g, '') : '0';
        const numVal = Number(cleanVal);
        const valueStr = isNaN(numVal) ? '0' : numVal.toLocaleString();
        
        const createdDate = opp.createdTime ? opp.createdTime.split('T')[0] : '-';
        const closeDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '-';
        
        const notesContent = opp.notes || '<span style="color:var(--text-muted);">(無備註內容)</span>';

        // [PATCH] Support multiple field names for Probability (SQL vs Sheet)
        const displayProbability = getFirst(opp, ['orderProbability', 'winProbability', 'win_probability'], '-') || '-';

        // Compatibility mappings (new DTO vs legacy UI)
        const displayAssignee = getFirst(opp, ['assignee', 'owner'], '-') || '-';
        const displaySource = getFirst(opp, ['opportunitySource', 'source'], '-') || '-';

        return `
            <div class="opp-view-container">

                <div class="main-section-title">機會核心資訊</div>

                <div class="header-separate-row">
                    <div class="header-card-name">
                        <span class="unified-label">機會名稱</span>
                        <h1 class="name-title">${opp.opportunityName || '未命名機會'}</h1>
                    </div>
                    
                    <div class="header-card-mini">
                        <span class="unified-label">負責業務</span>
                        <span class="mini-header-value">${displayAssignee}</span>
                    </div>

                    <div class="header-card-mini">
                        <span class="unified-label">機會來源</span>
                        <span class="mini-header-value">${displaySource}</span>
                    </div>

                    <div class="header-card-action-btn" onclick="OpportunityInfoCardEvents.toggleEditMode(true)" title="編輯機會資訊">
                        <div class="edit-btn-content">
                            <span>編輯</span>
                            <svg class="edit-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="stats-grid-row">
                    <div class="big-stat-card">
                        <span class="unified-label">終端客戶</span>
                        <span class="stat-value" title="${customerCompany}">${customerCompany || '-'}</span>
                    </div>
                    <div class="big-stat-card">
                        <span class="unified-label">機會種類</span>
                        <span class="stat-value">${opp.opportunityType || '-'}</span>
                    </div>
                    <div class="big-stat-card card-style-green">
                        <span class="unified-label">機會價值</span>
                        <span class="stat-value val-money">$${valueStr}</span>
                    </div>
                    <div class="big-stat-card">
                        <span class="unified-label">下單機率</span>
                        <span class="stat-value" style="color: var(--text-primary);">${displayProbability}</span>
                    </div>
                </div>

                <div class="main-section-title mid-section-title">販售商流</div>

                <div class="triple-col-row">
                    
                    <div class="layer-card card-split-royal-blue">
                        <div class="split-card-header">
                            <span class="split-header-text">${salesModel}</span>
                        </div>
                        
                        <div class="split-card-body">
                            <div class="split-target-name">${targetName}</div>
                            
                            ${targetContactName ? `
                                <div class="split-contact-row">
                                    <span class="contact-prefix">窗口：</span>
                                    <span>${targetContactName}</span>
                                    ${titleHtml}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="layer-card">
                        <div class="inner-card-title">可能下單規格</div>
                        <div class="specs-tags-container">
                            ${specsContent}
                        </div>
                    </div>

                    <div class="layer-card">
                        <div class="inner-card-title">關鍵日期</div>
                        <div class="dates-content">
                            <div class="date-row">
                                <span class="date-key">建立日期</span>
                                <span class="date-val">${createdDate}</span>
                            </div>
                            <div class="date-row">
                                <span class="date-key">預計結案</span>
                                <span class="date-val">${closeDate}</span>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="layer-card">
                    <div class="inner-card-title">備註</div>
                    <div class="notes-text-clean">${notesContent}</div>
                </div>

            </div>
        `;
    }

    return { render };
})();
</file>

<file path="public/scripts/opportunities/opportunity-details-events.js">
// ============================================================================
// File: public/scripts/opportunities/opportunity-details-events.js
// ============================================================================
/**
 * Project: TFC CRM
 * File: public/scripts/opportunities/opportunity-details-events.js
 * Version: 8.1.4
 * Date: 2026-03-13
 * Changelog:
 * - [FIX] _getCompanyContacts now correctly resolves companyId from companyList before fetching company details, fixing ID-based routing.
 * - [FIX] Added window.dashboardManager.markStale() to save() success branch to force dashboard refresh upon return.
 * - [FIX] _initSpecQuantities: Robust handling for JSON string, CSV string, or Object to prevent .split() crash.
 * - [FIX] salesChannel/channelDetails conflict in save() payload.
 * - [FIX] Ensure potentialSpecification reads from normalized data.
 * - [PERF] Made toggleEditMode async to support Lazy Loading of the Edit Mode cascading logic.
 */

// public/scripts/opportunity-details-events.js
// 職責：處理「機會資訊卡」的使用者互動事件 (編輯切換、資料驗證、儲存)
// (V-Layout: 包含建立日期儲存)

const OpportunityInfoCardEvents = (() => {
    let _currentOppForEditing = null;
    let _specQuantities = new Map();

    function init(opportunityData) {
        _currentOppForEditing = opportunityData;
        _initSpecQuantities();
    }

    function _initSpecQuantities() {
        _specQuantities.clear();
        if (!_currentOppForEditing) return;

        const raw = _currentOppForEditing.potentialSpecification;

        // 3) 其他情況 (null, undefined, false...) -> 視為空 (Map已清空)
        if (!raw) return;

        if (typeof raw === 'string') {
            // 1) 若為字串
            let parsed = null;
            let isJsonSuccess = false;

            try {
                // 先嘗試 JSON.parse
                parsed = JSON.parse(raw);
                // 確保解析出來是物件 (且非 null)
                if (parsed && typeof parsed === 'object') {
                    _specQuantities = new Map(Object.entries(parsed));
                    isJsonSuccess = true;
                }
            } catch (e) {
                // JSON parse 失敗，準備進入 split 回退機制
                isJsonSuccess = false;
            }

            // 若 parse 失敗 (或是 JSON 但不是我們期望的 map 物件)，則用 split(',')
            if (!isJsonSuccess) {
                raw.split(',').forEach(s => {
                    const t = s.trim();
                    if (t) _specQuantities.set(t, 1);
                });
            }

        } else if (typeof raw === 'object') {
            // 2) 若為物件
            try {
                _specQuantities = new Map(Object.entries(raw));
            } catch (e) {
                console.error('[OpportunityEvents] Failed to convert object to map:', e);
            }
        }
    }

    async function toggleEditMode(isEditing) {
        const displayMode = document.getElementById('opportunity-info-display-mode');
        const editMode = document.getElementById('opportunity-info-edit-mode');
        if (!displayMode || !editMode) return;

        if (isEditing) {
            if (!_currentOppForEditing) return showNotification('資料未就緒', 'error');

            // [Phase 8.6A Perf] Lazy load the company lists only when User actually enters Edit Mode
            if (typeof OpportunityInfoCard !== 'undefined' && typeof OpportunityInfoCard.ensureCascadingLogic === 'function') {
                showLoading('準備編輯環境...');
                try {
                    await OpportunityInfoCard.ensureCascadingLogic(_currentOppForEditing);
                } catch (e) {
                    console.error('[OpportunityEvents] Error loading cascading logic:', e);
                }
                hideLoading();
            }

            displayMode.style.display = 'none';
            editMode.style.display = 'block';
            _bindSpecEvents();
            _initSpecQuantities();

            if (_currentOppForEditing.customerCompany) {
                await handleCustomerChange(_currentOppForEditing.customerCompany, _currentOppForEditing.mainContact);
            }
            if (_currentOppForEditing.salesModel !== '直接販售' && _currentOppForEditing.channelDetails) {
                await handleChannelChange(_currentOppForEditing.channelDetails, _currentOppForEditing.channelContact);
            }
        } else {
            editMode.style.display = 'none';
            displayMode.style.display = 'block';
        }
    }

    function handleSingleSelectClick(element) {
        const container = element.closest('.single-select-container');
        const targetId = element.dataset.fieldTarget;
        const value = element.dataset.value;

        container.querySelectorAll('.info-option-pill').forEach(pill => pill.classList.remove('selected'));
        element.classList.add('selected');

        const hiddenInput = document.getElementById('edit-' + targetId);
        if (hiddenInput) hiddenInput.value = value;
    }

    async function handleSalesModelPillClick(element) {
        handleSingleSelectClick(element);
        const value = element.dataset.value;
        await OpportunityInfoCard.handleSalesModelChange(value, true);
    }

    async function _getCompanyContacts(companyName) {
        if (!companyName) return [];
        try {
            let companies = window.CRM_APP && window.CRM_APP.companyList ? window.CRM_APP.companyList : [];
            if (companies.length === 0) {
                const compRes = await authedFetch('/api/companies');
                if (compRes.success) {
                    companies = compRes.data;
                    if (window.CRM_APP) window.CRM_APP.companyList = companies;
                }
            }
            
            const company = companies.find(c => c.companyName === companyName);
            if (!company || !company.companyId) return [];

            const res = await authedFetch(`/api/companies/${encodeURIComponent(company.companyId)}/details`);
            if (res.success && res.data && Array.isArray(res.data.contacts)) {
                return res.data.contacts;
            }
        } catch (e) {
            console.error(`無法取得 ${companyName} 的聯絡人:`, e);
        }
        return [];
    }

    function _generateContactOptions(contacts, defaultContact) {
        let html = '<option value="">-- 請選擇 --</option>';
        if (contacts.length === 0) {
            html += '<option value="" disabled>無已建檔聯絡人</option>';
        } else {
            contacts.forEach(c => {
                const label = c.position ? `${c.name} (${c.position})` : c.name;
                const isSelected = defaultContact === c.name;
                html += `<option value="${c.name}" ${isSelected ? 'selected' : ''}>${label}</option>`;
            });
        }
        if (defaultContact && !contacts.some(c => c.name === defaultContact)) {
            html += `<option value="${defaultContact}" selected>${defaultContact} (未知/自填)</option>`;
        }
        return html;
    }

    async function handleCustomerChange(customerName, defaultContact = null) {
        const contactSelect = document.getElementById('edit-main-contact');
        if (!contactSelect) return;

        contactSelect.innerHTML = '<option value="">載入中...</option>';
        contactSelect.disabled = true;

        const contacts = await _getCompanyContacts(customerName);

        contactSelect.innerHTML = _generateContactOptions(contacts, defaultContact);
        contactSelect.disabled = false;

        const salesModelInput = document.getElementById('edit-sales-model');
        const channelSelect = document.getElementById('edit-channel-details');

        if (salesModelInput && salesModelInput.value === '直接販售' && channelSelect) {
            channelSelect.innerHTML = `<option value="${customerName}" selected>${customerName} (直販)</option>`;
            channelSelect.disabled = true;

            const channelContactSelect = document.getElementById('edit-channel-contact');
            if (channelContactSelect) {
                channelContactSelect.innerHTML = '<option value="">-- 不適用 --</option>';
                channelContactSelect.disabled = true;
            }
        }
    }

    async function handleChannelChange(companyName, defaultContact = null) {
        const contactSelect = document.getElementById('edit-channel-contact');
        if (!contactSelect) return;

        if (!companyName) {
            contactSelect.innerHTML = '<option value="">-- 請先選擇通路公司 --</option>';
            contactSelect.disabled = true;
            return;
        }

        contactSelect.innerHTML = '<option value="">載入中...</option>';
        contactSelect.disabled = true;

        const contacts = await _getCompanyContacts(companyName);

        contactSelect.innerHTML = _generateContactOptions(contacts, defaultContact);
        contactSelect.disabled = false;
    }

    function handleManualOverride(checkbox) {
        const input = document.getElementById('edit-opportunity-value');
        if (!input) return;
        if (checkbox.checked) {
            input.disabled = false;
        } else {
            input.disabled = true;
            _calculateTotalValue();
        }
    }

    function _bindSpecEvents() {
        const container = document.getElementById('spec-pills-container');
        if (!container) return;

        container.onclick = null;

        container.onclick = (e) => {
            const pill = e.target.closest('.info-option-pill');
            const qtySpan = e.target.closest('.pill-quantity');

            if (qtySpan) {
                e.stopPropagation();
                _handleQuantityChange(qtySpan);
            } else if (pill) {
                _handleSpecAccumulate(pill);
            }
        };
    }

    function _handleSpecAccumulate(pill) {
        const specId = pill.dataset.specId;
        const systemConfig = (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['可能下單規格']) || [];
        const config = systemConfig.find(s => s.value === specId);
        const allowQuantity = config && config.value3 === 'allow_quantity';

        if (_specQuantities.has(specId)) {
            if (allowQuantity) {
                const current = _specQuantities.get(specId);
                _specQuantities.set(specId, current + 1);
                _updatePillUI(pill, current + 1);
            } else {
                _specQuantities.delete(specId);
                pill.classList.remove('selected');
            }
        } else {
            _specQuantities.set(specId, 1);
            pill.classList.add('selected');
            if (allowQuantity) _addQuantityBadge(pill, 1, specId);
        }
        _calculateTotalValue();
    }

    function _handleQuantityChange(span) {
        const specId = span.dataset.specId;
        const current = _specQuantities.get(specId) || 1;
        const input = prompt('請輸入數量 (輸入 0 可移除):', current);
        if (input !== null) {
            const num = parseInt(input);
            const pill = span.closest('.info-option-pill');
            if (!isNaN(num) && num > 0) {
                _specQuantities.set(specId, num);
                span.innerText = `(x${num})`;
            } else {
                _specQuantities.delete(specId);
                pill.classList.remove('selected');
                span.remove();
            }
            _calculateTotalValue();
        }
    }

    function _addQuantityBadge(pill, qty, specId) {
        let span = pill.querySelector('.pill-quantity');
        if (!span) {
            span = document.createElement('span');
            span.className = 'pill-quantity';
            span.dataset.specId = specId;
            pill.appendChild(span);
        }
        span.innerText = `(x${qty})`;
    }

    function _updatePillUI(pill, qty) {
        let span = pill.querySelector('.pill-quantity');
        if (span) span.innerText = `(x${qty})`;
    }

    function _calculateTotalValue() {
        const manualCheck = document.getElementById('value-manual-override-checkbox');
        if (manualCheck && manualCheck.checked) return;

        const input = document.getElementById('edit-opportunity-value');
        if (!input) return;

        const systemConfig = (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['可能下單規格']) || [];
        let total = 0;
        _specQuantities.forEach((qty, specId) => {
            const config = systemConfig.find(s => s.value === specId);
            if (config && config.value2) total += (parseFloat(config.value2) || 0) * qty;
        });

        // NOTE: keep raw number (no commas) if your backend expects numeric string
        input.value = String(Math.round(total));
    }

    // ======= 핵심修補：避免「沒改的欄位」被空字串覆蓋 =======
    async function save() {
        if (!_currentOppForEditing) return;

        // Return undefined if element doesn't exist (do NOT return '')
        const getValueMaybe = (id) => {
            const el = document.getElementById(id);
            if (!el) return undefined;
            const v = (el.value ?? '').toString().trim();
            return v;
        };

        const oppName = getValueMaybe('edit-opportunity-name');
        const finalOppName = (oppName !== undefined) ? oppName : (_currentOppForEditing.opportunityName || '');
        if (!finalOppName) return showNotification('機會名稱必填', 'error');

        const specData = {};
        _specQuantities.forEach((v, k) => specData[k] = v);

        const manualEl = document.getElementById('value-manual-override-checkbox');
        const isManual = manualEl ? !!manualEl.checked : ((_currentOppForEditing.opportunityValueType || _currentOppForEditing.valueCalcMode) === 'manual');

        const salesModel = getValueMaybe('edit-sales-model');
        const finalSalesModel = (salesModel !== undefined) ? salesModel : (_currentOppForEditing.salesModel || '');

        let channelDetails = getValueMaybe('edit-channel-details');
        let channelContact = getValueMaybe('edit-channel-contact');

        // If direct sale, channelDetails should follow customerCompany
        const customerCompany = getValueMaybe('edit-customer-company');
        const finalCustomerCompany = (customerCompany !== undefined) ? customerCompany : (_currentOppForEditing.customerCompany || '');

        if (finalSalesModel === '直接販售') {
            channelDetails = finalCustomerCompany;
            channelContact = '';
        }

        // For each field: if DOM missing -> keep existing value
        const pick = (maybe, existingKeys, fallback = '') => {
            if (maybe !== undefined) return maybe;
            for (const k of existingKeys) {
                const v = _currentOppForEditing[k];
                if (v !== undefined && v !== null) return (typeof v === 'string') ? v : String(v);
            }
            return fallback;
        };

        const finalChannelDetails = pick(channelDetails, ['channelDetails', 'salesChannel'], '');
        const finalMainContact = pick(getValueMaybe('edit-main-contact'), ['mainContact'], '');
        const finalChannelContact = pick(channelContact, ['channelContact'], '');

        const finalExpectedCloseDate = pick(getValueMaybe('edit-expected-close-date'), ['expectedCloseDate'], '');
        const finalCreatedTime = pick(getValueMaybe('edit-created-time'), ['createdTime'], '');

        // These are the legacy keys your frontend uses; backend may map them
        const finalAssignee = pick(getValueMaybe('edit-assignee'), ['assignee', 'owner'], '');
        const finalOppSource = pick(getValueMaybe('edit-opportunity-source'), ['opportunitySource', 'source'], '');
        const finalOppType = pick(getValueMaybe('edit-opportunity-type'), ['opportunityType'], '');
        const finalStage = pick(getValueMaybe('edit-current-stage'), ['currentStage'], '');
        const finalProb = pick(getValueMaybe('edit-order-probability'), ['orderProbability', 'winProbability'], '');
        
        // [FORENSICS FIX] Ignore the hidden 'edit-sales-channel' input which may be stale.
        // In the writer logic, salesChannel is prioritized. We MUST sync it with channelDetails.
        const finalSalesChannel = finalChannelDetails;

        const finalDeviceScale = pick(getValueMaybe('edit-device-scale'), ['deviceScale', 'equipmentScale'], '');
        const finalNotes = pick(getValueMaybe('edit-notes'), ['notes'], '');

        // Value
        const rawValMaybe = getValueMaybe('edit-opportunity-value');
        const finalValue = (rawValMaybe !== undefined)
            ? (rawValMaybe.replace(/,/g, '') || '0')
            : (String(_currentOppForEditing.opportunityValue ?? '0').replace(/,/g, '') || '0');

        const updateData = {
            opportunityName: finalOppName,
            customerCompany: finalCustomerCompany,
            channelDetails: finalChannelDetails,
            mainContact: finalMainContact,
            channelContact: finalChannelContact,
            expectedCloseDate: finalExpectedCloseDate,

            // Created date
            createdTime: finalCreatedTime,

            salesModel: finalSalesModel,

            // Legacy UI keys (compatible with current frontend)
            assignee: finalAssignee,
            opportunitySource: finalOppSource,
            opportunityType: finalOppType,
            currentStage: finalStage,
            orderProbability: finalProb,
            
            // [FORENSICS FIX] Send synced salesChannel to satisfy SQL Writer priority
            salesChannel: finalSalesChannel,
            
            deviceScale: finalDeviceScale,

            opportunityValue: finalValue,
            opportunityValueType: isManual ? 'manual' : 'auto',
            potentialSpecification: JSON.stringify(specData),

            // Keep as-is if you don't use drive link in UI yet
            driveFolderLink: pick(undefined, ['driveFolderLink', 'driveLink'], ''),

            notes: finalNotes
        };

        showLoading('正在儲存...');
        try {
            const result = await authedFetch(`/api/opportunities/${_currentOppForEditing.opportunityId}`, {
                method: 'PUT',
                // IMPORTANT: avoid authedFetch "smart refresh" interfering; we handle UI ourselves
                skipRefresh: true,
                body: JSON.stringify({ ...updateData, modifier: getCurrentUser() })
            });

            if (result && result.success) {
                showNotification('儲存成功', 'success');

                // Update local state without wiping
                const updatedOpp = { ..._currentOppForEditing, ...updateData };
                _currentOppForEditing = updatedOpp;
                window.currentOpportunityData = updatedOpp;

                // Re-render info card (display wrappers + view)
                if (typeof OpportunityInfoCard !== 'undefined' && typeof OpportunityInfoCard.render === 'function') {
                    OpportunityInfoCard.render(updatedOpp);
                }

                // Re-init state
                init(updatedOpp);

                toggleEditMode(false);

                // [Phase 8.11 Patch] Flag dashboard as stale to force refresh on back navigation
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } else {
                throw new Error((result && result.error) || '儲存失敗');
            }
        } catch (e) {
            showNotification(e.message, 'error');
        } finally {
            hideLoading();
        }
    }

    return {
        init,
        toggleEditMode,
        save,
        handleSingleSelectClick,
        handleSalesModelPillClick,
        handleCustomerChange,
        handleChannelChange,
        handleManualOverride
    };
})();
</file>

<file path="public/scripts/opportunities/opportunity-details.js">
// ============================================================================
// File: public/scripts/opportunities/opportunity-details.js
// ============================================================================
/**
 * Project: TFC CRM
 * File: public/scripts/opportunities/opportunity-details.js
 * Version: 8.1.2 (Phase 8.6A - Perf Patch)
 * Date: 2026-03-11
 * Changelog:
 * - [FIX] Explicitly map SQL 'productDetails' to UI 'potentialSpecification' to fix edit mode data loss.
 * - [FIX] Sync 'salesChannel' and 'channelDetails' to prevent writer conflicts.
 * - [PERF] Removed redundant CRM_APP.updateAllDropdowns() to eliminate duplicate companyList fetches.
 */

window.currentDetailOpportunityId = null;
window.currentOpportunityData = null;

/**
 * Phase 8: normalize DTO (SQL) keys <-> legacy UI keys
 * Ensures BOTH display view and edit form can read values after hard refresh.
 */
function normalizeOppForUi(opp) {
    const o = opp || {};

    const pick = (keys, fallback = '') => {
        for (const k of keys) {
            const v = o[k];
            if (v === null || v === undefined) continue;
            if (typeof v === 'string') {
                const t = v.trim();
                if (t !== '') return t;
                continue;
            }
            return v;
        }
        return fallback;
    };

    // Canonical DTO keys (from SQL reader) + legacy keys (used by UI/edit form)
    const normalized = { ...o };

    // Identity & Core
    normalized.opportunityId = o.opportunityId; // Ensure ID exists

    // owner <-> assignee
    normalized.owner = pick(['owner', 'assignee'], normalized.owner);
    normalized.assignee = pick(['assignee', 'owner'], normalized.assignee);

    // source <-> opportunitySource
    normalized.source = pick(['source', 'opportunitySource'], normalized.source);
    normalized.opportunitySource = pick(['opportunitySource', 'source'], normalized.opportunitySource);

    // equipmentScale <-> deviceScale
    normalized.equipmentScale = pick(['equipmentScale', 'deviceScale'], normalized.equipmentScale);
    normalized.deviceScale = pick(['deviceScale', 'equipmentScale'], normalized.deviceScale);

    // winProbability <-> orderProbability
    normalized.winProbability = pick(['winProbability', 'orderProbability'], normalized.winProbability);
    normalized.orderProbability = pick(['orderProbability', 'winProbability'], normalized.orderProbability);

    // valueCalcMode <-> opportunityValueType
    normalized.valueCalcMode = pick(['valueCalcMode', 'opportunityValueType'], normalized.valueCalcMode);
    normalized.opportunityValueType = pick(['opportunityValueType', 'valueCalcMode'], normalized.opportunityValueType);

    // driveLink <-> driveFolderLink
    normalized.driveLink = pick(['driveLink', 'driveFolderLink'], normalized.driveLink);
    normalized.driveFolderLink = pick(['driveFolderLink', 'driveLink'], normalized.driveFolderLink);

    // [FORENSICS FIX] productDetails (SQL) <-> potentialSpecification (UI)
    // SQL Reader gives 'productDetails'. UI expects 'potentialSpecification'.
    normalized.productDetails = pick(['productDetails', 'potentialSpecification'], normalized.productDetails);
    normalized.potentialSpecification = pick(['potentialSpecification', 'productDetails'], normalized.potentialSpecification);

    // [FORENSICS FIX] salesChannel (SQL) <-> channelDetails (UI)
    // SQL Writer creates conflict if these differ. We sync them here.
    normalized.salesChannel = pick(['salesChannel', 'channelDetails'], normalized.salesChannel);
    normalized.channelDetails = pick(['channelDetails', 'salesChannel'], normalized.channelDetails);

    // notes (ensure string-ish)
    if (normalized.notes === null || normalized.notes === undefined) normalized.notes = '';

    return normalized;
}

/**
 * 載入並渲染機會詳細頁面的主函式
 * @param {string} opportunityId - 機會ID
 */
async function loadOpportunityDetailPage(opportunityId) {
    window.currentDetailOpportunityId = opportunityId;

    const container = document.getElementById('page-opportunity-details');
    if (!container) return;

    container.innerHTML = `
        <div class="loading show" style="padding-top: 50px;">
            <div class="spinner"></div>
            <p>正在載入機會詳細資料...</p>
        </div>
    `;

    try {
        const opportunityDetailPageTemplate = await fetch('/views/opportunity-detail.html').then(res => res.text());
        const result = await authedFetch(`/api/opportunities/${opportunityId}/details`);
        if (!result.success) throw new Error(result.error);

        const {
            opportunityInfo,
            interactions,
            eventLogs,
            linkedContacts,
            potentialContacts,
            parentOpportunity,
            childOpportunities
        } = result.data;

        // ✅ Phase 8: normalize DTO->UI keys so edit mode can show SQL data after refresh
        const normalizedOpp = normalizeOppForUi(opportunityInfo);

        window.currentOpportunityData = normalizedOpp;

        // 1. 注入主模板
        container.innerHTML = opportunityDetailPageTemplate;
        document.getElementById('page-title').textContent = '機會案件管理 - 機會詳細';
        document.getElementById('page-subtitle').textContent = '機會詳細資料與關聯活動';

        // 2. 注入資訊卡
        const infoCardContainer = document.getElementById('opportunity-info-card-container');
        if (infoCardContainer) {
            if (typeof OpportunityInfoCard !== 'undefined' && typeof OpportunityInfoCard.render === 'function') {
                OpportunityInfoCard.render(normalizedOpp);
            } else if (typeof OpportunityInfoView !== 'undefined' && typeof OpportunityInfoView.render === 'function') {
                infoCardContainer.innerHTML = `
                    <div class="dashboard-widget">
                        <div class="widget-content">
                            ${OpportunityInfoView.render(normalizedOpp)}
                        </div>
                    </div>
                `;
            }
        }

        // 3. 初始化資訊卡事件（用 normalizedOpp，讓 state 也帶雙 key）
        if (typeof OpportunityInfoCardEvents !== 'undefined' && typeof OpportunityInfoCardEvents.init === 'function') {
            OpportunityInfoCardEvents.init(normalizedOpp);
        }

        // 4. 其他模組初始化（順序不變）
        const Stepper = window.OpportunityStepper || (typeof OpportunityStepper !== 'undefined' ? OpportunityStepper : null);
        if (Stepper && typeof Stepper.init === 'function') {
            Stepper.init(normalizedOpp);
        }

        const Events = window.OpportunityEvents || (typeof OpportunityEvents !== 'undefined' ? OpportunityEvents : null);
        if (Events && typeof Events.init === 'function') {
            Events.init(eventLogs || [], {
                opportunityId: normalizedOpp.opportunityId,
                opportunityName: normalizedOpp.opportunityName,
                linkedContacts: linkedContacts || []
            });
        }

        const interactionContainer = document.getElementById('tab-content-interactions');
        if (interactionContainer) {
            const Interactions = window.OpportunityInteractions || (typeof OpportunityInteractions !== 'undefined' ? OpportunityInteractions : null);
            if (Interactions && typeof Interactions.init === 'function') {
                Interactions.init(
                    interactionContainer,
                    { opportunityId: normalizedOpp.opportunityId },
                    interactions || []
                );
            }
        }

        const Contacts = window.OpportunityContacts || (typeof OpportunityContacts !== 'undefined' ? OpportunityContacts : null);
        if (Contacts && typeof Contacts.init === 'function') {
            Contacts.init(normalizedOpp, linkedContacts || []);
        }

        const AssocOpps = window.OpportunityAssociatedOpps || (typeof OpportunityAssociatedOpps !== 'undefined' ? OpportunityAssociatedOpps : null);
        if (AssocOpps && typeof AssocOpps.render === 'function') {
            AssocOpps.render({
                opportunityInfo: normalizedOpp,
                parentOpportunity,
                childOpportunities
            });
        }

        if (window.PotentialContactsManager) {
            PotentialContactsManager.render({
                containerSelector: '#opp-potential-contacts-container',
                potentialContacts: potentialContacts || [],
                comparisonList: linkedContacts || [],
                comparisonKey: 'name',
                context: 'opportunity',
                opportunityId: normalizedOpp.opportunityId
            });
        }

        // [Phase 8.6A PERF] Removed global CRM_APP.updateAllDropdowns() to prevent redundant companyList fetch.
        
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('[OpportunityDetails] 載入失敗:', error);
            container.innerHTML = `
                <div class="alert alert-error">
                    載入機會詳細資料失敗: ${error.message}
                </div>
            `;
        }
    }
}

// 向主應用程式註冊此模組管理的頁面載入函式
window.loadOpportunityDetailPage = loadOpportunityDetailPage;
if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules['opportunity-details'] = loadOpportunityDetailPage;
}
</file>

<file path="public/styles/modules/layout.css">
/* File: public/styles/modules/layout.css */
/*
 * File Path: public/styles/modules/layout.css
 * Version: 1.1.39
 * Date: 2026-05-06
 * Changelog: 
 * - (v1.1.39) Opportunity Details Visual De-emphasis: Removed card border radius and aggressive Bento hover expansion.
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

/* ==================== Opportunity Details Visual De-emphasis ==================== */
/* Remove all card border radius and strong shadow boundaries */
#page-opportunity-details .dashboard-widget,
#page-opportunity-details .opportunity-info-card,
#page-opportunity-details .layer-card,
#page-opportunity-details .header-card-name,
#page-opportunity-details .header-card-mini,
#page-opportunity-details .header-card-action-btn,
#page-opportunity-details .big-stat-card,
#page-opportunity-details .card-split-royal-blue,
#page-opportunity-details .timeline-content,
#page-opportunity-details .interaction-card {
    border-radius: 0;
    box-shadow: none;
}

/* Normalize aggressive Bento hover expansion */
#page-opportunity-details .layer-card:hover,
#page-opportunity-details .header-card-name:hover,
#page-opportunity-details .header-card-mini:hover,
#page-opportunity-details .big-stat-card:hover,
#page-opportunity-details .dashboard-widget:hover,
#page-opportunity-details .header-card-action-btn:hover {
    transform: none;
    box-shadow: none;
}
</file>

<file path="public/views/opportunity-detail.html">
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>機會詳情</title>
    <link rel="stylesheet" href="/styles/main.css">
    <link rel="stylesheet" href="/styles/modules/variables.css">
    <link rel="stylesheet" href="/styles/modules/components.css">
    <link rel="stylesheet" href="/styles/modals.css">

    <style>
        /* 【最終修正】強制確保 widget-content 及其內容可見 */
        #opp-potential-contacts-container.widget-content {
            display: block !important;
            flex-grow: initial !important;
            min-height: 50px; /* 給予一個最小高度以確保容器不會塌陷 */
        }

        /* 新增的子頁籤樣式 */
        .sub-tabs {
            display: flex;
            border-bottom: 2px solid var(--border-color);
            margin-bottom: var(--spacing-5);
        }
        .sub-tab-link {
            padding: var(--spacing-3) var(--spacing-4);
            cursor: pointer;
            color: var(--text-muted);
            border: none;
            background: none;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px; /* 讓 active 的 border 蓋過底線 */
            transition: all 0.2s ease;
            
            font-size: var(--font-size-base); /* 1rem */
            font-weight: 700; /* 加粗 */
        }
        
        .sub-tab-link.active {
            color: var(--accent-blue);
            border-bottom-color: var(--accent-blue);
            /* 使用 color-mix 產生 20% 透明度的 accent-blue */
            background-color: color-mix(in srgb, var(--accent-blue) 20%, transparent); 
            border-radius: var(--rounded-md) var(--rounded-md) 0 0; /* 頂部圓角 */
        }

        .sub-tab-link:hover {
            color: var(--text-primary);
            /* Hover 使用 15% 透明度，比 active 略淡 */
            background-color: color-mix(in srgb, var(--accent-blue) 15%, transparent); 
            border-radius: var(--rounded-md) var(--rounded-md) 0 0; /* 同樣追加圓角 */
            border-bottom-color: var(--border-color); /* 給 hover 一個底線 */
        }
        
        .sub-tab-content {
            display: none;
        }
        .sub-tab-content.active {
            display: block;
        }
    </style>
</head>
<body>

    <div id="opportunity-detail-container">

        <div id="opportunity-info-card-container" class="opportunity-info-card" style="margin-bottom: var(--spacing-6);">
            </div>

        <div id="opportunity-stage-stepper-container" class="dashboard-widget" style="margin-bottom: var(--spacing-6);">
            <div class="widget-header" style="margin-bottom: 0;">
                <h2 class="widget-title">機會進程</h2>
            </div>
            <div id="opportunity-stage-stepper" class="widget-content">
                </div>
        </div>

        <div id="tab-content-events" class="tab-content active" style="margin-bottom: var(--spacing-6);">
             </div>

        <div id="tab-content-interactions" class="tab-content active" style="margin-bottom: var(--spacing-6);">
            <div class="interaction-layout">
                
                <div class="interaction-history-section">
        
                    <div class="sub-tabs">
                        <button class="sub-tab-link active" data-tab="discussion">動態牆</button>
                        <button class="sub-tab-link" data-tab="activity">系統活動紀錄</button>
                    </div>
                
                    <div id="discussion-pane" class="sub-tab-content active">
                        <div id="discussion-timeline" class="interaction-timeline">
                            </div>
                    </div>
                    <div id="activity-pane" class="sub-tab-content">
                        <div id="activity-log-timeline" class="interaction-timeline">
                            </div>
                    </div>
                
                </div>

                <div class="interaction-form-section">
                    <h3 style="margin-bottom: 1.5rem;">新增/編輯互動</h3>
                    <form id="new-interaction-form">
                        <input type="hidden" id="interaction-opportunity-id">
                        <input type="hidden" id="interaction-edit-rowIndex">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">互動類型</label>
                                <div class="select-wrapper">
                                    <select class="form-select" id="interaction-event-type" required></select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">互動時間</label>
                                <input type="datetime-local" class="form-input" id="interaction-time" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">內容摘要 *</label>
                            <textarea class="form-textarea" id="interaction-summary" placeholder="記錄互動重點..." required></textarea>
                        </div>
                         <div class="form-group">
                            <label class="form-label">下次行動</label>
                            <input type="text" class="form-input" id="interaction-next-action" placeholder="準備報價單並於下週三前寄出..."></input>
                        </div>
                        <button type="submit" class="submit-btn" id="interaction-submit-btn">💾 新增紀錄</button>
                    </form>
                </div>
            </div>
        </div>

        <div class="dashboard-widget" style="margin-top: var(--spacing-6);">
            <div class="widget-header">
                <h2 class="widget-title">關聯聯絡人</h2>
                <button class="action-btn primary" id="add-associated-contact-btn">+ 關聯聯絡人</button>
            </div>
            <div id="associated-contacts-list" class="widget-content">
                </div>
        </div>

        <div class="dashboard-widget" style="margin-top: var(--spacing-6);">
            <div class="widget-header">
                <h2 class="widget-title">關聯機會</h2>
                <button class="action-btn primary" id="add-associated-opportunity-btn">+ 關聯機會</button>
            </div>
            <div id="associated-opportunities-list" class="widget-content">
                </div>
        </div>

        <div class="dashboard-widget" style="margin-top: var(--spacing-6);">
            <div class="widget-header">
                <h2 class="widget-title">同公司潛在聯絡人</h2>
            </div>
            <div id="opp-potential-contacts-container" class="widget-content">
                </div>
        </div>

    </div>

    <div id="modal-container"></div>

    <script src="/scripts/core/theme-toggle.js"></script>
    <script src="/scripts/core/utils.js"></script>
    
    <script src="/scripts/services/api.js"></script>
    <script src="/scripts/services/ui.js"></script>
    
    <script src="/scripts/components/chip-wall.js"></script>

    <script src="/scripts/opportunities/details/opportunity-stepper.js"></script>
    <script src="/scripts/opportunities/details/opportunity-interactions.js"></script>
    <script src="/scripts/opportunities/details/opportunity-associated-contacts.js"></script>
    <script src="/scripts/opportunities/details/opportunity-event-reports.js"></script>
    <script src="/scripts/opportunities/details/opportunity-info-view.js"></script>
    <script src="/scripts/opportunities/details/opportunity-details-components.js"></script>
    
    <script src="/scripts/opportunities/opportunity-details-events.js"></script>
    <script src="/scripts/opportunities/opportunity-details.js"></script>
    <script src="/scripts/opportunities/opportunity-modals.js"></script>

    <script src="/scripts/events/event-modal-manager.js"></script>
    <script src="/scripts/events/event-editor-standalone.js"></script>

</body>
</html>
</file>

</files>
