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