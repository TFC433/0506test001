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
- Only files matching these patterns are included: public/components/forms/event-form-*.html, public/scripts/events/event-wizard.js, public/scripts/events/event-modal-manager.js, public/scripts/events/event-editor-standalone.js, public/styles/modules/layout.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/components/forms/event-form-dt.html
public/components/forms/event-form-dx.html
public/components/forms/event-form-general.html
public/components/forms/event-form-iot.html
public/scripts/events/event-editor-standalone.js
public/scripts/events/event-modal-manager.js
public/scripts/events/event-wizard.js
public/styles/modules/layout.css
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/components/forms/event-form-dt.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-name" class="form-label">事件名稱 *</label>
        <input type="text" class="form-input" id="event-name" name="eventName" required>
    </div>

    <div class="form-group">
        <label class="form-label">我方與會人員</label>
        <div class="participants-checkbox-group" id="our-participants-container">
            <p style="color: var(--text-muted);">載入中...</p>
        </div>
    </div>
    
    <div class="form-group">
        <label for="client-participants" class="form-label">客戶與會人員</label>
        <div id="client-participants-container">
            <input type="text" class="form-input" id="client-participants" name="clientParticipants" placeholder="請先選擇關聯對象以載入聯絡人...">
        </div>
    </div>

    <div class="form-group">
        <label for="visit-place" class="form-label">會議地點</label>
        <input type="text" class="form-input" id="visit-place" name="visitPlace">
    </div>
    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2"></textarea>
    </div>
</fieldset>

<fieldset>
    <legend>DT 專屬資訊</legend>
    <div class="form-group">
        <label for="dt-device-scale" class="form-label">設備規模</label>
        <input type="text" class="form-input" id="dt-device-scale" name="dt_deviceScale">
    </div>
    <div class="form-group">
        <label for="dt-processing-type" class="form-label">加工類型</label>
        <input type="text" class="form-input" id="dt-processing-type" name="dt_processingType">
    </div>
    <div class="form-group">
        <label for="dt-industry" class="form-label">加工產業別</label>
        <input type="text" class="form-input" id="dt-industry" name="dt_industry">
    </div>
</fieldset>
</file>

<file path="public/components/forms/event-form-dx.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-name" class="form-label">事件名稱 *</label>
        <input type="text" class="form-input" id="event-name" name="eventName" required>
    </div>

    <div class="form-group">
        <label class="form-label">我方與會人員</label>
        <div class="participants-checkbox-group" id="our-participants-container">
            <p style="color: var(--text-muted);">載入中...</p>
        </div>
    </div>
    
    <div class="form-group">
        <label for="client-participants" class="form-label">客戶與會人員</label>
        <div id="client-participants-container">
            <input type="text" class="form-input" id="client-participants" name="clientParticipants" placeholder="請先選擇關聯對象以載入聯絡人...">
        </div>
    </div>
    
    <div class="form-group">
        <label for="visit-place" class="form-label">會議地點</label>
        <input type="text" class="form-input" id="visit-place" name="visitPlace">
    </div>
    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2"></textarea>
    </div>
</fieldset>
</file>

<file path="public/components/forms/event-form-general.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-name" class="form-label">事件名稱 *</label>
        <input type="text" class="form-input" id="event-name" name="eventName" required>
    </div>

    <div class="form-group">
        <label class="form-label">我方與會人員</label>
        <div class="participants-checkbox-group" id="our-participants-container">
            <p style="color: var(--text-muted);">載入中...</p>
        </div>
    </div>
    
    <div class="form-group">
        <label for="client-participants" class="form-label">客戶與會人員</label>
        <div id="client-participants-container">
            <input type="text" class="form-input" id="client-participants" name="clientParticipants" placeholder="請先選擇關聯對象以載入聯絡人...">
        </div>
    </div>
    
    <div class="form-group">
        <label for="visit-place" class="form-label">會議地點</label>
        <input type="text" class="form-input" id="visit-place" name="visitPlace">
    </div>

    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2" style="resize: vertical;"></textarea>
    </div>
