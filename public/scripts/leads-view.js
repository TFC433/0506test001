// File: public/scripts/leads-view.js
// Version: 16.10.0
// Date: 2026-03-22
// Changelog: 
//   - V16.10.0 Delete Feature: Added handleDeleteSubmit and delete button visibility toggling based on card ownership.
//   - V16.9.0 Exhibition UI Cleanup: Surgically removed the legacy exhibition badge (pill) to eliminate visual clutter and ghosting. The visual system now strictly relies on the Corner Triangle (mode) and Bottom Info Bar (information) without redundancy.
//   - V16.8.0 Exhibition UI Theming: Added dynamic color and opacity injection from System Config for the exhibition corner triangle and bottom info bar. Implemented robust hexToRgba helper and safe fallbacks to guarantee UI stability.
//   - V16.7.0 Exhibition Display Normalization: Stopped frontend date reconstruction for exhibition labels. The bottom info bar now purely renders the pre-formatted label from RAW column R, ensuring future/historical data integrity and multi-exhibition support without drift.
//   - V16.6.0 Exhibition UX Polish: Fine-tuned corner triangle mode indicator (size, color, text centering) and bottom info bar (centered text, softer backdrop blur, integrated date range formatting) for a balanced, production-ready visual finish.
// Description: Logic controller for Lead View V6.3 (Reading Structure + Desktop Pill Position) and simplified strict LIFF Auth.

let allLeads = [];
let currentUser = {
    userId: null,
    displayName: '訪客',
    pictureUrl: null
};
let currentView = 'all'; 

// [Phase 8.4 Exhibition UX] Independent filter state and globally stored config
let showExhibitionOnly = false;
let currentExhibitionConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
    // [ITEM 5] Start with a neutral verifying state instead of jarring login prompt
    toggleContentVisibility(false, 'verifying');
    await initLIFF();
    bindEvents();
});

window.manualLiffLogin = function() {
    console.warn('[Auth] Manual login triggered.');
    liff.login();
};

window.forceLiffRelogin = function() {
    console.warn('[Auth] Forcing re-login: logging out and reloading to clear stale state.');
    if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
        liff.logout();
    }
    location.reload();
};

function showAuthFailedFallback() {
    console.warn('[Auth] 401 detected. Halting operations, clearing UI state, and displaying manual fallback.');
    
    updateUserUI(false);
    currentUser.userId = null;
    currentUser.displayName = '訪客';
    currentUser.pictureUrl = null;

    // [ITEM 5] Use the explicit expired state
    toggleContentVisibility(false, 'expired'); 
}

function toggleContentVisibility(show, state = 'login') {
    const controls = document.querySelector('.controls-section');
    const main = document.querySelector('.leads-container');
    let promptDiv = document.getElementById('login-prompt'); 

    if (show) {
        if(controls) controls.style.display = 'flex';
        if(main) main.style.display = 'block';
        if(promptDiv) promptDiv.style.display = 'none';
    } else {
        if(controls) controls.style.display = 'none';
        if(main) main.style.display = 'none';
        
        // Dynamically create or update prompt structure
        if (!promptDiv) {
            promptDiv = document.createElement('div');
            promptDiv.id = 'login-prompt';
            promptDiv.className = 'empty-state'; 
            promptDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; padding: 20px; text-align: center;';
            
            const header = document.querySelector('.main-header');
            if(header && header.parentNode) {
                header.parentNode.insertBefore(promptDiv, header.nextSibling);
            }
        }
        
        promptDiv.style.display = 'flex';

        // [ITEM 5] Smooth UX State Handling
        if (state === 'verifying') {
            promptDiv.innerHTML = `
                <div class="spinner" style="margin-bottom: 20px; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color, #00B900); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <h2 style="margin-bottom: 10px; color: var(--text-main);">身分驗證中...</h2>
                <p style="color: var(--text-sub);">正在安全地檢查您的登入狀態</p>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            `;
        } else if (state === 'expired') {
            promptDiv.innerHTML = `
                <div class="empty-icon" style="font-size: 5rem; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin-bottom: 10px; color: var(--text-main);">登入憑證失效</h2>
                <p style="color: var(--text-sub); margin-bottom: 20px;">您的登入狀態已過期或無效，請重新登入。</p>
                <button class="login-btn" onclick="window.forceLiffRelogin()" style="padding: 10px 30px; font-size: 1rem;">重新登入</button>
            `;
        } else {
            // Default manual login state
            promptDiv.innerHTML = `
                <div class="empty-icon" style="font-size: 5rem; margin-bottom: 20px;">🔒</div>
                <h2 style="margin-bottom: 10px; color: var(--text-main);">請先登入</h2>
                <p style="color: var(--text-sub); margin-bottom: 20px;">此頁面僅限授權成員存取<br>請點擊下方按鈕登入 LINE</p>
                <button class="login-btn" onclick="window.manualLiffLogin()" style="padding: 10px 30px; font-size: 1rem;">LINE 登入</button>
            `;
        }
    }
}

