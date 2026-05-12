// public/scripts/opportunities/details/opportunity-info-view.js
// Version: 8.8
// Date: 2026-05-12
// Changelog:
// [2026-05-12] Opportunity Detail header action alignment: match opportunity-name edit button to restrained stepper utility action style.
// -------------------------------------------------------------------------
// 檔案職責：專門負責「機會核心資訊」的純顯示模式 (Read-Only UI)
// UI 風格：Operational Workspace Header Composition
// 版本：1.8.7
// 修改日期：2026-05-11
// 修改紀錄：
// [2026-05-11] Opportunity Detail Value Hierarchy Pass A.
// [2026-05-11] Operational scan hierarchy refinement for key company, owner, contact, and value fields.
// [2026-05-11] Monetary value typography refinement with tabular numeric rhythm.
// [2026-05-11] Empty state productization refinement for quieter metadata-like fallbacks.
// [2026-05-11] Opportunity Detail Visual Language Spec v1 implementation.
// [2026-05-11] Section heading hierarchy refinement for operational metadata headings.
// [2026-05-11] Field/value hierarchy refinement for clearer scan rhythm.
// [2026-05-11] Divider rhythm refinement for calmer internal operational data separation.
// [2026-05-11] Operational action hierarchy refinement for restrained workspace controls.
// [2026-05-11] Opportunity Detail Pure Style Pass A: operationalize legacy header action button styling.
// [2026-05-11] Opportunity Detail typography alignment: unify workspace and rail section-heading language.
// [2026-05-11] Opportunity Detail divider rhythm alignment: standardize internal operational data separation styling.
// [2026-05-11] Opportunity Detail title surface radius alignment: unify opportunity header with restrained operational small-radius language.
// [2026-05-11] Opportunity Detail grid proportion refinement: tune middle operational workspace cards to 2-3.5-3-1.5 layout balance.
// [2026-05-11] Opportunity Detail grid proportion alignment: sync operational card widths with 3-3-2-2 business layout.
// [2026-05-11] Opportunity Detail operational card ordering refinement: align middle workspace cards to Basic Info / Business Context / Opportunity Overview / Key Dates.
// [2026-05-11] Opportunity Detail radius consistency alignment: preserve Level-1 title surface on the same operational card radius language as `.layer-card`.
// [2026-05-11] Opportunity Detail surface hierarchy recovery: elevate `.opp-name-strip` to `--secondary-bg` to restore Level 1 workspace contrast.
// [2026-05-08] Neutral shell spacing recovery for stable inner card flow.
// [2026-05-08] Notes bottom visual closure correction after wrapper neutralization.
// [2026-05-08] Structural decoupling stabilization: removed display: contents orchestration and flex order sandwiching.
// [2026-05-08] Natural DOM flow restoration with a stable Stepper placement slot.
// [2026-05-08] Opportunity Detail visual system decoupling from legacy dashboard surfaces.
// [2026-05-08] Core info card frame visibility correction using solid workspace frame variables.
// [2026-05-08] Operational typography rhythm refinement for labels, values, and section titles.
// [2026-05-08] Workspace density tuning to reduce vertical looseness while preserving readability.
// [2026-05-08] Radius consistency normalization across workspace info cards and inline badges.
// [2026-05-08] Compact operational card correction for the workspace info layout.
// [2026-05-08] Workspace info card density adjustment with small / small / wide / medium card proportions.
// [2026-05-08] Corrected field grouping for Basic Info / Key Dates / Business Context / Opportunity Overview.
// [2026-05-08] Workspace section containment recovery with soft operational segmentation.
// [2026-05-08] Operational grouping refinement for readable workspace sections without restoring Bento card behavior.
// [2026-05-08] Soft operational segmentation polish for core info, dates, business context, opportunity summary, and notes.
// [2026-05-08] Opportunity Detail Workspace Header composition migration: enabled existing Stepper integration into primary workspace flow.
// [2026-05-08] Core info Bento decomposition into header strip, operational groups, and notes while preserving full-width timeline ownership.
// [2026-05-08] Workspace Header composition migration and Core info hierarchy refactor.
// [2026-05-08] Bento decomposition into operational workspace structure while preserving display/edit mode contract.
// [2026-05-08] Stepper workflow reintegration and Timeline full-width preservation remain owned by opportunity-detail.html.
// [2026-03-02] Phase 8 Patch:
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
                gap: var(--spacing-5);
                width: 100%;
                box-sizing: border-box;
                position: relative;
            }

            .opp-name-strip {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: var(--spacing-3);
                background-color: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--rounded-sm);
                box-shadow: none;
                padding: var(--spacing-3);
                width: 100%;
                box-sizing: border-box;
            }

            .opp-name-content {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
                min-width: 0;
            }

            .name-title {
                font-size: 1.65rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.18;
                margin: 0;
                word-break: break-word;
            }

            .opp-operational-grid {
                display: grid;
                grid-template-columns: minmax(0, 2fr) minmax(0, 3.5fr) minmax(0, 3fr) minmax(0, 1.5fr);
                gap: var(--spacing-3);
                width: 100%;
                align-items: stretch;
            }

            /* --- 通用工作區區塊 --- */
            .layer-card {
                background-color: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--rounded-md);
                box-shadow: none;
                padding: var(--spacing-3);
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
            }

            .field-list {
                display: grid;
                grid-template-columns: 1fr;
                gap: var(--spacing-1);
            }

            .op-card-business .field-list {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: var(--spacing-1) var(--spacing-3);
            }

            .field-row {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
                min-width: 0;
                padding-top: var(--spacing-2);
                border-top: 1px solid color-mix(in srgb, var(--border-color) 35%, transparent);
            }

            .field-value {
                font-size: 0.98rem;
                font-weight: 500;
                color: var(--text-primary);
                line-height: 1.4;
                word-break: break-word;
            }

            .op-card-basic .field-row:nth-child(2) .field-value,
            .op-card-business .field-row:nth-child(1) .field-value {
                font-weight: 600;
            }

            .op-card-business .field-row:nth-child(3) .field-value,
            .op-card-business .field-row:nth-child(4) .field-value,
            .split-contact-row > span:not(.contact-prefix):not(.job-title-badge) {
                font-weight: 550;
            }

            .field-value.val-money {
                font-family: 'Roboto Mono', monospace;
                font-size: 1rem;
                font-weight: 650;
                font-variant-numeric: tabular-nums;
                letter-spacing: 0;
            }

            /* 統一標題樣式 (預設灰色) */
            .unified-label {
                font-size: var(--font-size-xs);
                font-weight: 450;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.32px;
                line-height: 1.2;
            }

            /* 內部卡片標題 (預設灰色) */
            .inner-card-title {
                font-size: var(--font-size-xs);
                font-weight: 600;
                color: var(--text-muted);
                margin-bottom: 0;
                padding-bottom: var(--spacing-2);
                border-bottom: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
                text-transform: uppercase;
                letter-spacing: 0.32px;
            }

            .header-card-action-btn {
                align-items: center;
                justify-content: center;
                padding: var(--spacing-3) var(--spacing-4);
                background: transparent;
                border: 1px solid transparent;
                border-radius: var(--rounded-sm);
                box-shadow: none;
                display: flex;
                flex-direction: column;
                gap: 6px;
                cursor: pointer;
                text-align: center;
                color: var(--text-muted);
                font-weight: 700;
                text-decoration: none;
                transform: none;
                transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
            }
            .header-card-action-btn:hover {
                background: color-mix(in srgb, var(--border-color) 28%, transparent);
                border-color: color-mix(in srgb, var(--border-color) 64%, transparent);
                color: var(--text-secondary);
                box-shadow: none;
                transform: none;
            }
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

            .split-contact-row {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 6px;
                font-size: 0.95rem;
                color: var(--text-primary);
                flex-wrap: wrap;
                width: 100%;
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
                border-radius: var(--rounded-sm);
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
                border-radius: var(--rounded-sm);
                font-size: 0.82rem;
                font-weight: 700;
                line-height: 1.25;
            }
            .spec-qty-text {
                margin-left: 4px;
                opacity: 0.9;
                font-family: monospace; 
                font-weight: 700;
            }

            .dates-content {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-1);
                height: 100%;
                justify-content: flex-start; 
            }
            .date-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: var(--spacing-2);
                border-top: 1px solid color-mix(in srgb, var(--border-color) 35%, transparent);
            }
            .date-row:last-child { padding-bottom: 0; }
            .date-key { font-size: var(--font-size-xs); color: var(--text-muted); font-weight: 450; text-transform: uppercase; letter-spacing: 0.32px; }
            .date-val { font-size: 0.95rem; color: var(--text-primary); font-weight: 600; line-height: 1.4; font-family: monospace; }

            .empty-inline {
                color: var(--text-muted);
                font-size: var(--font-size-sm);
                font-style: normal;
                font-weight: 450;
                padding: 4px 0;
            }

            .notes-text-clean {
                font-size: 0.98rem;
                color: var(--text-primary);
                line-height: 1.5;
                white-space: pre-wrap;
                padding-top: 6px;
            }

            .opp-notes-block {
                margin-bottom: var(--spacing-3);
            }

            /* RWD */
            @media (max-width: 1200px) {
                .opp-operational-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 900px) {
                .opp-name-strip { flex-direction: column; }
                .header-card-action-btn { width: 100%; align-items: center; justify-content: center; background: var(--primary-bg); }
                .opp-operational-grid,
                .op-card-business .field-list,
                .field-list {
                    grid-template-columns: 1fr;
                }
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
        let specsContent = '<span class="empty-inline">無指定規格</span>';
        
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
        
        const notesContent = opp.notes || '<span class="empty-inline">無備註</span>';

        // [PATCH] Support multiple field names for Probability (SQL vs Sheet)
        const displayProbability = getFirst(opp, ['orderProbability', 'winProbability', 'win_probability'], '-') || '-';

        // Compatibility mappings (new DTO vs legacy UI)
        const displayAssignee = getFirst(opp, ['assignee', 'owner'], '-') || '-';
        const displaySource = getFirst(opp, ['opportunitySource', 'source'], '-') || '-';

        return `
            <div class="opp-view-container">

                <div class="opp-name-strip">
                    <div class="opp-name-content">
                        <span class="unified-label">機會名稱</span>
                        <h1 class="name-title">${opp.opportunityName || '未命名機會'}</h1>
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

                <div data-stepper-slot="opportunity-stage-stepper"></div>

                <div class="opp-operational-grid">
                    <div class="layer-card op-card-basic">
                        <div class="inner-card-title">基本資訊</div>
                        <div class="field-list">
                            <div class="field-row">
                                <span class="unified-label">機會種類</span>
                                <span class="field-value">${opp.opportunityType || '-'}</span>
                            </div>
                            <div class="field-row">
                                <span class="unified-label">負責業務</span>
                                <span class="field-value">${displayAssignee}</span>
                            </div>
                            <div class="field-row">
                                <span class="unified-label">機會來源</span>
                                <span class="field-value">${displaySource}</span>
                            </div>
                        </div>
                    </div>

                    <div class="layer-card op-card-business">
                        <div class="inner-card-title">商務脈絡</div>
                        <div class="field-list">
                            <div class="field-row">
                                <span class="unified-label">終端客戶</span>
                                <span class="field-value">${customerCompany || '-'}</span>
                            </div>
                            <div class="field-row">
                                <span class="unified-label">銷售模式 / 通路</span>
                                <span class="field-value">${isDirect ? salesModel : `${salesModel} / ${targetName}`}</span>
                            </div>
                            <div class="field-row">
                                <span class="unified-label">主要聯絡人</span>
                                <span class="field-value">${mainContact || '-'}</span>
                            </div>
                            <div class="field-row">
                                <span class="unified-label">通路聯絡人</span>
                                <span class="field-value">${channelContact || '-'}</span>
                            </div>
                            ${targetContactName ? `
                                <div class="field-row">
                                    <span class="unified-label">主要窗口</span>
                                    <div class="split-contact-row">
                                    <span class="contact-prefix">窗口：</span>
                                    <span>${targetContactName}</span>
                                    ${titleHtml}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="layer-card op-card-overview">
                        <div class="inner-card-title">商機概況</div>
                        <div class="field-list">
                            <div class="field-row">
                                <span class="unified-label">機會價值</span>
                                <span class="field-value val-money">$${valueStr}</span>
                            </div>
                            <div class="field-row">
                                <span class="unified-label">下單機率</span>
                                <span class="field-value">${displayProbability}</span>
                            </div>
                        </div>
                        <div class="inner-card-title">可能下單規格</div>
                        <div class="specs-tags-container">
                            ${specsContent}
                        </div>
                    </div>

                    <div class="layer-card op-card-dates">
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

                <div class="layer-card opp-notes-block">
                    <div class="inner-card-title">備註</div>
                    <div class="notes-text-clean">${notesContent}</div>
                </div>

            </div>
        `;
    }

    return { render };
})();
