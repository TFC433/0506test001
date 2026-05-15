// views/scripts/contacts.js
/**
 * ============================================================================
 * File: public/scripts/contacts/contacts.js
 * Version: v8.9.13 (CORE Contact Split Workspace Refinement)
 * Date: 2026-05-13
 * Author: Gemini
 *
 * Change Log:
 * - [UX Polish] Refined CORE Formal Contacts split workspace density, table hierarchy, and relationship rail separation.
 * - [Bugfix] Confirmed CORE table last-update display uses SQL `updatedTime` before legacy `lastUpdateTime`/`createdTime`; paired with import-bundle cache bust.
 * - [UX Polish] Refined CORE contact context rail hierarchy with relationship-first opportunity section.
 * - [Bugfix] Made CORE contact rail row opening use explicit delegated data-action handling.
 * - [Feature] Added read-only CORE contact context rail with lazy related opportunity lookup.
 * - [UX Polish] Restored business card preview from RAW intake feed thumbnails without reintroducing the text button.
 * - [UX Polish] Added RAW feed display limit controls and clearer ghost-outline card actions.
 * - [UX Polish] Restored RAW upgrade action in intake feed and hid legacy RAW list tab entry.
 * - [UX Polish] Improved RAW intake feed status backgrounds and badge contrast across light/dark themes.
 * - [UX Polish] Removed redundant RAW overview card preview button and added lightweight intake-state rendering.
 * - [UX Polish] Tuned RAW overview feed to three-column desktop layout with compact RAW row index labels.
 * - [UX Polish] Replaced RAW overview body with compact dual-column CRM intake feed.
 * - [UX Polish] Refactored CORE tab top info bar into a clean two-line layout.
 * - [UX Polish] Removed redundant sorting text description from the info bar.
 * - [Feature] Refactored CORE page size selector into pill-style buttons in the top info bar.
 * - [Feature] Added `currentCorePageSize` state and UI control for dynamic CORE pagination sizing (50/100/500/1000).
 * - [Bugfix] Fixed CORE row numbering to use continuous global index based on `currentCorePageSize` instead of hardcoded 100.
 * - [Feature] Added `currentCoreSortOrder` state and UI toggle for ASC/DESC global sorting of CORE contacts.
 * - [Feature] BUGFIX: Removed redundant post-pagination sort from CORE tab rendering, as global sorting is now handled correctly by the backend before slicing.
 * - [Feature] Added explicit page state tracking (`currentCorePage`) and UI controls for CORE contacts.
 * - [Feature] Supported search-triggered page resets and post-delete empty-page auto-correction for CORE list.
 * - [Performance] Removed fetchAllCoreContacts bypass loop.
 * - [Refactor] Migrated CORE tab to use strict page-by-page API fetching instead of in-memory dataset mapping.
 * - [UX Polish] Aligned all internal comments to strictly match the UI tab order.
 * - [UX Polish] Maintained Operation Mode exclusively in Tab 2 (RAW table) and Tab 3 (CORE table).
 * - [Feature] Implemented real handleDeleteRawContact flow wired to expected backend sheet deletion route.
 * ============================================================================
 */

// ==================== 全域變數 ====================
let allContactsData = []; 
let coreContactsData = [];
let coreContactsTotal = 0; 
let currentCorePage = 1; // [Patch] CORE Page State
let corePaginationState = { hasNext: false, hasPrev: false, totalPages: 1 }; // [Patch] CORE Pagination Metadata
let currentContactsTab = 'list'; // 'list' | 'cards' | 'core'
let currentEditRowIndex = null;
let currentCoreEditContactId = null;
let contactsOperationMode = false;
let currentCoreSortOrder = 'desc'; // [Patch] Core sorting state
let currentCorePageSize = 100; // [Patch] Core dynamic pagination limit
let rawFeedDisplayLimit = 100;

// ==================== 主要功能函式 ====================

async function loadContacts(query = '') {
    const container = document.getElementById('page-contacts');
    if (!container) return;

    // Type Guard: Ensure query is a string (Router may pass a params object)
    const searchQuery = typeof query === 'string' ? query : '';
    if (currentContactsTab === 'cards') currentContactsTab = 'list';

    // Determine active tab state
    const isListActive = currentContactsTab === 'list';
    const isCardsActive = currentContactsTab === 'cards';
    const isCoreActive = currentContactsTab === 'core';

    // Base styles for RAW tabs
    const listBtnStyle = `background: ${isListActive ? 'white' : 'transparent'}; border: none; padding: 8px 16px; font-weight: ${isListActive ? '600' : '500'}; color: ${isListActive ? 'var(--accent-blue)' : 'var(--text-muted)'}; border-radius: 6px; box-shadow: ${isListActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; cursor: pointer; transition: all 0.2s;`;
    const cardsBtnStyle = `background: ${isCardsActive ? 'white' : 'transparent'}; border: none; padding: 8px 16px; font-weight: ${isCardsActive ? '600' : '500'}; color: ${isCardsActive ? 'var(--accent-blue)' : 'var(--text-muted)'}; border-radius: 6px; box-shadow: ${isCardsActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; cursor: pointer; transition: all 0.2s;`;
    
    // RED emphasis style for CORE tab
    const coreBtnStyle = `background: ${isCoreActive ? '#ef4444' : '#fef2f2'}; border: 1px solid ${isCoreActive ? '#dc2626' : '#fecaca'}; padding: 8px 16px; font-weight: ${isCoreActive ? '600' : '500'}; color: ${isCoreActive ? 'white' : '#ef4444'}; border-radius: 6px; box-shadow: ${isCoreActive ? '0 2px 4px rgba(239,68,68,0.3)' : 'none'}; cursor: pointer; transition: all 0.2s;`;

    // 1. 初始化容器與事件監聽 (加入頁籤 UI)
    container.innerHTML = `
        <div class="dashboard-widget">
            <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <div style="display: flex; align-items: baseline; gap: 15px;">
                    <h2 class="widget-title" style="margin: 0;">潛在客戶</h2>
                </div>
                <div class="contacts-tabs" style="display: flex; gap: 4px; background: var(--bg-hover, #f1f5f9); padding: 4px; border-radius: 8px;">
                    <button class="tab-btn ${isListActive ? 'active' : ''}" data-action="switch-tab" data-tab="list" style="${listBtnStyle}">名片總覽</button>
                    <button class="tab-btn ${isCoreActive ? 'active' : ''}" data-action="switch-tab" data-tab="core" style="${coreBtnStyle}">正式聯絡人</button>
                </div>
            </div>
            
            <div id="contacts-action-bar" style="padding: 1.5rem 1.5rem 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 15px;">
                    <div class="search-pagination" style="flex: 1;">
                        <input type="text" class="search-box" id="contacts-page-search" placeholder="搜尋姓名 / 公司" value="${searchQuery}" style="width: 100%; max-width: 400px;">
                    </div>
                    <div id="contacts-count-display" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;"></div>
                </div>
            </div>

            <div id="contacts-page-content" style="padding: 0 1.5rem 1.5rem;">
                <div class="loading show"><div class="spinner"></div><p>載入客戶資料中...</p></div>
            </div>
        </div>
    `;

    // 移除舊監聽器並綁定新的 (事件委派核心)
    container.removeEventListener('click', handleContactListClick);
    container.addEventListener('click', handleContactListClick);
    
    container.removeEventListener('change', handleContactListChange);
    container.addEventListener('change', handleContactListChange);

    // 綁定搜尋輸入
    const searchInputEl = document.getElementById('contacts-page-search');
    if (searchInputEl) {
        searchInputEl.addEventListener('keyup', searchContactsEvent);
    }

    try {
        if (allContactsData.length === 0) {
            console.log('[Contacts] 首次載入，正在獲取潛在客戶資料...');
            const listResult = await authedFetch(`/api/contacts?q=`);
            allContactsData = (listResult && listResult.data) ? listResult.data : [];
        }
        
        await filterAndRenderContacts(searchQuery);

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            const listContent = document.getElementById('contacts-page-content');
            if(listContent) listContent.innerHTML = `<div class="alert alert-error">載入資料失敗: ${error.message}</div>`;
        }
    }
}