</fieldset>
</file>

<file path="public/components/forms/event-form-iot.html">
<fieldset>
    <legend>會議共通資訊</legend>
    <div class="form-group">
        <label for="event-content" class="form-label">會議內容</label>
        <textarea class="form-textarea" id="event-content" name="eventContent" rows="5" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-questions" class="form-label">客戶提問</label>
        <textarea class="form-textarea" id="client-questions" name="clientQuestions" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="client-intelligence" class="form-label">客戶情報</label>
        <textarea class="form-textarea" id="client-intelligence" name="clientIntelligence" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="event-notes" class="form-label">備註</label>
        <textarea class="form-textarea" id="event-notes" name="eventNotes" rows="2" style="resize: vertical;"></textarea>
    </div>
</fieldset>

<fieldset>
    <legend>IOT 專屬資訊</legend>
    
    <div class="form-group">
        <label for="iot-device-scale" class="form-label">設備規模</label>
        <textarea class="form-textarea" id="iot-device-scale" name="iot_deviceScale" rows="1" placeholder="例: 機台數量、PLC 數量" style="resize: vertical;"></textarea>
    </div>

    <div class="form-group">
        <label class="form-label">生產線特徵 (可多選)</label>
        <div class="participants-checkbox-group" id="iot-line-features">
            <label><input type="checkbox" name="iot_lineFeatures" value="工具機"> <span>工具機</span></label>
            <label><input type="checkbox" name="iot_lineFeatures" value="ROBOT"> <span>ROBOT</span></label>
            <label><input type="checkbox" name="iot_lineFeatures" value="傳產機"> <span>傳產機</span></label>
            <label><input type="checkbox" name="iot_lineFeatures" value="PLC"> <span>PLC</span></label>
        </div>
    </div>
    
    <div class="form-group">
        <label for="iot-production-status" class="form-label">生產現況</label>
        <textarea class="form-textarea" id="iot-production-status" name="iot_productionStatus" rows="3" placeholder="客戶目前生產情況" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="iot-status" class="form-label">IoT現況</label>
        <textarea class="form-textarea" id="iot-status" name="iot_iotStatus" rows="3" placeholder="客戶 IoT 導入情況" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label class="form-label">痛點分類 (可多選)</label>
        <div class="participants-checkbox-group" id="iot-pain-points">
            <label><input type="checkbox" name="iot_painPoints" value="Monitoring"> <span>Monitoring</span></label>
            <label><input type="checkbox" name="iot_painPoints" value="Improve OEE"> <span>Improve OEE</span></label>
            <label><input type="checkbox" name="iot_painPoints" value="Reduce Man-hours"> <span>Reduce Man-hours</span></label>
            <label><input type="checkbox" name="iot_painPoints" value="Others"> <span>Others</span></label>
        </div>
    </div>
    <div class="form-group">
        <label for="iot-pain-point-details" class="form-label">客戶痛點說明</label>
        <textarea class="form-textarea" id="iot-pain-point-details" name="iot_painPointDetails" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="iot-pain-point-analysis" class="form-label">痛點分析與對策</label>
        <textarea class="form-textarea" id="iot-pain-point-analysis" name="iot_painPointAnalysis" rows="3" style="resize: vertical;"></textarea>
    </div>
    <div class="form-group">
        <label for="iot-system-architecture" class="form-label">系統架構</label>
        <textarea class="form-textarea" id="iot-system-architecture" name="iot_systemArchitecture" rows="3" placeholder="系統架構簡圖或文字描述" style="resize: vertical;"></textarea>
    </div>
</fieldset>
</file>

<file path="public/scripts/events/event-editor-standalone.js">
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
</file>

<file path="public/scripts/events/event-modal-manager.js">
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
</file>

<file path="public/scripts/events/event-wizard.js">
// public/scripts/events/event-wizard.js
// 職責：管理「新增事件精靈」的完整流程 (Step 1 -> 2 -> 3 -> Create)
// 修改歷程：加入機會自動跳轉、公司防呆、完成後連結至獨立編輯器、新增我方人員手動輸入、Dashboard Stale Integration
/**
 * @version 1.1.2
 * @date 2026-03-17
 * @description [UX Patch] Opted into HTML rendering and persistent display for the create success notification, and corrected the manual dismiss selector to target `.toast`.
 */

