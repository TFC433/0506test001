// public/scripts/core/layout-manager.js
// 職責：管理側邊欄 (Sidebar)、使用者資訊顯示、以及「角色定義」的單一真理來源
// @version 1.1.6
// @date 2026-04-28
// @changelog
// - (v1.1.6) Sidebar Final Polish: fixed internal order, enhanced active state, adjusted vertical spacing, and improved alignment.
// - (v1.1.5) Sidebar Final Fix: corrected admin insertion anchor and cleaned nav-header class usage.
// - (v1.1.4) Sidebar Phase B-2: added collapsible Main group, adjusted default expansion states, reordered internal items, and removed admin separator line.
// - (v1.1.3) Sidebar Phase B-1: fixed group state semantics, cleaned collapsible header pointer behavior, and normalized admin active styling.
// - (v1.1.2) Sidebar Phase B: implemented collapsible grouped navigation
// - (v1.1.1) Updated displayUser() to populate #user-display-account with username or role fallback.

window.CRM_APP = window.CRM_APP || {};

const LayoutManager = {
    isPinned: true,
    currentUserRole: 'sales', // 預設
    groupState: { main: true, analytics: true, internal: false }, // 預設狀態

    // 1. 定義預設的角色設定 (預設為中文，確保斷線時也顯示正常)
    defaultRoleDefs: {
        'admin': { title: '管理員', permission: 'System Admin', color: '#fee2e2', textColor: '#991b1b' },
        'sales': { title: '業務', permission: 'General User', color: '#dbeafe', textColor: '#1e40af' }
    },

    init() {
        console.log('🏗️ [Layout] 初始化 UI 佈局...');
        this.loadUserRole();
        
        // 嘗試建立角色定義 (如果 Config 已經在記憶體中)
        this.buildRoleDefinitions();
        
        this.setupSidebarGroups(); // Phase B: 初始化側邊欄群組收合邏輯
        this.setupSidebar();
        this.displayUser();
        this.injectAdminFeatures();
    },

    setupSidebarGroups() {
        const stored = localStorage.getItem('sidebar-group-state');
        if (stored) {
            try {
                this.groupState = JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to parse sidebar-group-state', e);
            }
        }

        document.querySelectorAll('.nav-collapsible').forEach(header => {
            header.addEventListener('click', () => {
                const group = header.getAttribute('data-group');
                if (group) {
                    this.groupState[group] = !this.groupState[group];
                    localStorage.setItem('sidebar-group-state', JSON.stringify(this.groupState));
                    this.applySidebarGroupState();
                }
            });
        });

        this.applySidebarGroupState();
    },

    applySidebarGroupState() {
        Object.entries(this.groupState).forEach(([group, isExpanded]) => {
            const header = document.querySelector(`.nav-collapsible[data-group="${group}"]`);
            if (header) {
                if (isExpanded) header.classList.remove('collapsed');
                else header.classList.add('collapsed');
            }

            const items = document.querySelectorAll(`.nav-item[data-group="${group}"]:not(.nav-collapsible)`);
            items.forEach(item => {
                if (isExpanded) item.classList.remove('group-hidden');
                else item.classList.add('group-hidden');
            });
        });
    },

    /**
     * ★★★ 核心方法：建立角色定義表 ★★★
     * 從系統設定 (Google Sheet) 讀取 UserRole，若無則使用預設值
     */
    buildRoleDefinitions() {
        const config = window.CRM_APP.systemConfig || {};
        const sheetRoles = config['UserRole']; // 對應 Sheet 的「設定類型」= UserRole

        // 準備一個容器
        const finalDefs = { ...this.defaultRoleDefs };

        if (Array.isArray(sheetRoles) && sheetRoles.length > 0) {
            sheetRoles.forEach(item => {
                // item.value = 'admin' (設定項目)
                // item.note = '管理員' (備註/顯示名稱)
                // item.color = '#fee2e2' (樣式規格/背景色)
                
                if (item.value) {
                    finalDefs[item.value] = {
                        title: item.note || item.value,
                        // 我們保留 permission 屬性在資料結構中，以備不時之需，但介面上不會顯示
                        permission: item.value3 || '一般權限',
                        color: item.color || '#f3f4f6',
                        textColor: item.color ? this.darkenColor(item.color, 60) : '#1f2937' 
                    };
                }
            });
        }

        // 將「真理」發布到全域變數
        window.CRM_APP.ROLE_DEFINITIONS = finalDefs;
        return finalDefs;
    },

    /**
     * 輔助：簡單的顏色變深 (為了文字可讀性)
     */
    darkenColor(hex, percent) {
        if (hex.includes('fee2e2')) return '#991b1b'; // 紅底配深紅
        if (hex.includes('dbeafe')) return '#1e40af'; // 藍底配深藍
        return '#374151'; // 預設深灰
    },

    loadUserRole() {
        this.currentUserRole = localStorage.getItem('crmUserRole') || 'sales';
        window.CRM_APP.currentUserRole = this.currentUserRole;
    },

    setupSidebar() {
        const pinBtn = document.getElementById('sidebar-pin-toggle');
        if (!pinBtn) return;

        const stored = localStorage.getItem('crm-sidebar-pinned');
        this.isPinned = stored === null ? true : (stored === 'true');

        pinBtn.addEventListener('click', () => {
            this.isPinned = !this.isPinned;
            localStorage.setItem('crm-sidebar-pinned', this.isPinned);
            this.updateSidebarUI();
        });

        this.updateSidebarUI();
    },

    updateSidebarUI() {
        const layout = document.querySelector('.app-layout');
        const pinBtn = document.getElementById('sidebar-pin-toggle');
        if (!layout || !pinBtn) return;

        const iconContainer = pinBtn.querySelector('.nav-icon');
        const textLabel = pinBtn.querySelector('.nav-text');

        if (this.isPinned) {
            layout.classList.remove('sidebar-collapsed');
            if (textLabel) textLabel.textContent = '收合側邊欄';
            if (iconContainer) iconContainer.innerHTML = this.getIcon('left');
        } else {
            layout.classList.add('sidebar-collapsed');
            if (textLabel) textLabel.textContent = '展開側邊欄';
            if (iconContainer) iconContainer.innerHTML = this.getIcon('right');
        }
    },

    getIcon(dir) {
        const pts = dir === 'left' ? "15 18 9 12 15 6" : "9 18 15 12 9 6";
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="${pts}"></polyline></svg>`;
    },

    displayUser() {
        // 確保定義是最新的
        this.buildRoleDefinitions(); 

        const el = document.getElementById('user-display-name');
        const accountEl = document.getElementById('user-display-account');
        const name = localStorage.getItem('crmCurrentUserName') || '使用者';
        
        const username = 
            localStorage.getItem('crmUsername') || 
            localStorage.getItem('crmUserRole') || 
            '帳號資訊';
        
        // 這裡依照您的需求：只顯示名字，不顯示任何職稱
        if (el) el.textContent = `${name}`; 
        if (accountEl) accountEl.textContent = username;
        
        window.CRM_APP.currentUser = name;
    },

    injectAdminFeatures() {
        if (this.currentUserRole !== 'admin') return;

        const sidebarNav = document.querySelector('.sidebar-nav ul') || document.querySelector('.sidebar-menu');
        if (!sidebarNav) return;
        if (document.getElementById('nav-cost-analysis')) return;

        const adminItem = document.createElement('li');
        adminItem.id = 'nav-cost-analysis';
        
        // ★★★ 套用 Admin 專屬樣式 Class ★★★
        adminItem.className = 'nav-item admin-restricted';
        adminItem.setAttribute('data-group', 'internal'); // 確保加入內部工具群組
        
        // ★★★ 修正：指向 'products' 頁面，且 SVG 結構正確 ★★★
        adminItem.innerHTML = `
            <a href="#" class="nav-link" onclick="event.preventDefault(); CRM_APP.navigateTo('products');">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span class="nav-text">商品成本</span>
            </a>
        `;

        const internalOpsLink = document.querySelector('.sidebar-nav .nav-link[data-page="internal-ops"]');

        if (internalOpsLink && internalOpsLink.closest('.nav-item')) {
            const internalOpsItem = internalOpsLink.closest('.nav-item');
            internalOpsItem.insertAdjacentElement('afterend', adminItem);
        } else {
            // fallback (keep existing safe behavior)
            const sidebarNav = document.querySelector('.sidebar-nav ul') || document.querySelector('.sidebar-menu');
            sidebarNav.appendChild(adminItem);
        }
        
        // 套用群組狀態以處理動態注入的選項
        this.applySidebarGroupState();
    },

    refreshRoleDisplay() {
        this.buildRoleDefinitions();
        this.displayUser();
    },

    updateDropdowns() {
        const config = window.CRM_APP.systemConfig;
        const mappings = window.CRM_APP.dropdownMappings;
        if (!config || !mappings) return;

        Object.entries(mappings).forEach(([id, key]) => {
            const select = document.getElementById(id);
            if (select && Array.isArray(config[key])) {
                const currentVal = select.value;
                const firstOption = select.querySelector('option:first-child')?.outerHTML || '<option value="">請選擇...</option>';
                select.innerHTML = firstOption;
                config[key]
                    .sort((a, b) => (a.order || 99) - (b.order || 99))
                    .forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.value;
                        opt.textContent = item.note || item.value;
                        select.appendChild(opt);
                    });
                if (currentVal) select.value = currentVal;
            }
        });
    }
};

window.CRM_APP.updateAllDropdowns = LayoutManager.updateDropdowns.bind(LayoutManager);
window.CRM_APP.refreshRoleDisplay = LayoutManager.refreshRoleDisplay.bind(LayoutManager);