// --- 事件處理中心 (Central Handler) ---

function toggleContactsOperationMode() {
    contactsOperationMode = !contactsOperationMode;
    const currentQuery = document.getElementById('contacts-page-search')?.value || '';
    filterAndRenderContacts(currentQuery);
}

function handleContactListChange(e) {
    if (e.target.dataset.action === 'change-core-limit') {
        currentCorePageSize = parseInt(e.target.value, 10) || 100;
        currentCorePage = 1;
        filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
    }
}

function handleContactListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn && currentContactsTab === 'core') {
        const row = e.target.closest('[data-core-contact-id]');
        if (row) {
            const contact = coreContactsData.find(c => c.contactId === row.dataset.coreContactId);
            if (contact) openCoreContactRail(contact);
        }
        return;
    }
    if (!btn) return;

    e.preventDefault();

    const action = btn.dataset.action;
    const payload = btn.dataset;

    switch (action) {
        case 'toggle-operations':
            toggleContactsOperationMode();
            break;

        case 'view-card':
            if (window.showBusinessCardPreview) {
                window.showBusinessCardPreview(payload.link);
            } else {
                console.warn('showBusinessCardPreview function not found');
            }
            break;
            
        case 'switch-tab':
            const tabName = payload.tab;
            if (currentContactsTab === tabName) return; 
            
            currentContactsTab = tabName;
            
            document.querySelectorAll('.contacts-tabs .tab-btn').forEach(t => {
                const isCoreBtn = t.dataset.tab === 'core';
                const isActive = t.dataset.tab === currentContactsTab;
                
                if (isCoreBtn) {
                    t.style.background = isActive ? '#ef4444' : '#fef2f2';
                    t.style.border = isActive ? '1px solid #dc2626' : '1px solid #fecaca';
                    t.style.color = isActive ? 'white' : '#ef4444';
                    t.style.boxShadow = isActive ? '0 2px 4px rgba(239,68,68,0.3)' : 'none';
                    t.style.fontWeight = isActive ? '600' : '500';
                } else {
                    t.style.background = isActive ? 'white' : 'transparent';
                    t.style.border = 'none';
                    t.style.color = isActive ? 'var(--accent-blue)' : 'var(--text-muted)';
                    t.style.boxShadow = isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
                    t.style.fontWeight = isActive ? '600' : '500';
                }
                
                if (isActive) t.classList.add('active');
                else t.classList.remove('active');
            });
            
            const currentQuery = document.getElementById('contacts-page-search')?.value || '';
            filterAndRenderContacts(currentQuery);
            break;

        // [Patch] CORE Pagination Controls
        case 'core-prev':
            if (currentCorePage > 1) {
                currentCorePage--;
                filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
            }
            break;
            
        case 'core-next':
            if (corePaginationState.hasNext) {
                currentCorePage++;
                filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
            }
            break;

        // [Patch] CORE Sort Toggle
        case 'toggle-core-sort':
            currentCoreSortOrder = currentCoreSortOrder === 'desc' ? 'asc' : 'desc';
            currentCorePage = 1; // Reset to page 1 on sort change
            filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
            break;

        // [Patch] CORE Page Size Pills Toggle
        case 'set-core-limit':
            const newSize = parseInt(payload.size, 10);
            if (!newSize || newSize === currentCorePageSize) return;

            currentCorePageSize = newSize;
            currentCorePage = 1;

            filterAndRenderContacts(
                document.getElementById('contacts-page-search')?.value || ''
            );
            break;

        case 'set-raw-feed-limit':
            rawFeedDisplayLimit = payload.limit === 'all' ? 'all' : parseInt(payload.limit, 10) || 100;
            filterAndRenderContacts(document.getElementById('contacts-page-search')?.value || '');
            break;

        case 'edit-card':
            try {
                const contactData = JSON.parse(payload.contact);
                renderEditCardMode(contactData);
            } catch (err) {
                console.error('無法解析聯絡人資料進行編輯', err);
            }
            break;

        case 'upgrade-card':
            try {
                const contactData = JSON.parse(payload.contact);
                if (typeof NewOppWizard !== 'undefined' && typeof NewOppWizard.startWithContact === 'function') {
                    NewOppWizard.startWithContact(contactData);
                } else {
                    console.error('NewOppWizard.startWithContact is not available');
                }
            } catch (err) {
                console.error('Failed to start RAW contact upgrade flow', err);
            }
            break;

        case 'delete-raw':
            handleDeleteRawContact(payload.index, payload.name);
            break;

        case 'cancel-edit':
            const rawQuery = document.getElementById('contacts-page-search')?.value || '';
            filterAndRenderContacts(rawQuery);
            break;
            
        case 'save-edit':
            handleSaveCardEdit();
            break;

        case 'edit-core':
            try {
                const coreData = JSON.parse(payload.contact);
                renderCoreEditMode(coreData);
            } catch (err) {
                console.error('無法解析正式聯絡人資料進行編輯', err);
            }
            break;

        case 'delete-core':
            handleDeleteCoreContact(payload.id, payload.name);
            break;

        case 'cancel-core-edit':
            const coreQuery = document.getElementById('contacts-page-search')?.value || '';
            filterAndRenderContacts(coreQuery);
            break;

        case 'save-core-edit':
            handleSaveCoreEdit();
            break;

        case 'open-core-contact-rail':
            try {
                const contact = JSON.parse(payload.contact);
                openCoreContactRail(contact);
            } catch (err) {
                console.error('Failed to open CORE contact rail', err);
            }
            break;

        case 'close-core-contact-rail':
            closeCoreContactRail();
            break;
    }
}

function searchContactsEvent(event) {
    const query = event.target.value;
    
    // [Patch] Reset page to 1 strictly on CORE search modifications
    if (currentContactsTab === 'core') {
        currentCorePage = 1;
    }
    
    handleSearch(() => filterAndRenderContacts(query));
}