const EventWizard = (() => {
    // 狀態儲存
    let state = {
        step: 1,
        targetType: null, // 'opportunity' | 'company'
        targetId: null,
        targetName: '',
        targetCompany: '', // 輔助資訊
        
        // Step 2 Data
        eventType: 'general',
        eventName: '',
        eventTime: '',
        eventLocation: '',
        
        // Step 3 Data
        selectedOurParticipants: new Set(),
        selectedClientParticipants: new Set()
    };

    let searchTimeout;

    // --- 初始化與顯示 ---
    function show(defaults = {}) {
        // 1. 強制重置狀態 (Clean Slate)
        resetState();

        // 2. 根據傳入的預設值設定狀態與起始步驟
        if (defaults.opportunityId) {
            // 情境 A：從機會詳細頁進入
            selectTargetType('opportunity');
            _setTarget({
                id: defaults.opportunityId,
                name: defaults.opportunityName,
                company: defaults.customerCompany
            });
            // 機會直接進入 Step 2 (定義事件)
            setStep(2); 
        } else if (defaults.companyId) {
            // 情境 B：從公司詳細頁進入
            selectTargetType('company');
            _setTarget({
                id: defaults.companyId,
                name: defaults.companyName,
                company: defaults.companyName 
            });
            // 公司停留在 Step 1，以便觸發防呆
            setStep(1);
        } else {
            // 情境 C：一般入口 (儀表板/列表)，停在 Step 1
            setStep(1);
        }
        
        // 設定預設時間為現在
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const timeInput = document.getElementById('wiz-event-time');
        if (timeInput) timeInput.value = now.toISOString().slice(0, 16);

        showModal('new-event-wizard-modal');
    }

    function resetState() {
        state = {
            step: 1,
            targetType: null,
            targetId: null,
            targetName: '',
            targetCompany: '',
            eventType: 'general',
            eventName: '',
            eventTime: '',
            eventLocation: '',
            selectedOurParticipants: new Set(),
            selectedClientParticipants: new Set()
        };

        // 重置 UI
        document.querySelectorAll('.event-entry-card').forEach(el => el.classList.remove('selected'));
        const searchArea = document.getElementById('wiz-target-search-area');
        if(searchArea) searchArea.style.display = 'none';
        
        const searchInput = document.getElementById('wiz-target-search');
        if(searchInput) searchInput.value = '';
        
        const results = document.getElementById('wiz-target-results');
        if(results) results.style.display = 'none';
        
        const nameInput = document.getElementById('wiz-event-name');
        if(nameInput) nameInput.value = '';
        
        const locInput = document.getElementById('wiz-event-location');
        if(locInput) locInput.value = '';
        
        // 重置 Step 2 類型卡片
        document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'));
        // 預設選中 General
        const generalCard = document.querySelector('.type-card[onclick*="general"]');
        if(generalCard) generalCard.classList.add('selected');
        
        // 重置手動輸入框
        const manualClient = document.getElementById('wiz-manual-participants');
        if(manualClient) manualClient.value = '';

        // 【新增】重置我方手動輸入框
        const manualOur = document.getElementById('wiz-manual-our-participants');
        if(manualOur) manualOur.value = '';
    }

    // --- 步驟控制 ---
    function setStep(step) {
        state.step = step;
        
        // UI 更新：隱藏所有內容，顯示當前步驟
        document.querySelectorAll('.wizard-step-content').forEach(el => el.style.display = 'none');
        const targetContent = document.querySelector(`.wizard-step-content[data-wiz-content="${step}"]`);
        if (targetContent) targetContent.style.display = 'block';

        // 導航條更新
        document.querySelectorAll('.step-item').forEach(el => {
            const s = parseInt(el.dataset.wizStep);
            el.classList.remove('active');
            if (s === step) el.classList.add('active');
        });

        // 按鈕顯示控制
        const prevBtn = document.getElementById('wiz-prev-btn');
        const nextBtn = document.getElementById('wiz-next-btn');
        const createBtn = document.getElementById('wiz-create-btn');

        if (prevBtn && nextBtn && createBtn) {
            if (step === 1) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'block';
                createBtn.style.display = 'none';
            } else if (step === 2) {
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'block';
                createBtn.style.display = 'none';
            } else if (step === 3) {
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'none';
                createBtn.style.display = 'block';
                _renderParticipantsStep(); 
            }
        }
    }

    function nextStep() {
        // --- Step 1 驗證與防呆 ---
        if (state.step === 1) {
            if (!state.targetId) {
                showNotification('請先選擇關聯對象', 'warning');
                return;
            }

            // 公司事件防呆機制
            if (state.targetType === 'company') {
                const message = `請確認您是在跟公司互動？\n\n此操作只會紀錄於「公司總覽」，\n(通常用於 SI、代理商或 MTB 的一般拜訪)，\n並「不會」存檔在任何機會案件中。\n\n確定要繼續嗎？`;
                
                showConfirmDialog(message, () => {
                    setStep(2);
                });
                return; // 阻斷，等待確認
            }
        } 
        
        // --- Step 2 驗證 ---
        if (state.step === 2) {
            const nameInput = document.getElementById('wiz-event-name');
            const timeInput = document.getElementById('wiz-event-time');
            const locInput = document.getElementById('wiz-event-location');

            const name = nameInput ? nameInput.value.trim() : '';
            const time = timeInput ? timeInput.value : '';
            
            if (!name || !time) {
                showNotification('事件名稱與發生時間為必填', 'warning');
                return;
            }
            // 暫存 DOM 資料回 State
            state.eventName = name;
            state.eventTime = time;
            state.eventLocation = locInput ? locInput.value.trim() : '';
        }
        
        // 正常跳轉
        setStep(state.step + 1);
    }

    function prevStep() {
        if (state.step > 1) setStep(state.step - 1);
    }

    // --- Step 1: 鎖定對象 ---
    function selectTargetType(type, cardElement) {
        state.targetType = type;
        
        // UI Highlight
        document.querySelectorAll('.event-entry-card').forEach(el => el.classList.remove('selected'));
        if (cardElement) {
            cardElement.classList.add('selected');
        } else {
            // 若是程式呼叫，手手動 highlight
            const index = type === 'opportunity' ? 0 : 1;
            const cards = document.querySelectorAll('.event-entry-card');
            if(cards[index]) cards[index].classList.add('selected');
        }

        // Show search area
        const searchArea = document.getElementById('wiz-target-search-area');
        if(searchArea) searchArea.style.display = 'block';
        
        const searchInput = document.getElementById('wiz-target-search');
        if(searchInput) {
            searchInput.value = '';
            searchInput.placeholder = type === 'opportunity' ? '搜尋機會名稱...' : '搜尋公司名稱...';
            searchInput.focus();
        }
        
        const label = document.getElementById('wiz-search-label');
        if(label) label.textContent = type === 'opportunity' ? '搜尋機會' : '搜尋公司';
        
        // 自動載入預設列表
        searchTargets('');
    }

    function searchTargets(query) {
        const resultsContainer = document.getElementById('wiz-target-results');
        if(!resultsContainer) return;

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading show" style="padding:10px;"><div class="spinner" style="width:20px;height:20px"></div></div>';

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                let apiUrl;
                if (state.targetType === 'opportunity') {
                    apiUrl = `/api/opportunities?q=${encodeURIComponent(query)}&page=0`; 
                } else {
                    apiUrl = `/api/companies`; 
                }

                const result = await authedFetch(apiUrl);
                let items = Array.isArray(result) ? result : (result.data || []);

                if (query) {
                    const lowerQ = query.toLowerCase();
                    if (state.targetType === 'opportunity') {
                        items = items.filter(i => i.opportunityName.toLowerCase().includes(lowerQ));
                    } else {
                        items = items.filter(i => i.companyName.toLowerCase().includes(lowerQ));
                    }
                }
                
                const displayItems = items.slice(0, 5);

                if (displayItems.length === 0) {
                    resultsContainer.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">無符合資料</div>';
                    return;
                }

                resultsContainer.innerHTML = displayItems.map(item => {
                    const data = state.targetType === 'opportunity' 
                        ? { id: item.opportunityId, name: item.opportunityName, company: item.customerCompany }
                        : { id: item.companyId, name: item.companyName, company: item.companyName };
                    
                    const safeJson = JSON.stringify(data).replace(/'/g, "&apos;");
                    
                    let subText = '';
                    if (state.targetType === 'opportunity') {
                        subText = `<small style="color:var(--text-muted)">${data.company}</small>`;
                    }

                    return `
                        <div class="search-result-item" onclick='EventWizard._setTarget(${safeJson})'>
                            <strong>${data.name}</strong>
                            ${subText}
                        </div>
                    `;
                }).join('');

            } catch (e) {
                console.error(e);
                resultsContainer.innerHTML = '<div class="search-result-item">搜尋失敗</div>';
            }
        }, 300);
    }

    function _setTarget(data) {
        state.targetId = data.id;
        state.targetName = data.name;
        state.targetCompany = data.company;

        const input = document.getElementById('wiz-target-search');
        if(input) input.value = data.name;
        
        const results = document.getElementById('wiz-target-results');
        if(results) results.style.display = 'none';
    }
    window.EventWizard_setTarget = _setTarget; 

    // --- Step 2: 定義事件 ---
    function selectEventType(type, cardElement) {
        state.eventType = type;
        document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'));
        if (cardElement) {
            cardElement.classList.add('selected');
        }
    }

    // --- Step 3: 與會人員 ---
    async function _renderParticipantsStep() {
        // 1. 渲染我方人員
        const myContainer = document.getElementById('wiz-our-participants');
        if (myContainer) {
            const members = window.CRM_APP?.systemConfig?.['團隊成員'] || [];
            
            if (members.length === 0) {
                myContainer.innerHTML = '<span>未設定團隊成員</span>';
            } else {
                myContainer.innerHTML = members.map(m => {
                    const isSelected = state.selectedOurParticipants.has(m.note) ? 'selected' : '';
                    return `<span class="wiz-tag ${isSelected}" onclick="EventWizard.toggleParticipant('our', '${m.note}', this)">${m.note}</span>`;
                }).join('');
            }

            // 【新增】動態注入我方人員手動輸入框 (如果還沒有的話)
            if (!document.getElementById('wiz-manual-our-participants')) {
                const manualInput = document.createElement('input');
                manualInput.type = 'text';
                manualInput.id = 'wiz-manual-our-participants';
                manualInput.className = 'form-input'; // 使用標準樣式
                manualInput.placeholder = '+ 手動輸入 (逗號分隔)';
                manualInput.style.marginTop = '8px';
                manualInput.style.fontSize = '0.9rem';
                // 插入到容器之後
                myContainer.parentNode.insertBefore(manualInput, myContainer.nextSibling);
            }
        }

        // 2. 渲染客戶人員
        const clientContainer = document.getElementById('wiz-client-participants');
        if (clientContainer) {
            clientContainer.innerHTML = '<span>載入中...</span>';

            if (!state.targetCompany) {
                clientContainer.innerHTML = '<span>無法識別公司，請手動輸入</span>';
                return;
            }

            try {
                const encodedName = encodeURIComponent(state.targetCompany);
                const result = await authedFetch(`/api/companies/${encodedName}/details`);
                
                if (result.success && result.data && result.data.contacts) {
                    const contacts = result.data.contacts;
                    if (contacts.length === 0) {
                        clientContainer.innerHTML = '<span>此公司尚無聯絡人資料</span>';
                    } else {
                        clientContainer.innerHTML = contacts.map(c => {
                            const label = `${c.name}`;
                            const isSelected = state.selectedClientParticipants.has(c.name) ? 'selected' : '';
                            return `<span class="wiz-tag ${isSelected}" onclick="EventWizard.toggleParticipant('client', '${c.name}', this)">${label}</span>`;
                        }).join('');
                    }
                } else {
                    clientContainer.innerHTML = '<span>載入失敗</span>';
                }
            } catch (e) {
                console.error(e);
                clientContainer.innerHTML = '<span>載入錯誤</span>';
            }
        }
    }

    function toggleParticipant(type, value, el) {
        const set = type === 'our' ? state.selectedOurParticipants : state.selectedClientParticipants;
        if (set.has(value)) {
            set.delete(value);
            el.classList.remove('selected');
        } else {
            set.add(value);
            el.classList.add('selected');
        }
    }

    // --- 建立 (Create) ---
    async function create() {
        const createBtn = document.getElementById('wiz-create-btn');
        if(createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = '建立中...';
        }

        try {
            // 收集資料
            const manualClientInput = document.getElementById('wiz-manual-participants');
            const manualOurInput = document.getElementById('wiz-manual-our-participants'); // 【新增】

            const payload = {
                eventType: state.eventType,
                eventName: state.eventName,
                createdTime: new Date(state.eventTime).toISOString(),
                visitPlace: state.eventLocation,
                
                opportunityId: state.targetType === 'opportunity' ? state.targetId : '',
                companyId: state.targetType === 'company' ? state.targetId : '',
                
                // 【修改】合併我方人員 (膠囊 + 手動)
                ourParticipants: [
                    ...Array.from(state.selectedOurParticipants),
                    manualOurInput ? manualOurInput.value.trim() : ''
                ].filter(Boolean).join(', '),

                // 合併客戶人員 (膠囊 + 手動)
                clientParticipants: [
                    ...Array.from(state.selectedClientParticipants),
                    manualClientInput ? manualClientInput.value.trim() : ''
                ].filter(Boolean).join(', '),
                
                creator: getCurrentUser()
            };

            const result = await authedFetch('/api/events', { 
                method: 'POST', 
                body: JSON.stringify(payload),
                skipRefresh: true 
            });

            if (result.success) {
                const newEventId = result.eventId || result.id; // [Bugfix] Support both DTO keys
                
                // 1. 關閉 Wizard
                closeModal('new-event-wizard-modal');
                
                // 2. 組合訊息，連結指向新的獨立編輯器
                const messageHtml = `已建立事件紀錄：<strong>${state.eventName}</strong><br>` +
                                    `<a href="#" style="color: var(--accent-blue); text-decoration: underline; font-weight: bold; margin-left: 0; display: inline-block; margin-top: 5px;" ` +
                                    `onclick="EventEditorStandalone.open('${newEventId}'); this.closest('.toast').remove(); return false;">` +
                                    `👉 點此補充詳細內容</a>`;

                // 3. 顯示永久通知 (明確要求支援 HTML 且不會自動關閉)
                showNotification(messageHtml, 'success', 0, { allowHtml: true, persistent: true }); 
                
                // [Phase 8.10 Stale-Refresh Fix] 標記 Dashboard 資料過期
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }

                // 4. 觸發背景資料刷新
                if (window.CRM_APP && window.CRM_APP.refreshCurrentView) {
                     window.CRM_APP.refreshCurrentView('資料同步中...');
                }

            } else {
                throw new Error(result.error || '建立失敗');
            }

        } catch (e) {
            console.error(e);
            showNotification('建立失敗: ' + e.message, 'error');
        } finally {
            if(createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = '✅ 建立並編輯詳情';
            }
        }
    }

    return {
        show,
        setStep,
        nextStep,
        prevStep,
        selectTargetType,
        searchTargets,
        _setTarget,
        selectEventType,
        toggleParticipant,
        create
    };
})();

// 掛載到 window
window.EventWizard = EventWizard;
</file>

<file path="public/styles/modules/layout.css">
/* File: public/styles/modules/layout.css */
/*
 * File Path: public/styles/modules/layout.css
 * Version: 1.1.38
 * Date: 2026-04-29
 * Changelog: 
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
</file>

</files>
