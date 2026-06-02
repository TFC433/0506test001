// ============================================================================
// File: public/scripts/opportunities/details/opportunity-details-components.js
// ============================================================================
// public/scripts/opportunity-details/opportunity-details-components.js
// 職責：整合機會詳細頁面組件，處理編輯邏輯與資料存取
// * @version 1.1.24 (Opportunity Detail Edit Mode Functional Patch A)
// * @date 2026-05-21
// * @changelog 2026-05-21: Opportunity Detail Edit Mode Functional Patch A: Mirror channel contact from main contact in Direct Sales flow.
// * @changelog 2026-05-21: Opportunity Detail Edit Mode UI Phase 1-E: compact non-title edit controls while preserving opportunity name prominence.
// * @changelog 2026-05-21: Opportunity Detail Edit Mode UI Phase 1-D: compress selector density and reduce operational visual noise.
// * @changelog 2026-05-21: Opportunity Detail Edit Mode UI Phase 1-C: tighten operational density and spacing rhythm.
// * @changelog 2026-05-21: Opportunity Detail Edit Mode UI Phase 1-B: Make operational edit zones visibly perceptible with restrained surface framing.
// * @changelog 2026-05-21: Opportunity Detail Edit Mode UI Phase 1-A Hotfix: Refresh injected styles when existing style tag is present.
// * @changelog 2026-05-21: Opportunity Detail Edit Mode UI Phase 1-A: Introduce operational workspace zone grouping and spacing hierarchy.
// * @changelog 2026-05-21: Opportunity Lineage Workflow Phase 2-C correction places parent-side commercial lineage labels before parent names.
// * @changelog 2026-05-20: Opportunity Lineage UX Phase 2-B — rename related opportunities to commercial context and render directional lineage labels.
// * @changelog 2026-05-20: Converge inline businessType selector to Chinese-only Phase 1 lifecycle set.
// * @changelog 2026-05-20: Add businessType selector to Opportunity Detail inline edit mode.
// * @changelog 2026-05-11: Opportunity Detail Value Hierarchy Pass A.
// * @changelog 2026-05-11: Operational scan hierarchy refinement for right-rail empty states.
// * @changelog 2026-05-11: Empty state productization refinement for quieter metadata-like fallbacks.
// * @changelog 2026-05-11: Opportunity Detail rail entity productization: tune relationship entity items with restrained radius and row-like padding for clearer operational readability.
// * @changelog 2026-05-11: Opportunity Detail rail contrast tuning: add subtle micro-elevation to rail entity chips/cards for improved nested-surface readability.
// * @changelog 2026-05-11: Opportunity Detail context rail surface recovery: elevate rail chips/mini-cards/empty states to `--secondary-bg` to resolve primary-on-primary contrast collision.
// * @changelog 2026-05-08: Relationship lifecycle stabilization adds manage-mode rail support for associated opportunities.
// * @changelog 2026-05-08: Parent opportunity unlink fix uses the passed opportunityId and refreshes detail state.
// * @changelog 2026-05-08: Manage-mode UX cleanup hides remove-parent actions outside management mode.
// * @changelog 2026-05-08: Right rail density reduction tightens chip spacing and lowers secondary control weight.
// * @changelog 2026-05-08: Associated contacts manage-mode collapse support hides per-item actions by default.
// * @changelog 2026-05-08: Potential contacts chip-only opportunity rendering support reduces rail operational noise.
// * @changelog 2026-05-08: Right context rail compact entity UI adds scoped chip and mini-card rendering support.
// * @changelog 2026-05-08: Associated opportunities chip rendering replaces legacy summary/list rail markup.
// * @changelog 2026-05-08: Stepper lifecycle re-sync after DOM rescue refreshes view mode and Stepper internal data.
// * @changelog 2026-05-08: Stepper save/edit state stabilization clears transient edit UI after OpportunityInfoCard re-render.
// * @changelog 2026-05-08: Neutral shell spacing recovery restores layout-only flow gap without reintroducing a visible outer card.
// * @changelog 2026-05-08: Opportunity info wrapper visual neutralization removes giant outer card regression while preserving inner operational card framing.
// * @changelog 2026-05-08: Preserves natural DOM flow stabilization for Stepper placement.
// * @changelog 2026-05-08: Natural DOM flow restoration, Stepper placement stabilization, and edit/view layout stability correction.
// * @changelog 2026-05-08: Preserves existing Stepper DOM node instead of relying on display: contents orchestration.
// (依賴 OpportunityInfoView 進行顯示模式渲染)