async function filterAndRenderContacts(query = '') {
    const listContent = document.getElementById('contacts-page-content');
    const actionBar = document.getElementById('contacts-action-bar');
    const countDisplay = document.getElementById('contacts-count-display');
    if (!listContent) return;

    if (actionBar) actionBar.style.display = 'block';
    
    currentEditRowIndex = null; 
    currentCoreEditContactId = null;

    let filteredData = [];
    const safeQuery = typeof query === 'string' ? query : '';
    const searchTerm = safeQuery.toLowerCase();

    if (currentContactsTab === 'core') {
        // [API-Driven] Show loading during live fetch
        listContent.innerHTML = `<div class="loading show"><div class="spinner"></div><p>載入正式聯絡人資料中...</p></div>`;
        
        try {
            // [Patch] Execute search strictly via API bound to current page state, limit, and sort order
            const res = await authedFetch(`/api/contacts/list?page=${currentCorePage}&limit=${currentCorePageSize}&q=${encodeURIComponent(safeQuery)}&order=${currentCoreSortOrder}`);
            coreContactsData = (res && res.data) ? res.data : [];
            
            // Extract pagination metadata
            if (res && res.pagination) {
                coreContactsTotal = res.pagination.totalItems !== undefined ? res.pagination.totalItems : coreContactsData.length;
                corePaginationState.hasNext = !!res.pagination.hasNext;
                corePaginationState.hasPrev = !!res.pagination.hasPrev;
                corePaginationState.totalPages = res.pagination.total || Math.ceil(coreContactsTotal / currentCorePageSize) || 1;
                
                // [Patch] Delete boundary auto-correction: if current page vanishes, step back
                if (coreContactsData.length === 0 && currentCorePage > 1) {
                    currentCorePage--;
                    return filterAndRenderContacts(query);
                }
            } else {
                coreContactsTotal = coreContactsData.length;
                corePaginationState.hasNext = false;
                corePaginationState.hasPrev = false;
                corePaginationState.totalPages = 1;
            }
        } catch (e) {
            console.error('Failed to fetch CORE contacts:', e);
            coreContactsData = [];
            coreContactsTotal = 0;
            corePaginationState = { hasNext: false, hasPrev: false, totalPages: 1 };
        }

        filteredData = [...coreContactsData];
        // [Bugfix] Local sort removed: Global sorting is now properly enforced at the service layer before slicing.

    } else {
        // [In-Memory] RAW Data slice
        filteredData = [...allContactsData];
        if (searchTerm) {
            filteredData = filteredData.filter(c =>
                (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                (c.company && c.company.toLowerCase().includes(searchTerm))
            );
        }
    }
    
    const rawVisibleData = currentContactsTab === 'list' && rawFeedDisplayLimit !== 'all'
        ? filteredData.slice(0, rawFeedDisplayLimit)
        : filteredData;

    if (countDisplay) {
        const label = currentContactsTab === 'core' ? '正式聯絡人' : '潛在客戶';
        const displayCount = currentContactsTab === 'core' ? coreContactsTotal : filteredData.length;
        
        if (currentContactsTab === 'core') {
            // [Patch] Add page size pills to top info bar (Line 1)
            const sizes = [50, 100, 500, 1000];
            let pillsHtml = sizes.map(size => {
                const isActive = size === currentCorePageSize;
                const style = isActive
                    ? 'background: var(--accent-blue, #3b82f6); color: white; border: 1px solid var(--accent-blue, #3b82f6); font-weight: 600;'
                    : 'background: white; color: var(--text-secondary); border: 1px solid var(--border-color); font-weight: 500;';
                return `<button data-action="set-core-limit" data-size="${size}" style="padding: 2px 8px; font-size: 0.85em; border-radius: 4px; cursor: pointer; transition: all 0.2s; margin-left: 4px; ${style}">${size}</button>`;
            }).join('');

            countDisplay.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                    <div style="font-size: 0.9em; color: var(--text-secondary); display: flex; align-items: center;">
                        每頁顯示: ${pillsHtml}
                    </div>
                    <div>共 ${displayCount} 筆${label}</div>
                </div>
            `;
        } else {
            const limits = [100, 300, 'all'];
            const limitPills = limits.map(limit => {
                const isActive = rawFeedDisplayLimit === limit;
                const labelText = limit === 'all' ? '全部' : `${limit} 張`;
                const style = isActive
                    ? 'background: var(--accent-blue, #3b82f6); color: white; border: 1px solid var(--accent-blue, #3b82f6); font-weight: 600;'
                    : 'background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); font-weight: 500;';
                return `<button data-action="set-raw-feed-limit" data-limit="${limit}" style="padding: 2px 8px; font-size: 0.85em; border-radius: 4px; cursor: pointer; transition: all 0.2s; margin-left: 4px; ${style}">${labelText}</button>`;
            }).join('');
            countDisplay.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                    <div style="font-size: 0.9em; color: var(--text-secondary); display: flex; align-items: center;">
                        顯示: ${limitPills}
                    </div>
                    <div>顯示 ${rawVisibleData.length} / ${displayCount} 張${label}</div>
                </div>
            `;
        }
    }

    if (currentContactsTab === 'list') {
        listContent.innerHTML = renderContactsTable(rawVisibleData);
    } else if (currentContactsTab === 'cards') {
        listContent.innerHTML = renderBusinessCardList(filteredData);
    } else if (currentContactsTab === 'core') {
        listContent.innerHTML = renderCoreContactsTable(filteredData);
        // [Patch] Append minimal CORE pagination controls
        if (coreContactsTotal > 0) {
            listContent.innerHTML += renderCorePagination();
        }
    }
}

// ==================== 專用渲染函式 ====================

// --- [Patch] CORE Pagination Helper ---
function renderCorePagination() {
    return `
        <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="action-btn" data-action="core-prev" ${!corePaginationState.hasPrev ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : 'style="background: white;"'}>上一頁</button>
                <span style="color: var(--text-secondary); font-weight: 500;">第 ${currentCorePage} / ${corePaginationState.totalPages} 頁</span>
                <button class="action-btn" data-action="core-next" ${!corePaginationState.hasNext ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : 'style="background: white;"'}>下一頁</button>
            </div>
        </div>
    `;
}

// --- Tab 1: 名片總覽 (RAW) ---
function renderContactsTable(data) {
    if (!data || data.length === 0) {
        return '<div class="alert alert-info" style="text-align:center; margin-top: 20px;">沒有找到名片資料</div>';
    }

    const safeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const safeAttr = (value) => safeHtml(value);
    const getStatusClass = (status, needsReview) => {
        if (needsReview) return 'review';
        if (status === '已升級') return 'upgraded';
        if (status === '已歸檔') return 'archived';
        if (status === '已建檔') return 'filed';
        return 'pending';
    };

    let listHTML = `
        <style>
            .crm-raw-feed-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
            }
            .crm-raw-feed-card {
                display: grid;
                grid-template-columns: 116px minmax(0, 1fr);
                gap: 12px;
                align-items: stretch;
                padding: 10px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--card-bg, #fff);
                transition: background-color 0.16s ease, border-color 0.16s ease;
            }
            .crm-raw-feed-card:hover {
                background: var(--bg-hover, #f8fafc);
                border-color: rgba(59, 130, 246, 0.28);
            }
            .crm-raw-feed-card.crm-raw-state-review {
                background: #3f1f24;
                border-color: #7f2d38;
            }
            .crm-raw-feed-card.crm-raw-state-upgraded {
                background: #172a46;
                border-color: #2563a8;
            }
            .crm-raw-feed-card.crm-raw-state-pending {
                background: #1f2937;
                border-color: #475569;
            }
            .crm-raw-feed-card.crm-raw-state-filed {
                background: #163225;
                border-color: #287447;
            }
            .crm-raw-feed-card.crm-raw-state-archived {
                background: #2e2645;
                border-color: #6d5ca8;
            }
            [data-theme="light"] .crm-raw-feed-card.crm-raw-state-review {
                background: #fff1f2;
                border-color: #fca5a5;
            }
            [data-theme="light"] .crm-raw-feed-card.crm-raw-state-upgraded {
                background: #eff6ff;
                border-color: #93c5fd;
            }
            [data-theme="light"] .crm-raw-feed-card.crm-raw-state-pending {
                background: #f8fafc;
                border-color: #cbd5e1;
            }
            [data-theme="light"] .crm-raw-feed-card.crm-raw-state-filed {
                background: #ecfdf5;
                border-color: #86efac;
            }
            [data-theme="light"] .crm-raw-feed-card.crm-raw-state-archived {
                background: #f5f3ff;
                border-color: #c4b5fd;
            }
            .crm-raw-feed-thumb {
                width: 116px;
                height: 76px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                overflow: hidden;
                background: var(--glass-bg, #f8fafc);
                color: var(--text-muted);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                cursor: default;
                transition: border-color 0.16s ease, opacity 0.16s ease;
            }
            .crm-raw-feed-thumb[data-action="view-card"] {
                cursor: pointer;
            }
            .crm-raw-feed-thumb[data-action="view-card"]:hover {
                border-color: var(--accent-blue);
                opacity: 0.9;
            }
            .crm-raw-feed-thumb img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
            .crm-raw-feed-thumb-placeholder {
                cursor: default;
                font-size: 0.82rem;
                font-weight: 600;
            }
            .crm-raw-feed-body {
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .crm-raw-feed-topline {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .crm-raw-feed-labels {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .crm-raw-feed-index {
                color: var(--text-muted);
                font-size: 0.72rem;
                font-weight: 600;
                white-space: nowrap;
            }
            .crm-raw-feed-title {
                font-weight: 600;
                color: var(--text-main);
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .crm-raw-feed-company {
                color: var(--text-secondary);
                font-size: 0.9rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .crm-raw-feed-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 6px 12px;
                color: var(--text-muted);
                font-size: 0.82rem;
                line-height: 1.35;
            }
            .crm-raw-feed-actions {
                display: flex;
                justify-content: flex-end;
                gap: 6px;
                margin-top: auto;
                white-space: nowrap;
            }
            .crm-raw-feed-action {
                min-height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 0 8px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: rgba(255,255,255,0.03);
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 600;
                line-height: 1;
                cursor: pointer;
                transition: color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
            }
            .crm-raw-feed-action:hover {
                color: var(--text-primary);
                background: var(--glass-bg, rgba(255,255,255,0.08));
                border-color: var(--border-color);
            }
            .crm-raw-feed-action.upgrade:hover {
                color: var(--accent-blue);
                border-color: var(--accent-blue);
            }
            .crm-raw-feed-action.delete:hover {
                color: var(--accent-red);
                border-color: rgba(248, 113, 113, 0.45);
            }
            .crm-raw-status-badge {
                flex-shrink: 0;
                padding: 2px 7px;
                border-radius: 999px;
                font-size: 0.74rem;
                font-weight: 600;
                border: 1px solid var(--border-color);
                color: var(--text-secondary);
                background: var(--glass-bg, #f8fafc);
            }
            .crm-raw-status-badge.upgraded {
                color: #bfdbfe;
                border-color: #2563a8;
                background: #1e3a5f;
            }
            .crm-raw-status-badge.archived {
                color: #ddd6fe;
                border-color: #6d5ca8;
                background: #3b2f5f;
            }
            .crm-raw-status-badge.filed {
                color: #bbf7d0;
                border-color: #287447;
                background: #17452c;
            }
            .crm-raw-status-badge.pending {
                color: #cbd5e1;
                border-color: #475569;
                background: #263244;
            }
            .crm-raw-status-badge.review {
                color: #fecaca;
                border-color: #7f2d38;
                background: #5f242e;
            }
            [data-theme="light"] .crm-raw-status-badge.upgraded {
                color: #1d4ed8;
                border-color: #93c5fd;
                background: #dbeafe;
            }
            [data-theme="light"] .crm-raw-status-badge.archived {
                color: #6d28d9;
                border-color: #c4b5fd;
                background: #ede9fe;
            }
            [data-theme="light"] .crm-raw-status-badge.filed {
                color: #047857;
                border-color: #86efac;
                background: #dcfce7;
            }
            [data-theme="light"] .crm-raw-status-badge.pending {
                color: #475569;
                border-color: #cbd5e1;
                background: #f1f5f9;
            }
            [data-theme="light"] .crm-raw-status-badge.review {
                color: #b91c1c;
                border-color: #fca5a5;
                background: #ffe4e6;
            }
            @media (max-width: 1280px) {
                .crm-raw-feed-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            @media (max-width: 860px) {
                .crm-raw-feed-grid {
                    grid-template-columns: 1fr;
                }
            }
            @media (max-width: 560px) {
                .crm-raw-feed-card {
                    grid-template-columns: 92px minmax(0, 1fr);
                }
                .crm-raw-feed-thumb {
                    width: 92px;
                    height: 64px;
                }
            }
        </style>
        <div class="crm-raw-feed-grid">
    `;

    data.forEach(contact => {
        const needsReview = !String(contact.name || '').trim() || !String(contact.company || '').trim();
        const knownStatuses = ['待處理', '已建檔', '已升級', '已歸檔'];
        const sourceStatus = knownStatuses.includes(contact.status) ? contact.status : '待處理';
        const statusText = needsReview ? '待確認' : sourceStatus;
        const statusClass = getStatusClass(sourceStatus, needsReview);
        const stateClass = needsReview
            ? 'crm-raw-state-review'
            : sourceStatus === '已升級'
                ? 'crm-raw-state-upgraded'
                : sourceStatus === '已建檔'
                    ? 'crm-raw-state-filed'
                    : sourceStatus === '已歸檔'
                        ? 'crm-raw-state-archived'
                        : 'crm-raw-state-pending';
        const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
        const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';
        const thumbUrl = contact.driveLink ? `/api/drive/thumbnail?link=${encodeURIComponent(contact.driveLink)}` : '';
        const phone = contact.mobile || contact.phone || '';
        const rowIndexLabel = contact.rowIndex ? `<span class="crm-raw-feed-index">RAW #${safeHtml(contact.rowIndex)}</span>` : '';
        const upgradeLabel = sourceStatus === '已升級' ? '再次建立機會' : '升級';

        const thumbHtml = contact.driveLink
            ? `<button class="crm-raw-feed-thumb" data-action="view-card" data-link="${safeAttr(safeDriveLink)}" title="查看名片" aria-label="查看名片"><img src="${safeAttr(thumbUrl)}" alt="名片預覽" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>名片</span>';"></button>`
            : `<div class="crm-raw-feed-thumb crm-raw-feed-thumb-placeholder">無名片</div>`;

        let deleteBtn = '';
        if (contactsOperationMode) {
            deleteBtn = `<button class="crm-raw-feed-action delete" data-action="delete-raw" data-index="${safeAttr(contact.rowIndex)}" data-name="${safeAttr(contact.name || '')}" title="刪除" aria-label="刪除"><span>⌫</span><span>刪除</span></button>`;
        }

        listHTML += `
            <div class="crm-raw-feed-card ${stateClass}">
                ${thumbHtml}
                <div class="crm-raw-feed-body">
                    <div class="crm-raw-feed-topline">
                        <div class="crm-raw-feed-title">${safeHtml(contact.name || '未命名名片')}</div>
                        <div class="crm-raw-feed-labels">
                            ${rowIndexLabel}
                            <span class="crm-raw-status-badge ${statusClass}">${safeHtml(statusText)}</span>
                        </div>
                    </div>
                    <div class="crm-raw-feed-company">${safeHtml(contact.company || '未填公司')}</div>
                    <div class="crm-raw-feed-meta">
                        ${contact.position ? `<span>${safeHtml(contact.position)}</span>` : ''}
                        ${phone ? `<span>${safeHtml(phone)}</span>` : ''}
                        ${contact.email ? `<span>${safeHtml(contact.email)}</span>` : ''}
                    </div>
                    <div class="crm-raw-feed-actions">
                        <button class="crm-raw-feed-action edit" data-action="edit-card" data-contact='${contactJsonString}' title="編輯" aria-label="編輯"><span>✎</span><span>編輯</span></button>
                        <button class="crm-raw-feed-action upgrade" data-action="upgrade-card" data-contact='${contactJsonString}' title="${upgradeLabel}" aria-label="${upgradeLabel}"><span>↗</span><span>${upgradeLabel}</span></button>
                        ${deleteBtn}
                    </div>
                </div>
            </div>
        `;
    });
    listHTML += '</div>';
    return listHTML;
}

// --- Tab 2: 聯絡人列表 (RAW) ---
function renderBusinessCardList(data) {
    if (!data || data.length === 0) {
        return '<div class="alert alert-info" style="text-align:center; margin-top: 20px;">沒有找到聯絡人資料</div>';
    }

    const toggleBtnStyle = contactsOperationMode 
        ? 'background: var(--accent-blue, #3b82f6); color: white; border-color: var(--accent-blue, #3b82f6);' 
        : 'background: white; color: var(--text-main); border-color: var(--border-color);';

    let listHTML = `
        <style>
            .bc-list-table { width: 100%; border-collapse: collapse; min-width: 800px; }
            .bc-list-table th, .bc-list-table td { padding: 12px; border-bottom: 1px solid var(--border-color); text-align: left; vertical-align: middle; }
            .bc-list-table th { background-color: var(--glass-bg); color: var(--text-secondary); font-weight: 600; }
            .bc-list-table tr:hover { background-color: var(--bg-hover, #f8fafc); }
            .bc-name-cell { font-weight: 600; color: var(--text-main); white-space: normal; word-break: break-all; }
        </style>
        <div style="overflow-x: auto;">
            <table class="bc-list-table">
                <thead>
                    <tr>
                        <th style="width: 60px; text-align: center;">項次</th>
                        <th>姓名</th>
                        <th>公司</th>
                        <th>職位</th>
                        <th>手機</th>
                        <th>Email</th>
                        <th style="text-align: right; white-space: nowrap;">
                            操作
                            <button class="action-btn small" data-action="toggle-operations" style="margin-left: 6px; padding: 2px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid; cursor: pointer; transition: all 0.2s; ${toggleBtnStyle}">
                                ${contactsOperationMode ? '完成' : '＋'}
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach((contact, index) => {
        const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
        const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';
        
        const previewBtn = contact.driveLink 
            ? `<button class="action-btn small info" title="預覽名片" data-action="view-card" data-link="${safeDriveLink}" style="margin-right: 8px;">💳</button>`
            : '';

        let deleteBtn = '';
        if (contactsOperationMode) {
            deleteBtn = `<button class="action-btn small danger" data-action="delete-raw" data-index="${contact.rowIndex}" data-name="${contact.name || ''}" style="margin-left: 4px; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5;">🗑️ 刪除</button>`;
        }

        listHTML += `
            <tr>
                <td style="text-align: center; color: var(--text-muted); font-weight: 500;">${index + 1}</td>
                <td class="bc-name-cell">${contact.name || '-'}</td>
                <td>${contact.company || '-'}</td>
                <td>${contact.position || '-'}</td>
                <td>${contact.mobile || '-'}</td>
                <td>${contact.email || '-'}</td>
                <td style="text-align: right; white-space: nowrap;">
                    ${previewBtn}
                    <button class="action-btn small primary" data-action="edit-card" data-contact='${contactJsonString}'>✏️ 編輯</button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });

    listHTML += `
                </tbody>
            </table>
        </div>
    `;
    return listHTML;
}

