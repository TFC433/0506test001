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