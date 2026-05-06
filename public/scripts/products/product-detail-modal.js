// public/scripts/products/product-detail-modal.js

/**
 * [獨立模組] 商品詳細視窗管理器
 * 負責處理 Modal 的顯示、編輯模式切換、資料填入與儲存
 * Fix: 2025-01 強制阻擋背景點擊冒泡，防止全域腳本誤關視窗
 */
class ProductDetailModal {
    constructor() {
        this.modalId = 'product-detail-modal';
        this.currentProduct = null;
        this.isEditing = false;
        this.categories = [];
        this.onSaveCallback = null;
        
        // 追蹤分類輸入模式
        this.isManualCategoryMode = false;

        this.elements = {
            modal: document.getElementById(this.modalId),
            form: document.getElementById('product-detail-form'),
            title: document.getElementById('modal-title'),
            
            // --- 分類相關 ---
            viewCategoryDisplay: document.getElementById('view-category-display'),
            categorySelectMode: document.getElementById('category-select-mode'),
            categoryManualMode: document.getElementById('category-manual-mode'),
            categorySelect: document.getElementById('input-category-select'),
            categoryInput: document.getElementById('input-category-text'),
            
            btnToManual: document.getElementById('btn-to-manual'),
            btnToSelect: document.getElementById('btn-to-select'),
            
            // --- 成本顯示控制 ---
            costDisplay: document.getElementById('input-cost-display'), // 顯示用 (******)
            costReal: document.getElementById('input-cost-real'),       // 編輯用 (真實數值)
            
            // --- 按鈕 ---
            btnEdit: document.getElementById('btn-modal-edit'),
            btnSave: document.getElementById('btn-modal-save'),
            btnCancel: document.getElementById('btn-modal-cancel'),
            btnCloseBtns: document.querySelectorAll('.close-modal-btn')
        };

        this.bindEvents();
    }