// --- Tab 3: 正式聯絡人 (CORE) ---
function renderCoreContactsTable(data) {
    if (!data || data.length === 0) {
        return '<div class="alert alert-info" style="text-align:center; margin-top: 20px;">沒有找到正式聯絡人資料</div>';
    }

    const toggleBtnStyle = contactsOperationMode 
        ? 'background: var(--accent-blue, #3b82f6); color: white; border-color: var(--accent-blue, #3b82f6);' 
        : 'background: white; color: var(--text-main); border-color: var(--border-color);';

    let listHTML = `
        <style>
            .core-contact-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 0; gap: 0; align-items: start; }
            .core-contact-workspace.core-contact-rail-open { grid-template-columns: minmax(560px, 1fr) 380px; gap: 24px; }
            .core-contact-table-zone { min-width: 0; overflow-x: auto; border: 1px solid rgba(148, 163, 184, 0.24); border-radius: 8px; background: var(--card-bg, #fff); }
            .core-contact-row { cursor: pointer; border-left: 3px solid transparent; transition: background-color 0.16s ease, border-color 0.16s ease; }
            .core-contact-row:hover { background-color: rgba(59, 130, 246, 0.045); }
            .core-contact-row.is-open { background-color: rgba(59, 130, 246, 0.075); border-left-color: var(--accent-blue, #3b82f6); }
            .core-list-table { width: 100%; border-collapse: collapse; min-width: 880px; font-size: 0.92rem; }
            .core-list-table th, .core-list-table td { padding: 10px 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.18); text-align: left; vertical-align: middle; }
            .core-list-table th { background-color: rgba(248, 250, 252, 0.82); color: var(--text-secondary); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.01em; white-space: nowrap; }
            .core-list-table tbody tr:last-child td { border-bottom: none; }
            .core-name-cell { font-weight: 650; color: var(--text-main); white-space: normal; word-break: break-all; }
            .core-company-cell { color: var(--text-main); font-weight: 560; }
            .core-secondary-cell { color: var(--text-secondary); font-size: 0.88rem; }
            .core-tertiary-cell { color: var(--text-muted); font-size: 0.84rem; white-space: nowrap; }
            .core-action-cell { text-align: right; white-space: nowrap; opacity: 0.88; }
            .core-action-cell .action-btn.small { padding: 3px 8px; font-size: 0.78rem; }
            .core-contact-rail { display: none; border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 8px; background: var(--card-bg, #fff); padding: 18px; position: sticky; top: 12px; max-height: calc(100vh - 120px); overflow-y: auto; box-shadow: -1px 0 0 rgba(148, 163, 184, 0.12); }
            .core-contact-workspace.core-contact-rail-open .core-contact-rail { display: block; }
            .core-contact-rail-header { display: flex; justify-content: space-between; gap: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 14px; }
            .core-contact-rail-title { font-weight: 700; color: var(--text-main); font-size: 1.12rem; line-height: 1.35; }
            .core-contact-rail-company { color: var(--text-main); font-size: 0.9rem; font-weight: 600; margin-top: 5px; }
            .core-contact-rail-subtitle { color: var(--text-secondary); font-size: 0.84rem; margin-top: 3px; }
            .core-contact-rail-close { border: 1px solid var(--border-color); background: transparent; color: var(--text-muted); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; }
            .core-contact-rail-section { border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px; }
            .core-contact-rail-section:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
            .core-contact-rail-heading { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 7px; letter-spacing: 0.02em; }
            .core-contact-rail-row { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 10px; font-size: 0.86rem; margin-bottom: 7px; }
            .core-contact-rail-label { color: var(--text-muted); }
            .core-contact-rail-value { color: var(--text-main); word-break: break-word; }
            .core-contact-rail-support { color: var(--text-muted); font-size: 0.82rem; }
            .core-contact-opps-section { background: var(--glass-bg, #f8fafc); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; }
            .core-contact-opp-chip { display: block; border: 1px solid var(--border-color); border-radius: 7px; padding: 9px 10px; margin-bottom: 8px; background: var(--card-bg, #fff); color: var(--text-main); text-decoration: none; transition: border-color 0.16s ease, background-color 0.16s ease; }
            .core-contact-opp-chip:hover { border-color: var(--accent-blue); background: var(--bg-hover, #f8fafc); }
            .core-contact-opp-name { font-weight: 650; font-size: 0.9rem; line-height: 1.35; }
            .core-contact-opp-meta { color: var(--text-muted); font-size: 0.78rem; margin-top: 4px; }
            .core-contact-empty-state { color: var(--text-muted); font-size: 0.86rem; }
            @media (max-width: 1100px) {
                .core-contact-workspace.core-contact-rail-open { grid-template-columns: 1fr; }
                .core-contact-rail { position: static; max-height: none; box-shadow: none; }
            }
        </style>
        <div id="core-contact-workspace" class="core-contact-workspace">
        <div class="core-contact-table-zone">
            <table class="core-list-table">
                <thead>
                    <tr>
                        <th style="width: 60px; text-align: center;">項次</th>
                        <th>姓名</th>
                        <th>公司</th>
                        <th>職位</th>
                        <th>手機</th>
                        <th>Email</th>
                        <th>最後更新 <button class="action-btn small" data-action="toggle-core-sort" style="margin-left:4px; padding: 0 4px; background: transparent; border: none; cursor: pointer;">${currentCoreSortOrder === 'desc' ? '⬇️' : '⬆️'}</button></th>
                        <th style="text-align: right; white-space: nowrap;">
                            操作
                            <button class="action-btn small" data-action="toggle-operations" style="margin-left: 6px; padding: 2px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid; cursor: pointer; transition: all 0.2s; ${toggleBtnStyle}">
                                ${contactsOperationMode ? '完成' : '＋'}
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Calculate absolute index to maintain visual consistency across pages based on dynamic limit
    const indexOffset = (currentCorePage - 1) * currentCorePageSize;

    data.forEach((contact, index) => {
        let updateTimeStr = '-';
        const rawTime = contact.updatedTime || contact.lastUpdateTime || contact.createdTime;
        if (rawTime) {
            const d = new Date(rawTime);
            if (!isNaN(d.getTime())) {
                updateTimeStr = d.toLocaleDateString('zh-TW');
            }
        }

        const safeName = (contact.name || '').replace(/"/g, '&quot;');
        const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;").replace(/"/g, '&quot;');

        let deleteBtn = '';
        if (contactsOperationMode) {
            deleteBtn = `<button class="action-btn small danger" data-action="delete-core" data-id="${contact.contactId}" data-name="${safeName}" style="margin-left: 4px; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5;">🗑️ 刪除</button>`;
        }

        listHTML += `
            <tr class="core-contact-row" data-action="open-core-contact-rail" data-contact='${contactJsonString}' data-core-contact-id="${contact.contactId}">
                <td style="text-align: center; color: var(--text-muted); font-weight: 500;">${indexOffset + index + 1}</td>
                <td class="core-name-cell">${contact.name || '-'}</td>
                <td class="core-company-cell">${contact.companyName || '-'}</td>
                <td class="core-secondary-cell">${contact.position || '-'}</td>
                <td class="core-secondary-cell">${contact.mobile || '-'}</td>
                <td class="core-secondary-cell">${contact.email || '-'}</td>
                <td class="core-tertiary-cell">${updateTimeStr}</td>
                <td class="core-action-cell">
                    <button class="action-btn small primary" data-action="edit-core" data-contact='${contactJsonString}'>✏️ 編輯</button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });

        listHTML += `
                </tbody>
            </table>
        </div>
        <aside id="core-contact-rail" class="core-contact-rail"></aside>
        </div>
    `;
    return listHTML;
}

