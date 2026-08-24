// File: public/scripts/leads-view.js
// Version: 16.10.3
// Date: 2026-05-15
// Change Log:
// - 2026-05-15: Extended RAW lead search to include department, phone, mobile, email, and notes.
// - 2026-05-15: Enabled RAW lead department and notes editing against existing Sheet columns E and W.
// - 2026-05-15: Unified lead card role display to department plus jobTitle/position without changing RAW edit schema.
// Changelog: 
//   - V16.10.0 Delete Feature: Added handleDeleteSubmit and delete button visibility toggling based on card ownership.
//   - V16.9.0 Exhibition UI Cleanup: Surgically removed the legacy exhibition badge (pill) to eliminate visual clutter and ghosting. The visual system now strictly relies on the Corner Triangle (mode) and Bottom Info Bar (information) without redundancy.
//   - V16.8.0 Exhibition UI Theming: Added dynamic color and opacity injection from System Config for the exhibition corner triangle and bottom info bar. Implemented robust hexToRgba helper and safe fallbacks to guarantee UI stability.
//   - V16.7.0 Exhibition Display Normalization: Stopped frontend date reconstruction for exhibition labels. The bottom info bar now purely renders the pre-formatted label from RAW column R, ensuring future/historical data integrity and multi-exhibition support without drift.
//   - V16.6.0 Exhibition UX Polish: Fine-tuned corner triangle mode indicator (size, color, text centering) and bottom info bar (centered text, softer backdrop blur, integrated date range formatting) for a balanced, production-ready visual finish.
// Description: Logic controller for Lead View V6.3 (Reading Structure + Desktop Pill Position) and simplified strict LIFF Auth.

let allLeads = [];
const LEAD_LIST_PAGE_SIZE = 50;
let currentUser = {
    userId: null,
    displayName: '訪客',
    pictureUrl: null,
    username: null,
    role: null,
    authSource: null
};
let currentView = 'all'; 
let leadPagination = {
    currentPage: 1,
    pageSize: LEAD_LIST_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
    counts: { all: 0, mine: 0, pending: 0, myPending: 0 }
};
let leadListRequestId = 0;

function leadDriveImageProxyUrl(driveLink, representation = 'source', profile = 'card') {
    const params = [`representation=${encodeURIComponent(representation)}`];
    if (representation === 'thumbnail') params.push(`profile=${encodeURIComponent(profile)}`);
    params.push(`link=${encodeURIComponent(driveLink)}`);
    return `/api/drive/thumbnail?${params.join('&')}`;
}

// [Phase 8.4 Exhibition UX] Independent filter state and globally stored config
let showExhibitionOnly = false;
let currentExhibitionConfig = null;
let lineLeadRecoveryAttempted = false;
let lastLineLeadDeniedUserId = null;
const LOCAL_LINE_LEAD_MANUAL_LOGIN_KEY = 'line-lead-local-manual-login';
const LIFF_RETURN_TARGET_KEY = 'tfc_liff_return_target';
const LIFF_LOGIN_ATTEMPT_KEY = 'tfc-liff-bridge-login-attempt';
const LIFF_EXPIRED_TOKEN_RECOVERY_KEY = 'tfc-liff-expired-token-recovery';
const ocrAuthCopy = Object.freeze({
    product: '名片管理',
    message: '請先使用 LINE 登入後繼續',
    verifying: '正在檢查登入狀態...',
    forbidden: '此 LINE 帳號尚未開通使用權限。'
});

function isLocalDevelopment() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function isMobileBrowser() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

function localManualLoginEnabled() {
    try {
        return isLocalDevelopment() && sessionStorage.getItem(LOCAL_LINE_LEAD_MANUAL_LOGIN_KEY) === '1';
    } catch (_) {
        return false;
    }
}

function crmToken() {
    try {
        return localStorage.getItem('crmToken') || localStorage.getItem('crm-token') || '';
    } catch (_) {
        return '';
    }
}

