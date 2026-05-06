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

/**
 * 輔助函式：將人員字串轉換為膠囊 HTML (含智慧職稱補完)
 * @param {string} participantsStr - 原始字串
 * @param {string} typeClass - 樣式類別 ('our-side' 或 'client-side')
 * @param {Array} contextContacts - 用於比對的聯絡人清單
 */
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
function renderEventLogReportHTML(event, contextContacts = []) {
    
    const createItemHTML = (label, contentHTML) => {
        const finalContent = (contentHTML && contentHTML !== '') ? contentHTML : '-';
        return `
            <div class="info-item">
                <div class="info-label">${label}</div>
                <div class="info-value-box">${finalContent}</div>
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
    
    let sectionsHTML = '';
    
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
             commonContent += createItemHTML(field.label, displayHTML);
        }
    });
    if (commonContent) {
        sectionsHTML += `<div class="report-section"><h3 class="section-title">${commonSection.title}</h3>${commonContent}</div>`;
    }

    // (B) 專屬區塊
    const typeKey = event.eventType;
    if (fieldMapping[typeKey]) {
        const typeSection = fieldMapping[typeKey];
        let typeContent = '';
        typeSection.fields.forEach(field => {
            const rawValue = event[field.key] || event[field.key.replace(/^(iot|dt)_/, '')];
            if (rawValue) {
                typeContent += createItemHTML(field.label, formatTextValue(rawValue));
            }
        });
        
        if (typeContent) {
            sectionsHTML += `<div class="report-section"><h3 class="section-title">${typeSection.title}</h3>${typeContent}</div>`;
        }
    }

    return `<div class="report-view">
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
        </div>
        
        <div class="report-container">
            ${sectionsHTML || '<div class="alert alert-info">此事件沒有額外的詳細記錄。</div>'}
        </div>
    </div>`;
}

// Ensure global accessibility
window.showEventLogReport = showEventLogReport;