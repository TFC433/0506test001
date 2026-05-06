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