function crmAuthorizationHeaders() {
    const token = crmToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function isCrmSystemManagerUser() {
    return currentUser.authSource === 'crm' && currentUser.role === 'system_manager' && Boolean(crmToken());
}

function setLocalManualLoginEnabled(enabled) {
    if (!isLocalDevelopment()) return;
    try {
        if (enabled) sessionStorage.setItem(LOCAL_LINE_LEAD_MANUAL_LOGIN_KEY, '1');
        else sessionStorage.removeItem(LOCAL_LINE_LEAD_MANUAL_LOGIN_KEY);
    } catch (_) {
        // Local test state is only an auto-login UI preference; session cookie remains authoritative.
    }
}

function storeLiffReturnTarget() {
    try {
        sessionStorage.setItem(LIFF_RETURN_TARGET_KEY, 'ocr');
        return true;
    } catch (error) {
        console.warn('[Auth] Unable to store LINE return target:', error.message);
        return false;
    }
}

function clearStaleLiffLoginAttempt() {
    try {
        sessionStorage.removeItem(LIFF_LOGIN_ATTEMPT_KEY);
        sessionStorage.removeItem(LIFF_EXPIRED_TOKEN_RECOVERY_KEY);
    } catch (_) {
        // LIFF auth markers are non-auth loop-prevention state.
    }
}

function liffBridgeLoginUrl() {
    if (isMobileBrowser()) {
        const bridgeUrl = new URL('/liff/', window.location.origin);
        bridgeUrl.searchParams.set('product', 'ocr');
        return bridgeUrl.toString();
    }

    const liffId = typeof LIFF_ID !== 'undefined' ? LIFF_ID : window.LIFF_ID;
    if (liffId) {
        const liffUrl = new URL(`https://liff.line.me/${encodeURIComponent(liffId)}/`);
        liffUrl.searchParams.set('product', 'ocr');
        return liffUrl.toString();
    }

    const bridgeUrl = new URL('/liff/', window.location.origin);
    bridgeUrl.searchParams.set('product', 'ocr');
    return bridgeUrl.toString();
}

function clearLiffReturnTarget() {
    try {
        sessionStorage.removeItem(LIFF_RETURN_TARGET_KEY);
    } catch (_) {
        // Routing state is non-auth, temporary browser state.
    }
}

function getRawContactIdentifier(record) {
    if (!record) return null;
    if (record.cardId) return String(record.cardId);

    const rowIndex = Number(record.rowIndex);
    return Number.isInteger(rowIndex) && rowIndex > 0 ? String(rowIndex) : null;
}

document.addEventListener('DOMContentLoaded', async () => {
    // [ITEM 5] Start with a neutral verifying state instead of jarring login prompt
    toggleContentVisibility(false, 'verifying');
    bindEvents();
    await initLIFF();
});

window.manualLiffLogin = async function() {
    console.warn('[Auth] Manual login triggered.');
    if (isLocalDevelopment()) {
        await window.localLineLeadTestLogin();
        return;
    }
    clearStaleLiffLoginAttempt();
    if (!storeLiffReturnTarget()) return;
    window.location.assign(liffBridgeLoginUrl());
};

window.localLineLeadTestLogin = async function() {
    if (!isLocalDevelopment()) return;
    setLocalManualLoginEnabled(true);
    const created = await createLineLeadSessionFromLiff({ forceLocal: true });
    if (created === true) {
        await loadLeadsData();
    }
};

window.localLineLeadTestLogout = async function() {
    if (!isLocalDevelopment()) return;
    setLocalManualLoginEnabled(false);
    try {
        await fetch('/api/line/session', {
            method: 'DELETE',
            credentials: 'same-origin'
        });
    } catch (error) {
        console.warn('[Auth] Local test session logout request failed:', error.message);
    }
    clearLiffReturnTarget();
    resetCurrentUser();
    toggleContentVisibility(false, 'login');
};

window.forceLiffRelogin = async function() {
    console.warn('[Auth] Logging out and clearing Line Lead session.');
    try {
        await fetch('/api/line/session', {
            method: 'DELETE',
            credentials: 'same-origin'
        });
    } catch (error) {
        console.warn('[Auth] Session logout request failed:', error.message);
    }

    try {
        if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
            liff.logout();
        }
    } catch (error) {
        console.warn('[Auth] LIFF logout skipped:', error.message);
    }

    clearLiffReturnTarget();
    resetCurrentUser();
    location.reload();
};