function showAccessDenied(userId) {
    const promptDiv = document.getElementById('login-prompt');
    if (promptDiv) {
        promptDiv.innerHTML = `
            <div class="empty-icon" style="font-size: 5rem; margin-bottom: 20px; color: var(--accent-red, #ef4444);">⛔</div>
            <h2 style="margin-bottom: 10px; color: var(--text-main);">未授權的帳號</h2>
            <p style="color: var(--text-sub); margin-bottom: 20px;">
                您的 LINE ID 尚未被加入系統白名單。<br>
                請複製下方 ID 並傳送給管理員申請開通：
            </p>
            <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; font-family: monospace; user-select: all; margin-bottom: 20px;">
                ${userId}
            </div>
            <button class="action-btn" onclick="window.forceLiffRelogin();" style="width: auto; padding: 10px 20px;">登出並切換帳號</button>
        `;
        promptDiv.style.display = 'flex';
    }
}

async function initLIFF() {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (isLocal) {
        console.warn('🛠️ [Dev] 本地模式，使用測試帳號');
        currentUser.userId = 'TEST_LOCAL_USER';
        currentUser.displayName = '測試員 (Local)';
        updateUserUI(true);
        loadLeadsData(); 
        return; 
    }

    try {
        if (typeof liff === 'undefined' || !LIFF_ID) {
            console.error('LIFF 未就緒');
            return;
        }
        
        await liff.init({ liffId: LIFF_ID });
        
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            currentUser.userId = profile.userId;
            currentUser.displayName = profile.displayName;
            currentUser.pictureUrl = profile.pictureUrl;
            updateUserUI(true);
            
            loadLeadsData();
        } else {
            updateUserUI(false);
            // [ITEM 5] Switch to login prompt once verification fails locally
            toggleContentVisibility(false, 'login');
        }
    } catch (error) {
        console.error('LIFF Init Error:', error);
        toggleContentVisibility(false, 'login');
    }
}