    bindEvents() {
        // 1. 綁定功能按鈕
        if (this.elements.btnEdit) {
            this.elements.btnEdit.addEventListener('click', () => this.toggleEdit(true));
        }
        if (this.elements.btnCancel) {
            this.elements.btnCancel.addEventListener('click', () => this.toggleEdit(false));
        }
        if (this.elements.btnSave) {
            this.elements.btnSave.addEventListener('click', () => this.handleSave());
        }
        
        // 2. 綁定明確的關閉按鈕 (X)
        this.elements.btnCloseBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // 避免觸發其他邏輯
                this.close();
            });
        });

        // 3. 分類切換按鈕
        if (this.elements.btnToManual) {
            this.elements.btnToManual.addEventListener('click', () => this.setCategoryInputMode(true));
        }
        if (this.elements.btnToSelect) {
            this.elements.btnToSelect.addEventListener('click', () => this.setCategoryInputMode(false));
        }

        // ★★★ [關鍵修正] 強制阻擋背景誤觸 ★★★
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                // 如果點擊目標是 modal 本體 (即半透明背景)，而不是內部的 content
                if (e.target === this.elements.modal) {
                    // 阻止事件冒泡！這會防止 main.js 或 bootstrap.js 接收到點擊事件
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Background click blocked by ProductDetailModal protection.');
                    // 可選：可以在這裡加一個搖晃動畫提示使用者不能關
                }
            });
            
            // 防止按 ESC 關閉 (如果需要的話)
            this.elements.modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isEditing) {
                    e.stopPropagation(); // 編輯中禁止 ESC 關閉
                }
            });
        }
    }

    open(product, allCategories, saveCallback) {
        this.currentProduct = JSON.parse(JSON.stringify(product));
        this.categories = allCategories || [];
        this.onSaveCallback = saveCallback;
        
        this.isEditing = false;
        
        this.populateForm();
        this.updateViewModeUI();
        
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
        }
    }

    close() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
        }
        this.isEditing = false;
    }

    populateForm() {
        const p = this.currentProduct;
        const form = this.elements.form;
        if (!form) return;

        // 1. 分類 Tag
        if (this.elements.viewCategoryDisplay) {
            this.elements.viewCategoryDisplay.textContent = p.category || '未分類';
            if (!p.category) {
                this.elements.viewCategoryDisplay.style.backgroundColor = '#f1f5f9';
                this.elements.viewCategoryDisplay.style.color = '#64748b';
                this.elements.viewCategoryDisplay.style.borderColor = '#e2e8f0';
            } else {
                this.elements.viewCategoryDisplay.style.backgroundColor = '';
                this.elements.viewCategoryDisplay.style.color = '';
                this.elements.viewCategoryDisplay.style.borderColor = '';
            }
        }

        // 2. 分類 Select
        if (this.elements.categorySelect) {
            this.elements.categorySelect.innerHTML = '';
            const cats = new Set([...this.categories]);
            if (p.category) cats.add(p.category);
            
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '-- 請選擇分類 --';
            this.elements.categorySelect.appendChild(defaultOpt);

            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                if (cat === p.category) opt.selected = true;
                this.elements.categorySelect.appendChild(opt);
            });
        }
        
        // 3. 分類 Input
        if (this.elements.categoryInput) {
            this.elements.categoryInput.value = p.category || '';
        }

        // 4. 其他欄位
        if(form.elements.id) form.elements.id.value = p.id || '';
        if(form.elements.name) form.elements.name.value = p.name || '';
        if(form.elements.spec) form.elements.spec.value = p.spec || '';
        if(form.elements.description) form.elements.description.value = p.description || '';
        
        if(form.elements.priceMtb) form.elements.priceMtb.value = p.priceMtb || '';
        if(form.elements.priceSi) form.elements.priceSi.value = p.priceSi || '';
        if(form.elements.priceMtu) form.elements.priceMtu.value = p.priceMtu || '';
        
        // 成本數值 (填入 hidden real input)
        if(form.elements.cost) form.elements.cost.value = p.cost || '';
    }

    toggleEdit(active) {
        this.isEditing = active;
        const form = this.elements.form;
        if (!form) return;
        
        if (active) {
            // --- [編輯模式] ---
            if(this.elements.modal) this.elements.modal.classList.remove('view-mode');
            if(this.elements.title) this.elements.title.textContent = '編輯商品';
            
            Array.from(form.elements).forEach(el => {
                // 不啟用 ID 和 Cost Display (******)
                if (el.name !== 'id' && el.id !== 'input-cost-display') {
                    el.disabled = false;
                }
            });

            this.setCategoryInputMode(false); // 預設回選單模式
            
            if(this.elements.btnEdit) this.elements.btnEdit.style.display = 'none';
            if(this.elements.btnSave) this.elements.btnSave.style.display = 'inline-flex';
            if(this.elements.btnCancel) this.elements.btnCancel.style.display = 'inline-flex';

            // ★ 成本：切換為真實輸入框
            if(this.elements.costDisplay) this.elements.costDisplay.style.display = 'none';
            if(this.elements.costReal) {
                this.elements.costReal.style.display = 'block';
                this.elements.costReal.type = 'number';
                // 確保啟用
                this.elements.costReal.disabled = false;
            }
            
        } else {
            // --- [檢視模式] ---
            if(this.elements.modal) this.elements.modal.classList.add('view-mode');
            if(this.elements.title) this.elements.title.textContent = '商品詳細資訊';

            if (!this.isEditing) this.populateForm();

            Array.from(form.elements).forEach(el => el.disabled = true);
            
            if(this.elements.btnEdit) this.elements.btnEdit.style.display = 'inline-flex';
            if(this.elements.btnSave) this.elements.btnSave.style.display = 'none';
            if(this.elements.btnCancel) this.elements.btnCancel.style.display = 'none';

            // ★ 成本：切換回星號
            if(this.elements.costReal) this.elements.costReal.style.display = 'none';
            if(this.elements.costDisplay) {
                this.elements.costDisplay.style.display = 'block';
                this.elements.costDisplay.value = '******';
            }
        }
    }

    setCategoryInputMode(isManual) {
        this.isManualCategoryMode = isManual;
        
        if (!this.elements.categorySelectMode || !this.elements.categoryManualMode) return;

        if (isManual) {
            this.elements.categorySelectMode.style.display = 'none';
            this.elements.categoryManualMode.style.display = 'block';
            if(this.elements.categoryInput) this.elements.categoryInput.focus();
        } else {
            this.elements.categorySelectMode.style.display = 'block';
            this.elements.categoryManualMode.style.display = 'none';
        }
    }

    updateViewModeUI() {
        this.toggleEdit(false);
    }

    async handleSave() {
        if (!this.onSaveCallback) return;

        const formData = new FormData(this.elements.form);
        const newData = Object.fromEntries(formData.entries());
        newData.id = this.currentProduct.id;

        if (this.isManualCategoryMode) {
            newData.category = newData.category_text || '';
        } else {
            newData.category = newData.category_select || '';
        }
        delete newData.category_select;
        delete newData.category_text;

        if(this.elements.btnSave) this.elements.btnSave.disabled = true;
        
        try {
            await this.onSaveCallback(newData);
            this.currentProduct = { ...this.currentProduct, ...newData };
            
            if (newData.category && !this.categories.includes(newData.category)) {
                this.categories.push(newData.category);
            }

            this.toggleEdit(false);
            
            if (this.elements.title) {
                const titleOriginal = this.elements.title.textContent;
                this.elements.title.textContent = '✓ 儲存成功';
                this.elements.title.style.color = '#16a34a';
                setTimeout(() => {
                    this.elements.title.textContent = titleOriginal;
                    this.elements.title.style.color = '';
                }, 2000);
            }

        } catch (error) {
            alert('儲存失敗: ' + error.message);
        } finally {
            if(this.elements.btnSave) this.elements.btnSave.disabled = false;
        }
    }
}