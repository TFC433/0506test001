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
- Only files matching these patterns are included: public/components/modals/opportunity-modals.html, public/components/modals/link-opportunity-modal.html, public/scripts/opportunities/opportunity-modals.js, public/styles/modules/layout.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/components/modals/link-opportunity-modal.html
public/components/modals/opportunity-modals.html
public/scripts/opportunities/opportunity-modals.js
public/styles/modules/layout.css
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/components/modals/link-opportunity-modal.html">
<div id="link-opportunity-modal" class="modal">
    <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
            <h2 class="modal-title" id="link-opportunity-modal-title">關聯至母機會</h2>
            <button class="close-btn" onclick="closeModal('link-opportunity-modal')">&times;</button>
        </div>
        <div class="form-group">
            <label class="form-label">搜尋機會案件</label>
            <input type="text" class="form-input" id="search-opportunity-to-link-input" placeholder="輸入機會名稱或公司進行搜尋...">
        </div>
        <div id="opportunity-to-link-results" class="search-result-list">
            </div>
    </div>
</div>
</file>

<file path="public/components/modals/opportunity-modals.html">
<div id="new-opportunity-modal" class="modal">
    <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
            <h2 class="modal-title">🎯 新增機會案件</h2>
            <button class="close-btn" onclick="closeModal('new-opportunity-modal')">&times;</button>
        </div>

        <div class="wizard-steps">
            <div class="step-item active" data-step="1">
                <div class="step-circle">1</div>
                <div class="step-label">鎖定對象</div>
            </div>
            <div class="step-line"></div>
            <div class="step-item" data-step="2">
                <div class="step-circle">2</div>
                <div class="step-label">機會內容</div>
            </div>
            <div class="step-line"></div>
            <div class="step-item" data-step="3">
                <div class="step-circle">3</div>
                <div class="step-label">歸屬設定</div>
            </div>
        </div>

        <form id="new-opportunity-wizard-form">
            <input type="hidden" id="wiz-path" value="">
            <input type="hidden" id="wiz-company-county" value="">
            <input type="hidden" id="wiz-contact-source-id" value="">

            <div class="wizard-step-content" data-step="1">
                <h3 class="step-instruction">請問您要建立哪種類型的機會？</h3>
                
                <div class="entry-options-grid" id="wiz-entry-options">
                    <div class="entry-option-card" onclick="NewOppWizard.selectPath('card')">
                        <div class="entry-icon">📇</div>
                        <div class="entry-title">新名片轉入</div>
                        <div class="entry-desc">已掃描名片，<br>從「潛在客戶」 轉入</div>
                    </div>
                    <div class="entry-option-card" onclick="NewOppWizard.selectPath('old')">
                        <div class="entry-icon">🏢</div>
                        <div class="entry-title">經營老客戶</div>
                        <div class="entry-desc">公司曾建過機會，<br>新增「新的機會案件」</div>
                    </div>
                    <div class="entry-option-card" onclick="NewOppWizard.selectPath('new')">
                        <div class="entry-icon">✨</div>
                        <div class="entry-title">全新開發</div>
                        <div class="entry-desc">系統無相關資料，<br>手動建立「公司與聯絡人」</div>
                    </div>
                </div>

                <div id="wiz-path-card" class="wiz-path-section" style="display: none;">
                    <div class="form-group">
                        <label class="form-label">搜尋名片 / 選擇最近新增</label>
                        <input type="text" class="form-input" id="wiz-card-search" placeholder="輸入姓名或公司搜尋..." onkeyup="NewOppWizard.searchCards(this.value)">
                    </div>
                    <div id="wiz-card-list" class="search-result-list" style="display: block; max-height: 250px; position: static;">
                        </div>
                </div>

                <div id="wiz-path-old" class="wiz-path-section" style="display: none;">
                    <div class="form-group">
                        <label class="form-label">搜尋已建檔公司</label>
                        <div class="search-input-wrapper">
                            <input type="text" class="form-input" id="wiz-company-search" placeholder="輸入公司名稱 (例如: 台積電)..." onkeyup="NewOppWizard.searchCompanies(this.value)">
                        </div>
                        <div id="wiz-company-results" class="search-result-list"></div>
                    </div>
                    
                    <div id="wiz-old-contact-area" style="display: none; margin-top: 15px; padding: 15px; background: var(--glass-bg); border-radius: 8px;">
                        <p style="margin-bottom: 10px;"><strong>已選定公司：</strong><span id="wiz-selected-company-name"></span></p>
                        <div class="form-group">
                            <label class="form-label">選擇聯絡人</label>
                            <div class="select-wrapper">
                                <select class="form-select" id="wiz-old-contact-select" onchange="NewOppWizard.handleContactSelect(this)">
                                    </select>
                            </div>
                        </div>
                        <div id="wiz-new-contact-inputs" style="display: none; margin-top: 10px;">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">姓名 *</label>
                                    <input type="text" class="form-input" id="wiz-new-contact-name">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">電話/手機</label>
                                    <input type="text" class="form-input" id="wiz-new-contact-phone">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="wiz-path-new" class="wiz-path-section" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">客戶公司 *</label>
                            <input type="text" class="form-input" id="wiz-manual-company">
                        </div>
                        <div class="form-group">
                            <label class="form-label">地區 (縣市)</label>
                            <div class="select-wrapper">
                                <select class="form-select" id="wiz-manual-county">
                                    </select>
                            </div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">聯絡人姓名 *</label>
                            <input type="text" class="form-input" id="wiz-manual-contact">
                        </div>
                        <div class="form-group">
                            <label class="form-label">電話/手機</label>
                            <input type="text" class="form-input" id="wiz-manual-phone">
                        </div>
                    </div>
                </div>
            </div>

            <div class="wizard-step-content" data-step="2" style="display: none;">
                <div class="alert alert-info" id="wiz-step2-summary" style="margin-bottom: 20px;">
                    </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">機會種類 *</label>
                        <div class="select-wrapper">
                            <select class="form-select" id="wiz-opp-type" onchange="NewOppWizard.autoGenerateName()">
                                </select>
                        </div>
                    </div>
                     <div class="form-group">
                        <label class="form-label">機會名稱 *</label>
                        <input type="text" class="form-input" id="wiz-opp-name" placeholder="系統將自動生成，可修改">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">機會來源</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="wiz-opp-source">
                            </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">預計結案日</label>
                        <input type="date" class="form-input" id="wiz-close-date">
                    </div>
                    <div class="form-group">
                        <label class="form-label">預計金額</label>
                        <input type="text" class="form-input" id="wiz-value" placeholder="選填">
                    </div>
                </div>
            </div>

            <div class="wizard-step-content" data-step="3" style="display: none;">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">負責業務</label>
                        <div class="select-wrapper">
                            <select class="form-select" id="wiz-assignee">
                                </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">目前階段</label>
                        <div class="select-wrapper">
                            <select class="form-select" id="wiz-stage">
                                </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">備註</label>
                    <textarea class="form-textarea" id="wiz-notes" rows="3"></textarea>
                </div>

                <div class="summary-card" style="margin-top: 20px; background: var(--glass-bg); border: 1px solid var(--accent-blue);">
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 5px;">即將建立</div>
                    <div style="text-align: center; font-weight: 700; font-size: 1.1rem; color: var(--text-primary);" id="wiz-final-preview">
                        </div>
                </div>
            </div>

            <div class="wizard-footer">
                <button type="button" class="action-btn secondary" id="wiz-btn-prev" onclick="NewOppWizard.prevStep()" style="display: none;">&lt; 上一步</button>
                <span id="wiz-btn-spacer" style="flex-grow: 1;"></span> 
                
                <button type="button" class="action-btn primary" id="wiz-btn-next" onclick="NewOppWizard.nextStep()">下一步 &gt;</button>
                <button type="submit" class="action-btn primary" id="wiz-btn-submit" style="display: none;">✅ 建立機會</button>
            </div>
        </form>
    </div>