function _injectStylesForOppInfoCard() {
    const styleId = 'opportunity-info-card-container-styles';
    let style = document.getElementById(styleId);
    const css = `
        /* 容器基礎樣式 */
        .opportunity-info-card {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            border: none;
            margin-bottom: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: var(--spacing-5);
        }
        #opportunity-info-edit-mode {
            background-color: var(--secondary-bg);
            padding: var(--spacing-6);
            border-radius: var(--rounded-md);
            border: 1px solid var(--border-color);
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
        .edit-form-columns { display: flex; gap: var(--spacing-4); align-items: flex-start; }
        .form-col { flex: 1; display: flex; flex-direction: column; gap: var(--spacing-2); min-width: 0; }
        @media (max-width: 900px) { .edit-form-columns { flex-direction: column; gap: var(--spacing-6); } }
        .op-edit-zone {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-2);
            background: var(--primary-bg);
            border: 1px solid var(--border-color);
            border-radius: var(--rounded-sm);
            padding: var(--spacing-3);
        }
        .op-edit-zone + .op-edit-zone {
            margin-top: var(--spacing-3);
        }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 0.82rem; color: var(--text-muted); font-weight: 500; line-height: 1.25; }
        .form-input, .form-select, .form-textarea {
            padding: 5px 8px;
            border: 1px solid var(--border-color);
            border-radius: var(--rounded-sm);
            background: var(--primary-bg);
            color: var(--text-primary);
            font-size: 0.92rem;
            line-height: 1.3;
            min-height: 32px;
        }
        #edit-opportunity-name {
            padding: 7px 10px;
            border-radius: var(--rounded-md);
            font-size: var(--font-size-base);
            line-height: normal;
            min-height: initial;
        }
        .form-input:read-only, .form-select:disabled, .form-input:disabled { 
            background-color: var(--secondary-bg); 
            cursor: not-allowed; 
            opacity: 0.7; 
            color: var(--text-muted); 
            border-color: var(--border-color);
        }
        .pills-container { display: flex; flex-wrap: wrap; gap: 4px 5px; }
        .info-option-pill {
            padding: 3px 8px; border-radius: 4px; font-size: 0.78rem; line-height: 1.25; border: 1px solid color-mix(in srgb, var(--border-color) 78%, transparent);
            cursor: pointer; background: var(--secondary-bg); color: var(--text-secondary); transition: border-color 0.2s, color 0.2s, background-color 0.2s;
            display: inline-flex; align-items: center; gap: 4px; user-select: none; min-height: 24px;
        }
        .info-option-pill:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
        .info-option-pill.selected {
            background: color-mix(in srgb, var(--accent-blue) 10%, var(--secondary-bg)); color: var(--accent-blue);
            border-color: color-mix(in srgb, var(--accent-blue) 70%, var(--border-color)); font-weight: 600;
        }
        .pill-quantity { display: inline-block; padding: 0px 5px; font-size: 0.7rem; font-weight: 700; background-color: var(--accent-blue); color: white; border-radius: var(--rounded-sm); }
        .spec-category-group { margin-bottom: 6px; }
        .spec-category-title { font-size: 0.72rem; color: var(--text-muted); margin-bottom: 3px; font-weight: 600; }
        .spec-pills-wrapper { display: flex; flex-wrap: wrap; gap: 4px 5px; }
        .manual-override-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; margin-top: 4px; }
        .notes-section { margin-top: var(--spacing-6); padding-top: var(--spacing-4); border-top: 1px solid var(--border-color); }
        #opportunity-detail-container .opp-rail-chip-wall,
        #opportunity-detail-container .opp-rail-card-list {
            display: flex;
            gap: var(--spacing-2);
        }
        #opportunity-detail-container .opp-rail-chip-wall { flex-wrap: wrap; }
        #opportunity-detail-container .opp-rail-card-list { flex-direction: column; }
        #opportunity-detail-container .opp-rail-chip {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-2);
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--secondary-bg);
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            color: var(--text-secondary);
            font-size: var(--font-size-sm);
            line-height: 1.35;
        }
        #opportunity-detail-container .opp-rail-chip-main {
            color: var(--text-primary);
            font-size: 13px;
            font-weight: 600;
        }
        #opportunity-detail-container .opp-rail-chip-meta,
        #opportunity-detail-container .opp-rail-mini-meta {
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 400;
        }
        #opportunity-detail-container .opp-rail-mini-card {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-2);
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--secondary-bg);
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        #opportunity-detail-container .opp-rail-mini-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: var(--spacing-2);
        }
        #opportunity-detail-container .opp-rail-mini-name {
            color: var(--text-primary);
            font-weight: 600;
            line-height: 1.35;
        }
        #opportunity-detail-container .opp-rail-contact-list {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-2);
        }
        #opportunity-detail-container .opp-rail-contact-chip {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-1);
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--secondary-bg);
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        #opportunity-detail-container .opp-rail-contact-summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-2);
            min-width: 0;
        }
        #opportunity-detail-container .opp-rail-contact-text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--text-primary);
            font-size: 13px;
            font-weight: 600;
            line-height: 1.35;
        }
        #opportunity-detail-container .opp-rail-contact-role {
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 400;
        }
        #opportunity-detail-container .opp-rail-contact-list:not(.is-managing) .opp-rail-actions {
            display: none;
        }
        #opportunity-detail-container .opp-rail-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-1);
        }
        #opportunity-detail-container .opp-rail-actions .action-btn.small {
            padding: 2px 6px;
            font-size: var(--font-size-xs);
            min-height: 0;
        }
        #opportunity-detail-container .opp-rail-manage-link {
            border: 0;
            background: transparent;
            color: var(--text-muted);
            padding: 0;
            font-size: var(--font-size-xs);
            cursor: pointer;
        }
        #opportunity-detail-container .opp-rail-manage-link:hover {
            color: var(--accent-blue);
        }
        #opportunity-detail-container .opp-rail-empty {
            padding: var(--spacing-3);
            border: 1px solid color-mix(in srgb, var(--border-color) 45%, transparent);
            border-radius: var(--rounded-md);
            color: var(--text-muted);
            background: var(--secondary-bg);
            font-size: var(--font-size-xs);
            font-weight: 450;
            text-align: center;
        }
    `;
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
    }
    style.textContent = css;
}