// ==================== 編輯模式渲染函式 ====================

function openCoreContactRail(contact) {
    const workspace = document.getElementById('core-contact-workspace');
    const rail = document.getElementById('core-contact-rail');
    if (!workspace || !rail || !contact) return;

    workspace.classList.add('core-contact-rail-open');
    workspace.querySelectorAll('.core-contact-row.is-open').forEach(row => row.classList.remove('is-open'));
    const activeRow = workspace.querySelector(`[data-core-contact-id="${contact.contactId}"]`);
    if (activeRow) activeRow.classList.add('is-open');
    rail.innerHTML = renderCoreContactRail(contact);
    loadCoreContactOpportunities(contact.contactId);
}

function closeCoreContactRail() {
    const workspace = document.getElementById('core-contact-workspace');
    const rail = document.getElementById('core-contact-rail');
    if (workspace) {
        workspace.classList.remove('core-contact-rail-open');
        workspace.querySelectorAll('.core-contact-row.is-open').forEach(row => row.classList.remove('is-open'));
    }
    if (rail) rail.innerHTML = '';
}

function renderCoreContactRail(contact) {
    const safe = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const empty = '<span class="core-contact-empty-state">-</span>';
    const sourceId = contact.sourceId || '';
    const sourceState = sourceId === 'MANUAL' || !sourceId ? '尚未歸檔' : '已連結名片';
    const titleParts = [contact.jobTitle || contact.position, contact.department].filter(Boolean).join(' / ');
    const companyName = contact.companyName || contact.company || '未填公司';
    const cardPreview = contact.driveLink
        ? `<button class="action-btn small info" data-action="view-card" data-link="${safe(contact.driveLink)}">名片預覽</button>`
        : '<div class="core-contact-rail-support">尚無名片預覽</div>';

    const row = (label, value) => `
        <div class="core-contact-rail-row">
            <div class="core-contact-rail-label">${label}</div>
            <div class="core-contact-rail-value">${value ? safe(value) : empty}</div>
        </div>
    `;

    return `
        <div class="core-contact-rail-header">
            <div>
                <div class="core-contact-rail-title">${safe(contact.name || '未命名聯絡人')}</div>
                <div class="core-contact-rail-company">${safe(companyName)}</div>
                <div class="core-contact-rail-subtitle">${safe(titleParts || '未填職稱')}</div>
            </div>
            <button class="core-contact-rail-close" data-action="close-core-contact-rail" title="關閉">×</button>
        </div>

        <section class="core-contact-rail-section core-contact-opps-section">
            <div class="core-contact-rail-heading">關聯機會</div>
            <div id="core-contact-opportunities" class="core-contact-empty-state">載入關聯機會...</div>
        </section>

        <section class="core-contact-rail-section">
            <div class="core-contact-rail-heading">聯絡方式</div>
            ${row('手機', contact.mobile)}
            ${row('電話', contact.phone)}
            ${row('Email', contact.email)}
        </section>

        <section class="core-contact-rail-section">
            <div class="core-contact-rail-heading">來源 / 名片</div>
            ${row('狀態', sourceState)}
            ${row('sourceId', sourceId || 'MANUAL')}
            ${cardPreview}
        </section>

        <section class="core-contact-rail-section">
            <div class="core-contact-rail-heading">備註</div>
            <div class="core-contact-rail-value">${contact.notes ? safe(contact.notes).replace(/\n/g, '<br>') : '<span class="core-contact-rail-support">尚無備註</span>'}</div>
        </section>
    `;
}