function updateUserUI(isLoggedIn) {
    const userArea = document.getElementById('user-area');
    const loginBtn = document.getElementById('login-btn');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (isLoggedIn) {
        if(userArea) {
            userArea.style.display = 'flex';
            userArea.style.alignItems = 'center';
            userArea.style.gap = '10px';
        }
        if(loginBtn) loginBtn.style.display = 'none';
        
        // [ITEM 6] Inject pending reminder DOM placeholder
        if(userName) {
            userName.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <span>你好，${currentUser.displayName}</span>
                    <span id="my-pending-reminder" style="display:none; color: var(--accent-red); font-size: 0.75rem; margin-top: 2px;"></span>
                </div>
            `;
        }
        
        if (currentUser.pictureUrl && userAvatar) {
            userAvatar.src = currentUser.pictureUrl;
            userAvatar.style.display = 'block';
        }

        // [ITEM 4] Inject logout entry natively to user-area
        if (userArea && !document.getElementById('header-logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'header-logout-btn';
            logoutBtn.className = 'action-btn';
            logoutBtn.textContent = '登出';
            logoutBtn.style.cssText = 'padding: 4px 8px; font-size: 0.8rem; width: auto; background: var(--surface-bg, #fff); color: var(--text-main, #333); border: 1px solid var(--border-color, #ccc); cursor: pointer; border-radius: 4px;';
            logoutBtn.onclick = window.forceLiffRelogin;
            userArea.appendChild(logoutBtn);
        }

    } else {
        if(userArea) userArea.style.display = 'none';
        if(loginBtn) loginBtn.style.display = 'block';
        if(userAvatar) {
            userAvatar.style.display = 'none';
            userAvatar.src = '';
        }
        if(userName) userName.innerHTML = '載入中...';
        
        const logoutBtn = document.getElementById('header-logout-btn');
        if(logoutBtn) logoutBtn.remove();
    }
}

function bindEvents() {
    document.getElementById('login-btn').onclick = () => {
        if (typeof liff !== 'undefined' && LIFF_ID) window.manualLiffLogin(); 
    };

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view; 
            renderLeads();
        };
    });

    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearBtn.style.display = e.target.value ? 'flex' : 'none';
            renderLeads();
        });
    }
    if (clearBtn) {
        clearBtn.onclick = () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            renderLeads();
        };
    }

    // [ITEM 2] Decouple close logic. Close only the immediate parent modal
    document.querySelectorAll('.close-modal').forEach(el => {
        el.onclick = function() {
            const parentModal = this.closest('.modal');
            if (parentModal) parentModal.style.display = 'none';
        };
    });
    
    // [ITEM 1] Fix mobile close bug. Bind strictly to modal background (event.target === this)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });

    const editForm = document.getElementById('edit-form');
    if (editForm) editForm.onsubmit = handleEditSubmit;

    const deleteBtn = document.getElementById('delete-lead-btn');
    if (deleteBtn) deleteBtn.onclick = handleDeleteSubmit;
}

async function getValidIdToken() {
    if (!liff.isLoggedIn()) {
        console.warn('[Auth] Token 取得失敗: LIFF 尚未登入');
        return null;
    }

    const token = liff.getIDToken();
    if (!token) {
        console.warn('[Auth] Token 取得失敗: ID Token 為空');
        return null;
    }

    return token;
}

// ============================================================================
// [Phase 8.4/16.8.0] Exhibition Feature Methods
// Contextual Mode Banner & Dynamic UI Theming
// ============================================================================

// Helper: Converts HEX to RGBA safely for dynamic theme injection
function hexToRgba(hex, opacity) {
    if (!hex || typeof hex !== 'string') return null;
    hex = hex.replace('#', '');
    if (hex.length !== 6) return null;
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    
    const alpha = (opacity !== undefined && opacity !== null && opacity !== '') 
        ? parseFloat(opacity) 
        : 1;
        
    if (isNaN(alpha)) return null;
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isExhibitionActive(config) {
    if (!config || String(config.exhibition_enabled).toUpperCase() !== 'TRUE') return false;
    
    if (!config.exhibition_start_date || !config.exhibition_end_date) return false;

    // Use simple, normalized local date comparison to avoid timezone drift
    const now = new Date();
    // Reset time portions for strict date boundary comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Parse the config dates (assuming YYYY-MM-DD format)
    const startDateParts = config.exhibition_start_date.split('-');
    const endDateParts = config.exhibition_end_date.split('-');
    
    if (startDateParts.length !== 3 || endDateParts.length !== 3) return false;

    const start = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
    const end = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

    return today >= start && today <= end;
}

function renderExhibitionBanner() {
    const existingBanner = document.getElementById('exhibition-info-banner');
    if (existingBanner) existingBanner.remove();

    // Clean up old standalone pill if it exists
    const oldPill = document.getElementById('exhibition-filter-pill');
    if (oldPill) oldPill.remove();

    if (!isExhibitionActive(currentExhibitionConfig)) return;

    const startDateParts = currentExhibitionConfig.exhibition_start_date.split('-');
    const endDateParts = currentExhibitionConfig.exhibition_end_date.split('-');
    
    // Format to M/D safely
    const startMD = `${parseInt(startDateParts[1], 10)}/${parseInt(startDateParts[2], 10)}`;
    const endMD = `${parseInt(endDateParts[1], 10)}/${parseInt(endDateParts[2], 10)}`;
    const exName = (currentExhibitionConfig.exhibition_name || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Create banner DOM
    const bannerEl = document.createElement('div');
    bannerEl.id = 'exhibition-info-banner';
    // Two-line contextual mode styling: Light blue tint, strong left border, compact flex-column.
    bannerEl.style.cssText = 'background-color: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0ea5e9; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;';
    
    bannerEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="font-weight: 600; color: #0f172a; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">
                📢 ${exName} 期間（${startMD} - ${endMD}）
            </div>
            <div style="flex-shrink: 0;">
                <span id="inline-exhibition-toggle" style="color: #0284c7; cursor: pointer; font-weight: 600; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;">
                    EXPO名片
                </span>
            </div>
        </div>
        <div style="font-size: 0.75rem; color: #64748b; line-height: 1.2;">
            本期間掃描的名片將自動標記為展示會名片
        </div>
    `;

    // Inject INSIDE the already-sticky controls-section at the very top (prepend)
    const controlsContainer = document.querySelector('.controls-section');
    if (controlsContainer) {
        controlsContainer.prepend(bannerEl);
    } else {
        // Fallback injection if controls-section is missing structurally
        const gridContainer = document.getElementById('leads-grid');
        if (gridContainer && gridContainer.parentNode) {
            gridContainer.insertAdjacentElement('beforebegin', bannerEl);
        }
    }

    // Attach inline toggle event
    const toggleBtn = bannerEl.querySelector('#inline-exhibition-toggle');
    if (toggleBtn) {
        toggleBtn.onclick = function() {
            showExhibitionOnly = !showExhibitionOnly;
            renderLeads();
        };
    }
}

// Minimal inline text update for the toggle
function updateExhibitionInlineToggle(count) {
    const toggleBtn = document.getElementById('inline-exhibition-toggle');
    if (!toggleBtn) return;

    if (showExhibitionOnly) {
        toggleBtn.textContent = `顯示全部`;
        toggleBtn.style.backgroundColor = '#e0f2fe'; // subtle active state
    } else {
        toggleBtn.textContent = `EXPO名片`;
        toggleBtn.style.backgroundColor = 'transparent';
    }
}
// ============================================================================


async function loadLeadsData() {
    const loadingEl = document.getElementById('loading-indicator');
    const gridEl = document.getElementById('leads-grid');
    
    if (!currentUser.userId) return;

    toggleContentVisibility(true); 
    if(loadingEl) loadingEl.style.display = 'block';
    if(gridEl) gridEl.style.display = 'none';
    
    try {
        const headers = { 
            'Content-Type': 'application/json'
        };

        if (currentUser.userId === 'TEST_LOCAL_USER') {
            headers['Authorization'] = 'Bearer TEST_LOCAL_TOKEN';
        } else {
            const idToken = await getValidIdToken();
            if (!idToken) {
                console.warn('[Auth] Missing token, skip request.');
                if(loadingEl) loadingEl.style.display = 'none';
                return;
            }
            
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('/api/line/leads', { headers });
        
        if (response.status === 401) {
            showAuthFailedFallback();
            return;
        }
        
        const result = await response.json();
        
        if (response.status === 403) {
            toggleContentVisibility(false);
            showAccessDenied(result.yourUserId);
            return;
        }

        if (result.success) {
            allLeads = result.data;
            
            // Extract config from payload and initialize UI enhancements safely
            if (result.exhibitionConfig) {
                currentExhibitionConfig = result.exhibitionConfig;
                renderExhibitionBanner();
            }

            if(loadingEl) loadingEl.style.display = 'none';
            if(gridEl) gridEl.style.display = 'flex'; 
            updateCounts();
            renderLeads();
        } else {
            throw new Error(result.message || '資料載入失敗');
        }
    } catch (error) {
        console.error(error);
        if(loadingEl) loadingEl.innerHTML = `<p style="color:red">發生錯誤: ${error.message}</p>`;
    }
}

function updateCounts() {
    document.getElementById('count-all').textContent = allLeads.length;
    
    const myCount = allLeads.filter(l => l.lineUserId === currentUser.userId).length;
    document.getElementById('count-mine').textContent = myCount;
    
    const pendingCount = allLeads.filter(l => {
        const hasName = l.name && l.name.trim() !== '';
        const hasCompany = l.company && l.company.trim() !== '';
        return !hasName || !hasCompany;
    }).length;
    document.getElementById('count-pending').textContent = pendingCount;

    // [ITEM 6] Compute strictly owned pending leads for visual reminder
    const myPendingCount = allLeads.filter(l => {
        const isMine = l.lineUserId === currentUser.userId;
        const hasName = l.name && l.name.trim() !== '';
        const hasCompany = l.company && l.company.trim() !== '';
        return isMine && (!hasName || !hasCompany);
    }).length;

    const reminderEl = document.getElementById('my-pending-reminder');
    if (reminderEl) {
        if (myPendingCount > 0) {
            reminderEl.textContent = `⚠️ 你有 ${myPendingCount} 張待確認名片`;
            reminderEl.style.display = 'block';
        } else {
            reminderEl.style.display = 'none';
        }
    }
}

function renderLeads() {
    const grid = document.getElementById('leads-grid');
    const emptyState = document.getElementById('empty-state');
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

    if (!grid) return;

    let filtered = allLeads.filter(lead => {
        const hasName = lead.name && lead.name.trim() !== '';
        const hasCompany = lead.company && lead.company.trim() !== '';
        const isPending = !hasName || !hasCompany;

        // Core state machine evaluation
        if (currentView === 'mine' && lead.lineUserId !== currentUser.userId) return false;
        if (currentView === 'pending' && !isPending) return false;

        // Search text evaluation
        if (searchTerm) {
            const text = `${lead.name} ${lead.company} ${lead.position}`.toLowerCase();
            if (!text.includes(searchTerm)) return false;
        }

        // Layered Boolean Evaluation for Exhibition Filter
        if (showExhibitionOnly) {
            const isEx = lead.is_exhibition === true || String(lead.is_exhibition).toUpperCase() === 'TRUE';
            if (!isEx) return false;
        }

        return true;
    });

    // Update the inline toggle state
    updateExhibitionInlineToggle(filtered.length);

    if (filtered.length === 0) {
        grid.style.display = 'none';
        if(emptyState) emptyState.style.display = 'block';
        return;
    }

    grid.style.display = 'flex'; 
    if(emptyState) emptyState.style.display = 'none';
    grid.innerHTML = filtered.map(lead => createCardHTML(lead)).join('');
}

function createCardHTML(lead) {
    const isMine = (lead.lineUserId === currentUser.userId);
    
    const hasName = lead.name && lead.name.trim() !== '';
    const hasCompany = lead.company && lead.company.trim() !== '';
    
    let missingText = '';
    if (!hasName && !hasCompany) missingText = '缺姓名 + 公司';
    else if (!hasName) missingText = '缺姓名';
    else if (!hasCompany) missingText = '缺公司';

    const safe = (str) => (str || '').replace(/"/g, '&quot;');
    const safeHtml = (str) => (str || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const leadJson = JSON.stringify(lead).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

    const isLocalDev = (currentUser.userId === 'TEST_LOCAL_USER');
    const showEditBtn = isLocalDev || isMine;

    const ownerName = lead.userNickname || 'Unknown';
    const ownerText = isMine ? `👤 我的` : `👤 ${ownerName}`;
    
    const statusBadgeHtml = missingText 
        ? `<span class="badge warning-badge badge-top-left">⚠ ${missingText}</span>` 
        : '';

    const imageUrl = lead.driveLink && lead.driveLink !== 'undefined' && lead.driveLink !== 'null'
        ? `/api/drive/thumbnail?link=${encodeURIComponent(lead.driveLink)}`
        : null;

    const imageHtml = imageUrl 
        ? `<img src="${imageUrl}" alt="名片" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder\\'>📇</div>';">`
        : `<div class="placeholder">📇</div>`;

    const isExhibition = lead.is_exhibition === true || String(lead.is_exhibition).toUpperCase() === 'TRUE';
    
    // Dynamic Theming: Safe default colors
    let triangleBgColor = 'rgba(37, 99, 235, 0.85)';
    let bottomBarBgColor = 'rgba(15, 23, 42, 0.4)';
    
    // Dynamic Theming: Override with system config if valid HEX/opacity is present
    if (isExhibition && currentExhibitionConfig) {
        const customTriangle = hexToRgba(currentExhibitionConfig.exhibition_triangle_color, currentExhibitionConfig.exhibition_triangle_opacity);
        if (customTriangle) triangleBgColor = customTriangle;
        
        const customBar = hexToRgba(currentExhibitionConfig.exhibition_bar_color, currentExhibitionConfig.exhibition_bar_opacity);
        if (customBar) bottomBarBgColor = customBar;
    }
    
    // 1) Corner Triangle Tag (Fixed Mode Indicator) - Colors dynamically injected
    const exhibitionCornerTagHtml = isExhibition
        ? `<div style="position: absolute; top: 0; left: 0; width: 44px; height: 44px; background: ${triangleBgColor}; clip-path: polygon(0 0, 100% 0, 0 100%); z-index: 9; pointer-events: none;">
               <span style="position: absolute; top: 5px; left: 6px; color: white; font-size: 12px; font-weight: 700; line-height: 1;">展</span>
           </div>`
        : '';

    // 2) Bottom Info Bar (Primary readable info) - Colors dynamically injected, displaying normalized label from RAW R
    const exhibitionBottomBarHtml = isExhibition && lead.exhibition_name
        ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: ${bottomBarBgColor}; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); color: white; font-size: 12px; font-weight: 500; letter-spacing: 0.3px; padding: 5px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 9; pointer-events: none; text-align: center;">${safeHtml(lead.exhibition_name)}</div>`
        : '';

    return `
        <div class="v6-list-item ${isMine ? 'is-mine' : ''}">
            <div class="image-top-right">
                <div class="owner-tag">${safeHtml(ownerText)}</div>
                ${showEditBtn ? `<button class="edit-pill-btn" onclick='event.stopPropagation(); openEdit(${leadJson})'>✏️ 編輯</button>` : ''}
            </div>
            
            <div class="item-image" onclick='openPreview("${safe(lead.driveLink)}")' title="點擊看原圖" style="position: relative;">
                ${exhibitionCornerTagHtml}
                ${statusBadgeHtml}
                ${exhibitionBottomBarHtml}
                ${imageHtml}
            </div>
            
            <div class="item-info">
                <div class="identity-zone">
                    <div class="info-name ${!hasName ? 'text-missing' : ''}">${hasName ? safeHtml(lead.name) : '未命名'}</div>
                    <div class="company-row">
                        ${lead.company ? `<span class="company-pill">${safeHtml(lead.company)}</span>` : ''}
                        ${lead.position ? `<span class="position-text">${safeHtml(lead.position)}</span>` : ''}
                    </div>
                </div>
                
                <div class="info-body">
                    ${lead.mobile ? `<div class="info-line">📱 ${safeHtml(lead.mobile)}</div>` : ''}
                    ${lead.email ? `<div class="info-line">📧 ${safeHtml(lead.email)}</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function openPreview(driveLink) {
    if (!driveLink || driveLink === 'undefined' || driveLink === 'null') { 
        alert('此名片沒有圖片連結'); 
        return; 
    }
    
    const modal = document.getElementById('preview-modal');
    const container = document.getElementById('preview-image-container');
    const downloadLink = document.getElementById('preview-download-link');
    
    modal.style.display = 'block';
    container.innerHTML = '<div class="spinner"></div>';
    
    const previewUrl = `/api/drive/thumbnail?link=${encodeURIComponent(driveLink)}`;
    const img = new Image();
    
    img.onload = () => {
        container.innerHTML = '';
        container.appendChild(img);
    };
    
    img.onerror = () => {
        console.error('名片預覽載入失敗');
        container.innerHTML = '<p style="color:red">圖片無法載入</p>';
    };
    
    img.src = previewUrl;
    img.alt = "名片預覽";
    downloadLink.href = driveLink;
}

function openEdit(lead) {
    const modal = document.getElementById('edit-modal');
    
    let previewContainer = document.getElementById('edit-preview-container');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'edit-preview-container';
        previewContainer.className = 'edit-preview';
        const form = document.getElementById('edit-form');
        form.insertBefore(previewContainer, form.firstChild);
    }
    
    if (lead.driveLink && lead.driveLink !== 'undefined' && lead.driveLink !== 'null') {
        const previewUrl = `/api/drive/thumbnail?link=${encodeURIComponent(lead.driveLink)}`;
        const safeLink = (lead.driveLink || '').replace(/"/g, '&quot;');
        // [ITEM 3] Thumbnail explicitly calls openPreview()
        previewContainer.innerHTML = `<img src="${previewUrl}" alt="名片預覽" style="cursor: pointer;" onclick='openPreview("${safeLink}")' title="點擊放大預覽" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder\\'>📇</div>';">`;
    } else {
        previewContainer.innerHTML = `<div class="placeholder">📇</div>`;
    }

    document.getElementById('edit-rowIndex').value = lead.rowIndex;
    document.getElementById('edit-name').value = lead.name || '';
    document.getElementById('edit-position').value = lead.position || '';
    document.getElementById('edit-company').value = lead.company || '';
    document.getElementById('edit-mobile').value = lead.mobile || '';
    document.getElementById('edit-email').value = lead.email || '';
    document.getElementById('edit-notes').value = ''; 

    // [Fallback Auto-Tag] Conditional rendering of the Exhibition control UI
    const oldDynamicGroup = document.getElementById('dynamic-exhibition-group');
    if (oldDynamicGroup) oldDynamicGroup.remove();

    if (lead.is_exhibition != null && lead.is_exhibition !== '') {
        const form = document.getElementById('edit-form');
        const notesEl = document.getElementById('edit-notes');
        
        if (form && notesEl && notesEl.parentNode) {
            const isChecked = lead.is_exhibition === true || String(lead.is_exhibition).toUpperCase() === 'TRUE';
            const safeExName = (lead.exhibition_name || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            const exGroup = document.createElement('div');
            exGroup.id = 'dynamic-exhibition-group';
            exGroup.className = 'form-group';
            // Embedding hidden input to strictly preserve exhibition string payload against loss during update flow
            exGroup.innerHTML = `
                <input type="hidden" id="edit-exhibition-name" value="${safeExName}">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: 500; cursor: pointer; margin-bottom: 4px;">
                    <input type="checkbox" id="edit-is-exhibition" ${isChecked ? 'checked' : ''} style="width: auto; margin: 0;">
                    <span>設為展會名片</span>
                </label>
                <div style="font-size: 0.85rem; color: var(--text-sub);">展會名稱: ${safeExName || '未指定'}</div>
            `;
            
            form.insertBefore(exGroup, notesEl.parentNode);
        }
    }

    const isLocalDev = (currentUser.userId === 'TEST_LOCAL_USER');
    const isMine = (lead.lineUserId === currentUser.userId);
    const showDeleteBtn = isLocalDev || isMine;
    
    const deleteBtn = document.getElementById('delete-lead-btn');
    if (deleteBtn) {
        deleteBtn.style.display = showDeleteBtn ? 'block' : 'none';
        deleteBtn.dataset.rowIndex = lead.rowIndex;
    }

    modal.style.display = 'block';
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '儲存中...';

    const rowIndex = document.getElementById('edit-rowIndex').value;
    const data = {
        name: document.getElementById('edit-name').value,
        position: document.getElementById('edit-position').value,
        company: document.getElementById('edit-company').value,
        mobile: document.getElementById('edit-mobile').value,
        email: document.getElementById('edit-email').value,
        modifier: currentUser.displayName 
    };
    
    const notes = document.getElementById('edit-notes').value.trim();
    if (notes) data.notes = notes;

    // [Fallback Auto-Tag] Safely extraction to explicitly prevent exhibition string loss
    const exToggle = document.getElementById('edit-is-exhibition');
    const exNameInput = document.getElementById('edit-exhibition-name');
    if (exToggle && exNameInput) {
        data.is_exhibition = exToggle.checked;
        data.exhibition_name = exNameInput.value;
    }

    try {
        const headers = { 
            'Content-Type': 'application/json'
        };

        if (currentUser.userId === 'TEST_LOCAL_USER') {
            headers['Authorization'] = 'Bearer TEST_LOCAL_TOKEN';
        } else {
            const idToken = await getValidIdToken();
            if (!idToken) {
                console.warn('[Auth] Missing token, skip request.');
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        const res = await fetch(`/api/line/leads/${rowIndex}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        if (res.status === 401) {
            document.getElementById('edit-modal').style.display = 'none';
            showAuthFailedFallback();
            return;
        }

        if (res.status === 403) {
            alert('您沒有權限執行此操作');
            return;
        }

        const result = await res.json();
        
        if (result.success) {
            alert('更新成功！');
            document.getElementById('edit-modal').style.display = 'none';
            loadLeadsData();
        } else {
            alert('更新失敗: ' + result.error);
        }
    } catch (e) {
        alert('網路錯誤');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function handleDeleteSubmit(e) {
    const rowIndex = e.target.dataset.rowIndex;
    if (!rowIndex) return;

    if (!window.confirm('確定要刪除這張名片嗎？此動作無法復原。')) {
        return;
    }

    const deleteBtn = e.target;
    const saveBtn = document.querySelector('#edit-form button[type="submit"]');
    const originalDeleteText = deleteBtn.textContent;
    
    deleteBtn.disabled = true;
    deleteBtn.textContent = '刪除中...';
    if (saveBtn) saveBtn.disabled = true;

    try {
        const headers = { 'Content-Type': 'application/json' };

        if (currentUser.userId === 'TEST_LOCAL_USER') {
            headers['Authorization'] = 'Bearer TEST_LOCAL_TOKEN';
        } else {
            const idToken = await getValidIdToken();
            if (!idToken) {
                console.warn('[Auth] Missing token, skip request.');
                deleteBtn.disabled = false;
                deleteBtn.textContent = originalDeleteText;
                if (saveBtn) saveBtn.disabled = false;
                return;
            }
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        const res = await fetch(`/api/line/leads/${rowIndex}`, {
            method: 'DELETE',
            headers: headers
        });

        if (res.status === 401) {
            document.getElementById('edit-modal').style.display = 'none';
            showAuthFailedFallback();
            return;
        }

        if (res.status === 403 || res.status === 404) {
            const errData = await res.json();
            alert(errData.message || '您沒有權限執行此操作');
            return;
        }

        const result = await res.json();
        
        if (result.success) {
            alert('刪除成功！');
            document.getElementById('edit-modal').style.display = 'none';
            loadLeadsData();
        } else {
            alert('刪除失敗: ' + (result.message || result.error));
        }
    } catch (e) {
        alert('網路錯誤');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalDeleteText;
        if (saveBtn) saveBtn.disabled = false;
    }
}