</div>

<div id="edit-opportunity-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">✏️ 編輯機會案件</h2>
            <button class="close-btn" onclick="closeModal('edit-opportunity-modal')">&times;</button>
        </div>
        <form id="edit-opportunity-form">
            <input type="hidden" id="edit-opportunity-rowIndex">

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">機會名稱 *</label>
                    <input type="text" class="form-input" id="edit-opportunity-name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">機會種類</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-opportunity-type">
                            <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">客戶公司</label>
                    <input type="text" class="form-input" id="edit-customer-company" disabled>
                </div>
                <div class="form-group">
                    <label class="form-label">公司所在縣市</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-company-county">
                            <option value="">讀取中...</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">主要聯絡人</label>
                    <input type="text" class="form-input" id="edit-main-contact" disabled>
                </div>
                 <div class="form-group">
                    <label class="form-label">機會來源</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-opportunity-source">
                            <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">目前階段</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-current-stage">
                           <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">負責業務</label>
                    <div class="select-wrapper">
                        <select class="form-select" id="edit-assignee">
                            <option value="">請選擇...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">結案日期</label> 
                    <input type="date" class="form-input" id="edit-expected-close-date">
                </div>
                <div class="form-group">
                    <label class="form-label">機會價值</label>
                    <input type="text" class="form-input" id="edit-opportunity-value" placeholder="如: 1,000,000">
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">備註</label>
                <textarea class="form-textarea" id="edit-opportunity-notes"></textarea>
            </div>

            <button type="submit" class="submit-btn" style="background: #ffc107; color: #212529;">💾 儲存編輯</button>
        </form>
    </div>
</div>

<div id="kanban-expand-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title" id="kanban-expand-title"></h2>
            <button class="close-btn" onclick="closeModal('kanban-expand-modal')">&times;</button>
        </div>
        <div id="kanban-expand-content" class="widget-content">
            <div class="loading show"><div class="spinner"></div></div>
        </div>
    </div>
</div>
</file>

<file path="public/scripts/opportunities/opportunity-modals.js">
/**
 * public/scripts/opportunities/opportunity-modals.js
 * @version v5.0.10
 * @date 2026-04-17
 * @changelog
 * - Fix empty contact creation by trimming mainContact in payload
 * - Fix wizard card search residual input state
 * - Add success notification after opportunity creation
 * - Auto navigate to created opportunity detail page
 */

// 職責：管理所有與「機會」相關的彈出視窗 (新增Wizard、編輯、關聯)