function showAuthFailedFallback() {
    console.warn('[Auth] 401 detected. Halting operations, clearing UI state, and displaying manual fallback.');
    
    resetCurrentUser();

    // [ITEM 5] Use the explicit expired state
    toggleContentVisibility(false, 'expired'); 
}

function resetCurrentUser() {
    updateUserUI(false);
    currentUser.userId = null;
    currentUser.displayName = '訪客';
    currentUser.pictureUrl = null;
    currentUser.username = null;
    currentUser.role = null;
    currentUser.authSource = null;
}

function applyAuthenticatedUser(sessionUser) {
    currentUser.userId = sessionUser.userId;
    currentUser.displayName = sessionUser.displayName || sessionUser.userId;
    currentUser.pictureUrl = sessionUser.pictureUrl || null;
    currentUser.username = sessionUser.username || null;
    currentUser.role = sessionUser.role || null;
    currentUser.authSource = sessionUser.authSource || null;
    updateUserUI(true);
}

function toggleContentVisibility(show, state = 'login') {
    const controls = document.querySelector('.controls-section');
    const main = document.querySelector('.leads-container');
    const header = document.querySelector('.main-header');
    const sidebar = document.querySelector('.ocr-sidebar');
    const lineBotLink = document.querySelector('.line-bot-link');
    const appContainer = document.querySelector('.app-container');
    let promptDiv = document.getElementById('login-prompt'); 

    if (show) {
        document.body.classList.remove('ocr-auth-state');
        if(appContainer) appContainer.classList.remove('ocr-auth-container');
        if(header) header.style.display = '';
        if(sidebar) sidebar.style.display = '';
        if(lineBotLink) lineBotLink.style.display = '';
        if(controls) controls.style.display = 'flex';
        if(main) main.style.display = 'block';
        if(promptDiv) promptDiv.style.display = 'none';
    } else {
        document.body.classList.add('ocr-auth-state');
        if(appContainer) appContainer.classList.add('ocr-auth-container');
        if(header) header.style.display = 'none';
        if(sidebar) sidebar.style.display = 'none';
        if(lineBotLink) lineBotLink.style.display = 'none';
        if(controls) controls.style.display = 'none';
        if(main) main.style.display = 'none';
        
        // Dynamically create or update prompt structure
        if (!promptDiv) {
            promptDiv = document.createElement('div');
            promptDiv.id = 'login-prompt';
            promptDiv.className = 'ocr-auth-gate'; 
            
            const header = document.querySelector('.main-header');
            if(header && header.parentNode) {
                header.parentNode.insertBefore(promptDiv, header.nextSibling);
            }
        }
        
        promptDiv.className = `ocr-auth-gate ocr-auth-${state}`;
        promptDiv.style.display = 'flex';
        promptDiv.innerHTML = renderOcrAuthGate(state);
    }
}

function renderOcrAuthGate(state = 'login', userId = '') {
    const isVerifying = state === 'verifying';
    const isForbidden = state === 'forbidden';
    const isExpired = state === 'expired';
    const message = isVerifying
        ? ocrAuthCopy.verifying
        : isForbidden
            ? ocrAuthCopy.forbidden
            : isExpired
                ? '登入狀態已失效，請重新登入。'
                : ocrAuthCopy.message;
    const localControl = isLocalDevelopment() && !isVerifying && !isForbidden
        ? `
            <div class="ocr-local-auth-control" aria-label="本機測試">
                <span>本機測試</span>
                <button class="login-btn ocr-auth-button ocr-local-auth-button" type="button" onclick="window.localLineLeadTestLogin()">本機測試登入</button>
            </div>
        `
        : '';
    const deniedUser = isForbidden && userId ? `<small class="ocr-auth-denied-id">${escapeAuthHtml(userId)}</small>` : '';
    const primaryAction = isVerifying || isForbidden
        ? ''
        : `<button class="login-btn ocr-auth-button" type="button" onclick="window.manualLiffLogin()">使用 LINE 登入</button>`;
    const messageMarkup = state === 'login' ? '' : `<p>${message}</p>`;

    return `
        <main class="ocr-auth-panel" aria-live="${isVerifying ? 'polite' : 'off'}">
            <div class="ocr-auth-main">
                <img src="/images/portal/ocr.png" alt="FANUC card OCR" class="ocr-auth-logo">
                <h1>${ocrAuthCopy.product}</h1>
                ${messageMarkup}
                ${deniedUser}
                ${isVerifying ? '<div class="ocr-auth-status" role="status">驗證中</div>' : primaryAction}
            </div>
            ${localControl}
        </main>
    `;
}

function escapeAuthHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function showAccessDenied(userId) {
    const promptDiv = document.getElementById('login-prompt');
    if (promptDiv) {
        promptDiv.innerHTML = renderOcrAuthGate('forbidden', userId);
        promptDiv.style.display = 'flex';
    }
}

async function initLIFF() {
    try {
        const existingSession = await fetch('/api/line/session', {
            credentials: 'same-origin',
            headers: crmAuthorizationHeaders()
        });

        if (existingSession.ok) {
            const result = await existingSession.json();
            applyAuthenticatedUser(result);
            loadLeadsData();
            return;
        }

        if (existingSession.status === 403) {
            const result = await existingSession.json();
            toggleContentVisibility(false);
            showAccessDenied(result.yourUserId);
            return;
        }

        if (existingSession.status !== 401) {
            showAuthFailedFallback();
            return;
        }

        if (isLocalDevelopment() && !localManualLoginEnabled()) {
            updateUserUI(false);
            toggleContentVisibility(false, 'login');
            return;
        }

        if (!isLocalDevelopment()) {
            updateUserUI(false);
            toggleContentVisibility(false, 'login');
            return;
        }

        const sessionCreated = await createLineLeadSessionFromLiff();
        if (sessionCreated === true) {
            loadLeadsData();
        }
    } catch (error) {
        console.error('Line Lead session init error:', error);
        toggleContentVisibility(false, 'login');
    }
}

