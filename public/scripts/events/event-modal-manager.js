// views/scripts/event-modal-manager.js
// 職責：管理所有與「新增/編輯事件」彈出視窗相關的複雜邏輯
// (版本 V5: 類報告式介面 + DOM清理 + 資料防呆)

let eventOppSearchTimeout;
let eventCompanySearchTimeout;

// 用於編輯視窗的人員選擇狀態
let selectedEditOurParticipants = new Set();
let selectedEditClientParticipants = new Set();

// 入口函式
async function showEventLogFormModal(options = {}) {
    // 分流：若無 eventId 則開啟精靈
    if (!options.eventId) {
        if (window.EventWizard) {
            EventWizard.show(options);
        } else {
            console.error("EventWizard module not loaded!");
            showNotification("無法開啟新增精靈，請重新整理頁面。", "error");
        }
        return; 
    }

    if (!document.getElementById('event-log-modal')) {
        console.error('Event log modal HTML not loaded!');
        showNotification('無法開啟事件紀錄視窗，元件遺失。', 'error');
        return;
    }
    
    const form = document.getElementById('event-log-form');
    form.reset();
    
    // 重置人員選擇 Set
    selectedEditOurParticipants.clear();
    selectedEditClientParticipants.clear();
    
    showModal('event-log-modal');

    const title = document.getElementById('event-log-modal-title');
    const submitBtn = document.getElementById('event-log-submit-btn');
    const deleteBtn = document.getElementById('event-log-delete-btn');

    title.textContent = '✏️ 編輯事件紀錄';
    submitBtn.textContent = '💾 儲存變更';

    try {
        const result = await authedFetch(`/api/events/${options.eventId}`);
        if (!result.success) throw new Error('無法載入事件資料');
        const eventData = result.data;
        
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => confirmDeleteEvent(eventData.eventId, eventData.eventName);

        await populateEventLogForm(eventData);
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`載入資料失敗: ${error.message}`, 'error');
        closeModal('event-log-modal');
    }
}

// 刪除事件
async function confirmDeleteEvent(eventId, eventName) {
    const safeEventName = eventName || '此事件';
    const message = `您確定要永久刪除事件 "${safeEventName}" 嗎？\n\n此操作無法復原，但系統會留下一筆刪除互動紀錄。`;

    showConfirmDialog(message, async () => {
        showLoading('正在刪除事件...');
        try {
            await authedFetch(`/api/events/${eventId}`, { method: 'DELETE' });
        } catch (error) {
            if (error.message !== 'Unauthorized') console.error('刪除事件失敗:', error);
        } finally {
            hideLoading();
            closeModal('event-log-modal');
            closeModal('event-log-report-modal');
        }
    });
}

// [核心功能] 切換事件類型 (含防呆與合併邏輯)
function selectEventTypeForEdit(newType, cardElement) {
    const currentTypeInput = document.getElementById('event-log-type');
    const currentType = currentTypeInput.value;

    if (currentType === newType) return; // 沒變則不做事

    // 1. 檢查當前【下層容器】是否有填寫專屬資料
    const formContainer = document.getElementById('event-form-container');
    const inputs = formContainer.querySelectorAll('input, textarea, select');
    
    let hasData = false;
    let mergedDataString = '';

    inputs.forEach(input => {
        // 排除 hidden, submit, button
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') return;
        // 排除共通欄位 (如果意外殘留的話)
        if (['eventName', 'visitPlace', 'eventNotes', 'ourParticipants', 'clientParticipants'].includes(input.name)) return;

        // 檢查值
        if (input.value && input.value.trim() !== '') {
            hasData = true;
            // 取得欄位名稱 Label (往上找)
            let label = input.name;
            const labelEl = input.closest('.form-group')?.querySelector('.form-label') || input.closest('.form-group')?.querySelector('label');
            if (labelEl) label = labelEl.innerText.replace('*', '').trim();
            
            mergedDataString += `[${label}]: ${input.value}\n`;
        }
    });

    if (hasData) {
        const message = `您即將從 ${currentType} 切換為 ${newType}。\n\n⚠️ 警告：這將移除目前的專屬欄位資料 (如設備規模等)！\n\n系統會自動將舊資料備份到「備註」欄位。\n確定要繼續嗎？`;
        
        showConfirmDialog(message, () => {
            // 使用者確認 -> 執行切換並合併
            _applyTypeSwitch(newType, cardElement, mergedDataString);
        });
    } else {
        // 無資料 -> 直接切換
        _applyTypeSwitch(newType, cardElement, '');
    }
}

// 執行切換動作
function _applyTypeSwitch(newType, cardElement, dataToMerge) {
    // 1. 更新 UI (亮燈)
    document.querySelectorAll('.type-select-card').forEach(el => el.classList.remove('selected'));
    if (cardElement) cardElement.classList.add('selected');
    else {
        const targetCard = document.querySelector(`.type-select-card[data-type="${newType}"]`);
        if(targetCard) targetCard.classList.add('selected');
    }

    // 2. 更新隱藏欄位
    document.getElementById('event-log-type').value = newType;

    // 3. 載入新表單 (傳入 dataToMerge)
    loadEventTypeForm(newType, dataToMerge);
}


