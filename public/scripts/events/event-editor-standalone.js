// public/scripts/events/event-editor-standalone.js
/**
 * @version Phase 8.11 Final Stable
 * @date 2026-04-15
 * @purpose Phase 8.11 Production：修正外部關閉 (ESC/Backdrop) 導致的 Scroll Lock 凍結問題
 * @description [Bugfix Patch] Added MutationObserver to guarantee _unlockScroll fires when modal is hidden externally.
 */

// 職責：獨立的事件編輯器控制器 (含 DT Placeholders)
// (Refactored: Fix Zero-Dimension Trap via ResizeObserver - Loop Safe)

// [Forensics Probe] Debug Counter
console.log('%c[EventEditorStandalone] LOADED Phase 8.11 Final Stable Production (Patched)', 'color:#22c55e;font-weight:bold;');

window._DEBUG_EDITOR_OPEN_COUNT ||= 0;

const EventEditorStandalone = (() => {
    let _modal, _form, _inputs = {};
    
    let _data = {
        ourParticipants: new Set(),
        clientParticipants: new Set()
    };
    
    let _isInitialized = false;
    let _resizeObserver = null;
    let _modalObserver = null; // [Fix] Observer for external close detection
    
    // [Fix] State flags for scroll lock and re-entry guard
    let _isOpening = false;
    let _originalOverflow = { body: '' }; // Removed html overflow state to prevent divergent lock freeze

    // [Fix] Prevent double-submit
    let _isSaving = false;

    const DEFAULT_OPTIONS = {
        lineFeatures: ['工具機', 'ROBOT', '傳產機', 'PLC'],
        painPoints: ['Monitoring', 'Improve OEE', 'Reduce Man-hours', 'Others']
    };

    // 【新增】確保模板已載入
    async function _ensureTemplateLoaded() {
        if (document.getElementById('standalone-event-modal')) return;
        
        try {
            const response = await fetch('/views/event-editor.html');
            if (!response.ok) throw new Error('無法下載編輯器模板');
            let html = await response.text();
            
            // 移除 HTML 中的 script 標籤，避免重複執行初始化
            html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            
            const container = document.getElementById('modal-container') || document.body;
            container.insertAdjacentHTML('beforeend', html);
        } catch (e) {
            console.error('載入 Event Editor Template 失敗:', e);
            throw e;
        }
    }

    function _init() {
        if (_isInitialized && document.getElementById('standalone-event-modal')) return;
        
        _modal = document.getElementById('standalone-event-modal');
        if (!_modal) return; 
        
        _form = document.getElementById('standalone-event-form');
        
        _inputs = {
            id: document.getElementById('standalone-eventId'),
            oppId: document.getElementById('standalone-opportunityId'),
            compId: document.getElementById('standalone-companyId'),
            type: document.getElementById('standalone-type'),
            name: document.getElementById('standalone-name'),
            time: document.getElementById('standalone-createdTime'),
            location: document.getElementById('standalone-location'),
            
            content: document.getElementById('standalone-content'),
            questions: document.getElementById('standalone-questions'),
            intelligence: document.getElementById('standalone-intelligence'),
            notes: document.getElementById('standalone-notes'),

            ourContainer: document.getElementById('standalone-our-participants-container'),
            manualOur: document.getElementById('standalone-manual-our-participants'),
            clientContainer: document.getElementById('standalone-client-participants-container'),
            manualClient: document.getElementById('standalone-manual-participants'),
            
            specificWrapper: document.getElementById('standalone-specific-wrapper'),
            specificCard: document.getElementById('specific-info-card'),
            specificTitle: document.getElementById('specific-card-title'),
            specificContainer: document.getElementById('standalone-specific-container'),
            workspaceGrid: document.getElementById('workspace-container'),

            submitBtn: document.getElementById('standalone-submit-btn'),
            deleteBtn: document.getElementById('standalone-delete-btn'),
            closeBtn: document.getElementById('standalone-close-btn')
        };

        if (_inputs.closeBtn) _inputs.closeBtn.onclick = _close;
        if (_form) {
            _form.onsubmit = _handleSubmit;
            _form.addEventListener('input', (e) => {
                if (e.target.tagName.toLowerCase() === 'textarea') {
                    _autoResize(e.target);
                }
            });
        }
        
        // Initialize ResizeObserver to handle initial layout visibility (Zero-Dimension Fix)
        if (!_resizeObserver) {
            _resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    // Only resize if the element is visible
                    if (entry.target.offsetParent !== null) {
                        _autoResize(entry.target);
                        // Stop observing immediately to prevent Loop Limit Exceeded errors.
                        // We only needed this to catch the transition from hidden -> visible.
                        _resizeObserver.unobserve(entry.target);
                    }
                }
            });
        }

        // [Fix] Initialize MutationObserver to catch external close (ESC / backdrop click)
        if (!_modalObserver && _modal) {
            _modalObserver = new MutationObserver(() => {
                if (_modal.style.display === 'none' || window.getComputedStyle(_modal).display === 'none') {
                    _unlockScroll();
                    if (_resizeObserver) _resizeObserver.disconnect();
                }
            });
            _modalObserver.observe(_modal, { attributes: true, attributeFilter: ['style', 'class'] });
        }

        _isInitialized = true;
    }

    function _autoResize(element) {
        if (!element) return;
        
        // Zero-Dimension Trap Guard: Check visibility
        if (element.offsetParent === null) {
            // Element is hidden, observe it to resize when it becomes visible
            if (_resizeObserver) _resizeObserver.observe(element);
            return;
        }

        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
    }

    // [Fix] Scroll locking helpers (Aligned with global ui.js to prevent freeze)
    function _lockScroll() {
        _originalOverflow.body = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }

    function _unlockScroll() {
        document.body.style.overflow = _originalOverflow.body;
    }

    async function open(eventId) {
        // [Fix] Anti-reentry guard
        if (_isOpening) return;
        _isOpening = true;

        // [Forensics Probe] Trace call
        window._DEBUG_EDITOR_OPEN_COUNT++;
        console.log(`[Forensics] EventEditorStandalone.open called (Count: ${window._DEBUG_EDITOR_OPEN_COUNT})`, { eventId });
        console.trace('[Forensics] EventEditorStandalone.open trace');

        try {
            await _ensureTemplateLoaded();
            _init();
            
            if (!_modal || !_form) {
                console.error('無法初始化編輯器 DOM');
                showNotification('編輯器初始化失敗', 'error');
                return;
            }

            _resetForm();
            _modal.style.display = 'block';
            _lockScroll(); // [Fix] Lock scroll on open
            
            // ★★★ [Fix] 判斷是編輯還是新增 ★★★
            if (eventId) {
                _setLoading(true, '載入中...');

                // 1. Main Event Data Fetch
                // If this fails, we MUST close because we have nothing to edit.
                let eventData = null;
                try {
                    const result = await authedFetch(`/api/events/${eventId}`);
                    if (result.success) {
                        eventData = result.data;
                    } else {
                        throw new Error(result.error || 'Unknown Error');
                    }
                } catch (fetchError) {
                    console.error('Main event fetch failed:', fetchError);
                    showNotification('無法載入事件: ' + fetchError.message, 'error');
                    _close();
                    return; // Critical failure, stop here.
                }

                // 2. Setup Delete Button (UI)
                if (_inputs.deleteBtn) {
                    _inputs.deleteBtn.style.display = 'block';
                    _inputs.deleteBtn.onclick = () => _confirmDelete(eventData.eventId, eventData.eventName);
                }

                // 3. Populate Form with Robust Error Handling
                // [Fix] If populate fails (e.g. linked opportunity 500), catch it and keep editor open.
                try {
                    await _populateForm(eventData);
                } catch (populateError) {
                    console.error('[EventEditor] Partial population failure:', populateError);
                    showNotification('關聯資料載入異常，但您仍可編輯主要內容', 'warning');
                }
                
                _setLoading(false);

            } else {
                // 新增模式：隱藏刪除按鈕，初始化類型
                if (_inputs.deleteBtn) _inputs.deleteBtn.style.display = 'none';
                _applyTypeSwitch('general', {});
                // 設為一般狀態，不顯示 Loading
                _setLoading(false);
            }

        } catch (e) {
            console.error(e);
            showNotification('發生未預期錯誤', 'error');
            _close();
            _setLoading(false);
        } finally {
            _isOpening = false; // [Fix] Release guard
        }
    }

    async function _populateForm(eventData) {
        _inputs.id.value = eventData.eventId;
        _inputs.oppId.value = eventData.opportunityId || '';
        _inputs.compId.value = eventData.companyId || '';
        _inputs.name.value = eventData.eventName || '';
        _inputs.location.value = eventData.visitPlace || '';
        
        _inputs.content.value = eventData.eventContent || '';
        _inputs.questions.value = eventData.clientQuestions || '';
        _inputs.intelligence.value = eventData.clientIntelligence || '';
        _inputs.notes.value = eventData.eventNotes || '';

        // Trigger resize. If hidden, observer will catch it later.
        [_inputs.content, _inputs.questions, _inputs.intelligence, _inputs.notes].forEach(el => {
            if (el) _autoResize(el);
        });

        if (eventData.createdTime) {
            const date = new Date(eventData.createdTime);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            _inputs.time.value = date.toISOString().slice(0, 16);
        }

        const eventType = eventData.eventType || 'general';
        const typeToSelect = eventType === 'legacy' ? 'iot' : eventType;
        
        await _applyTypeSwitch(typeToSelect, eventData);

        _data.ourParticipants.clear();
        const ourManualList = [];
        const teamMembers = window.CRM_APP.systemConfig['團隊成員'] || [];
        const teamNames = new Set(teamMembers.map(m => m.note));

        (eventData.ourParticipants || '').split(',').map(p => p.trim()).filter(Boolean).forEach(p => {
            if (teamNames.has(p)) _data.ourParticipants.add(p);
            else ourManualList.push(p);
        });
        _renderPillSelector('our', _inputs.ourContainer, teamMembers, _data.ourParticipants);
        _inputs.manualOur.value = ourManualList.join(', ');

        _data.clientParticipants.clear();
        const clientList = (eventData.clientParticipants || '').split(',').map(p => p.trim()).filter(Boolean);
        await _fetchAndPopulateClientParticipants(eventData.opportunityId, eventData.companyId, clientList);
    }

    function selectType(newType, cardElement) {
        const currentType = _inputs.type.value;
        if (currentType === newType) return;

        const container = _inputs.specificContainer;
        let hasData = false;
        let mergedData = '';

        if (container) {
            container.querySelectorAll('input[type="text"], textarea').forEach(el => {
                if (el.value && el.value.trim()) {
                    hasData = true;
                    const label = el.closest('.form-group')?.querySelector('label')?.textContent || el.name;
                    mergedData += `● ${label}：\n${el.value}\n\n`;
                }
            });
            container.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked').forEach(el => {
                hasData = true;
                let label = el.name; 
                const groupLabel = el.closest('.form-group')?.querySelector('.iso-label');
                if (groupLabel) label = groupLabel.textContent;
                mergedData += `● ${label}：${el.value}\n\n`;
            });
        }

        if (hasData) {
            showConfirmDialog(`切換類型將移除目前專屬欄位資料，是否繼續？\n(舊資料將自動備份至備註)`, () => {
                const currentNotes = _inputs.notes.value;
                const nowStr = new Date().toLocaleString();
                const backupBlock = `\n----------------------------------------\n【系統自動備份】 (${nowStr})\n原類型：${currentType}\n\n${mergedData}----------------------------------------\n`;
                
                _inputs.notes.value = currentNotes + backupBlock;
                _autoResize(_inputs.notes);

                _applyTypeSwitch(newType, {});
            });
        } else {
            _applyTypeSwitch(newType, {});
        }
    }

    async function _applyTypeSwitch(newType, eventData) {
        const grid = document.querySelector('#standalone-event-modal .type-select-grid');
        if (grid) {
            grid.querySelectorAll('.type-select-card').forEach(el => el.classList.remove('selected'));
            const target = grid.querySelector(`.type-select-card[data-type="${newType}"]`);
            if(target) target.classList.add('selected');
        }
        _inputs.type.value = newType;

        _updateSpecificCardColor(newType);
        _inputs.specificContainer.innerHTML = '';
        
        if (newType === 'general') {
            _inputs.specificWrapper.style.display = 'none';
            _inputs.workspaceGrid.classList.remove('has-sidebar');
        } else {
            _inputs.specificWrapper.style.display = 'block';
            _inputs.workspaceGrid.classList.add('has-sidebar');
            
            if (newType === 'iot') {
                _renderIoTFields(eventData);
            } else if (newType === 'dt') {
                _renderSimpleFields(eventData, 
                    ['dt_deviceScale', 'dt_processingType', 'dt_industry'], 
                    ['設備規模', '加工類型', '加工產業別'],
                    ['例：預計導入機台數、場域大小...', '例：CNC、射出成型、組裝...', '例：航太、半導體、車用...']
                );
            } else {
                _inputs.specificContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">無專屬欄位設定</p>';
            }
            
            // Trigger resize for new fields
            _inputs.specificContainer.querySelectorAll('textarea').forEach(el => {
                _autoResize(el);
            });
        }
    }

    function _updateSpecificCardColor(type) {
        const config = window.CRM_APP?.systemConfig?.['事件類型'] || [];
        const typeConfig = config.find(t => t.value === type);
        const baseColor = typeConfig?.color || '#64748b';
        
        _inputs.specificCard.style.backgroundColor = `color-mix(in srgb, ${baseColor} 5%, white)`;
        _inputs.specificCard.style.borderColor = `color-mix(in srgb, ${baseColor} 20%, white)`;
        _inputs.specificTitle.style.color = baseColor;
        _inputs.specificTitle.style.borderBottomColor = `color-mix(in srgb, ${baseColor} 20%, white)`;
    }

    function _renderIoTFields(data) {
        const container = _inputs.specificContainer;

        // ✅ v1.0.6：避免 UX 退化 — 設備規模改回 textarea（承襲你 v1.0.3 的修正）
        container.innerHTML += _createTextareaHTML('iot_deviceScale', '設備規模', data.iot_deviceScale, '例：機台數量 50 台、PLC 型號...');

        const lineFeaturesVal = (data.iot_lineFeatures || '').split(',').map(s=>s.trim());
        container.innerHTML += _createCheckboxGroupHTML('iot_lineFeatures', '生產線特徵(可多選)', DEFAULT_OPTIONS.lineFeatures, lineFeaturesVal);

        container.innerHTML += _createTextareaHTML('iot_productionStatus', '生產現況', data.iot_productionStatus, '請描述客戶目前的生產流程、稼動率或遇到的瓶頸...');
        container.innerHTML += _createTextareaHTML('iot_iotStatus', 'IoT現況', data.iot_iotStatus, '客戶是否已導入 MES、ERP 或其他聯網系統？');
        
        const painPointsVal = (data.iot_painPoints || '').split(',').map(s=>s.trim());
        container.innerHTML += _createCheckboxGroupHTML('iot_painPoints', '痛點分類(可多選)', DEFAULT_OPTIONS.painPoints, painPointsVal);

        container.innerHTML += _createTextareaHTML('iot_painPointDetails', '客戶痛點說明', data.iot_painPointDetails, '請詳細描述客戶提出的具體困難點...');
        container.innerHTML += _createTextareaHTML('iot_painPointAnalysis', '痛點分析與對策', data.iot_painPointAnalysis, '針對上述痛點，我方提出的分析觀點或初步對策...');
        container.innerHTML += _createTextareaHTML('iot_systemArchitecture', '系統架構', data.iot_systemArchitecture, '請描述預計導入的架構、硬體配置或軟體模組...');
    }

    function _renderSimpleFields(data, keys, labels, placeholders = []) {
        let html = '';
        keys.forEach((key, idx) => {
            html += _createInputHTML(key, labels[idx], data[key], placeholders[idx] || '');
        });
        _inputs.specificContainer.innerHTML = html;
    }

    function _createInputHTML(name, label, value, placeholder = '') {
        const safeValue = (value === null || value === undefined) ? '' : value;
        return `<div class="form-group"><label class="iso-label">${label}</label><input type="text" class="iso-input" name="${name}" value="${safeValue}" placeholder="${placeholder}"></div>`;
    }
    
    // 這裡會產生 <textarea class="form-textarea">，搭配 CSS 的 resize: vertical 即可調整
    function _createTextareaHTML(name, label, value, placeholder = '') {
        const safeValue = (value === null || value === undefined) ? '' : value;
        return `<div class="form-group"><label class="iso-label">${label}</label><textarea class="form-textarea" name="${name}" rows="1" placeholder="${placeholder}">${safeValue}</textarea></div>`;
    }
    
    function _createCheckboxGroupHTML(name, label, options, selectedValues) {
        let checks = options.map(opt => {
            const checked = selectedValues.includes(opt) ? 'checked' : '';
            return `<label><input type="checkbox" name="${name}" value="${opt}" ${checked}> ${opt}</label>`;
        }).join('');
        return `<div class="form-group"><label class="iso-label">${label}</label><div class="checkbox-group">${checks}</div></div>`;
    }

    function _renderPillSelector(type, container, optionsList, selectedSet) {
        if (!container) return;
        const allItems = new Map();
        optionsList.forEach(opt => {
            const val = opt.value || opt.name || opt.note;
            const label = opt.note || opt.name || val;
            allItems.set(val, label);
        });

        let html = '';
        allItems.forEach((label, val) => {
            const isSelected = selectedSet.has(val) ? 'selected' : '';
            html += `<span class="participant-pill-tag ${isSelected}" onclick="EventEditorStandalone.toggleItem('${type}', '${val}', this)">${label}</span>`;
        });
        container.innerHTML = html;
    }

    function toggleItem(dataSetKey, val, el) {
        let targetSet = (dataSetKey === 'our') ? _data.ourParticipants : _data.clientParticipants;
        if (targetSet.has(val)) {
            targetSet.delete(val);
            el.classList.remove('selected');
        } else {
            targetSet.add(val);
            el.classList.add('selected');
        }
    }

    async function _fetchAndPopulateClientParticipants(oppId, compId, currentList) {
        let contacts = [];
        try {
            if (oppId) {
                const res = await authedFetch(`/api/opportunities/${oppId}/details`);
                if (res.success) contacts = res.data.linkedContacts || [];
            } else if (compId) {
                const all = await authedFetch(`/api/companies`).then(r => r.data || []);
                const comp = all.find(c => c.companyId === compId);
                if (comp) {
                    const res = await authedFetch(`/api/companies/${encodeURIComponent(comp.companyName)}/details`);
                    if (res.success) contacts = res.data.contacts || [];
                }
            }
        } catch (e) { console.error(e); }

        const manualList = [];
        const knownNames = new Set(contacts.map(c => c.name));
        currentList.forEach(p => {
            if (knownNames.has(p)) _data.clientParticipants.add(p);
            else manualList.push(p);
        });
        _renderPillSelector('client', _inputs.clientContainer, contacts, _data.clientParticipants);
        _inputs.manualClient.value = manualList.join(', ');
    }

    async function _handleSubmit(e) {
        e.preventDefault();

        if (_isSaving) return;
        _isSaving = true;

        const id = _inputs.id.value;
        
        // Phase 8.2 Fix: include dynamic fields outside <form>
        const formData = new FormData(_form);

        // 手動補抓 IoT / DT 動態欄位（可能不在 form 內）
        document.querySelectorAll(
            '#standalone-specific-container input[name], #standalone-specific-container textarea[name]'
        ).forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.checked) formData.append(el.name, el.value);
            } else {
                formData.append(el.name, el.value);
            }
        });

        const data = {};
        
        // 注意：FormData 可能包含重複 key（checkbox / 動態欄位補抓），這裡先收單值，multi 會在下方重算
        for (let [k, v] of formData.entries()) {
            if (!data[k]) data[k] = v;
        }

        const mergePillsAndInput = (set, inputEl) => {
            const manuals = (inputEl?.value || '').split(',').map(s => s.trim()).filter(Boolean);
            return [...Array.from(set), ...manuals].join(', ');
        };
        data.ourParticipants = mergePillsAndInput(_data.ourParticipants, _inputs.manualOur);
        data.clientParticipants = mergePillsAndInput(_data.clientParticipants, _inputs.manualClient);

        if (_inputs.time.value) data.createdTime = new Date(_inputs.time.value).toISOString();

        const checkboxes = _form.querySelectorAll('input[type="checkbox"][name]:checked');
        const multi = {};
        checkboxes.forEach(cb => {
            if(!multi[cb.name]) multi[cb.name] = [];
            multi[cb.name].push(cb.value);
        });
        for (let k in multi) data[k] = multi[k].join(', ');

        data.eventType = _inputs.type.value;

        _setLoading(true, '儲存中...');
        try {
            // [Phase 8 Fix] Distinguish Create (POST) vs Update (PUT)
            let res;
            if (id) {
                res = await authedFetch(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            } else {
                res = await authedFetch(`/api/events`, { method: 'POST', body: JSON.stringify(data) });
            }

            // Production rule: treat explicit success:false as failure; everything else is success.
            if (res && res.success === false) {
                throw new Error(res.error || res.message || 'Unknown Error');
            }

            // ✅ Success UX
            showNotification('事件已儲存', 'success');

            // [Phase 8.10 Stale-Refresh Fix] 標記 Dashboard 資料過期
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

            // Close first for best UX (avoid modal lingering if router refresh triggers)
            _close();

            // Phase 8: If we are on standalone route, normalize back to #events to prevent router re-entry loop.
            // Do NOT force refreshCurrentView here; dashboard behind modal will refresh via its own logic if needed.
            if (typeof window.location?.hash === 'string' && window.location.hash.includes('event-editor')) {
                window.location.hash = '#events';
            }

        } catch (e) {
            console.error('[EventEditorStandalone] save failed:', e);
            showNotification('儲存失敗: ' + (e.message || String(e)), 'error');
        } finally {
            _setLoading(false);
            _isSaving = false;
        }
    }

    function _confirmDelete(id, name) {
        showConfirmDialog(`確定刪除事件 "${name}"？`, async () => {
            showLoading('刪除中...');
            try {
                await authedFetch(`/api/events/${id}`, { method: 'DELETE' });
                
                // [Phase 8.10 Stale-Refresh Fix] 標記 Dashboard 資料過期
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
                
                _close();
                closeModal('event-log-report-modal');
                
                // 即時更新當前列表 (如果是停留在 Event List)
                if (window.CRM_APP && window.CRM_APP.refreshCurrentView) {
                     window.CRM_APP.refreshCurrentView();
                }
            } catch (e) { console.error(e); } finally { hideLoading(); }
        });
    }

    function _close() { 
        if (_modal) _modal.style.display = 'none'; 
        if (_resizeObserver) _resizeObserver.disconnect();
        _unlockScroll(); // [Fix] Restore scroll on close
    }
    
    function _resetForm() {
        if (!_form) return;
        _form.reset();
        _data.ourParticipants.clear();
        _data.clientParticipants.clear();
        _setLoading(false);
        
        _inputs.specificContainer.innerHTML = '';
        _inputs.specificWrapper.style.display = 'none';
        _inputs.workspaceGrid.classList.remove('has-sidebar');
    }

    function _setLoading(isLoading, text) {
        if (!_inputs.submitBtn) return;
        _inputs.submitBtn.disabled = isLoading;
        _inputs.submitBtn.textContent = isLoading ? text : '儲存';
    }

    return {
        open: open,
        close: _close,
        selectType: selectType,
        toggleItem: toggleItem
    };
})();

window.EventEditorStandalone = EventEditorStandalone;

// ★★★ [Fix] 註冊 Router 模組 (相容性修正) ★★★
if (window.CRM_APP) {
    window.CRM_APP.pageModules['event-editor'] = async (params) => {
        // [Hotfix] 參數相容性處理：
        // 1. 若 params 為物件 (Router 修改後傳入)，取 params.eventId
        // 2. 若 params 為字串 (相容舊有 detail 呼叫習慣或手動呼叫)，直接當 id
        // 3. 若無參數 (params == null/undefined)，id 為 null (開啟新增模式)
        
        let id = null;
        if (params && typeof params === 'object') {
            id = params.eventId;
        } else if (typeof params === 'string') {
            id = params;
        }
        
        await EventEditorStandalone.open(id);
    };
}