function updateUserUI(isLoggedIn) {
    const userArea = document.getElementById('user-area');
    const loginBtn = document.getElementById('login-btn');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const userAvatarFallback = document.getElementById('user-avatar-fallback');
    
    if (isLoggedIn) {
        if(userArea) {
            userArea.style.display = 'flex';
            userArea.style.alignItems = 'center';
            userArea.style.gap = '';
        }
        if(loginBtn) loginBtn.style.display = 'none';
        
        // [ITEM 6] Inject pending reminder DOM placeholder
        if(userName) {
            userName.innerHTML = `
                <div class="user-name-copy">
                    <span>你好，${currentUser.displayName}</span>
                    <span id="my-pending-reminder" style="display:none; color: var(--accent-red); font-size: 0.75rem; margin-top: 2px;"></span>
                </div>
            `;
        }
        
        if (currentUser.pictureUrl && userAvatar) {
            userAvatar.src = currentUser.pictureUrl;
            userAvatar.style.display = 'block';
            if (userAvatarFallback) userAvatarFallback.style.display = 'none';
        } else {
            if (userAvatar) {
                userAvatar.style.display = 'none';
                userAvatar.src = '';
            }
            if (userAvatarFallback) {
                const fallbackName = String(currentUser.displayName || currentUser.userId || 'TFC').trim();
                userAvatarFallback.textContent = Array.from(fallbackName).slice(0, 2).join('').toUpperCase();
                userAvatarFallback.style.display = 'grid';
            }
        }

        // [ITEM 4] Inject logout entry natively to user-area
        if (userArea && !document.getElementById('header-logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'header-logout-btn';
            logoutBtn.className = 'action-btn';
            logoutBtn.textContent = '登出';
            logoutBtn.onclick = window.forceLiffRelogin;
            userArea.appendChild(logoutBtn);
        }

        if (isLocalDevelopment() && userArea && !document.getElementById('local-test-logout-btn')) {
            const localLogoutBtn = document.createElement('button');
            localLogoutBtn.id = 'local-test-logout-btn';
            localLogoutBtn.className = 'action-btn local-test-logout-btn';
            localLogoutBtn.textContent = '本機測試登出';
            localLogoutBtn.onclick = window.localLineLeadTestLogout;
            userArea.appendChild(localLogoutBtn);
        }

    } else {
        if(userArea) userArea.style.display = 'none';
        if(loginBtn) loginBtn.style.display = 'block';
        if(userAvatar) {
            userAvatar.style.display = 'none';
            userAvatar.src = '';
        }
        if(userAvatarFallback) {
            userAvatarFallback.style.display = 'none';
            userAvatarFallback.textContent = '';
        }
        if(userName) userName.innerHTML = '載入中...';
        
        const logoutBtn = document.getElementById('header-logout-btn');
        if(logoutBtn) logoutBtn.remove();

        const localLogoutBtn = document.getElementById('local-test-logout-btn');
        if(localLogoutBtn) localLogoutBtn.remove();
    }
}

function bindEvents() {
    document.getElementById('login-btn').onclick = () => {
        window.manualLiffLogin();
    };

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view; 
            leadPagination.currentPage = 1;
            loadLeadsData({ page: 1 });
        };
    });

    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearBtn.style.display = e.target.value ? 'flex' : 'none';
            leadPagination.currentPage = 1;
            loadLeadsData({ page: 1 });
        });
    }
    if (clearBtn) {
        clearBtn.onclick = () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            leadPagination.currentPage = 1;
            loadLeadsData({ page: 1 });
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

async function createLineLeadSessionFromLiff(options = {}) {
    const isLocal = isLocalDevelopment();
    const headers = {};

    if (isLocal) {
        if (!options.forceLocal && !localManualLoginEnabled()) {
            updateUserUI(false);
            toggleContentVisibility(false, 'login');
            return false;
        }
        headers.Authorization = 'Bearer TEST_LOCAL_TOKEN';
    } else {
        updateUserUI(false);
        toggleContentVisibility(false, 'login');
        return false;
    }

    const response = await fetch('/api/line/session', {
        method: 'POST',
        headers,
        credentials: 'same-origin'
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
        applyAuthenticatedUser(result);
        return true;
    }

    if (response.status === 403) {
        lastLineLeadDeniedUserId = result.yourUserId || null;
        toggleContentVisibility(false);
        showAccessDenied(result.yourUserId);
        return 'forbidden';
    }

    if (response.status === 401) {
        showAuthFailedFallback();
        return false;
    }

    showAuthFailedFallback();
    return false;
}

async function lineLeadFetch(url, options = {}, allowRecovery = true) {
    const fetchOptions = {
        ...options,
        credentials: 'same-origin',
        headers: {
            ...(options.headers || {})
        }
    };

    if (isCrmSystemManagerUser()) {
        Object.assign(fetchOptions.headers, crmAuthorizationHeaders());
    }

    let response = await fetch(url, fetchOptions);

    if (response.status === 401 && allowRecovery && !lineLeadRecoveryAttempted) {
        lineLeadRecoveryAttempted = true;
        const recovered = await createLineLeadSessionFromLiff();
        if (recovered === true) {
            response = await fetch(url, fetchOptions);
        } else if (recovered === 'forbidden') {
            return new Response(JSON.stringify({ success: false, yourUserId: lastLineLeadDeniedUserId }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return response;
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
            leadPagination.currentPage = 1;
            loadLeadsData({ page: 1 });
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


function currentLeadSearchTerm() {
    const searchInput = document.getElementById('search-input');
    return searchInput ? searchInput.value.toLowerCase().trim() : '';
}

function leadListQueryUrl(page) {
    const params = new URLSearchParams();
    params.set('page', String(page || leadPagination.currentPage || 1));
    params.set('pageSize', String(LEAD_LIST_PAGE_SIZE));
    params.set('view', currentView || 'all');

    const searchTerm = currentLeadSearchTerm();
    if (searchTerm) params.set('search', searchTerm);
    if (showExhibitionOnly) params.set('exhibitionOnly', '1');

    return `/api/line/leads?${params.toString()}`;
}

function normalizeLeadPagination(pagination, counts, requestedPage) {
    const pageSize = Number(pagination && pagination.pageSize) || LEAD_LIST_PAGE_SIZE;
    const totalCount = Number(pagination && pagination.totalCount) || 0;
    const totalPages = Math.max(1, Number(pagination && pagination.totalPages) || Math.ceil(totalCount / pageSize) || 1);
    const currentPage = Math.min(Math.max(1, Number(pagination && pagination.currentPage) || requestedPage || 1), totalPages);

    return {
        currentPage,
        pageSize,
        totalCount,
        totalPages,
        counts: {
            all: Number(counts && counts.all) || 0,
            mine: Number(counts && counts.mine) || 0,
            pending: Number(counts && counts.pending) || 0,
            myPending: Number(counts && counts.myPending) || 0
        }
    };
}

async function loadLeadsData(options = {}) {
    const loadingEl = document.getElementById('loading-indicator');
    const gridEl = document.getElementById('leads-grid');
    const emptyState = document.getElementById('empty-state');
    const page = Number(options.page) > 0 ? Number(options.page) : leadPagination.currentPage;
    const requestId = ++leadListRequestId;
    
    if (!currentUser.userId) return;

    toggleContentVisibility(true); 
    if(loadingEl) loadingEl.style.display = 'block';
    if(gridEl) gridEl.style.display = 'none';
    if(emptyState) emptyState.style.display = 'none';
    renderPaginationControls();
    
    try {
        const headers = { 
            'Content-Type': 'application/json'
        };

        const response = await lineLeadFetch(leadListQueryUrl(page), { headers });
        if (requestId !== leadListRequestId) return;
        
        if (response.status === 401) {
            showAuthFailedFallback();
            return;
        }
        
        const result = await response.json();
        if (requestId !== leadListRequestId) return;
        
        if (response.status === 403) {
            toggleContentVisibility(false);
            showAccessDenied(result.yourUserId);
            return;
        }

        if (result.success) {
            allLeads = Array.isArray(result.data) ? result.data : [];
            leadPagination = normalizeLeadPagination(result.pagination, result.counts, page);

            if (allLeads.length === 0 && leadPagination.totalCount > 0 && page > leadPagination.totalPages) {
                return loadLeadsData({ page: leadPagination.totalPages });
            }
            
            // Extract config from payload and initialize UI enhancements safely
            if (result.exhibitionConfig) {
                currentExhibitionConfig = result.exhibitionConfig;
                renderExhibitionBanner();
            }

            if(loadingEl) loadingEl.style.display = 'none';
            if(gridEl) gridEl.style.display = 'flex'; 
            updateCounts(leadPagination.counts);
            renderLeads();
            renderPaginationControls();
        } else {
            throw new Error(result.message || '資料載入失敗');
        }
    } catch (error) {
        console.error(error);
        if(loadingEl) loadingEl.innerHTML = `<p style="color:red">發生錯誤: ${error.message}</p>`;
    }
}

function updateCounts(counts = leadPagination.counts) {
    document.getElementById('count-all').textContent = counts.all || 0;
    document.getElementById('count-mine').textContent = counts.mine || 0;
    document.getElementById('count-pending').textContent = counts.pending || 0;

    const myPendingCount = counts.myPending || 0;

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
            const text = [
                lead.name,
                lead.company,
                lead.position,
                lead.jobTitle,
                lead.department,
                lead.phone,
                lead.mobile,
                lead.email,
                lead.notes
            ].map(value => String(value || '')).join(' ').toLowerCase();
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
    updateExhibitionInlineToggle(leadPagination.totalCount);

    if (filtered.length === 0) {
        grid.style.display = 'none';
        if(emptyState) emptyState.style.display = 'block';
        return;
    }

    grid.style.display = 'flex'; 
    if(emptyState) emptyState.style.display = 'none';
    grid.innerHTML = filtered.map(lead => createCardHTML(lead)).join('');
}

function ensurePaginationElement() {
    let pager = document.getElementById('lead-pagination');
    if (pager) return pager;

    const container = document.querySelector('.leads-container');
    if (!container) return null;

    pager = document.createElement('nav');
    pager.id = 'lead-pagination';
    pager.className = 'lead-pagination';
    pager.setAttribute('aria-label', 'Lead pagination');
    container.appendChild(pager);
    return pager;
}

function renderPaginationControls() {
    const pager = ensurePaginationElement();
    if (!pager) return;

    const totalPages = leadPagination.totalPages || 1;
    const currentPage = leadPagination.currentPage || 1;
    const totalCount = leadPagination.totalCount || 0;

    if (totalPages <= 1) {
        pager.style.display = 'none';
        pager.innerHTML = '';
        return;
    }

    pager.style.display = 'flex';
    pager.innerHTML = `
        <button type="button" class="lead-page-btn" data-page-action="prev" ${currentPage <= 1 ? 'disabled' : ''}>上一頁</button>
        <span class="lead-page-indicator">第 ${currentPage} / ${totalPages} 頁 · 共 ${totalCount} 筆</span>
        <button type="button" class="lead-page-btn" data-page-action="next" ${currentPage >= totalPages ? 'disabled' : ''}>下一頁</button>
    `;

    pager.querySelectorAll('.lead-page-btn').forEach(button => {
        button.onclick = () => {
            if (button.disabled) return;
            const nextPage = button.dataset.pageAction === 'prev' ? currentPage - 1 : currentPage + 1;
            loadLeadsData({ page: nextPage });
        };
    });
}

function getContactRoleText(contact) {
    const department = String(contact?.department || '').trim();
    const title = String(contact?.jobTitle || contact?.position || '').trim();
    const parts = [];
    if (department) parts.push(department);
    if (title && title !== department) parts.push(title);
    return parts.join('｜');
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
    const roleText = getContactRoleText(lead);
    const leadJson = JSON.stringify(lead).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

    const isLocalDev = (currentUser.userId === 'TEST_LOCAL_USER');
    const showEditBtn = isLocalDev || isMine;

    const ownerName = lead.userNickname || 'Unknown';
    const ownerText = isMine ? `👤 我的` : `👤 ${ownerName}`;
    
    const statusBadgeHtml = missingText 
        ? `<span class="badge warning-badge badge-top-left">⚠ ${missingText}</span>` 
        : '';

    const imageUrl = lead.driveLink && lead.driveLink !== 'undefined' && lead.driveLink !== 'null'
        ? leadDriveImageProxyUrl(lead.driveLink, 'source')
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
                        ${roleText ? `<span class="position-text">${safeHtml(roleText)}</span>` : ''}
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
    
    const previewUrl = leadDriveImageProxyUrl(driveLink, 'source');
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
        const previewUrl = leadDriveImageProxyUrl(lead.driveLink, 'source');
        const safeLink = (lead.driveLink || '').replace(/"/g, '&quot;');
        // [ITEM 3] Thumbnail explicitly calls openPreview()
        previewContainer.innerHTML = `<img src="${previewUrl}" alt="名片預覽" style="cursor: pointer;" onclick='openPreview("${safeLink}")' title="點擊放大預覽" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder\\'>📇</div>';">`;
    } else {
        previewContainer.innerHTML = `<div class="placeholder">📇</div>`;
    }

    document.getElementById('edit-rowIndex').value = getRawContactIdentifier(lead) || '';
    document.getElementById('edit-name').value = lead.name || '';
    document.getElementById('edit-position').value = lead.position || '';
    document.getElementById('edit-department').value = lead.department || '';
    document.getElementById('edit-company').value = lead.company || '';
    document.getElementById('edit-mobile').value = lead.mobile || '';
    document.getElementById('edit-email').value = lead.email || '';
    document.getElementById('edit-notes').value = lead.notes || ''; 

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
        deleteBtn.dataset.rowIndex = getRawContactIdentifier(lead) || '';
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
        department: document.getElementById('edit-department').value,
        company: document.getElementById('edit-company').value,
        mobile: document.getElementById('edit-mobile').value,
        email: document.getElementById('edit-email').value,
        notes: document.getElementById('edit-notes').value,
        modifier: currentUser.displayName 
    };

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

        const res = await lineLeadFetch(`/api/line/leads/${encodeURIComponent(rowIndex)}`, {
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

        const res = await lineLeadFetch(`/api/line/leads/${encodeURIComponent(rowIndex)}`, {
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