// 動態載入表單範本 (含 DOM 清理與備註合併)
async function loadEventTypeForm(eventType, dataToMerge = '') {
    const formContainer = document.getElementById('event-form-container');
    if (!formContainer) return;

    let formName = eventType === 'dx' ? 'general' : eventType;
    
    // 顯示載入中
    formContainer.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';

    let templateHtml = window.CRM_APP.formTemplates[formName];
    if (!templateHtml) {
        try {
            // 【修改】路徑修正：加上 /components/forms/
            const response = await fetch(`/components/forms/event-form-${formName}.html`);
            
            if (!response.ok) throw new Error(`找不到 ${formName} 的表單範本`);
            templateHtml = await response.text();
            window.CRM_APP.formTemplates[formName] = templateHtml; // 快取
        } catch (error) {
            formContainer.innerHTML = `<div class="alert alert-error">無法載入 ${eventType} 表單。</div>`;
            return;
        }
    }
    
    // 渲染 HTML
    formContainer.innerHTML = templateHtml;

    // --- 【關鍵修改：DOM 清理】移除下層重複的共通欄位 ---
    // 因為 eventName, visitPlace, participants 已經移到上層了
    // 我們透過 Name 或 ID 來查找並移除它們的父容器 (.form-group)
    const fieldsToRemove = ['eventName', 'visitPlace', 'ourParticipants', 'clientParticipants', 'clientParticipants-checkbox'];
    
    fieldsToRemove.forEach(name => {
        // 嘗試找 input[name="..."]
        const els = formContainer.querySelectorAll(`[name="${name}"], [id="event-name"], [id="visit-place"]`);
        els.forEach(el => {
            const group = el.closest('.form-group');
            if (group) group.remove();
        });
    });
    
    // 移除可能殘留的 fieldset legend (如果變成空的)
    const fieldsets = formContainer.querySelectorAll('fieldset');
    fieldsets.forEach(fs => {
        // 檢查是否只剩下 legend
        if (fs.children.length <= 1) fs.remove();
        // 或者如果 legend 寫著 "會議共通資訊"，直接移除該 legend 或整塊
        const legend = fs.querySelector('legend');
        if (legend && legend.textContent.includes('會議共通資訊')) {
            // 移除整個 fieldset，因為共通資訊都在上面了 (除非備註還在裡面)
            // 檢查備註是否在裡面
            if (!fs.querySelector('[name="eventNotes"]')) {
                fs.remove();
            } else {
                // 如果備註還在，只移除 legend
                legend.remove();
            }
        }
    });

    // --- 【關鍵修改：資料合併】 ---
    if (dataToMerge) {
        const notesInput = document.getElementById('event-notes'); // 備註欄位 (ID 通常是 event-notes)
        if (notesInput) {
            const existingNotes = notesInput.value;
            const header = `\n\n【系統自動備份 - 原資料】\n`;
            notesInput.value = existingNotes + header + dataToMerge;
        }
    }
}

// 填充表單資料 (編輯模式核心)
async function populateEventLogForm(eventData) {
    // 1. 填入隱藏與基本欄位 (上層與中層)
    document.getElementById('event-log-eventId').value = eventData.eventId;
    document.getElementById('event-log-opportunityId').value = eventData.opportunityId || '';
    document.getElementById('event-log-companyId').value = eventData.companyId || '';
    
    // 這些欄位現在位於上層/中層
    document.getElementById('event-log-name').value = eventData.eventName || '';
    document.getElementById('event-log-location').value = eventData.visitPlace || '';

    // 2. 處理時間 (轉換為 local datetime string)
    if (eventData.createdTime) {
        try {
            const date = new Date(eventData.createdTime);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            document.getElementById('event-log-createdTime').value = date.toISOString().slice(0, 16);
        } catch (e) { console.warn("時間格式錯誤", e); }
    }

    // 3. 設定類型與載入下層表單
    const eventType = eventData.eventType || 'general';
    const typeToSelect = eventType === 'legacy' ? 'iot' : eventType;
    
    document.getElementById('event-log-type').value = typeToSelect;
    // 呼叫切換 (傳入 null 表示不需要合併資料，因為這是初始載入)
    _applyTypeSwitch(typeToSelect, null, null);

    // 4. 處理參與人員 (渲染膠囊)
    const ourList = (eventData.ourParticipants || '').split(',').map(p => p.trim()).filter(Boolean);
    ourList.forEach(p => selectedEditOurParticipants.add(p));
    _renderEditParticipants('our', 'edit-our-participants-container', window.CRM_APP.systemConfig['團隊成員'] || [], selectedEditOurParticipants);

    const clientList = (eventData.clientParticipants || '').split(',').map(p => p.trim()).filter(Boolean);
    await _fetchAndPopulateClientParticipantsForEdit(eventData.opportunityId, eventData.companyId, clientList);

    // 5. 填入下層詳細欄位 (等待表單載入後)
    setTimeout(() => {
        const form = document.getElementById('event-log-form');
        for (const key in eventData) {
            // 跳過已在上層處理過的欄位
            if (['eventId', 'opportunityId', 'companyId', 'eventName', 'visitPlace', 'createdTime', 'ourParticipants', 'clientParticipants', 'eventType'].includes(key)) continue;

            // 尋找對應的輸入框
            const element = form.querySelector(`[name="${key}"], [name="iot_${key}"], [name="dt_${key}"]`);
            if (element) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    const values = String(eventData[key]).split(',').map(s => s.trim());
                    if (values.includes(element.value)) element.checked = true;
                } else {
                    element.value = eventData[key] || '';
                }
            }
        }
    }, 300); // 稍微延遲確保 DOM 載入與清理完畢
}

