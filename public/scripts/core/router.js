/**
 * File: public/scripts/core/router.js
 * @version 1.0.5 (Phase B Patch)
 * @date 2026-04-23
 * @purpose Restore SPA cache flag for non-detail pages & introduce Stale Invalidation
 * @changelog
 * - Restored SPA cache behavior for non-detail pages to prevent redundant API fetches.
 * - [Patch Phase B] Integrated config.stale flag into needsLoad logic to force reload dirtied pages.
 */

// public/scripts/core/router.js
// 職責：處理 URL Hash 變更、頁面導航 (Navigation) 與 SPA 歷史紀錄

window.CRM_APP = window.CRM_APP || {};

const Router = {
    /**
     * 初始化導航監聽
     */
    init() {
        console.log('🌐 [Router] 初始化導航監聽...');
        
        // 監聽瀏覽器前進/後退 (Hash變更)
        window.addEventListener('hashchange', () => this.handleHashChange());

        // 監聽點擊事件 (data-page 屬性)
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-page]');
            if (target) {
                e.preventDefault();
                const pageName = target.dataset.page;
                let params = {};
                if (target.dataset.params) {
                    try {
                        params = JSON.parse(target.dataset.params);
                    } catch (err) {
                        console.error(`[Router] 解析參數失敗:`, target.dataset.params, err);
                    }
                }
                this.navigateTo(pageName, params);
                
                // 行動裝置自動收合選單
                if (document.body.classList.contains('sidebar-is-open')) {
                    this.toggleMobileNav(false);
                }
            }
        });

        // 初始化行動裝置切換鈕
        const mobileToggle = document.querySelector('.mobile-nav-toggle');
        const mobileBackdrop = document.querySelector('.mobile-nav-backdrop');
        if (mobileToggle) mobileToggle.addEventListener('click', () => this.toggleMobileNav());
        if (mobileBackdrop) mobileBackdrop.addEventListener('click', () => this.toggleMobileNav(false));
    },

    /**
     * 處理 Hash 變更邏輯
     */
    handleHashChange() {
        const hash = window.location.hash.substring(1);
        const [pageName, paramsString] = hash.split('?');
        let params = {};

        if (paramsString) {
            try {
                params = Object.fromEntries(new URLSearchParams(paramsString));
                Object.keys(params).forEach(key => params[key] = decodeURIComponent(params[key] ?? ''));
            } catch (e) { console.warn(`[Router] 解析 Hash 參數失敗:`, e); }
        }

        const currentPageId = document.querySelector('.page-view[style*="display: block"]')?.id.replace('page-', '');
        const targetConfig = window.CRM_APP.pageConfig[pageName];

        if (targetConfig && pageName !== currentPageId) {
            this.navigateTo(pageName, params, false);
        } else if (!hash && currentPageId !== 'dashboard') {
            this.navigateTo('dashboard', {}, false);
        } else if (targetConfig && pageName === currentPageId) {
            // 參數變更檢查
            const currentParams = new URLSearchParams(window.location.hash.split('?')[1] || '').toString();
            const newParams = new URLSearchParams(paramsString || '').toString();
            if (currentParams !== newParams) {
                this.navigateTo(pageName, params, false);
            }
        }
    },

    /**
     * 核心導航函式
     */
    async navigateTo(pageName, params = {}, updateHistory = true) {
        const config = window.CRM_APP.pageConfig[pageName];
        if (!config) {
            console.error(`[Router] 未知頁面: ${pageName}`);
            if (pageName !== 'dashboard') await this.navigateTo('dashboard', {}, updateHistory);
            return;
        }

        console.log(`[Router] 前往: ${pageName}`, params);

        // 1. 更新 URL 歷史紀錄
        if (updateHistory) {
            let newHash = `#${pageName}`;
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v != null) searchParams.set(k, String(v)); });
            if (searchParams.toString()) newHash += `?${searchParams.toString()}`;
            
            if (window.location.hash !== newHash) {
                window.history.pushState({ page: pageName, params }, '', newHash);
            }
        }

        // 2. 更新標題與側邊欄 Active 狀態
        const isDetailPage = pageName.includes('-details') || pageName === 'weekly-detail';
        if (!isDetailPage) {
            const titleEl = document.getElementById('page-title');
            const subtitleEl = document.getElementById('page-subtitle');
            if (titleEl) titleEl.textContent = config.title;
            if (subtitleEl) subtitleEl.textContent = config.subtitle;

            document.querySelectorAll('.nav-list .nav-item').forEach(i => i.classList.remove('active'));
            const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
            activeLink?.closest('.nav-item')?.classList.add('active');
        } else {
            // 詳細頁面時，將 Active 狀態設為對應的列表頁
            let listPage = 'dashboard';
            if (pageName === 'opportunity-details') listPage = 'opportunities';
            if (pageName === 'company-details') listPage = 'companies';
            if (pageName === 'weekly-detail') listPage = 'weekly-business';
            document.querySelectorAll('.nav-list .nav-item').forEach(i => i.classList.remove('active'));
            document.querySelector(`.nav-link[data-page="${listPage}"]`)?.closest('.nav-item')?.classList.add('active');
        }

        // 3. 切換顯示的 DOM 元素
        const targetView = document.getElementById(`page-${pageName}`) || (pageName === 'weekly-detail' ? document.getElementById('page-weekly-business') : null);
        document.querySelectorAll('.page-view').forEach(v => v.style.display = 'none');
        
        if (targetView) {
            targetView.style.display = 'block';
        } else {
            return this.navigateTo('dashboard', {}, false);
        }

        // 4. 執行模組載入邏輯
        if (pageName === 'dashboard') {
            // [Hotfix] 遵循 SPA 載入旗標，避免路由切換時重複發送 /api/dashboard 請求
            // [Patch Phase B] Support config.stale to force reload dirty dashboard
            if ((!config.loaded || config.stale) && window.dashboardManager?.refresh) {
                await window.dashboardManager.refresh();
                config.loaded = true;
                config.stale = false;
            }
        } else {
            const loadFn = window.CRM_APP.pageModules[pageName];

            // [Hotfix-1] event-editor：豁免一次性載入鎖定，允許每次進入都跑 loadFn
            // [Patch Phase B] Support config.stale to force reload dirty list pages
            const needsLoad = loadFn && (isDetailPage || pageName === 'event-editor' || !config.loaded || config.stale);

            if (needsLoad) {
                try {
                    if (isDetailPage) {
                        // 自動推斷參數 Key
                        let paramValue = params.weekId || params.opportunityId || params.companyName || Object.values(params)[0];
                        if (!paramValue) throw new Error(`缺少頁面所需參數: ${pageName}`);
                        await loadFn(paramValue);
                    } else {
                        // [Hotfix-2] event-editor：把 params 傳進去；其他頁維持原行為 (不傳參)
                        if (pageName === 'event-editor') {
                            await loadFn(params);
                        } else {
                            await loadFn();
                        }
                    }

                    // Restore SPA cache flag for non-detail pages to prevent redundant API fetches
                    if (!isDetailPage && pageName !== 'event-editor') {
                        config.loaded = true;
                        config.stale = false; // [Patch Phase B] Clear stale flag after loading
                    }

                } catch (err) {
                    console.error(`[Router] 載入頁面失敗:`, err);
                    targetView.innerHTML = `<div class="alert alert-error">載入失敗: ${err.message}</div>`;
                }
            } else if (loadFn) {
                // 執行樣式修復 (針對 SPA 樣式覆蓋問題)
                const compName = pageName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Components';
                if (window[compName]?.injectStyles) window[compName].injectStyles();
            }
        }
    },

    toggleMobileNav(forceOpen) {
        const body = document.body;
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.mobile-nav-backdrop');
        const isOpen = body.classList.contains('sidebar-is-open');
        const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

        if (shouldOpen) {
            sidebar?.classList.add('is-open');
            backdrop?.classList.add('is-open');
            body.classList.add('sidebar-is-open');
        } else {
            sidebar?.classList.remove('is-open');
            backdrop?.classList.remove('is-open');
            body.classList.remove('sidebar-is-open');
        }
    }
};

window.CRM_APP.navigateTo = Router.navigateTo.bind(Router); // 導出供全域使用