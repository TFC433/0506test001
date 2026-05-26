// public/scripts/events/event-report-manager.js
// 職責：專門負責「查看報告」彈窗的顯示、渲染與匯出功能
// (V6 - 包含智慧職稱關聯、動態標頭色、膠囊顯示)
/**
 * @version 1.0.11
 * @date 2026-04-14
 * @description [Forensics Probe] Changed company name enrichment assignment to conditional block to prevent empty string fallback issues.
 */

// [Forensics Probe] Debug Counter
window._DEBUG_SHOW_EVENT_REPORT_COUNT ||= 0;

function ensureInlineIotOptionStyles() {
    if (document.getElementById('inline-iot-option-styles')) return;
    const style = document.createElement('style');
    style.id = 'inline-iot-option-styles';
    style.textContent = `
        #tab-content-interactions .crm-stream-item.operational.has-inline-report-expanded .inline-event-report .inline-iot-multiselect {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        #tab-content-interactions .crm-stream-item.operational.has-inline-report-expanded .inline-event-report .inline-iot-multiselect__chip {
            background: transparent;
            border: 1px solid color-mix(in srgb, var(--border-color) 28%, transparent);
            border-radius: 2px;
            box-shadow: none;
            color: color-mix(in srgb, var(--text-muted, #6b7280) 76%, var(--text-secondary));
            cursor: pointer;
            font: inherit;
            font-size: 0.78rem;
            font-weight: 600;
            line-height: 1.1;
            padding: 2px 6px;
        }
        #tab-content-interactions .crm-stream-item.operational.has-inline-report-expanded .inline-event-report .inline-iot-multiselect__chip:hover {
            border-color: color-mix(in srgb, var(--workspace-domain-accent) 24%, var(--border-color));
            color: #111827;
        }
        #tab-content-interactions .crm-stream-item.operational.has-inline-report-expanded .inline-event-report .inline-iot-multiselect__chip.is-selected {
            background: color-mix(in srgb, var(--workspace-domain-accent) 10%, #ffffff);
            border-color: color-mix(in srgb, var(--workspace-domain-accent) 44%, var(--border-color));
            color: var(--workspace-domain-accent);
        }
        #tab-content-interactions .crm-stream-item.operational.has-inline-report-expanded .inline-event-report .inline-iot-option-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        #tab-content-interactions .crm-stream-item.operational.has-inline-report-expanded .inline-event-report .inline-iot-option-badge {
            background: color-mix(in srgb, var(--workspace-domain-accent) 8%, var(--workspace-surface-panel, #ffffff));
            border: 1px solid color-mix(in srgb, var(--workspace-domain-accent) 26%, var(--workspace-divider, var(--border-color)));
            border-radius: 2px;
            color: color-mix(in srgb, var(--workspace-domain-accent) 72%, #111827);
            display: inline-block;
            font-size: 0.76rem;
            font-weight: 700;
            line-height: 1.1;
            padding: 2px 6px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * 顯示單筆事件的詳細報告彈出視窗
 * @param {string} eventId - 要顯示報告的事件 ID
 */
async function showEventLogReport(eventId) {
    // [Forensics Probe] Trace call
    window._DEBUG_SHOW_EVENT_REPORT_COUNT++;
    console.log(`[Forensics] showEventLogReport called (Count: ${window._DEBUG_SHOW_EVENT_REPORT_COUNT})`, { eventId });
    console.trace('[Forensics] showEventLogReport trace');

    let modalContent = document.getElementById('event-log-report-content');
    
    // 確保 Modal 結構存在
    if (!modalContent) {
        const modalContainer = document.getElementById('modal-container');
        try {
            // 【修改】路徑修正：指向 /views/event-log-list.html (保留原始路徑)
            const modalViewsHtml = await fetch('/views/event-log-list.html').then(res => res.text());
            modalContainer.insertAdjacentHTML('beforeend', modalViewsHtml);
            modalContent = document.getElementById('event-log-report-content');
        } catch (error) {
            console.error('載入 event-log-list.html 失敗:', error);
            showNotification('無法開啟報告視窗', 'error');
            return;
        }
    }
    
    modalContent.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入報告中...</p></div>';
    showModal('event-log-report-modal');

    try {
        // 1. 獲取事件本身資料
        const result = await authedFetch(`/api/events/${eventId}`);
        if (!result.success || !result.data) throw new Error(result.error || '找不到該筆紀錄');
        
        const eventData = result.data;

        // 2. 【智慧關聯】嘗試獲取關聯的聯絡人清單以補完職稱
        let contextContacts = [];
        try {
            if (eventData.opportunityId) {
                // 如果關聯機會，抓取該機會的詳細資料 (包含 linkedContacts)
                const oppResult = await authedFetch(`/api/opportunities/${eventData.opportunityId}/details`);
                if (oppResult.success && oppResult.data) {
                    contextContacts = oppResult.data.linkedContacts || [];
                    
                    const oppInfo = oppResult.data.opportunityInfo || {};
                    // [Forensics Probe] 從機會明細 (opportunityInfo) 中提取並補完 eventData 的名稱欄位，確保 UI 能正確顯示
                    eventData.opportunityName = oppInfo.opportunityName || eventData.opportunityName || '';
                    if (oppInfo.customerCompany) {
                        eventData.companyName = oppInfo.customerCompany;
                    }
                }
            } else if (eventData.companyId) { // 如果沒有機會ID但有公司ID，嘗試抓公司聯絡人
                const compResult = await authedFetch(`/api/companies/${eventData.companyId}/details`);
                if (compResult.success && compResult.data) {
                    contextContacts = compResult.data.contacts || [];
                    const companyInfo = compResult.data.companyInfo || {};
                    if (companyInfo.companyName || companyInfo.customerCompany) {
                        eventData.companyName = 
                            companyInfo.companyName || 
                            companyInfo.customerCompany;
                    }
                }
            }
        } catch (e) {
            console.warn("[EventReport] 無法獲取關聯聯絡人或關聯資訊進行比對", e);
            // 失敗不影響報告顯示，只是無法自動補齊名稱或職稱
        }
        
        // 3. 渲染報告 (傳入 contextContacts)
        const reportHTML = renderEventLogReportHTML(eventData, contextContacts);
        modalContent.innerHTML = reportHTML;
        
        // 4. 綁定按鈕事件
        document.getElementById('edit-event-log-btn').onclick = () => {
            closeModal('event-log-report-modal');
            
            // 切換至新的獨立編輯器
            if (window.EventEditorStandalone) {
                EventEditorStandalone.open(eventId); 
            } else {
                console.error("EventEditorStandalone module not loaded");
            }
        };
        document.getElementById('report-delete-event-btn').onclick = () => {
            if (typeof confirmDeleteEvent === 'function') {
                confirmDeleteEvent(eventData.eventId, eventData.eventName);
            } else {
                console.error('confirmDeleteEvent 函式未定義');
            }
        };

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            modalContent.innerHTML = `<div class="alert alert-error">讀取事件報告失敗: ${error.message}</div>`;
        }
    }
}

function renderOperationalWorkspaceHTML(event, contextContacts = []) {
    ensureInlineIotOptionStyles();
    const formatTextValue = (value) => {
        if (!value) return '';
        return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    const formatNarrativeValue = (value) => formatTextValue(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const parseMultiSelectValue = (value) => String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    const createMultiSelectBadgesHTML = (value) => {
        const selectedValues = parseMultiSelectValue(value);
        if (!selectedValues.length) return '';
        return `<div class="inline-iot-option-badges">${selectedValues.map(item => (
            `<span class="inline-iot-option-badge">${formatTextValue(item)}</span>`
        )).join('')}</div>`;
    };
    const createMetaRowHTML = (label, contentHTML) => {
        if (!contentHTML) return '';
        return `
            <div class="report-top-meta__item">
                <span class="report-top-meta__label">${label}</span>
                <span class="report-top-meta__value">${contentHTML}</span>
            </div>`;
    };
    const createMetaGroupHTML = (contentHTML, modifier = '') => `
            <div class="report-top-meta__group${modifier ? ` report-top-meta__group--${modifier}` : ''}">${contentHTML}</div>`;
    const createWorkspaceFieldHTML = (label, contentHTML, modifier) => {
        if (!contentHTML) return '';
        return `
            <div class="operational-field operational-field--${modifier}">
                <div class="operational-field__label">${label}</div>
                <div class="operational-field__value">${contentHTML}</div>
            </div>`;
    };

    const eventTypeConfig = new Map((window.CRM_APP?.systemConfig['事件類型'] || []).map(t => [t.value, { note: t.note, color: t.color }]));
    const typeInfo = eventTypeConfig.get(event.eventType) || { note: (event.eventType || 'unknown').toUpperCase(), color: null };
    const eventTypeLabel = typeInfo.note;
    const fallbackAccentByType = { iot: '#2563eb', dt: '#6d5bd0', dx: '#6d5bd0' };
    const headerColor = typeInfo.color || fallbackAccentByType[event.eventType] || '#6c757d';
    const updatedTime = event.updatedTime || event.updated_time || event.updatedAt || event.updated_at;

    let systemMetaHTML = createMetaRowHTML('事件種類', `<span class="inline-event-type-badge" style="--event-type-color: ${headerColor};">${formatTextValue(eventTypeLabel)}</span>`);
    if (event.createdTime) {
        systemMetaHTML += createMetaRowHTML('建立時間', formatDateTime(event.createdTime));
    }
    if (updatedTime) {
        systemMetaHTML += createMetaRowHTML('最後修改時間', formatDateTime(updatedTime));
    }
    let meetingMetaHTML = createMetaRowHTML('會議地點', formatTextValue(event.visitPlace));
    meetingMetaHTML += createMetaRowHTML('我方與會', _renderParticipantsPills(event.ourParticipants, 'our-side'));
    meetingMetaHTML += createMetaRowHTML('客戶與會', _renderParticipantsPills(event.clientParticipants, 'client-side', contextContacts));
    const topMetaHTML = [
        createMetaGroupHTML(systemMetaHTML, 'system'),
        createMetaGroupHTML(meetingMetaHTML, 'meeting'),
        createMetaGroupHTML('', 'future')
    ].join('');

    const narrativeFields = [
        { key: 'eventContent', label: '會議內容', type: 'textarea', placeholder: '請輸入會議紀錄...' },
        { key: 'clientQuestions', label: '客戶提問', type: 'textarea', placeholder: '客戶提出的問題...' },
        { key: 'clientIntelligence', label: '客戶情報', type: 'textarea', placeholder: '收集到的情報...' },
        { key: 'eventNotes', label: '備註', type: 'textarea', placeholder: '其他備註事項...' }
    ];
    const domainFieldsByType = {
        iot: [
            { key: 'iot_deviceScale', fallbackKey: 'deviceScale', label: '設備規模', type: 'textarea', placeholder: '例: 機台數量、PLC 數量' },
            { key: 'iot_lineFeatures', fallbackKey: 'lineFeatures', label: '生產線特徵', type: 'multiselect', options: ['工具機', 'ROBOT', '傳產機', 'PLC'] },
            { key: 'iot_productionStatus', fallbackKey: 'productionStatus', label: '生產現況', type: 'textarea', placeholder: '客戶目前生產情況' },
            { key: 'iot_iotStatus', fallbackKey: 'iotStatus', label: 'IoT現況', type: 'textarea', placeholder: '客戶 IoT 導入情況' },
            { key: 'iot_painPoints', fallbackKey: 'painPoints', label: '痛點分類', type: 'multiselect', options: ['Monitoring', 'Improve OEE', 'Reduce Man-hours', 'Others'] },
            { key: 'iot_painPointDetails', fallbackKey: 'painPointDetails', label: '客戶痛點說明', type: 'textarea', placeholder: '請詳細描述客戶提出的具體困難點...' },
            { key: 'iot_painPointAnalysis', fallbackKey: 'painPointAnalysis', label: '痛點分析與對策', type: 'textarea', placeholder: '針對上述痛點，我方提出的分析觀點或初步對策...' },
            { key: 'iot_systemArchitecture', fallbackKey: 'systemArchitecture', label: '系統架構', type: 'textarea', placeholder: '系統架構簡圖或文字描述' }
        ],
        dt: [
            { key: 'dt_deviceScale', fallbackKey: 'deviceScale', label: '設備規模', type: 'textarea', placeholder: '請輸入設備規模，例如機台數量、產線數量或主要設備...' },
            { key: 'dt_processingType', fallbackKey: 'processingType', label: '加工類型', type: 'textarea', placeholder: '請輸入加工類型，例如車削、銑削、磨削、複合加工...' },
            { key: 'dt_industry', fallbackKey: 'industry', label: '加工產業別', type: 'textarea', placeholder: '請輸入加工產業別，例如航太、汽車、醫療、模具...' }
        ],
        dx: []
    };

    const mainContentHTML = narrativeFields.map(field => (
        createWorkspaceFieldHTML(field.label, formatNarrativeValue(event[field.key]), 'narrative')
    )).join('');
    const domainFields = domainFieldsByType[event.eventType] || [];
    const sideContentHTML = domainFields.map(field => {
        const rawValue = event[field.key] || event[field.fallbackKey];
        const contentHTML = field.type === 'multiselect'
            ? createMultiSelectBadgesHTML(rawValue)
            : formatTextValue(rawValue);
        return createWorkspaceFieldHTML(field.label, contentHTML, 'meta');
    }).join('');

    return `<div class="operational-workspace-view" style="--workspace-domain-accent: ${headerColor};">
        <div class="report-top-meta">${topMetaHTML}</div>
        <div class="report-workspace-grid">
            <section class="workspace-main">
                <div class="operational-section">
                    <h3 class="section-title">會議紀錄</h3>
                    ${mainContentHTML || '<div class="inline-event-report__status">尚無會議敘述資料。</div>'}
                </div>
            </section>
            ${sideContentHTML ? `<aside class="workspace-side">
                <div class="operational-section">
                    <h3 class="section-title">${eventTypeLabel} 專屬資訊</h3>
                    ${sideContentHTML}
                </div>
            </aside>` : ''}
        </div>
    </div>`;
}

/**
 * 輔助函式：將人員字串轉換為膠囊 HTML (含智慧職稱補完)
 * @param {string} participantsStr - 原始字串
 * @param {string} typeClass - 樣式類別 ('our-side' 或 'client-side')
 * @param {Array} contextContacts - 用於比對的聯絡人清單
 */
function renderOperationalWorkspaceEditHTML(event, contextContacts = []) {
    ensureInlineIotOptionStyles();
    const formatTextValue = (value) => {
        if (!value) return '';
        return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    const formatAttributeValue = (value) => formatTextValue(value).replace(/"/g, "&quot;");
    const createMetaRowHTML = (label, contentHTML) => `
            <div class="report-top-meta__item">
                <span class="report-top-meta__label">${label}</span>
                <span class="report-top-meta__value">${contentHTML}</span>
            </div>`;
    const createMetaGroupHTML = (contentHTML, modifier = '') => `
            <div class="report-top-meta__group${modifier ? ` report-top-meta__group--${modifier}` : ''}">${contentHTML}</div>`;
    const createInputHTML = (key, value, placeholder = '') => `
        <input class="inline-report-control inline-report-control--input" type="text" data-report-field="${key}" value="${formatAttributeValue(value)}"${placeholder ? ` placeholder="${formatAttributeValue(placeholder)}"` : ''}>`;
    const createTextareaHTML = (key, value, placeholder = '') => `<textarea class="inline-report-control inline-report-control--textarea" data-report-field="${key}" rows="1"${placeholder ? ` placeholder="${formatAttributeValue(placeholder)}"` : ''}>${formatTextValue(value)}</textarea>`;
    const createWorkspaceFieldHTML = (label, contentHTML, modifier) => `
            <div class="operational-field operational-field--${modifier}">
                <div class="operational-field__label">${label}</div>
                <div class="operational-field__value">${contentHTML}</div>
            </div>`;
    const parseMultiSelectValue = (value) => String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    const createMultiSelectHTML = (fieldConfig, currentValue) => {
        const selectedValues = parseMultiSelectValue(currentValue);
        const selectedSet = new Set(selectedValues.map(item => item.toLowerCase()));
        const toggleScript = "const root=this.closest('.inline-iot-multiselect');this.classList.toggle('is-selected');this.setAttribute('aria-pressed',this.classList.contains('is-selected')?'true':'false');root.querySelector('input[data-report-field]').value=Array.from(root.querySelectorAll('.inline-iot-multiselect__chip.is-selected')).map(chip=>chip.getAttribute('data-iot-option')).join(', ');";
        const optionsHTML = (fieldConfig.options || []).map(option => {
            const isSelected = selectedSet.has(option.toLowerCase());
            return `<button type="button" class="inline-iot-multiselect__chip${isSelected ? ' is-selected' : ''}" data-iot-option="${formatAttributeValue(option)}" aria-pressed="${isSelected ? 'true' : 'false'}" onclick="${toggleScript}">${formatTextValue(option)}</button>`;
        }).join('');
        return `<div class="inline-iot-multiselect" data-iot-multiselect="${formatAttributeValue(fieldConfig.key)}">
            <input type="hidden" data-report-field="${formatAttributeValue(fieldConfig.key)}" value="${formatAttributeValue(selectedValues.join(', '))}">
            ${optionsHTML}
        </div>`;
    };
    const parseParticipants = (value) => String(value || '')
        .split(/[,，、;；]/)
        .map(name => name.trim())
        .filter(Boolean);
    const uniqueNames = (names) => {
        const seen = new Set();
        return names.filter(name => {
            const key = name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };
    const createParticipantSelectorHTML = (key, value, candidates) => {
        const selectedNames = uniqueNames(parseParticipants(value));
        const selectedSet = new Set(selectedNames.map(name => name.toLowerCase()));
        const candidateItems = uniqueNames(candidates.map(candidate => candidate.value)).map(candidateValue => {
            const candidate = candidates.find(item => item.value === candidateValue);
            return {
                value: candidateValue,
                label: candidate?.label || candidateValue
            };
        });
        const candidateSet = new Set(candidateItems.map(candidate => candidate.value.toLowerCase()));
        const manualNames = selectedNames.filter(name => !candidateSet.has(name.toLowerCase()));
        const hiddenValue = selectedNames.join(', ');
        const chipsHTML = candidateItems.map(candidate => {
            const isSelected = selectedSet.has(candidate.value.toLowerCase());
            return `<button type="button" class="inline-participant-selector__chip${isSelected ? ' is-selected' : ''}" data-participant-value="${formatAttributeValue(candidate.value)}" aria-pressed="${isSelected ? 'true' : 'false'}">${formatTextValue(candidate.label)}</button>`;
        }).join('');
        const candidatesHTML = chipsHTML
            ? `<div class="inline-participant-selector__candidates">${chipsHTML}</div>`
            : key === 'clientParticipants'
                ? '<div class="inline-participant-selector__empty">無關聯聯絡人，請手動新增</div>'
                : '';

        return `
        <div class="inline-participant-selector" data-participant-selector="${key}">
            <input type="hidden" data-report-field="${key}" value="${formatAttributeValue(hiddenValue)}">
            ${candidatesHTML}
            <input class="inline-participant-selector__manual" type="text" data-participant-manual value="${formatAttributeValue(manualNames.join(', '))}" placeholder="手動新增姓名">
        </div>`;
    };

    const eventTypeConfig = new Map((window.CRM_APP?.systemConfig['事件類型'] || []).map(t => [t.value, { note: t.note, color: t.color }]));
    const typeInfo = eventTypeConfig.get(event.eventType) || { note: (event.eventType || 'unknown').toUpperCase(), color: null };
    const eventTypeLabel = typeInfo.note;
    const fallbackAccentByType = { iot: '#2563eb', dt: '#6d5bd0', dx: '#6d5bd0' };
    const headerColor = typeInfo.color || fallbackAccentByType[event.eventType] || '#6c757d';
    const updatedTime = event.updatedTime || event.updated_time || event.updatedAt || event.updated_at;

    let systemMetaHTML = createMetaRowHTML('事件種類', `<span class="inline-event-type-badge" style="--event-type-color: ${headerColor};">${formatTextValue(eventTypeLabel)}</span>`);
    if (event.createdTime) {
        systemMetaHTML += createMetaRowHTML('建立時間', formatDateTime(event.createdTime));
    }
    if (updatedTime) {
        systemMetaHTML += createMetaRowHTML('最後修改時間', formatDateTime(updatedTime));
    }
    const teamMembers = Array.isArray(window.CRM_APP?.systemConfig?.['團隊成員'])
        ? window.CRM_APP.systemConfig['團隊成員']
        : [];
    const ourParticipantCandidates = teamMembers.map(member => {
        const name = member && typeof member === 'object'
            ? (member.note || member.value || member.name || '')
            : member;
        return String(name || '').trim();
    }).filter(Boolean).map(name => ({ value: name, label: name }));
    const clientParticipantCandidates = (Array.isArray(contextContacts) ? contextContacts : []).map(contact => {
        const name = String(contact?.name || '').trim();
        const position = String(contact?.position || '').trim();
        return name ? { value: name, label: position ? `${name} (${position})` : name } : null;
    }).filter(Boolean);

    let meetingMetaHTML = createMetaRowHTML('會議地點', createInputHTML('visitPlace', event.visitPlace));
    meetingMetaHTML += createMetaRowHTML('我方與會', createParticipantSelectorHTML('ourParticipants', event.ourParticipants, ourParticipantCandidates));
    meetingMetaHTML += createMetaRowHTML('客戶與會', createParticipantSelectorHTML('clientParticipants', event.clientParticipants, clientParticipantCandidates));
    const topMetaHTML = [
        createMetaGroupHTML(systemMetaHTML, 'system'),
        createMetaGroupHTML(meetingMetaHTML, 'meeting'),
        createMetaGroupHTML('', 'future')
    ].join('');

    const narrativeFields = [
        { key: 'eventContent', label: '會議內容', type: 'textarea', placeholder: '請輸入會議紀錄...' },
        { key: 'clientQuestions', label: '客戶提問', type: 'textarea', placeholder: '客戶提出的問題...' },
        { key: 'clientIntelligence', label: '客戶情報', type: 'textarea', placeholder: '收集到的情報...' },
        { key: 'eventNotes', label: '備註', type: 'textarea', placeholder: '其他備註事項...' }
    ];
    const domainFieldsByType = {
        iot: [
            { key: 'iot_deviceScale', fallbackKey: 'deviceScale', label: '設備規模', type: 'textarea', placeholder: '例: 機台數量、PLC 數量' },
            { key: 'iot_lineFeatures', fallbackKey: 'lineFeatures', label: '生產線特徵', type: 'multiselect', options: ['工具機', 'ROBOT', '傳產機', 'PLC'] },
            { key: 'iot_productionStatus', fallbackKey: 'productionStatus', label: '生產現況', type: 'textarea', placeholder: '客戶目前生產情況' },
            { key: 'iot_iotStatus', fallbackKey: 'iotStatus', label: 'IoT現況', type: 'textarea', placeholder: '客戶 IoT 導入情況' },
            { key: 'iot_painPoints', fallbackKey: 'painPoints', label: '痛點分類', type: 'multiselect', options: ['Monitoring', 'Improve OEE', 'Reduce Man-hours', 'Others'] },
            { key: 'iot_painPointDetails', fallbackKey: 'painPointDetails', label: '客戶痛點說明', type: 'textarea', placeholder: '請詳細描述客戶提出的具體困難點...' },
            { key: 'iot_painPointAnalysis', fallbackKey: 'painPointAnalysis', label: '痛點分析與對策', type: 'textarea', placeholder: '針對上述痛點，我方提出的分析觀點或初步對策...' },
            { key: 'iot_systemArchitecture', fallbackKey: 'systemArchitecture', label: '系統架構', type: 'textarea', placeholder: '系統架構簡圖或文字描述' }
        ],
        dt: [
            { key: 'dt_deviceScale', fallbackKey: 'deviceScale', label: '設備規模', type: 'textarea', placeholder: '請輸入設備規模，例如機台數量、產線數量或主要設備...' },
            { key: 'dt_processingType', fallbackKey: 'processingType', label: '加工類型', type: 'textarea', placeholder: '請輸入加工類型，例如車削、銑削、磨削、複合加工...' },
            { key: 'dt_industry', fallbackKey: 'industry', label: '加工產業別', type: 'textarea', placeholder: '請輸入加工產業別，例如航太、汽車、醫療、模具...' }
        ],
        dx: []
    };

    const mainContentHTML = narrativeFields.map(field => (
        createWorkspaceFieldHTML(field.label, createTextareaHTML(field.key, event[field.key], field.placeholder), 'narrative')
    )).join('');
    const domainFields = domainFieldsByType[event.eventType] || [];
    const sideContentHTML = domainFields.map(field => {
        const rawValue = event[field.key] || event[field.fallbackKey];
        const controlHTML = field.type === 'multiselect'
            ? createMultiSelectHTML(field, rawValue)
            : createTextareaHTML(field.key, rawValue, field.placeholder);
        return createWorkspaceFieldHTML(field.label, controlHTML, 'meta');
    }).join('');

    return `<div class="operational-workspace-view operational-workspace-edit" style="--workspace-domain-accent: ${headerColor};">
        <div class="report-top-meta">${topMetaHTML}</div>
        <div class="report-workspace-grid">
            <section class="workspace-main">
                <div class="operational-section">
                    <h3 class="section-title">會議紀錄</h3>
                    ${mainContentHTML}
                </div>
            </section>
            ${sideContentHTML ? `<aside class="workspace-side">
                <div class="operational-section">
                    <h3 class="section-title">${eventTypeLabel} 專屬資訊</h3>
                    ${sideContentHTML}
                </div>
            </aside>` : ''}
        </div>
    </div>`;
}

function _renderParticipantsPills(participantsStr, typeClass, contextContacts = []) {
    if (!participantsStr) return '-';

    // 切割：只認逗號
    const names = participantsStr.split(/[,，、;]+/)
        .map(s => s.trim())
        .filter(Boolean);

    if (names.length === 0) return '-';

    return `<div class="participants-wrapper">` + 
           names.map(name => {
               let displayName = name;

               // 【智慧補完邏輯】只針對客戶端人員，且當名字內沒有括號時才嘗試補完
               if (typeClass === 'client-side' && !name.includes('(') && contextContacts.length > 0) {
                   // 嘗試在聯絡人清單中尋找同名的人
                   const matchedContact = contextContacts.find(c => c.name === name);
                   if (matchedContact && matchedContact.position) {
                       displayName = `${name} (${matchedContact.position})`;
                   }
               }

               return `<span class="participant-pill ${typeClass}">${displayName}</span>`;
           }).join('') + 
           `</div>`;
}

/**
 * 渲染事件報告 HTML
 * @param {object} event - 事件物件
 * @param {Array} contextContacts - 關聯聯絡人清單 (用於補完職稱)
 * @returns {string} HTML 字串
 */
function renderEventLogReportHTML(event, contextContacts = [], options = {}) {
    const isInlineVariant = options && options.variant === 'inline';
    
    const createItemHTML = (label, contentHTML, layout) => {
        const finalContent = (contentHTML && contentHTML !== '') ? contentHTML : '-';
        const layoutClass = layout ? ` info-item--${layout}` : '';
        return `
            <div class="info-item${layoutClass}">
                <div class="info-label">${label}</div>
                <div class="info-value-box">${finalContent}</div>
            </div>`;
    };
    const createTopMetaItemHTML = (label, contentHTML) => {
        if (!contentHTML) return '';
        return `
            <div class="report-top-meta__item">
                <span class="report-top-meta__label">${label}</span>
                <span class="report-top-meta__value">${contentHTML}</span>
            </div>`;
    };
    
    const formatTextValue = (value) => {
        if (!value) return '';
        return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    const linkedEntityType = event.opportunityId ? '關聯機會' : '關聯公司';
    const linkedEntityName = event.opportunityId 
        ? (event.opportunityName || '-') 
        : (event.companyName || (event.companyId ? '-' : '未指定'));
        
    // 取得系統設定顏色
    const eventTypeConfig = new Map((window.CRM_APP?.systemConfig['事件類型'] || []).map(t => [t.value, { note: t.note, color: t.color }]));
    const typeInfo = eventTypeConfig.get(event.eventType) || { note: (event.eventType || 'unknown').toUpperCase(), color: '#6c757d' };
    
    const eventTypeLabel = typeInfo.note;
    const headerColor = typeInfo.color || '#6c757d';

    const fieldMapping = {
        common: {
            title: "會議共通資訊",
            fields: [
                { key: 'visitPlace', label: '會議地點', type: 'text' },
                { key: 'ourParticipants', label: '我方與會', type: 'pill-our' },
                { key: 'clientParticipants', label: '客戶與會', type: 'pill-client' },
                { key: 'eventContent', label: '會議內容', type: 'text' },
                { key: 'clientQuestions', label: '客戶提問', type: 'text' },
                { key: 'clientIntelligence', label: '客戶情報', type: 'text' },
                { key: 'eventNotes', label: '備註', type: 'text' }
            ]
        },
        iot: {
            title: "IOT 專屬資訊",
            fields: [
                { key: 'iot_deviceScale', label: '設備規模', type: 'text' },
                { key: 'iot_lineFeatures', label: '生產線特徵', type: 'text' },
                { key: 'iot_productionStatus', label: '生產現況', type: 'text' },
                { key: 'iot_iotStatus', label: 'IoT現況', type: 'text' },
                { key: 'iot_painPoints', label: '痛點分類', type: 'text' },
                { key: 'iot_painPointDetails', label: '客戶痛點說明', type: 'text' },
                { key: 'iot_painPointAnalysis', label: '痛點分析與對策', type: 'text' },
                { key: 'iot_systemArchitecture', label: '系統架構', type: 'text' }
            ]
        },
        dt: {
            title: "DT 專屬資訊",
            fields: [
                { key: 'dt_deviceScale', label: '設備規模', type: 'text' },
                { key: 'dt_processingType', label: '加工類型', type: 'text' },
                { key: 'dt_industry', label: '加工產業別', type: 'text' }
            ]
        },
        dx: {
            title: "DX 專屬資訊",
            fields: [] 
        }
    };
    const layoutByFieldKey = {
        visitPlace: 'meta',
        ourParticipants: 'meta',
        clientParticipants: 'meta',
        eventContent: 'narrative',
        clientQuestions: 'narrative',
        clientIntelligence: 'narrative',
        eventNotes: 'narrative',
        iot_deviceScale: 'meta',
        iot_lineFeatures: 'meta',
        iot_productionStatus: 'meta',
        iot_iotStatus: 'meta',
        iot_painPoints: 'meta',
        iot_painPointDetails: 'narrative',
        iot_painPointAnalysis: 'narrative',
        iot_systemArchitecture: 'meta',
        dt_deviceScale: 'meta',
        dt_processingType: 'meta',
        dt_industry: 'meta'
    };
    Object.values(fieldMapping).forEach(section => {
        section.fields.forEach(field => {
            field.layout = layoutByFieldKey[field.key];
        });
    });
    
    let commonSectionHTML = '';
    let typeSectionHTML = '';
    const updatedTime = event.updatedTime || event.updated_time || event.updatedAt || event.updated_at;
    let topMetaHTML = isInlineVariant
        ? createTopMetaItemHTML('事件種類', `<span class="inline-event-type-badge" style="--event-type-color: ${headerColor};">${formatTextValue(eventTypeLabel)}</span>`)
        : '';
    if (isInlineVariant && event.createdTime) {
        topMetaHTML += createTopMetaItemHTML('建立時間', formatDateTime(event.createdTime));
    }
    if (isInlineVariant && updatedTime) {
        topMetaHTML += createTopMetaItemHTML('更新時間', formatDateTime(updatedTime));
    }
    
    // (A) 共通區塊
    const commonSection = fieldMapping.common;
    let commonContent = '';
    commonSection.fields.forEach(field => {
        const rawValue = event[field.key];
        let displayHTML = '';
        
        if (field.type === 'pill-our') {
            displayHTML = _renderParticipantsPills(rawValue, 'our-side'); // 我方不需要補完職稱
        } else if (field.type === 'pill-client') {
            // 【傳入 contextContacts 進行補完】
            displayHTML = _renderParticipantsPills(rawValue, 'client-side', contextContacts);
        } else {
            displayHTML = formatTextValue(rawValue);
        }
        
        if (rawValue || field.type.includes('pill')) {
             if (isInlineVariant && ['visitPlace', 'ourParticipants', 'clientParticipants'].includes(field.key)) {
                if (rawValue) {
                    topMetaHTML += createTopMetaItemHTML(field.label, displayHTML);
                }
                return;
             }
             commonContent += createItemHTML(field.label, displayHTML, field.layout);
        }
    });
    if (commonContent) {
        commonSectionHTML = `<div class="report-section"><h3 class="section-title">${commonSection.title}</h3>${commonContent}</div>`;
    }

    // (B) 專屬區塊
    const typeKey = event.eventType;
    if (fieldMapping[typeKey]) {
        const typeSection = fieldMapping[typeKey];
        let typeContent = '';
        typeSection.fields.forEach(field => {
            const rawValue = event[field.key] || event[field.key.replace(/^(iot|dt)_/, '')];
            if (rawValue) {
                typeContent += createItemHTML(field.label, formatTextValue(rawValue), field.layout);
            }
        });
        
        if (typeContent) {
            typeSectionHTML = `<div class="report-section"><h3 class="section-title">${typeSection.title}</h3>${typeContent}</div>`;
        }
    }

    const sectionsHTML = isInlineVariant && typeSectionHTML
        ? `<div class="report-workspace-grid">
            <div class="workspace-main">${commonSectionHTML}</div>
            <div class="workspace-side">${typeSectionHTML}</div>
        </div>`
        : `${commonSectionHTML}${typeSectionHTML}`;

    const headerHTML = isInlineVariant && topMetaHTML ? `
        <div class="report-top-meta">${topMetaHTML}</div>` : isInlineVariant ? '' : `
        <div class="report-header" style="--header-color: ${headerColor};">
             <h2 class="report-title">
                ${event.eventName || '未命名事件'} 
                <span class="card-tag" style="background-color: ${headerColor}; color: white; font-size: 0.8rem; padding: 2px 8px; border-radius: 12px; vertical-align: middle;">${eventTypeLabel}</span>
             </h2>
             <div class="header-meta-info">
                <span><strong>${linkedEntityType}:</strong> ${linkedEntityName}</span>
                <span><strong>建立者:</strong> ${event.creator || 'N/A'}</span>
                <span><strong>時間:</strong> ${formatDateTime(event.createdTime)}</span>
            </div>
        </div>`;

    return `<div class="report-view${isInlineVariant ? ' report-view--inline' : ''}">
        ${headerHTML}
        
        <div class="report-container">
            ${sectionsHTML || '<div class="alert alert-info">此事件沒有額外的詳細記錄。</div>'}
        </div>
    </div>`;
}

// Ensure global accessibility
window.showEventLogReport = showEventLogReport;
window.renderOperationalWorkspaceHTML = renderOperationalWorkspaceHTML;
window.renderOperationalWorkspaceEditHTML = renderOperationalWorkspaceEditHTML;