// ==================== 全域變數 ====================
let allSearchedContacts = [];
let companySearchTimeout;
let linkOppSearchTimeout;

// ==================== Wizard 核心邏輯 (新增機會專用) ====================
const NewOppWizard = {
    state: {
        step: 1,
        path: null, // 'card', 'old', 'new'
        data: {
            companyName: '',
            mainContact: '',
            contactPhone: '',
            county: '',
            sourceId: null, // 用於名片轉入 (Contact rowIndex)
            lastGeneratedName: ''
        }
    },

    // 初始化與顯示
    show: function() {
        this.reset();
        showModal('new-opportunity-modal');
        
        // 調整 UI (隱藏欄位、加星號、置中)
        this._adjustUI();

        // 嘗試預先填入地區選單
        if (typeof populateCountyDropdown === 'function') {
            populateCountyDropdown('wiz-manual-county');
        }
        
        // 載入下拉選單
        if(window.CRM_APP && window.CRM_APP.systemConfig) {
            if (typeof populateSelect === 'function') {
                populateSelect('wiz-opp-type', window.CRM_APP.systemConfig['機會種類']);
                populateSelect('wiz-opp-source', window.CRM_APP.systemConfig['機會來源']);
                
                // 預設選取第一個階段
                const stages = window.CRM_APP.systemConfig['機會階段'] || [];
                const defaultStage = stages.length > 0 ? stages[0].value : '01_初步接觸';
                populateSelect('wiz-stage', stages, defaultStage);
                
                populateSelect('wiz-assignee', window.CRM_APP.systemConfig['團隊成員'], getCurrentUser());
            }
        }
        
        this.renderStep();
    },

    // 【新增】從聯絡人列表直接啟動 Wizard 並帶入資料
    startWithContact: function(contact) {
        // 1. 先顯示並重置 Wizard
        this.show();
        
        // 2. 設定路徑狀態為 'card' (名片轉入模式)
        this.state.path = 'card';
        
        // 3. 直接呼叫 selectCard 邏輯來填入資料並跳轉
        // 這會自動設定 companyName, mainContact, sourceId 等，並執行 nextStep()
        this.selectCard(contact);
    },

    // 內部 UI 調整函式
    _adjustUI: function() {
        // 1. 隱藏預計結案日與機會價值
        const dateInput = document.getElementById('wiz-close-date');
        const valueInput = document.getElementById('wiz-value');
        if (dateInput) dateInput.closest('.form-group').style.display = 'none';
        if (valueInput) valueInput.closest('.form-group').style.display = 'none';

        // 2. 必填欄位加註米字號
        const addStar = (id) => {
            const el = document.getElementById(id);
            if (el) {
                const label = el.closest('.form-group')?.querySelector('label');
                if (label && !label.innerHTML.includes('*')) {
                    label.innerHTML += ' <span style="color:var(--accent-red)">*</span>';
                }
            }
        };
        ['wiz-opp-type', 'wiz-opp-name', 'wiz-assignee', 'wiz-stage'].forEach(addStar);

        // 3. 即將建立卡片置中
        const summaryCard = document.querySelector('#new-opportunity-wizard-form .summary-card');
        if (summaryCard) {
            summaryCard.style.margin = '20px auto';
            summaryCard.style.textAlign = 'center';
            summaryCard.style.maxWidth = '400px';
        }

        // 4. 綁定聯絡人搜尋框 (Client-side filter)
        const cardSearch = document.getElementById('wiz-card-search');
        if (cardSearch && !cardSearch.dataset.eventsBound) {
            cardSearch.removeAttribute('onkeyup');
            cardSearch.setAttribute('autocomplete', 'off');
            cardSearch.addEventListener('focus', (e) => this.searchCards(e.target.value));
            cardSearch.addEventListener('input', (e) => this.searchCards(e.target.value));
            cardSearch.dataset.eventsBound = 'true';
        }
    },

    // 重置狀態
    reset: function() {
        this.state = {
            step: 1,
            path: null,
            data: { companyName: '', mainContact: '', contactPhone: '', county: '', sourceId: null, lastGeneratedName: '' }
        };
        
        const form = document.getElementById('new-opportunity-wizard-form');
        if (form) form.reset();
        
        const cardSearch = document.getElementById('wiz-card-search');
        if (cardSearch) cardSearch.value = '';
        
        // 重置 UI 顯示狀態
        const entryOptions = document.getElementById('wiz-entry-options');
        if (entryOptions) entryOptions.style.display = 'grid';
        
        document.querySelectorAll('.wiz-path-section').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.entry-option-card').forEach(el => el.classList.remove('selected'));
        
        const oldContactArea = document.getElementById('wiz-old-contact-area');
        if (oldContactArea) oldContactArea.style.display = 'none';
        
        const newContactInputs = document.getElementById('wiz-new-contact-inputs');
        if (newContactInputs) newContactInputs.style.display = 'none';
        
        // 重置按鈕狀態
        const btnPrev = document.getElementById('wiz-btn-prev');
        if (btnPrev) btnPrev.style.display = 'none';
        const btnNext = document.getElementById('wiz-btn-next');
        if (btnNext) btnNext.style.display = 'none';
        const btnSubmit = document.getElementById('wiz-btn-submit');
        if (btnSubmit) btnSubmit.style.display = 'none';
    },

    // 選擇路徑 (Step 1)
    selectPath: function(path) {
        this.state.path = path;
        
        // UI 更新
        document.querySelectorAll('.entry-option-card').forEach(el => el.classList.remove('selected'));
        
        // 隱藏入口選項，顯示對應路徑的內容
        document.getElementById('wiz-entry-options').style.display = 'none';
        document.querySelectorAll('.wiz-path-section').forEach(el => el.style.display = 'none');

        const targetSection = document.getElementById(`wiz-path-${path}`);
        if (targetSection) targetSection.style.display = 'block';
        
        // 顯示「上一步」按鈕
        document.getElementById('wiz-btn-prev').style.display = 'block';
        
        // 路徑初始化邏輯
        if(path === 'card') {
            this.loadRecentCards();
        } else if(path === 'new') {
             document.getElementById('wiz-btn-next').style.display = 'block';
        } else if(path === 'old') {
             document.getElementById('wiz-btn-next').style.display = 'block'; 
             setTimeout(() => {
                 const input = document.getElementById('wiz-company-search');
                 if (input) input.focus();
             }, 100);
        }
    },

    // [路徑 A] 載入最近名片
    loadRecentCards: async function() {
        const list = document.getElementById('wiz-card-list');
        if (!list) return;
        
        try {
            if (allSearchedContacts.length === 0) {
                list.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
                const result = await authedFetch(`/api/contacts`);
                allSearchedContacts = result.data || [];
            }
            this.renderCardList(allSearchedContacts.slice(0, 5));
        } catch(e) {
            console.error(e);
            list.innerHTML = '<div class="alert alert-error">載入名片失敗</div>';
        }
    },

    searchCards: function(query) {
        const list = document.getElementById('wiz-card-list');
        if (!list) return;
        
        if(!query || !query.trim()) { 
            this.renderCardList(allSearchedContacts.slice(0, 5)); 
            return; 
        }
        
        const q = query.toLowerCase().trim();
        const filtered = allSearchedContacts.filter(c => {
            return (c.name && c.name.toLowerCase().includes(q)) || 
                   (c.company && c.company.toLowerCase().includes(q));
        });
        
        this.renderCardList(filtered);
    },

    renderCardList: function(cards) {
        const list = document.getElementById('wiz-card-list');
        if (!list) return;
        
        if(cards.length === 0) {
            list.innerHTML = '<div class="search-result-item" style="cursor:default; color:var(--text-muted);">無符合資料</div>';
            return;
        }
        
        list.innerHTML = cards.map(c => {
            const safeJson = JSON.stringify(c).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
            const companyDisplay = c.company || '未知公司';
            const titleDisplay = c.position || c.jobTitle || '未知職位';
            return `
            <div class="search-result-item" onclick='NewOppWizard.selectCard(${safeJson})'>
                ${c.name} ｜ ${companyDisplay} ｜ ${titleDisplay}
            </div>
        `}).join('');
    },

    // 選定名片後的動作
    selectCard: function(card) {
        this.state.data.companyName = card.company;
        this.state.data.mainContact = card.name;
        this.state.data.contactPhone = card.mobile || card.phone;
        this.state.data.sourceId = card.rowIndex;
        
        if(card.address && typeof detectCountyFromAddress === 'function') {
            const detected = detectCountyFromAddress(card.address);
            if(detected) this.state.data.county = detected;
        }

        // 清空名稱以觸發自動命名
        const nameInput = document.getElementById('wiz-opp-name');
        if (nameInput) nameInput.value = '';

        // 自動跳到下一步
        this.nextStep();
    },

    // [路徑 B] 搜尋公司 (僅搜尋公司總表)
    searchCompanies: function(query) {
        handleSearch(async () => {
            const list = document.getElementById('wiz-company-results');
            if (!list) return;
            
            if(!query) { list.innerHTML = ''; list.style.display = 'none'; return; }
            
            list.style.display = 'block';
            list.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
            
            try {
                const compRes = await authedFetch('/api/companies');
                const companies = (compRes.data || []).filter(c => c.companyName.toLowerCase().includes(query.toLowerCase()));

                let html = '';
                if (companies.length > 0) {
                    companies.forEach(c => {
                        const safeJson = JSON.stringify(c).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
                        html += `<div class="search-result-item" onclick='NewOppWizard.selectOldCompany(${safeJson})'>
                            <strong>🏢 ${c.companyName}</strong>
                        </div>`;
                    });
                } else {
                    html = `<div class="search-result-item" style="color: var(--text-muted); cursor: default;">
                                找不到符合的公司。<br>
                                若為新客戶，請改用 <a href="#" onclick="NewOppWizard.switchToNewPath('${query.replace(/'/g, "\\'")}')" class="text-link">【全新開發】</a> 路徑。
                            </div>`;
                }
                list.innerHTML = html;
            } catch(e) { 
                console.error(e); 
                list.innerHTML = '<div class="search-result-item">搜尋發生錯誤</div>';
            }
        });
    },

    // 選定已建檔公司
    selectOldCompany: async function(company) {
        this.state.data.companyName = company.companyName;
        this.state.data.county = company.county;
        
        // 清空名稱以觸發自動命名
        const nameInput = document.getElementById('wiz-opp-name');
        if (nameInput) nameInput.value = '';
        
        document.getElementById('wiz-company-search').value = company.companyName;
        document.getElementById('wiz-company-results').style.display = 'none';
        
        document.getElementById('wiz-old-contact-area').style.display = 'block';
        document.getElementById('wiz-selected-company-name').textContent = company.companyName;

        // 載入該公司的聯絡人
        const select = document.getElementById('wiz-old-contact-select');
        select.innerHTML = '<option>載入中...</option>';
        
        try {
            const detail = await authedFetch(`/api/companies/${encodeURIComponent(company.companyName)}/details`);
            const contacts = detail.data.contacts || [];
            
            let opts = '<option value="">請選擇聯絡人...</option>';
            contacts.forEach(c => {
                const val = JSON.stringify({name: c.name, phone: c.mobile || c.phone}).replace(/"/g, "&quot;");
                opts += `<option value="${val}">${c.name}</option>`;
            });
            opts += '<option value="NEW_CONTACT">➕ 新增聯絡人</option>';
            select.innerHTML = opts;
        } catch(e) {
            console.error(e);
            select.innerHTML = '<option value="NEW_CONTACT">載入失敗，直接新增</option>';
        }
    },

    handleContactSelect: function(select) {
        const val = select.value;
        const newContactArea = document.getElementById('wiz-new-contact-inputs');
        
        if(val === 'NEW_CONTACT') {
            newContactArea.style.display = 'block';
            this.state.data.mainContact = ''; 
            this.state.data.contactPhone = '';
            setTimeout(() => document.getElementById('wiz-new-contact-name').focus(), 100);
        } else if(val) {
            newContactArea.style.display = 'none';
            const c = JSON.parse(val);
            this.state.data.mainContact = c.name;
            this.state.data.contactPhone = c.phone;
        } else {
            newContactArea.style.display = 'none';
            this.state.data.mainContact = '';
        }
    },

    // 切換到全新開發路徑 (並帶入已輸入的公司名稱)
    switchToNewPath: function(name) {
        this.selectPath('new');
        setTimeout(() => {
            document.getElementById('wiz-manual-company').value = name;
            const nameInput = document.getElementById('wiz-opp-name');
            if (nameInput) nameInput.value = ''; 
        }, 50);
    },

    // ==================== 導航與驗證邏輯 ====================
    nextStep: function() {
        // Step 1 驗證
        if(this.state.step === 1) {
            if(this.state.path === 'new') {
                const comp = document.getElementById('wiz-manual-company').value.trim();
                const name = document.getElementById('wiz-manual-contact').value.trim();
                const phone = document.getElementById('wiz-manual-phone').value.trim();
                const county = document.getElementById('wiz-manual-county').value;
                
                if(!comp || !name) { showNotification('公司名稱與聯絡人姓名為必填', 'error'); return; }
                
                this.state.data.companyName = comp;
                this.state.data.mainContact = name;
                this.state.data.contactPhone = phone;
                this.state.data.county = county;
                
            } else if (this.state.path === 'old') {
                const select = document.getElementById('wiz-old-contact-select');
                
                if(select.value === 'NEW_CONTACT') {
                    const name = document.getElementById('wiz-new-contact-name').value.trim();
                    const phone = document.getElementById('wiz-new-contact-phone').value.trim();
                    if(!name) { showNotification('請輸入新聯絡人姓名', 'error'); return; }
                    this.state.data.mainContact = name;
                    this.state.data.contactPhone = phone;
                } else if (!select.value) {
                    if (!this.state.data.companyName) {
                        showNotification('請先選擇公司', 'warning'); return;
                    }
                    showNotification('請選擇一位聯絡人，或選擇新增', 'warning'); 
                    return;
                }
            }
        }

        // Step 2 驗證
        if(this.state.step === 2) {
            const type = document.getElementById('wiz-opp-type').value;
            const name = document.getElementById('wiz-opp-name').value.trim();
            
            if (!type) { showNotification('請選擇機會種類', 'error'); return; }
            if (!name) { showNotification('請輸入機會名稱', 'error'); return; }
        }

        // 前進下一步
        this.state.step++;
        this.renderStep();
    },

    prevStep: function() {
        if(this.state.step === 1) {
            this.state.path = null;
            document.getElementById('wiz-entry-options').style.display = 'grid';
            document.querySelectorAll('.wiz-path-section').forEach(el => el.style.display = 'none');
            document.getElementById('wiz-btn-prev').style.display = 'none';
            document.getElementById('wiz-btn-next').style.display = 'none';
        } else {
            this.state.step--;
            this.renderStep();
        }
    },

    renderStep: function() {
        const step = this.state.step;
        
        document.querySelectorAll('.step-item').forEach(el => {
            const s = parseInt(el.dataset.step);
            if(s === step) el.className = 'step-item active';
            else if(s < step) el.className = 'step-item completed'; 
            else el.className = 'step-item';
        });

        document.querySelectorAll('.wizard-step-content').forEach(el => el.style.display = 'none');
        const targetContent = document.querySelector(`.wizard-step-content[data-step="${step}"]`);
        if(targetContent) targetContent.style.display = 'block';

        const btnNext = document.getElementById('wiz-btn-next');
        const btnSubmit = document.getElementById('wiz-btn-submit');
        const btnPrev = document.getElementById('wiz-btn-prev');
        const spacer = document.getElementById('wiz-btn-spacer');

        if(step === 1) {
            btnNext.style.display = (this.state.path === 'new' || this.state.path === 'old') ? 'block' : 'none'; 
            btnSubmit.style.display = 'none';
            btnPrev.style.display = this.state.path ? 'block' : 'none';
            if(!this.state.path) spacer.style.display = 'block';
            
        } else if (step === 2) {
            btnNext.style.display = 'block';
            btnSubmit.style.display = 'none';
            btnPrev.style.display = 'block';
            spacer.style.display = 'none';
            
            const summaryEl = document.getElementById('wiz-step2-summary');
            if(summaryEl) {
                summaryEl.innerHTML = `
                    <strong>客戶：</strong>${this.state.data.companyName || '-'} <br>
                    <strong>窗口：</strong>${this.state.data.mainContact || '-'} 
                    <span style="color:var(--text-muted); font-size:0.85em;">(${this.state.data.contactPhone || '無電話'})</span>
                `;
            }
            this.autoGenerateName();
            
        } else if (step === 3) {
            btnNext.style.display = 'none';
            btnSubmit.style.display = 'block';
            btnPrev.style.display = 'block';
            spacer.style.display = 'none';
            
            const type = document.getElementById('wiz-opp-type').value;
            const name = document.getElementById('wiz-opp-name').value;
            const previewEl = document.getElementById('wiz-final-preview');
            if(previewEl) {
                previewEl.textContent = `${name} (${this.state.data.mainContact})`;
            }
        }
    },

    autoGenerateName: function() {
        const typeSelect = document.getElementById('wiz-opp-type');
        const nameInput = document.getElementById('wiz-opp-name');
        if (!typeSelect || !nameInput) return;

        const typeText = typeSelect.options[typeSelect.selectedIndex]?.text || typeSelect.value || '';
        const company = this.state.data.companyName;
        
        if (!company || !typeText) return;

        const currentName = nameInput.value.trim();
        
        // 解析機會種類簡稱 (擷取空白、半形或全形括號前的文字)
        const abbreviation = typeText.split(/[\s(（]+/)[0].trim();
        const expectedName = `${abbreviation} - ${company}`;
        
        // 只有當「輸入框為空」、「符合系統前次自動生成的結果」或「與舊版邏輯相符(向下相容)」時，才執行覆寫
        if(!currentName || currentName === this.state.data.lastGeneratedName || currentName === `${typeText} - ${company}`) {
            nameInput.value = expectedName;
            this.state.data.lastGeneratedName = expectedName;
        }
    }
};

// ==================== 全域函式綁定 ====================

// 1. 覆蓋舊的 showNewOpportunityModal
window.showNewOpportunityModal = function() {
    NewOppWizard.show();
};

// 2. 編輯機會 Modal
async function editOpportunity(opportunityId) {
    if (!opportunityId) { showNotification('無效的機會ID', 'error'); return; }
    showLoading('正在獲取最新資料...');
    try {
        const result = await authedFetch(`/api/opportunities/${opportunityId}/details`);
        if (!result.success) throw new Error('無法從後端獲取機會資料');
        const opportunity = result.data.opportunityInfo;

        showModal('edit-opportunity-modal');
        // [Modified] Use opportunityId (hidden input or dataset) instead of rowIndex
        const form = document.getElementById('edit-opportunity-form');
        form.dataset.currentOppId = opportunity.opportunityId;
        
        // Also try to set hidden input if it exists, for robustness
        const idInput = document.getElementById('edit-opportunity-id');
        if(idInput) idInput.value = opportunity.opportunityId;

        document.getElementById('edit-opportunity-name').value = opportunity.opportunityName;
        document.getElementById('edit-customer-company').value = opportunity.customerCompany;
        document.getElementById('edit-main-contact').value = opportunity.mainContact;
        document.getElementById('edit-expected-close-date').value = opportunity.expectedCloseDate;
        document.getElementById('edit-opportunity-value').value = opportunity.opportunityValue;
        document.getElementById('edit-opportunity-notes').value = opportunity.notes;
        
        if(window.CRM_APP.systemConfig) {
            populateSelect('edit-opportunity-type', window.CRM_APP.systemConfig['機會種類'], opportunity.opportunityType);
            populateSelect('edit-opportunity-source', window.CRM_APP.systemConfig['機會來源'], opportunity.opportunitySource);
            populateSelect('edit-current-stage', window.CRM_APP.systemConfig['機會階段'], opportunity.currentStage);
            populateSelect('edit-assignee', window.CRM_APP.systemConfig['團隊成員'], opportunity.assignee);
        }
        if (typeof populateCountyDropdown === 'function') {
            populateCountyDropdown('edit-company-county');
        }
        const companyResult = await authedFetch(`/api/companies/${encodeURIComponent(opportunity.customerCompany)}/details`);
        if (companyResult.success && companyResult.data.companyInfo && companyResult.data.companyInfo.county) {
            document.getElementById('edit-company-county').value = companyResult.data.companyInfo.county;
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification('找不到該筆機會的資料', 'error');
    } finally {
        hideLoading();
    }
}

// 3. 關聯聯絡人 Modal
function showLinkContactModal(opportunityId) {
    showModal('link-contact-modal');
    const container = document.getElementById('link-contact-content-container');
    const tabs = document.querySelectorAll('.link-contact-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[0].classList.add('active');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderLinkContactTabContent(tab.dataset.tab, container);
        };
    });
    renderLinkContactTabContent('from-potential', container);
}

function renderLinkContactTabContent(tabName, container) {
    let html = '';
    if (tabName === 'from-potential') {
        html = `
            <div class="form-group">
                <label class="form-label">搜尋名片 (潛在客戶)</label>
                <input type="text" class="form-input" id="search-potential-contact-input" placeholder="輸入姓名或公司...">
            </div>
            <div id="potential-contact-results" class="search-result-list"></div>
        `;
        container.innerHTML = html;
        document.getElementById('search-potential-contact-input').addEventListener('keyup', (e) => handleSearch(() => searchAndRenderContacts('potential', e.target.value)));
        searchAndRenderContacts('potential', '');
    } else if (tabName === 'from-existing') {
        html = `
            <div class="form-group">
                <label class="form-label">搜尋已建檔聯絡人</label>
                <input type="text" class="form-input" id="search-existing-contact-input" placeholder="輸入姓名或公司...">
            </div>
            <div id="existing-contact-results" class="search-result-list"></div>
        `;
        container.innerHTML = html;
        document.getElementById('search-existing-contact-input').addEventListener('keyup', (e) => handleSearch(() => searchAndRenderContacts('existing', e.target.value)));
        searchAndRenderContacts('existing', '');
    } else if (tabName === 'create-new') {
        const companyName = window.currentOpportunityData ? window.currentOpportunityData.customerCompany : '';
        html = `
            <form id="create-and-link-contact-form">
                <div class="form-group">
                    <label class="form-label">公司名稱 *</label>
                    <input type="text" class="form-input" name="company" value="${companyName}" required>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">姓名 *</label><input type="text" class="form-input" name="name" required></div>
                    <div class="form-group"><label class="form-label">職位</label><input type="text" class="form-input" name="position"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">手機</label><input type="text" class="form-input" name="mobile"></div>
                    <div class="form-group"><label class="form-label">公司電話</label><input type="text" class="form-input" name="phone"></div>
                </div>
                <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email"></div>
                <button type="submit" class="submit-btn">建立並關聯</button>
            </form>
        `;
        container.innerHTML = html;
        document.getElementById('create-and-link-contact-form').addEventListener('submit', handleCreateAndLinkContact);
    }
}

async function searchAndRenderContacts(type, query) {
    const containerId = type === 'potential' ? 'potential-contact-results' : 'existing-contact-results';
    const resultsContainer = document.getElementById(containerId);
    if (!resultsContainer) return;

    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
    
    const apiUrl = type === 'existing' 
        ? `/api/contact-list?q=${encodeURIComponent(query || '')}` 
        : `/api/contacts?q=${encodeURIComponent(query || '')}`;
    
    try {
        const result = await authedFetch(apiUrl);
        if (result.data && result.data.length > 0) {
            resultsContainer.innerHTML = result.data.map(contact => {
                const companyDisplay = contact.companyName || contact.company || '公司未知';
                const safeJson = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
                return `
                    <div class="kanban-card" style="cursor: pointer; margin-bottom:8px;" onclick='handleLinkContact(${safeJson}, "${type}")'>
                        <div class="card-title">${contact.name}</div>
                        <div class="card-company">${companyDisplay} - ${contact.position || '職位未知'}</div>
                    </div>
                `;
            }).join('');
        } else {
            resultsContainer.innerHTML = '<div class="alert alert-info">找不到符合的聯絡人</div>';
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') resultsContainer.innerHTML = '<div class="alert alert-error">搜尋失敗</div>';
    }
}

async function handleLinkContact(contactData, type) {
    showLoading('正在關聯...');
    const payload = {
        name: contactData.name,
        position: contactData.position,
        mobile: contactData.mobile,
        phone: contactData.phone,
        email: contactData.email,
        rowIndex: contactData.rowIndex, 
        company: contactData.companyName || contactData.company,
        contactId: contactData.contactId
    };

    try {
        if (!window.currentDetailOpportunityId) throw new Error('無法識別當前機會 ID');
        const result = await authedFetch(`/api/opportunities/${window.currentDetailOpportunityId}/contacts`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (result.success) closeModal('link-contact-modal');
        else throw new Error(result.error);
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function handleCreateAndLinkContact(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const contactData = Object.fromEntries(formData.entries());
    await handleLinkContact(contactData, 'new');
}

// 4. 關聯母機會 Modal
// [Modified] Use currentOppId only
function showLinkOpportunityModal(currentOppId) {
    showModal('link-opportunity-modal');
    const searchInput = document.getElementById('search-opportunity-to-link-input');
    const resultsContainer = document.getElementById('opportunity-to-link-results');
    
    const performSearch = async (query) => {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading show"><div class="spinner" style="width:20px;height:20px"></div></div>';
        try {
            const result = await authedFetch(`/api/opportunities?q=${encodeURIComponent(query)}&page=0`);
            const opportunities = Array.isArray(result) ? result : (result.data || []);
            const filtered = opportunities.filter(opp => opp.opportunityId !== currentOppId);

            if (filtered.length > 0) {
                // [Modified] Pass currentOppId to handleLinkOpportunity
                resultsContainer.innerHTML = filtered.map(opp => `
                    <div class="kanban-card" style="cursor: pointer; margin-bottom:8px;" onclick='handleLinkOpportunity("${currentOppId}", "${opp.opportunityId}")'>
                        <div class="card-title">${opp.opportunityName}</div>
                        <div class="card-company">${opp.customerCompany}</div>
                    </div>
                `).join('');
            } else {
                resultsContainer.innerHTML = `<div class="alert alert-warning">找不到符合的機會</div>`;
            }
        } catch(error) {
            if(error.message !== 'Unauthorized') resultsContainer.innerHTML = `<div class="alert alert-error">搜尋失敗</div>`;
        }
    };
    performSearch('');
    searchInput.onkeyup = (e) => {
        clearTimeout(linkOppSearchTimeout);
        linkOppSearchTimeout = setTimeout(() => performSearch(e.target.value.trim()), 400); 
    };
}

async function handleLinkOpportunity(currentOppId, parentOppId) {
    showLoading('正在建立關聯...');
    try {
        // [Modified] PUT by ID
        const result = await authedFetch(`/api/opportunities/${currentOppId}`, {
            method: 'PUT',
            body: JSON.stringify({ parentOpportunityId: parentOppId })
        });
        if (result.success) closeModal('link-opportunity-modal');
        else throw new Error(result.error);
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== 表單提交事件監聽 ====================

document.addEventListener('submit', async function(e) {
    // 1. 新增機會 Wizard 表單提交
    if(e.target.id === 'new-opportunity-wizard-form') {
        e.preventDefault();
        const stateData = NewOppWizard.state.data;
        
        const payload = {
            customerCompany: stateData.companyName,
            mainContact: (stateData.mainContact || '').trim(),
            contactPhone: stateData.contactPhone,
            county: stateData.county,
            
            opportunityName: document.getElementById('wiz-opp-name').value,
            opportunityType: document.getElementById('wiz-opp-type').value,
            opportunitySource: document.getElementById('wiz-opp-source').value,
            
            assignee: document.getElementById('wiz-assignee').value,
            currentStage: document.getElementById('wiz-stage').value,
            notes: document.getElementById('wiz-notes').value,
            
            // sourceId from wizard is usually Contact rowIndex for "upgrade".
            rowIndex: stateData.sourceId 
        };

        showLoading('正在建立機會案件...');
        try {
            let url = '/api/opportunities';
            if (payload.rowIndex) {
                // Keep this path if it's for contact upgrade (Legacy RAW)
                url = `/api/contacts/${payload.rowIndex}/upgrade`;
            }
            const result = await authedFetch(url, { method: 'POST', body: JSON.stringify(payload) });

            if (result.success) {
                // [Phase 8.10 Dashboard Refresh Fix]
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
                closeModal('new-opportunity-modal');
                
                showNotification('機會建立成功', 'success');

                const targetOppId = result.opportunityId || result.id;

                if (targetOppId && window.CRM_APP && typeof window.CRM_APP.navigateTo === 'function') {
                    window.CRM_APP.navigateTo('opportunity-details', { opportunityId: targetOppId });
                }
            } else {
                throw new Error(result.details || result.error || '建立失敗');
            }
        } catch (error) {
            if(error.message !== 'Unauthorized') showNotification(`建立失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 2. 編輯機會表單提交
    if (e.target.id === 'edit-opportunity-form') {
        e.preventDefault();
        showLoading('正在儲存編輯...');
        try {
            // [Modified] Retrieve opportunityId from dataset or hidden input
            const form = document.getElementById('edit-opportunity-form');
            const opportunityId = form.dataset.currentOppId || document.getElementById('edit-opportunity-id')?.value;
            
            if (!opportunityId) throw new Error("無法識別機會 ID");

            const modifier = getCurrentUser();
            const companyName = document.getElementById('edit-customer-company').value;
            const newCounty = document.getElementById('edit-company-county').value;
            
            const updateOpportunityData = {
                opportunityName: document.getElementById('edit-opportunity-name').value,
                opportunityType: document.getElementById('edit-opportunity-type').value,
                opportunitySource: document.getElementById('edit-opportunity-source').value,
                currentStage: document.getElementById('edit-current-stage').value,
                assignee: document.getElementById('edit-assignee').value,
                expectedCloseDate: document.getElementById('edit-expected-close-date').value,
                opportunityValue: document.getElementById('edit-opportunity-value').value,
                notes: document.getElementById('edit-opportunity-notes').value,
                modifier: modifier
            };
            
            const promises = [
                // [Modified] PUT by ID
                authedFetch(`/api/opportunities/${opportunityId}`, { method: 'PUT', body: JSON.stringify(updateOpportunityData) })
            ];
            if (newCounty) {
                const encodedCompanyName = encodeURIComponent(companyName);
                promises.push(authedFetch(`/api/companies/${encodedCompanyName}`, { method: 'PUT', body: JSON.stringify({ county: newCounty }) }));
            }
            await Promise.all(promises);

            // [Phase 8.10 Dashboard Refresh Fix]
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }
            closeModal('edit-opportunity-modal');
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`更新失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }
});
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