async function loadCoreContactOpportunities(contactId) {
    const container = document.getElementById('core-contact-opportunities');
    if (!container || !contactId) return;

    const safe = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    try {
        const result = await authedFetch(`/api/contacts/${encodeURIComponent(contactId)}/opportunities`);
        const opportunities = Array.isArray(result) ? result : (result.data || []);

        if (!opportunities.length) {
            container.innerHTML = '<span class="core-contact-empty-state">尚無關聯機會</span>';
            return;
        }

        container.innerHTML = opportunities.map(opp => {
            const name = opp.opportunityName || opp.name || '未命名機會';
            const company = opp.customerCompany || '-';
            const status = opp.status || opp.currentStatus || opp.phase || opp.currentStage || '-';
            const value = opp.value || opp.opportunityValue || '';
            return `
                <div class="core-contact-opp-chip">
                    <div class="core-contact-opp-name">${safe(name)}</div>
                    <div class="core-contact-opp-meta">${safe(company)} · ${safe(status)}${value ? ` · ${safe(value)}` : ''}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<span class="core-contact-empty-state">關聯機會載入失敗</span>';
    }
}

// --- RAW Contacts Edit Mode ---
function renderEditCardMode(contact) {
    const listContent = document.getElementById('contacts-page-content');
    const actionBar = document.getElementById('contacts-action-bar');
    if (!listContent) return;

    if (actionBar) actionBar.style.display = 'none';
    currentEditRowIndex = contact.rowIndex;

    let imagePreviewHtml = '';
    if (contact.driveLink) {
        const proxyUrl = `/api/drive/thumbnail?link=${encodeURIComponent(contact.driveLink)}`;
        imagePreviewHtml = `
            <a href="${contact.driveLink}" target="_blank" title="點擊開啟原始檔案 (Google Drive)" style="display: block; text-align: center; cursor: zoom-in;">
                <img src="${proxyUrl}" alt="名片預覽" style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid var(--border-color);" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'alert alert-warning\\'>預覽載入失敗，可點擊查看原檔</div>';">
            </a>
            <div style="text-align: center; margin-top: 8px;"><small style="color: var(--text-muted);">點擊圖片可開啟原檔</small></div>
        `;
    } else {
        imagePreviewHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 300px; background-color: var(--glass-bg); border-radius: 8px; border: 1px dashed var(--border-color); color: var(--text-muted);">
                <span style="font-size: 3rem; margin-bottom: 1rem;">📇</span>
                <p>無名片圖檔</p>
            </div>
        `;
    }

    const safeName = (contact.name || '').replace(/"/g, '&quot;');
    const safeCompany = (contact.company || '').replace(/"/g, '&quot;');
    const safePosition = (contact.position || '').replace(/"/g, '&quot;');
    const safeMobile = (contact.mobile || '').replace(/"/g, '&quot;');
    const safeEmail = (contact.email || '').replace(/"/g, '&quot;');

    listContent.innerHTML = `
        <div class="edit-card-container" style="display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap;">
            
            <div class="edit-card-preview" style="flex: 1; min-width: 300px;">
                <h3 style="margin-bottom: 1rem; font-size: 1.1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">名片預覽</h3>
                ${imagePreviewHtml}
            </div>

            <div class="edit-card-form" style="flex: 1; min-width: 300px; background: var(--card-bg, #fff); padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <h3 style="font-size: 1.1rem; margin: 0;">編輯聯絡人資訊</h3>
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">姓名</label>
                    <input type="text" id="raw-edit-name" class="form-input" value="${safeName}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">公司名稱</label>
                    <input type="text" id="raw-edit-company" class="form-input" value="${safeCompany}" style="width: 100%;">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">職稱 (Position)</label>
                    <input type="text" id="raw-edit-position" class="form-input" value="${safePosition}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">手機 (Mobile)</label>
                    <input type="tel" id="raw-edit-mobile" class="form-input" value="${safeMobile}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">信箱 (Email)</label>
                    <input type="email" id="raw-edit-email" class="form-input" value="${safeEmail}" style="width: 100%;">
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="action-btn" data-action="cancel-edit" style="background: var(--glass-bg); color: var(--text-main); border: 1px solid var(--border-color);">取消</button>
                    <button class="action-btn primary" data-action="save-edit" id="btn-save-raw-edit">儲存變更</button>
                </div>
            </div>

        </div>
    `;
}

// --- CORE Contacts Edit Mode ---
function renderCoreEditMode(contact) {
    const listContent = document.getElementById('contacts-page-content');
    const actionBar = document.getElementById('contacts-action-bar');
    if (!listContent) return;

    if (actionBar) actionBar.style.display = 'none';
    currentCoreEditContactId = contact.contactId;

    const safeName = (contact.name || '').replace(/"/g, '&quot;');
    const safePosition = (contact.position || '').replace(/"/g, '&quot;');
    const safeMobile = (contact.mobile || '').replace(/"/g, '&quot;');
    const safePhone = (contact.phone || '').replace(/"/g, '&quot;');
    const safeEmail = (contact.email || '').replace(/"/g, '&quot;');
    const displayCompany = contact.companyName || '-';

    listContent.innerHTML = `
        <div class="edit-core-container" style="display: flex; justify-content: center;">
            <div class="edit-card-form" style="width: 100%; max-width: 600px; background: var(--card-bg, #fff); padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <h3 style="font-size: 1.1rem; margin: 0;">編輯正式聯絡人</h3>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem; background: var(--bg-hover, #f8fafc); padding: 10px; border-radius: 6px;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem;">公司名稱 (不可編輯)</label>
                    <div style="font-weight: 600; color: var(--text-main);">${displayCompany}</div>
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">姓名</label>
                    <input type="text" id="core-edit-name" class="form-input" value="${safeName}" style="width: 100%;">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">職稱 (Position)</label>
                    <input type="text" id="core-edit-position" class="form-input" value="${safePosition}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">手機 (Mobile)</label>
                    <input type="tel" id="core-edit-mobile" class="form-input" value="${safeMobile}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">電話 (Phone)</label>
                    <input type="tel" id="core-edit-phone" class="form-input" value="${safePhone}" style="width: 100%;">
                </div>

                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">信箱 (Email)</label>
                    <input type="email" id="core-edit-email" class="form-input" value="${safeEmail}" style="width: 100%;">
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="action-btn" data-action="cancel-core-edit" style="background: var(--glass-bg); color: var(--text-main); border: 1px solid var(--border-color);">取消</button>
                    <button class="action-btn primary" data-action="save-core-edit" id="btn-save-core-edit">儲存變更</button>
                </div>
            </div>
        </div>
    `;
}

// ==================== 儲存與刪除處理函式 ====================

// --- Save Action: RAW ---
async function handleSaveCardEdit() {
    if (!currentEditRowIndex) {
        console.error('Missing rowIndex for save.');
        if (typeof showNotification === 'function') showNotification('無法儲存：缺少資料識別碼', 'error');
        return;
    }

    const btn = document.getElementById('btn-save-raw-edit');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '儲存中...';
    }

    const payload = {
        name: document.getElementById('raw-edit-name')?.value.trim() || '',
        company: document.getElementById('raw-edit-company')?.value.trim() || '',
        position: document.getElementById('raw-edit-position')?.value.trim() || '',
        mobile: document.getElementById('raw-edit-mobile')?.value.trim() || '',
        email: document.getElementById('raw-edit-email')?.value.trim() || ''
    };

    try {
        const response = await authedFetch(`/api/contacts/${currentEditRowIndex}/raw`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            skipRefresh: true
        });

        if (response && response.success) {
            if (typeof showNotification === 'function') showNotification('資料已更新成功', 'success');
            
            const listResult = await authedFetch(`/api/contacts?q=`);
            if (listResult && listResult.data) {
                allContactsData = listResult.data;
            }
            
            currentEditRowIndex = null;
            const safeQuery = document.getElementById('contacts-page-search')?.value || '';
            await filterAndRenderContacts(safeQuery);
            
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

        } else {
            throw new Error(response.error || '更新失敗');
        }
    } catch (error) {
        console.error('Save raw contact failed:', error);
        if (typeof showNotification === 'function') {
            showNotification(`儲存失敗: ${error.message}`, 'error');
        } else {
            alert(`儲存失敗: ${error.message}`);
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = '儲存變更';
        }
    }
}

// --- Delete Action: RAW ---
async function handleDeleteRawContact(rowIndex, contactName) {
    const msg = `您確定要永久刪除潛客戶「${contactName}」嗎？\n\n⚠️ 警告：此操作將會從 Google 試算表中永久移除該筆實體資料，且無法復原。`;
    
    const executeDelete = async () => {
        try {
            const response = await authedFetch(`/api/contacts/${rowIndex}/raw`, {
                method: 'DELETE',
                skipRefresh: true 
            });

            if (response && response.success) {
                if (typeof showNotification === 'function') {
                    showNotification('刪除成功：潛在客戶已從試算表中移除', 'success');
                } else {
                    alert('刪除成功：潛在客戶已從試算表中移除');
                }
                
                const listResult = await authedFetch(`/api/contacts?q=`);
                if (listResult && listResult.data) {
                    allContactsData = listResult.data;
                }
                
                const safeQuery = document.getElementById('contacts-page-search')?.value || '';
                await filterAndRenderContacts(safeQuery);
                
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } else {
                const backendMsg = (response && (response.error || response.message)) || '無法刪除：後端發生錯誤或尚未實作該路由';
                
                if (typeof showNotification === 'function') {
                    showNotification(backendMsg, 'info'); 
                } else {
                    alert(backendMsg);
                }
            }
        } catch (error) {
            console.error('Delete raw contact failed:', error);
            if (typeof showNotification === 'function') {
                showNotification('刪除失敗：系統錯誤或後端 API 尚未實作此功能', 'error');
            } else {
                alert('刪除失敗：系統錯誤或後端 API 尚未實作此功能');
            }
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(msg, executeDelete);
    } else {
        if (confirm(msg)) {
            executeDelete();
        }
    }
}

// --- Save Action: CORE ---
async function handleSaveCoreEdit() {
    if (!currentCoreEditContactId) {
        console.error('Missing contactId for save.');
        if (typeof showNotification === 'function') showNotification('無法儲存：缺少資料識別碼', 'error');
        return;
    }

    const btn = document.getElementById('btn-save-core-edit');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '儲存中...';
    }

    const payload = {
        name: document.getElementById('core-edit-name')?.value.trim() || '',
        position: document.getElementById('core-edit-position')?.value.trim() || '',
        mobile: document.getElementById('core-edit-mobile')?.value.trim() || '',
        phone: document.getElementById('core-edit-phone')?.value.trim() || '',
        email: document.getElementById('core-edit-email')?.value.trim() || ''
    };

    try {
        const response = await authedFetch(`/api/contacts/${currentCoreEditContactId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            skipRefresh: true
        });

        if (response && response.success) {
            if (typeof showNotification === 'function') showNotification('正式聯絡人已更新成功', 'success');
            
            currentCoreEditContactId = null;
            const safeQuery = document.getElementById('contacts-page-search')?.value || '';
            // [Patch] Will naturally respect currentCorePage
            await filterAndRenderContacts(safeQuery);
            
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

        } else {
            throw new Error(response.error || '更新失敗');
        }
    } catch (error) {
        console.error('Save core contact failed:', error);
        if (typeof showNotification === 'function') {
            showNotification(`儲存失敗: ${error.message}`, 'error');
        } else {
            alert(`儲存失敗: ${error.message}`);
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = '儲存變更';
        }
    }
}

// --- Delete Action: CORE ---
async function handleDeleteCoreContact(contactId, contactName) {
    const msg = `您確定要永久刪除正式聯絡人「${contactName}」嗎？\n\n系統將進行關聯檢查，若該聯絡人已綁定任何機會案件，將無法刪除。`;
    
    const executeDelete = async () => {
        try {
            const response = await authedFetch(`/api/contacts/${contactId}`, {
                method: 'DELETE',
                skipRefresh: true 
            });

            if (response && response.success) {
                if (typeof showNotification === 'function') {
                    showNotification('刪除成功：正式聯絡人已移除', 'success');
                } else {
                    alert('刪除成功：正式聯絡人已移除');
                }
                
                const safeQuery = document.getElementById('contacts-page-search')?.value || '';
                // [Patch] Bound safely to auto-correcting pagination logic
                await filterAndRenderContacts(safeQuery);
                
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } else {
                const backendMsg = (response && (response.error || response.message)) || '無法刪除：該聯絡人已有關聯資料';
                
                if (typeof showNotification === 'function') {
                    showNotification(backendMsg, 'info');
                } else {
                    alert(backendMsg);
                }
            }
        } catch (error) {
            console.error('Delete core contact failed:', error);
            if (typeof showNotification === 'function') {
                showNotification('刪除失敗：系統錯誤，請稍後再試', 'error');
            } else {
                alert('刪除失敗：系統錯誤，請稍後再試');
            }
        }
    };

    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog(msg, executeDelete);
    } else {
        if (confirm(msg)) {
            executeDelete();
        }
    }
}

if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules.contacts = loadContacts;
}