const OpportunityInfoCard = (() => {
    let _currentOpp = null;
    let _isCascadingInitialized = false; // [Phase 8.6A] Lazy Load Tracker
    let _opportunitySpecOptions = null;
    let _opportunitySpecOptionsPromise = null;
    let _usesOpportunitySpecFallback = false;

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

    function _getLegacySpecsConfig() {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        return systemConfig['可能下單規格'] || [];
    }

    function _normalizeLegacySpecOption(spec) {
        return {
            id: spec.value,
            label: spec.note || spec.value,
            category: spec.category || '?嗡?',
            displayOrder: Number.isFinite(Number(spec.sortOrder)) ? Number(spec.sortOrder) : 9999,
            behaviorMode: spec.value3 || '',
            legacyConfig: spec
        };
    }

    function _getLegacySpecOptions() {
        return _getLegacySpecsConfig().map(_normalizeLegacySpecOption);
    }

    function _normalizeProductSpecOption(spec) {
        if (!spec || !spec.id) return null;
        const label = spec.label || spec.name || spec.id;
        return {
            id: spec.id,
            label,
            category: spec.category || '未分類',
            displayOrder: Number.isFinite(Number(spec.displayOrder)) ? Number(spec.displayOrder) : 9999,
            behaviorMode: spec.behaviorMode || '',
            priceMtb: spec.priceMtb,
            priceSi: spec.priceSi,
            priceMtu: spec.priceMtu,
            status: spec.status
        };
    }

    function _ensureOpportunitySpecOptions() {
        if (_opportunitySpecOptions) return Promise.resolve(_opportunitySpecOptions);
        if (_opportunitySpecOptionsPromise) return _opportunitySpecOptionsPromise;
        if (typeof authedFetch !== 'function') {
            _usesOpportunitySpecFallback = true;
            _opportunitySpecOptions = _getLegacySpecOptions();
            return Promise.resolve(_opportunitySpecOptions);
        }

        _opportunitySpecOptionsPromise = Promise.resolve()
            .then(() => authedFetch('/api/products/opportunity-specs'))
            .then(response => {
                if (!response || !response.success || !Array.isArray(response.data)) {
                    throw new Error('Invalid opportunity spec response');
                }
                const productOptions = response.data
                    .map(_normalizeProductSpecOption)
                    .filter(Boolean);
                if (productOptions.length === 0) {
                    throw new Error('Empty opportunity spec response');
                }
                _usesOpportunitySpecFallback = false;
                _opportunitySpecOptions = productOptions;
                return _opportunitySpecOptions;
            })
            .catch(error => {
                console.warn('[OpportunityInfoCard] opportunity-specs fallback:', error);
                _usesOpportunitySpecFallback = true;
                _opportunitySpecOptions = _getLegacySpecOptions();
                return _opportunitySpecOptions;
            });

        return _opportunitySpecOptionsPromise;
    }

    function getOpportunitySpecOptionsSync() {
        return (_opportunitySpecOptions && _opportunitySpecOptions.length > 0)
            ? _opportunitySpecOptions
            : _getLegacySpecOptions();
    }

    function getOpportunitySpecOption(specId) {
        return getOpportunitySpecOptionsSync().find(spec => spec.id === specId) || null;
    }

    function render(opp) {
        _currentOpp = opp;
        _isCascadingInitialized = false; // Reset on re-render

        _injectStylesForOppInfoCard();
        const container = document.getElementById('opportunity-info-card-container');
        if (!container) return;
        const stepperContainer = document.getElementById('opportunity-stage-stepper-container');

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

        const stepperSlot = container.querySelector('[data-stepper-slot="opportunity-stage-stepper"]');
        if (stepperContainer && stepperSlot) {
            stepperSlot.replaceWith(stepperContainer);
            if (window.OpportunityStepper && typeof window.OpportunityStepper.init === 'function') {
                window.OpportunityStepper.init(opp);
            }
        }

        // 預先生成編輯表單，以便切換時使用
        _generateEditFormHTML(opp).then(html => {
            const editContainer = document.getElementById('opportunity-info-edit-mode');
            if (editContainer) {
                editContainer.innerHTML = html;
                // [Phase 8.6A PERF] Removed eager _initCascadingLogic(opp) to prevent duplicate companyList fetch.
            }
        }).catch(error => {
            console.error('[OpportunityInfoCard] edit form render failed:', error);
        });

        _ensureOpportunitySpecOptions().catch(error => {
            console.warn('[OpportunityInfoCard] opportunity spec preload skipped:', error);
        });
    }

    // [Phase 8.6A PERF] Lazy Initialization Entry Point
    async function ensureCascadingLogic(opp) {
        if (_isCascadingInitialized) return;
        await _ensureOpportunitySpecOptions();
        const editContainer = document.getElementById('opportunity-info-edit-mode');
        if (editContainer) {
            editContainer.innerHTML = await _generateEditFormHTML(opp);
        }
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
        const specsConfig = getOpportunitySpecOptionsSync();
        
        let specQuantities = new Map();
        try {
            const parsed = JSON.parse(opp.potentialSpecification);
            if (parsed && typeof parsed === 'object') specQuantities = new Map(Object.entries(parsed));
        } catch (e) {}

        const groups = new Map();
        specsConfig.slice().sort((a, b) => {
            const orderA = Number.isFinite(Number(a.displayOrder)) ? Number(a.displayOrder) : 9999;
            const orderB = Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 9999;
            return orderA - orderB;
        }).forEach(spec => {
            const cat = spec.category || '其他';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(spec);
        });

        let html = '<div id="spec-pills-container" class="form-group">';
        groups.forEach((items, category) => {
            let pillsHtml = '';
            items.forEach(spec => {
                const quantity = specQuantities.get(spec.id) || 0;
                const isSelected = specQuantities.has(spec.id);
                let qtyHtml = '';
                if (isSelected && spec.behaviorMode === 'allow_quantity' && quantity > 0) {
                    qtyHtml = `<span class="pill-quantity" data-spec-id="${spec.id}">(x${quantity})</span>`;
                }
                pillsHtml += `
                    <span class="info-option-pill ${isSelected ? 'selected' : ''}"
                          data-spec-id="${spec.id}"
                          title="${spec.label}">
                        ${spec.label}
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
        const businessType = ['NEW', 'RENEWAL', 'FOLLOWUP'].includes(opp.businessType) ? opp.businessType : 'FOLLOWUP';

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
                    <div class="op-edit-zone">
                        <div class="form-group">
                            <label class="form-label">機會名稱</label>
                            <input type="text" id="edit-opportunity-name" class="form-input" value="${opp.opportunityName || ''}">
                        </div>
                    </div>
                    
                    <div class="op-edit-zone">
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
                    </div>

                    <div class="op-edit-zone">
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
                            <label class="form-label">商務類型</label>
                            <select id="edit-business-type" class="form-select">
                                <option value="NEW" ${businessType === 'NEW' ? 'selected' : ''}>新案</option>
                                <option value="RENEWAL" ${businessType === 'RENEWAL' ? 'selected' : ''}>續約</option>
                                <option value="FOLLOWUP" ${businessType === 'FOLLOWUP' ? 'selected' : ''}>延伸</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">設備規模</label>
                            ${_renderPillsGroup('設備規模', opp.deviceScale, 'device-scale')}
                        </div>
                    </div>
                </div>

                <div class="form-col">
                    <div class="op-edit-zone">
                        <div class="form-group">
                            <label class="form-label">下單機率</label>
                            ${_renderPillsGroup('下單機率', opp.orderProbability, 'order-probability')}
                        </div>
                    </div>
                    
                    <div class="op-edit-zone">
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
                    </div>

                    <div class="op-edit-zone">
                        <div class="form-group">
                            <label class="form-label">目前階段</label>
                            ${_renderPillsGroup('機會階段', opp.currentStage, 'current-stage')}
                        </div>

                        <div class="form-group">
                            <label class="form-label">機會來源</label>
                            ${_renderPillsGroup('機會來源', opp.opportunitySource, 'opportunity-source')}
                        </div>
                    </div>

                    <div class="op-edit-zone">
                        <div class="form-group">
                            <label class="form-label">可能下單規格 (複選)</label>
                            ${_renderSpecsGroup(opp)}
                        </div>
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
        const mainContactSelect = document.getElementById('edit-main-contact');
        
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
                channelContactSelect.innerHTML = mainContactSelect?.innerHTML || '<option value="">-- 請選擇 --</option>';
                channelContactSelect.value = mainContactSelect?.value || '';
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

    return { render, handleSalesModelChange, ensureCascadingLogic, getOpportunitySpecOption, getOpportunitySpecOptionsSync };
})();

// OpportunityAssociatedOpps 保持不變
const OpportunityAssociatedOpps = (() => {
    let _isManageMode = false;

    async function _handleRemoveParentLink(opportunityId, rowIndex) {
        showConfirmDialog('您確定要移除此母機會關聯嗎？', async () => {
            showLoading('正在移除關聯...');
            try {
                const result = await authedFetch(`/api/opportunities/${opportunityId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ parentOpportunityId: '', modifier: getCurrentUser() })
                });
                if (result.success) {
                    _isManageMode = false;
                    if (typeof window.loadOpportunityDetailPage === 'function') {
                        await window.loadOpportunityDetailPage(opportunityId);
                    }
                } else {
                    throw new Error(result.error || '移除失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`移除關聯失敗: ${error.message}`, 'error');
            } finally { hideLoading(); }
        });
    }

    function render(details) {
        const container = document.getElementById('associated-opportunities-list');
        const addButton = document.getElementById('add-associated-opportunity-btn');
        if (!container) return;
        const { opportunityInfo, parentOpportunity, childOpportunities } = details;
        let html = '';
        _isManageMode = false;
        if (addButton) {
            addButton.style.display = 'none';
            addButton.onclick = null;
        }
        const manageBtn = document.getElementById('manage-associated-opportunity-btn');
        if (manageBtn) manageBtn.remove();
        const safeId = value => String(value || '').replace(/'/g, "\\'");
        const childItems = childOpportunities || [];
        const parentRelationLabelMap = {
            RENEWAL_OF: '續約自',
            FOLLOWUP_OF: '延伸自',
            EXPANSION_OF: '延伸自',
            UPGRADE_OF: '延伸自',
            REPLACEMENT_OF: '延伸自'
        };
        const childRelationLabelMap = {
            RENEWAL_OF: '續約案',
            FOLLOWUP_OF: '延伸案',
            EXPANSION_OF: '延伸案',
            UPGRADE_OF: '延伸案',
            REPLACEMENT_OF: '延伸案'
        };

        if (parentOpportunity) {
            const parentLabel = parentRelationLabelMap[opportunityInfo.relationType] || '';
            html += `
                <div class="opp-rail-chip">
                    ${parentLabel ? `<span class="opp-rail-chip-meta">${parentLabel}</span>` : ''}
                    <a href="#" class="text-link opp-rail-chip-main" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${safeId(parentOpportunity.opportunityId)}' })">${parentOpportunity.opportunityName}</a>
                </div>`;
        }
        childItems.forEach(child => {
            const childLabel = childRelationLabelMap[child.relationType] || '';
            html += `
                <a href="#" class="opp-rail-chip text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${safeId(child.opportunityId)}' })">
                    <span class="opp-rail-chip-main">${child.opportunityName}</span>
                    ${childLabel ? `<span class="opp-rail-chip-meta">${childLabel}</span>` : ''}
                </a>`;
        });

        container.innerHTML = `<div class="opp-rail-chip-wall">${html || '<div class="opp-rail-empty">尚無商務脈絡</div>'}</div>`;
    }
    return {
        render,
        _handleRemoveParentLink,
        resetManageMode: () => { _isManageMode = false; }
    };
})();
