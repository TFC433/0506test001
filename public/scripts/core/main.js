// public/scripts/core/main.js
// 職責：System initialization entry + parallelized resource loading
// @version [Phase B] Stale Invalidation Mechanism Patch + Session Avatar
// @date 2026-04-28
// @changelog
// - Modified logout() to clear 'crmSessionAvatar' from sessionStorage
// - Added initSessionUserAvatar() for dynamic session-stable avatar injection
// - Parallelized loadResources fetches using Promise.all
// - Removal of unintended injected code
// - [Patch Phase B] Added CRM_APP.markStale utility for router cache invalidation

window.CRM_APP = window.CRM_APP || {};

// --- Main App Logic ---

CRM_APP.init = async function() {
    console.log('🚀 [Main] TFC CRM系統啟動中...');
    try {
        await this.loadResources();
        await this.loadConfig();
        LayoutManager.init();

        Router.init();

        if (window.kanbanBoardManager?.initialize) {
            window.kanbanBoardManager.initialize();
        }

        await this.handleInitialRoute();
        console.log('✅ [Main] 系統載入完成！');
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            console.error('❌ [Main] 初始化失敗:', err);
            showNotification(`初始化失敗: ${err.message}`, 'error', 10000);
        }
    }
};

CRM_APP.loadConfig = async function() {
    try {
        const data = await authedFetch('/api/config');
        if (data) {
            this.systemConfig = data;
            this.updateAllDropdowns();
        }
    } catch (err) {
        console.error('[Main] 載入 Config 失敗:', err);
    }
};

CRM_APP.handleInitialRoute = async function() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const [pageName, paramsString] = hash.split('?');
        if (this.pageConfig && this.pageConfig[pageName]) {
            let params = {};
            if (paramsString) params = Object.fromEntries(new URLSearchParams(paramsString));
            await this.navigateTo(pageName, params, false);
            return;
        }
    }
    await this.navigateTo('dashboard', {}, false);
    window.history.replaceState(null, '', '#dashboard');
};

CRM_APP.loadResources = async function() {
    // 定義要載入的組件列表
    const components = [
        'contact-modals', 'opportunity-modals', 'meeting-modals', 
        'system-modals', 'event-log-modal', 'link-contact-modal', 
        'link-opportunity-modal', 'announcement-modals'
    ];
    
    const container = document.getElementById('modal-container');
    if (container) {
        const htmlResults = await Promise.all(components.map(async (c) => {
            try {
                const res = await fetch(`/components/modals/${c}.html`);
                if (res.ok) {
                    return await res.text();
                } else {
                    console.warn(`[Main] ⚠ 載入模組失敗: ${c} (Status: ${res.status})`);
                    return '';
                }
            } catch (error) {
                console.error(`[Main] ❌ 載入模組發生錯誤: ${c}`, error);
                return '';
            }
        }));
        container.innerHTML = htmlResults.join('');
    }

    const types = ['general', 'iot', 'dt', 'dx'];
    
    this.formTemplates = this.formTemplates || {};
    
    await Promise.all(types.map(async (t) => {
        try {
            const file = `/components/forms/event-form-${t === 'dx' ? 'general' : t}.html`;
            const res = await fetch(file);
            if (res.ok) {
                const html = await res.text();
                // 儲存到全域變數中
                this.formTemplates[t] = html;
            } else {
                 console.warn(`[Main] ⚠ 載入表單失敗: ${t}`);
            }
        } catch (error) {
            console.error(`[Main] ❌ 載入表單發生錯誤: ${t}`, error);
        }
    }));
};

/**
 * [Patch Phase B] 標記特定 SPA 頁面為 Stale (髒資料)，強制 Router 在下次進入時重新載入
 * @param {string|string[]} pageNames - 要標記的頁面 ID
 */
CRM_APP.markStale = function(pageNames) {
    if (!this.pageConfig) return;
    if (!Array.isArray(pageNames)) pageNames = [pageNames];
    
    pageNames.forEach(page => {
        if (this.pageConfig[page]) {
            this.pageConfig[page].stale = true;
            console.log(`🔄 [Cache] 標記 SPA 頁面需更新 (Stale): ${page}`);
        }
    });
};

// Global Helpers
function getCurrentUser() {
    return window.CRM_APP?.currentUser || localStorage.getItem('crmCurrentUserName') || '系統';
}

function logout() {
    localStorage.removeItem('crm-token');
    localStorage.removeItem('crmToken');
    localStorage.removeItem('crmCurrentUserName');
    localStorage.removeItem('crmUserRole');
    
    try {
        sessionStorage.removeItem('crmSessionAvatar');
    } catch (e) {
        console.warn('[Avatar] Failed to clear session avatar on logout', e);
    }
    
    window.location.href = '/';
}

function initSessionUserAvatar() {
    const avatarEl = document.getElementById('user-avatar');
    if (!avatarEl) return;

    const images = [
        '/assets/avatars/avatar-1.png',
        '/assets/avatars/avatar-2.png',
        '/assets/avatars/avatar-3.png',
        '/assets/avatars/avatar-4.png',
        '/assets/avatars/avatar-5.png',
        '/assets/avatars/avatar-6.png',
        '/assets/avatars/avatar-7.png',
        '/assets/avatars/avatar-8.png',
        '/assets/avatars/avatar-9.png',
        '/assets/avatars/avatar-10.png',
        '/assets/avatars/avatar-11.png',
        '/assets/avatars/avatar-12.png',
        '/assets/avatars/avatar-13.png',
        '/assets/avatars/avatar-14.png',
        '/assets/avatars/avatar-15.png',
        '/assets/avatars/avatar-16.png',
        '/assets/avatars/avatar-17.png',
        '/assets/avatars/avatar-18.png',
        '/assets/avatars/avatar-19.png',
        '/assets/avatars/avatar-20.png',
        '/assets/avatars/avatar-21.png',
        '/assets/avatars/avatar-22.png',
        '/assets/avatars/avatar-23.png',
    ];
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

    let sessionData;
    try {
        const stored = sessionStorage.getItem('crmSessionAvatar');
        if (stored) {
            sessionData = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[Avatar] Failed to parse session avatar data', e);
    }

    if (!sessionData || !sessionData.image || !sessionData.color) {
        sessionData = {
            image: images[Math.floor(Math.random() * images.length)],
            color: colors[Math.floor(Math.random() * colors.length)]
        };
        try {
            sessionStorage.setItem('crmSessionAvatar', JSON.stringify(sessionData));
        } catch (e) {
            console.warn('[Avatar] Failed to set session avatar data', e);
        }
    }

    avatarEl.style.backgroundColor = sessionData.color;
    avatarEl.style.backgroundImage = `url("${sessionData.image}")`;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.CRM_APP_INITIALIZED) {
        window.CRM_APP_INITIALIZED = true;
        if (typeof loadWeeklyBusinessPage === 'function') window.CRM_APP.pageModules['weekly-business'] = loadWeeklyBusinessPage;
        if (typeof navigateToWeeklyDetail === 'function') window.CRM_APP.pageModules['weekly-detail'] = navigateToWeeklyDetail;
        if (typeof loadSalesAnalysisPage === 'function') window.CRM_APP.pageModules['sales-analysis'] = loadSalesAnalysisPage;
        
        // 註冊內部運營頁面模組
        if (typeof loadInternalOpsPage === 'function') window.CRM_APP.pageModules['internal-ops'] = loadInternalOpsPage;

        initSessionUserAvatar();
        
        CRM_APP.init();
    }
});