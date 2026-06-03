/**
 * public/scripts/products/products.js
 * 商品管理前端模組
 * * @version 5.2.1 (Product Cost Operational SaaS Alignment)
 * * @date 2026-05-07
 * @description 
 * 1. 實作前端 Dirty Checking (只送出有變更的資料)。
 * 2. 增加 DOM 元素檢測，防止 textContent of null 錯誤。
 * 3. [UI] Tokenized generated category badges and focus ring to align Product Cost with operational SaaS theme cleanup.
 */

window.ProductManager = {
    allProducts: [],
    revealedCostIds: new Set(),
    categoryOrder: [], 
    isEditMode: false,
    hasBoundGlobalEvents: false,
    detailModal: null,

    async init() {
        const container = document.getElementById('page-products');
        if (!container) return;

        try {
            const html = await fetch('/views/product-list.html').then(res => res.text());
            container.innerHTML = html;
        } catch (err) {
            console.error('[Products] 載入失敗', err);
            return;
        }

        // 初始化 Modal
        if (typeof ProductDetailModal !== 'undefined') {
            this.detailModal = new ProductDetailModal();
        } else {
            console.error('ProductDetailModal class not found!');
        }

        await this.loadCategoryOrder();
        this.injectToolbarControls();
        this.bindEvents();
        await this.loadData();
    },

    async loadData() {
        const container = document.getElementById('product-groups-container');
        // 只有在完全沒資料時才顯示 Loading，避免編輯切換時閃爍
        if (this.allProducts.length === 0 && container) {
            container.innerHTML = `<div class="loading show"><div class="spinner"></div><p>載入商品資料中...</p></div>`;
        }
        try {
            const res = await authedFetch('/api/products');
            if (!res.success) throw new Error(res.error);
            this.allProducts = res.data || [];
            this.renderTable();
        } catch (error) {
            if (container) container.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
        }
    },

    async loadCategoryOrder() {
        try {
            const res = await authedFetch('/api/products/category-order');
            if (res.success && Array.isArray(res.order)) this.categoryOrder = res.order;
        } catch (e) { console.warn('排序設定讀取失敗', e); }
    },

    injectToolbarControls() {
        const panelActions = document.querySelector('.panel-actions');
        // 確保不會重複注入
        if (!panelActions || panelActions.querySelector('.product-actions-group')) return;

        const btnGroup = document.createElement('div');
        btnGroup.className = 'product-actions-group';

        btnGroup.innerHTML = `
            <button id="btn-add-row" class="action-btn secondary" style="display:none;">＋ 新增</button>
            <button id="btn-toggle-edit" class="action-btn secondary">✎ 編輯</button>
            <button id="btn-save-batch" class="action-btn primary" style="display:none;">✓ 儲存</button>
            <button id="btn-refresh-products" class="action-btn secondary" title="同步">↻ 同步</button>
        `;
        panelActions.appendChild(btnGroup);
    },

    bindEvents() {
        const searchInput = document.getElementById('product-search-input');
        let debounceTimer;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.renderTable(e.target.value), 300);
            });
        }

        document.addEventListener('input', (e) => {
            if (e.target?.name !== 'oppDisplayCategory') return;
            const row = e.target.closest('.edit-row');
            const categoryInput = row?.querySelector('input[name="category"]');
            if (categoryInput) categoryInput.value = e.target.value;
        });

        if (this.hasBoundGlobalEvents) return;

        document.addEventListener('click', (e) => {
            const statusToggle = e.target.closest('.inline-status-toggle');
            if (statusToggle) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleInlineStatus(statusToggle);
                return;
            }

            const target = e.target.closest('button');
            if (!target) return;
            if (target.closest('.modal')) return;
            
            // 確保點擊發生在 Product 頁面範圍內
            const page = document.getElementById('page-products');
            if (!page || !page.contains(target)) return;

            if (target.id === 'btn-refresh-products') this.forceRefresh();
            if (target.id === 'btn-toggle-edit') this.setEditMode(!this.isEditMode);
            if (target.id === 'btn-save-batch') this.saveAll();
            if (target.id === 'btn-add-row') this.addNewRow();
            
            if (target.classList.contains('close-modal')) {
                if(this.detailModal) this.detailModal.close();
            }
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('product-detail-modal');
            if (modal && e.target === modal) {
                if(this.detailModal) this.detailModal.close();
                else modal.style.display = 'none';
            }
        });

        this.hasBoundGlobalEvents = true;
    },

    renderTable(query = '') {
        const container = document.getElementById('product-groups-container');
        if (!container) return;

        let data = this.allProducts;
        
        if (query && !this.isEditMode) {
            const q = query.toLowerCase();
            data = data.filter(p => 
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q)) ||
                (p.spec && p.spec.toLowerCase().includes(q))
            );
        }
        const displayRows = data.map(item => ({
            item,
            originalIndex: this.allProducts.indexOf(item),
            isNew: !!item._isNew,
            category: String(item.oppDisplayCategory || '').trim(),
            order: this.parseOppDisplayOrder(item.oppDisplayOrder)
        }));
        const categoryGroups = new Map();
        displayRows.forEach(row => {
            if (!row.category) return;
            const group = categoryGroups.get(row.category) || {
                minOrder: null,
                firstIndex: row.originalIndex
            };
            group.firstIndex = Math.min(group.firstIndex, row.originalIndex);
            if (row.order !== null) {
                group.minOrder = group.minOrder === null ? row.order : Math.min(group.minOrder, row.order);
            }
            categoryGroups.set(row.category, group);
        });

        data = displayRows
            .sort((a, b) => {
                if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;

                const aHasCategory = a.category !== '';
                const bHasCategory = b.category !== '';
                if (aHasCategory !== bHasCategory) return aHasCategory ? -1 : 1;

                if (a.category !== b.category) {
                    const aGroup = categoryGroups.get(a.category);
                    const bGroup = categoryGroups.get(b.category);
                    const aHasGroupOrder = aGroup?.minOrder !== null && aGroup?.minOrder !== undefined;
                    const bHasGroupOrder = bGroup?.minOrder !== null && bGroup?.minOrder !== undefined;
                    if (aHasGroupOrder !== bHasGroupOrder) return aHasGroupOrder ? -1 : 1;
                    if (aHasGroupOrder && bHasGroupOrder && aGroup.minOrder !== bGroup.minOrder) {
                        return aGroup.minOrder - bGroup.minOrder;
                    }

                    const firstIndexCompare = (aGroup?.firstIndex ?? a.originalIndex) - (bGroup?.firstIndex ?? b.originalIndex);
                    if (firstIndexCompare !== 0) return firstIndexCompare;
                }

                const aHasOrder = a.order !== null;
                const bHasOrder = b.order !== null;
                if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
                if (aHasOrder && bHasOrder) {
                    const orderCompare = a.order - b.order;
                    if (orderCompare !== 0) return orderCompare;
                }

                return a.originalIndex - b.originalIndex;
            })
            .map(row => row.item);
        if (wallArea) wallArea.style.display = 'none';

        if (data.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">無資料</div>`;
            return;
        }

        const fmtMoney = (v) => v ? `$ ${Number(v).toLocaleString()}` : '-';
        const fmtText = (v) => v || '-';
        const priceBadgeClass = (value, type) => value ? `tag-price tag-price-${type}` : 'tag-price-empty';
        const fmtYearMonthTaiwan = (v) => {
            if (!v) return '-';
            const date = new Date(v);
            if (Number.isNaN(date.getTime())) return '-';
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Taipei',
                year: 'numeric',
                month: '2-digit'
            }).formatToParts(date);
            const year = parts.find(p => p.type === 'year')?.value;
            const month = parts.find(p => p.type === 'month')?.value;
            return year && month ? `${year}-${month}` : '-';
        };
        const thWithResizer = (text, width, className = '') => `
            <th class="${className}" style="width: ${width};">
                ${text}
                <div class="resizer"></div>
            </th>
        `;

        let html = `
            <div class="product-table-wrap">
                <table class="product-table">
                    <thead>
                        <tr>
                            ${thWithResizer('#', '4%')}
                            ${thWithResizer('分類', '10%')}
                            ${thWithResizer('商品名稱', '33%')}
                            ${thWithResizer('規格', '17%')}
                            ${thWithResizer('MTB價格', '8%', 'col-number')}
                            ${thWithResizer('SI價格', '8%', 'col-number')}
                            ${thWithResizer('MTU價格', '8%', 'col-number')}
                            ${thWithResizer('狀態', '6%')}
                            ${thWithResizer('更新', '6%')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach((item, index) => {
            const originalIndex = this.allProducts.indexOf(item);
            const displayCategory = fmtText(item.oppDisplayCategory);
            const updatedMonth = fmtYearMonthTaiwan(item.lastUpdateTime || item.createTime);
            const statusValue = this.normalizeProductStatus(item.status);
            const categoryValue = item.oppDisplayCategory || item.category || '';
            const oppSpecOptionValue = this.statusToOppSpecOption(statusValue);

            if (this.isEditMode) {
                html += `
                    <tr class="edit-row" data-index="${originalIndex}">
                        <td class="col-index">${index + 1}</td>
                        <input type="hidden" name="id" value="${item.id || ''}">
                        <input type="hidden" name="category" value="${categoryValue}">
                        <input type="hidden" name="oppSpecOption" value="${oppSpecOptionValue}">
                        <input type="hidden" name="oppDisplayOrder" value="${item.oppDisplayOrder || ''}">
                        <td><input type="text" name="oppDisplayCategory" class="form-control inline-edit-input" value="${item.oppDisplayCategory || ''}" placeholder="-"></td>
                        <td><input type="text" name="name" class="form-control inline-edit-input cell-wrap" value="${item.name || ''}" placeholder="名稱"></td>
                        <td><input type="text" name="spec" class="form-control inline-edit-input cell-wrap" value="${item.spec || ''}" placeholder="規格"></td>
                        <td class="col-number"><input type="number" name="priceMtb" class="form-control inline-edit-input" value="${item.priceMtb || ''}" placeholder="$"></td>
                        <td class="col-number"><input type="number" name="priceSi" class="form-control inline-edit-input" value="${item.priceSi || ''}" placeholder="$"></td>
                        <td class="col-number"><input type="number" name="priceMtu" class="form-control inline-edit-input" value="${item.priceMtu || ''}" placeholder="$"></td>
                        <td>
                            <input type="hidden" name="status" value="${statusValue}">
                            ${this.renderInlineStatusToggle(statusValue)}
                        </td>
                        <td title="${updatedMonth}">${updatedMonth}</td>
                    </tr>
                `;
            } else {
                html += `
                    <tr>
                        <td class="col-index">${index + 1}</td>
                        <td title="${displayCategory}">${this.renderCategoryBadge(displayCategory)}</td>
                        <td class="cell-wrap" title="${item.name || ''}">${fmtText(item.name)}</td>
                        <td class="cell-wrap" title="${item.spec || ''}">${fmtText(item.spec)}</td>
                        <td class="col-number"><span class="tag-pill ${priceBadgeClass(item.priceMtb, 'mtb')}">${fmtMoney(item.priceMtb)}</span></td>
                        <td class="col-number"><span class="tag-pill ${priceBadgeClass(item.priceSi, 'si')}">${fmtMoney(item.priceSi)}</span></td>
                        <td class="col-number"><span class="tag-pill ${priceBadgeClass(item.priceMtu, 'mtu')}">${fmtMoney(item.priceMtu)}</span></td>
                        <td>${this.renderStatusBadge(item)}</td>
                        <td title="${updatedMonth}">${updatedMonth}</td>
                    </tr>
                `;
            }
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    },

    normalizeProductStatus(value) {
        return String(value || '').trim() === '下架' ? '下架' : '上架';
    },

    statusToOppSpecOption(value) {
        return this.normalizeProductStatus(value) === '上架' ? 'TRUE' : 'FALSE';
    },

    getNextOppDisplayOrder() {
        const maxOrder = this.allProducts.reduce((max, product) => {
            const n = this.parseOppDisplayOrder(product.oppDisplayOrder);
            return n === null ? max : Math.max(max, n);
        }, 0);

        return String(maxOrder > 0 ? maxOrder + 1 : 1);
    },

    parseOppDisplayOrder(value) {
        if (value === undefined || value === null) return null;
        const text = String(value).trim();
        if (text === '') return null;
        const n = Number(text);
        return Number.isFinite(n) ? n : null;
    },

    renderInlineStatusToggle(value) {
        const status = this.normalizeProductStatus(value);
        const cls = status === '下架' ? 'tag-status-inactive' : 'tag-status-active';
        return `<button type="button" class="tag-pill inline-status-toggle ${cls}" data-status="${status}">${status}</button>`;
    },

    toggleInlineStatus(button) {
        const row = button.closest('.edit-row');
        if (!row) return;

        const input = row.querySelector('input[name="status"]');
        if (!input) return;
        const oppSpecInput = row.querySelector('input[name="oppSpecOption"]');

        const next = this.normalizeProductStatus(input.value) === '上架' ? '下架' : '上架';
        input.value = next;
        if (oppSpecInput) oppSpecInput.value = this.statusToOppSpecOption(next);
        button.dataset.status = next;
        button.textContent = next;
        button.classList.toggle('tag-status-active', next === '上架');
        button.classList.toggle('tag-status-inactive', next === '下架');
    },

    renderStatusBadge(item) {
        const rawStatus = String(item.status ?? item.productStatus ?? item.enabledStatus ?? '').trim();
        const text = rawStatus === '上架' || rawStatus === '下架' ? rawStatus : '-';
        const cls = text === '上架' ? 'tag-status-active' : text === '下架' ? 'tag-status-inactive' : 'tag-muted';
        return `<span class="tag-pill ${cls}">${text}</span>`;
    },

    renderCategoryBadge(value) {
        const text = String(value || '').trim() || '-';
        return `<span class="tag-pill category-badge ${this.getCategoryPaletteClass(text)}">${text}</span>`;
    },

    getCategoryPaletteClass(value) {
        const text = String(value || '').trim();
        if (!text || text === '-') return 'cat-palette-empty';

        let hash = 0;
        for (let i = 0; i < text.length; i += 1) {
            hash = ((hash * 31) + text.charCodeAt(i)) >>> 0;
        }
        return `cat-palette-${hash % 12}`;
    },

    enableColumnResizing() {
        const resizers = document.querySelectorAll('.resizer');
        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const th = resizer.parentElement;
                const startX = e.pageX;
                const startWidth = th.offsetWidth;
                resizer.classList.add('resizing');

                const onMouseMove = (e) => {
                    const currentX = e.pageX;
                    const newWidth = startWidth + (currentX - startX);
                    if (newWidth > 30) th.style.width = `${newWidth}px`;
                };
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    resizer.classList.remove('resizing');
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    },

    openDetailModal(id) {
        if (!this.detailModal) return;
        const product = this.allProducts.find(p => p.id === id);
        if (!product) return;

        const existingCategories = Array.from(new Set(this.allProducts.map(p => p.category).filter(Boolean)));
        const allCats = Array.from(new Set([...this.categoryOrder, ...existingCategories]));

        this.detailModal.open(product, allCats, async (updatedData) => {
            await this.handleSingleProductSave(updatedData);
        });
    },

    async handleSingleProductSave(updatedData) {
        try {
            const res = await authedFetch('/api/products/batch', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({products: [updatedData]})
            });

            if(res.success) {
                const idx = this.allProducts.findIndex(p => p.id === updatedData.id);
                if (idx !== -1) {
                    this.allProducts[idx] = { ...this.allProducts[idx], ...updatedData };
                }
                this.renderTable(); 
            } else {
                throw new Error(res.error || 'API Error');
            }
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    toggleCost(id) {
        const key = `${id}_cost`;
        if (this.revealedCostIds.has(key)) this.revealedCostIds.delete(key);
        else this.revealedCostIds.add(key);
        this.renderTable();
    },

    // ★★★ 修復：加入空值檢查 (Null Safety) ★★★
    setEditMode(active, skipLoad = false) {
        this.isEditMode = active;
        
        const btnEdit = document.getElementById('btn-toggle-edit');
        const btnSave = document.getElementById('btn-save-batch');
        const btnAdd = document.getElementById('btn-add-row');

        if (this.isEditMode) {
            // 只有當元素存在時才操作
            if (btnEdit) {
                btnEdit.textContent = '× 取消';
                btnEdit.classList.add('danger');
            }
            if (btnSave) btnSave.style.display = 'inline-block';
            if (btnAdd) btnAdd.style.display = 'inline-block';
            this.renderTable(); 
        } else {
            if (btnEdit) {
                btnEdit.textContent = '✎ 編輯';
                btnEdit.classList.remove('danger');
            }
            if (btnSave) btnSave.style.display = 'none';
            if (btnAdd) btnAdd.style.display = 'none';
            
            if (skipLoad) {
                this.renderTable();
            } else {
                this.loadData();
            }
        }
    },

    addNewRow() {
        const autoId = 'P' + Date.now().toString().slice(-5);
        const nextOppDisplayOrder = this.getNextOppDisplayOrder();
        this.allProducts.unshift({
            id: autoId,
            name: '',
            spec: '',
            category: '未分類',
            priceMtb: '',
            priceSi: '',
            priceMtu: '',
            oppDisplayCategory: '',
            oppSpecOption: 'TRUE',
            oppDisplayOrder: nextOppDisplayOrder,
            status: '上架',
            _isNew: true
        });
        this.renderTable();
    },

    // ★★★ 優化：髒檢查 (Dirty Checking) ★★★
    async saveAll() {
        const rows = document.querySelectorAll('.edit-row');
        const payload = [];

        rows.forEach(row => {
            const idx = row.dataset.index;
            const original = this.allProducts[idx] || {};
            const inputs = row.querySelectorAll('input');
            const obj = {};
            let hasChange = false;

            inputs.forEach(i => {
                const key = i.name;
                const val = i.value.trim();
                obj[key] = val;

                // 比對資料是否變更 (弱型別比對，因 input value 永遠是 string)
                // 處理 null/undefined 轉為空字串的情況
                const originalVal = original[key] === undefined || original[key] === null ? '' : String(original[key]);
                if (originalVal !== val) {
                    hasChange = true;
                }
            });

            // 若為新資料 (_isNew) 或 有變更 (hasChange)，才加入 payload
            if (original._isNew || hasChange) {
                if (!obj.id && original.id) obj.id = original.id;
                // 合併原始資料與變更，確保沒變的欄位也存在 (視後端需求，通常傳送完整物件較安全)
                payload.push({ ...original, ...obj });
            }
        });
        
        // 如果完全沒有變更，直接切換回檢視模式，不打 API
        if(!payload.length) {
            alert('未偵測到任何變更。');
            this.setEditMode(false, true);
            return;
        }

        if(!confirm(`偵測到 ${payload.length} 筆資料變更，確定儲存?`)) return;

        const overlay = document.getElementById('global-loading-overlay');
        if(overlay) overlay.classList.add('active');

        try {
            const res = await authedFetch('/api/products/batch', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({products: payload})
            });

            if(res.success) {
                // 儲存成功後，重新讀取資料以確保同步
                const refreshRes = await authedFetch('/api/products');
                if(refreshRes.success) {
                    this.allProducts = refreshRes.data || [];
                }
                this.setEditMode(false, true);
            } else {
                throw new Error(res.error);
            }
        } catch(e) {
            alert('儲存失敗: ' + e.message);
        } finally {
            if(overlay) overlay.classList.remove('active');
        }
    },

    async forceRefresh() {
        const btn = document.getElementById('btn-refresh-products');
        // 加入 null check
        if(btn) btn.textContent = '...';
        
        await authedFetch('/api/products/refresh', { method: 'POST' });
        await this.loadData();
        
        if(btn) btn.textContent = '⟳';
    }
};

if (window.CRM_APP) window.CRM_APP.pageModules['products'] = () => ProductManager.init();