// 獲取並渲染客戶人員 (編輯用)
async function _fetchAndPopulateClientParticipantsForEdit(opportunityId, companyId, currentList = []) {
    let contacts = [];
    try {
        if (opportunityId) {
            const result = await authedFetch(`/api/opportunities/${opportunityId}/details`);
            contacts = result.success ? result.data.linkedContacts : [];
        } else if (companyId) {
            const allCompanies = await authedFetch(`/api/companies`).then(res => res.data || []);
            const company = allCompanies.find(c => c.companyId === companyId);
            if (company) {
                 const result = await authedFetch(`/api/companies/${encodeURIComponent(company.companyName)}/details`);
                 contacts = result.success ? result.data.contacts : [];
            }
        }
    } catch (error) { console.error(error); }

    // 分離手動輸入
    const contactNames = new Set(contacts.map(c => c.name));
    const contactDisplayNames = new Set(contacts.map(c => c.position ? `${c.name} (${c.position})` : c.name));
    
    const manualList = [];
    currentList.forEach(p => {
        if (contactDisplayNames.has(p) || contactNames.has(p)) {
            selectedEditClientParticipants.add(p);
        } else {
            manualList.push(p);
        }
    });

    _renderEditParticipants('client', 'edit-client-participants-container', contacts, selectedEditClientParticipants);
    document.getElementById('edit-manual-participants').value = manualList.join(', ');
}

// 渲染人員膠囊標籤
function _renderEditParticipants(type, containerId, list, selectedSet) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted)">無資料</span>';
        return;
    }

    container.innerHTML = list.map(item => {
        let value, label;
        if (typeof item === 'string') {
            value = label = item;
        } else if (item.note) { // 團隊成員
            value = label = item.note;
        } else { // 聯絡人
            value = item.position ? `${item.name} (${item.position})` : item.name;
            label = value;
        }
        
        const isSelected = selectedSet.has(value);
        return `<span class="participant-pill-tag ${isSelected ? 'selected' : ''}" 
                      onclick="toggleEditParticipant('${type}', '${value}', this)">
                      ${label}
                </span>`;
    }).join('');
}

// 切換人員選取狀態
function toggleEditParticipant(type, value, el) {
    const set = type === 'our' ? selectedEditOurParticipants : selectedEditClientParticipants;
    if (set.has(value)) {
        set.delete(value);
        el.classList.remove('selected');
    } else {
        set.add(value);
        el.classList.add('selected');
    }
}

// 表單提交
async function handleEventFormSubmit(e) {
    e.preventDefault();
    const eventId = document.getElementById('event-log-eventId').value;
    const form = e.target;
    
    showLoading('正在更新...');

    try {
        const formData = new FormData(form);
        const eventData = {};
        
        for (let [key, value] of formData.entries()) {
            if (!eventData[key]) eventData[key] = value;
        }
        
        // 處理人員
        eventData.ourParticipants = Array.from(selectedEditOurParticipants).join(', ');
        const manualClient = document.getElementById('edit-manual-participants').value.trim();
        const clientList = Array.from(selectedEditClientParticipants);
        if (manualClient) clientList.push(...manualClient.split(',').map(s => s.trim()));
        eventData.clientParticipants = clientList.filter(Boolean).join(', ');

        // 處理時間
        if (form.createdTime && form.createdTime.value) {
            eventData.createdTime = new Date(form.createdTime.value).toISOString();
        }

        // 處理 Checkbox (多選)
        const checkboxes = form.querySelectorAll('input[type="checkbox"][name]:checked');
        const multiVal = {};
        checkboxes.forEach(cb => {
            if(!multiVal[cb.name]) multiVal[cb.name] = [];
            multiVal[cb.name].push(cb.value);
        });
        for (let k in multiVal) {
            eventData[k] = multiVal[k].join(', ');
        }
        
        const result = await authedFetch(`/api/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });

        if (result.success) {
            closeModal('event-log-modal');
        } else {
            throw new Error(result.details || '更新失敗');
        }

    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`更新失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 綁定
document.addEventListener('submit', function(e) {
    if (e.target.id === 'event-log-form') {
        handleEventFormSubmit(e);
    }
});