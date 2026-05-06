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
- Only files matching these patterns are included: public/leads-view.html, public/scripts/leads-view.js, public/styles/leads-view.css, routes/line-leads.routes.js, controllers/line-leads.controller.js, services/external-service.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/line-leads.controller.js
public/leads-view.html
public/scripts/leads-view.js
public/styles/leads-view.css
routes/line-leads.routes.js
services/external-service.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/line-leads.controller.js">
/**
 * File: controllers/line-leads.controller.js
 * Version: 7.4.0
 * Date: 2026-03-22
 * Changelog: 
 * - [V7.4.0] Implemented backend ownership enforcement for updateLead and added deleteLead endpoint.
 * - [V7.3.1] Restored CRM Whitelist authorization gate in getAllLeads and updateLead, and ensured authorization executes before data access.
 * - [V7.3.0] Exposed 4 new exhibition theme config keys (triangle color/opacity, bar color/opacity) to the frontend via the getAllLeads response payload.
 * - [V7.2.0] Added minimal injection of SystemService into the Controller to expose Exhibition Configuration to the frontend.
 * - [V7.1.4] Fix localhost bypass logic in getAllLeads to prevent 401 fallthrough.
 * LINE LIFF 潛在客戶控制器
 * @description Line-Leads L1→L2：移除 Controller 內 Token 驗證實作與 Writer 直接依賴，改由 AuthService + ContactService 承擔。
 * @contract 遵守契約 v1.0：DOM/API/localStorage 不變。
 */

const { handleApiError } = require('../middleware/error.middleware');

class LineLeadsController {
    /**
     * @param {ContactService} contactService 
     * @param {AuthService} authService 
     * @param {SystemService} systemService - Injected to fetch Exhibition Config deterministically
     */
    constructor(contactService, authService, systemService) {
        this.contactService = contactService;
        this.authService = authService;
        
        // Ensure deterministic access for config exposure
        if (!systemService) {
            console.warn('[LineLeadsController] systemService not provided. Exhibition config will be skipped.');
        }
        this.systemService = systemService;
    }

    // GET /api/line/leads
    getAllLeads = async (req, res) => {
        try {
            // 1. 手動提取 Token (因為我們移出了 authMiddleware)
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ success: false, message: '未提供 Token' });
            }

            // 2. 驗證（L2：驗證細節移入 AuthService）
            let user = null;

            if (token === 'TEST_LOCAL_TOKEN') {
                // 🚧 本地開發模式：維持原日誌行為
                console.log('🚧 [Dev] 本地模式：跳過 LINE 驗證');
                user = {
                    userId: 'dev-user',
                    displayName: 'Local Dev User'
                };
            } else {
                user = await this.authService.verifyLineIdToken(token);
                if (!user) {
                    return res.status(401).json({ success: false, message: 'LINE Token 驗證失敗' });
                }
            }

            // 3. Extract and expose Exhibition Config & Whitelist Authorization Gate
            let exhibitionConfig = null;
            if (this.systemService) {
                try {
                    const sysConfig = await this.systemService.getSystemConfig();

                    // --- Whitelist Authorization Gate ---
                    if (token !== 'TEST_LOCAL_TOKEN') {
                        const whitelist = sysConfig['LINE白名單'] || [];
                        const isAllowed = whitelist.some(w => w.value && w.value.trim() === user.sub);
                        if (!isAllowed) {
                            return res.status(403).json({ success: false, message: '未授權的帳號', yourUserId: user.sub });
                        }
                    }

                    const exConfigRaw = sysConfig['展會設定'] || [];
                    
                    // Reconstruct into a flat object for easy frontend consumption.
                    // If keys are missing in the sheet, they safely default to undefined/empty.
                    exhibitionConfig = {
                        // Core behavior and data rules
                        exhibition_enabled: (exConfigRaw.find(c => c.value === 'exhibition_enabled') || {}).note || 'false',
                        exhibition_name: (exConfigRaw.find(c => c.value === 'exhibition_name') || {}).note || '',
                        exhibition_start_date: (exConfigRaw.find(c => c.value === 'exhibition_start_date') || {}).note || '',
                        exhibition_end_date: (exConfigRaw.find(c => c.value === 'exhibition_end_date') || {}).note || '',
                        
                        // Dynamic UI Theming keys
                        exhibition_triangle_color: (exConfigRaw.find(c => c.value === 'exhibition_triangle_color') || {}).note,
                        exhibition_triangle_opacity: (exConfigRaw.find(c => c.value === 'exhibition_triangle_opacity') || {}).note,
                        exhibition_bar_color: (exConfigRaw.find(c => c.value === 'exhibition_bar_color') || {}).note,
                        exhibition_bar_opacity: (exConfigRaw.find(c => c.value === 'exhibition_bar_opacity') || {}).note
                    };
                } catch (configErr) {
                    console.warn('[LineLeadsController] Failed to fetch system config:', configErr.message);
                }
            }

            // 4. 執行業務邏輯
            if (!this.contactService) {
                throw new Error('ContactService not initialized in Controller');
            }

            const leads = await this.contactService.getPotentialContacts(3000);

            // 包裹回傳格式以符合前端 result.success 檢查
            res.json({
                success: true,
                data: leads,
                exhibitionConfig // Safely pass config to UI layer
            });

        } catch (error) {
            console.error('⚠ Get All Leads Error:', error);
            handleApiError(res, error, 'Get All Leads');
        }
    };

    // PUT /api/line/leads/:rowIndex
    updateLead = async (req, res) => {
        try {
            // 1. 驗證 (同上)
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const rowIndex = parseInt(req.params.rowIndex);

            if (token !== 'TEST_LOCAL_TOKEN') {
                const user = await this.authService.verifyLineIdToken(token);
                if (!user) return res.status(401).json({ success: false, message: 'Invalid Token' });

                // --- Whitelist Authorization Gate ---
                if (this.systemService) {
                    const sysConfig = await this.systemService.getSystemConfig();
                    const whitelist = sysConfig['LINE白名單'] || [];
                    const isAllowed = whitelist.some(w => w.value && w.value.trim() === user.sub);
                    if (!isAllowed) {
                        return res.status(403).json({ success: false, message: '未授權的帳號', yourUserId: user.sub });
                    }
                }

                // --- Ownership Authorization Gate ---
                const targetLead = await this.contactService.getPotentialContactByRow(rowIndex);
                if (!targetLead) {
                    return res.status(404).json({ success: false, message: '找不到該名片資料' });
                }
                if (targetLead.lineUserId !== user.sub) {
                    return res.status(403).json({ success: false, message: '無權限修改他人的名片' });
                }
            }

            // 2. 執行更新
            const updateData = req.body;

            // ★ 行為等價：保持原本 modifier 規則（只看 body，否則 LineUser）
            const modifier = updateData.modifier || 'LineUser';

            // L2：寫入統一委派至 ContactService（移除 Writer 直接依賴）
            await this.contactService.updatePotentialContact(rowIndex, updateData, modifier);

            res.json({ success: true, message: '更新成功' });

        } catch (error) {
            handleApiError(res, error, 'Update Lead');
        }
    };

    // DELETE /api/line/leads/:rowIndex
    deleteLead = async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const rowIndex = parseInt(req.params.rowIndex);
            let modifier = 'LineUser';

            if (token !== 'TEST_LOCAL_TOKEN') {
                const user = await this.authService.verifyLineIdToken(token);
                if (!user) return res.status(401).json({ success: false, message: 'Invalid Token' });

                // --- Whitelist Authorization Gate ---
                if (this.systemService) {
                    const sysConfig = await this.systemService.getSystemConfig();
                    const whitelist = sysConfig['LINE白名單'] || [];
                    const isAllowed = whitelist.some(w => w.value && w.value.trim() === user.sub);
                    if (!isAllowed) {
                        return res.status(403).json({ success: false, message: '未授權的帳號', yourUserId: user.sub });
                    }
                }

                // --- Ownership Authorization Gate ---
                const targetLead = await this.contactService.getPotentialContactByRow(rowIndex);
                if (!targetLead) {
                    return res.status(404).json({ success: false, message: '找不到該名片資料' });
                }
                if (targetLead.lineUserId !== user.sub) {
                    return res.status(403).json({ success: false, message: '無權限刪除他人的名片' });
                }
                
                modifier = user.sub;
            } else {
                modifier = 'TEST_LOCAL_USER';
            }

            await this.contactService.deletePotentialContact(rowIndex, modifier);
            res.json({ success: true, message: '刪除成功' });

        } catch (error) {
            handleApiError(res, error, 'Delete Lead');
        }
    };
}

module.exports = LineLeadsController;
</file>

<file path="public/leads-view.html">
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>名片總覽</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    
    <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    
    <link rel="stylesheet" href="styles/modules/variables.css">
    <link rel="stylesheet" href="styles/leads-view.css">
    
    <script>
        const LIFF_ID = '2008584585-8OQnm0Gk'; 
    </script>
</head>
<body>
    <div class="app-container">
        <header class="main-header">
            <a href="/dashboard.html" class="logo-area" style="text-decoration: none;">
                <img src="images/logo-full.svg" alt="FATDX" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                <span class="logo-text" style="display:none; font-weight:800; font-size:1.2rem; color:var(--text-primary);">名片待確認</span>
            </a>
            
            <div class="user-area" id="user-area" style="display: none;">
                <span class="user-name" id="user-name">載入中...</span>
                <img id="user-avatar" class="user-avatar" src="" alt="User">
            </div>
            <button id="login-btn" class="login-btn" style="display: none;">登入</button>
        </header>

        <div class="controls-section">
            <a href="https://line.me/R/ti/p/@302winpe" target="_blank" class="line-bot-link">
                <span class="icon">📸</span> 
                <span>掃描名片</span>
            </a>

            <div class="search-bar">
                <input type="text" id="search-input" placeholder="🔍 搜尋姓名、公司、職稱...">
                <button id="clear-search" class="clear-btn" style="display: none;">✕</button>
            </div>
            
            <div class="view-toggle">
                <button class="toggle-btn active" data-view="all">
                    全部 <span id="count-all" class="count-badge">0</span>
                </button>
                <button class="toggle-btn" data-view="mine">
                    我的 <span id="count-mine" class="count-badge">0</span>
                </button>
                <button class="toggle-btn" data-view="pending">
                    待確認 <span id="count-pending" class="count-badge">0</span>
                </button>
            </div>
        </div>

        <main class="leads-container">
            <div id="loading-indicator" class="loading-state">
                <div class="spinner"></div>
                <p>正在同步名片資料...</p>
            </div>
            
            <div id="leads-grid" class="leads-list-view" style="display: none;">
                </div>
            
            <div id="empty-state" class="empty-state" style="display: none;">
                <div class="empty-icon">📇</div>
                <p>沒有找到符合的名片</p>
            </div>
        </main>
    </div>

    <div id="edit-modal" class="modal">
        <div class="modal-content edit-content">
            <div class="modal-header">
                <h3>✏️ 補資料</h3>
                <span class="close-modal">&times;</span>
            </div>
            <form id="edit-form">
                <input type="hidden" id="edit-rowIndex">
                <div class="form-group">
                    <label>姓名</label>
                    <input type="text" id="edit-name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>職稱</label>
                    <input type="text" id="edit-position" class="form-input">
                </div>
                <div class="form-group">
                    <label>公司</label>
                    <input type="text" id="edit-company" class="form-input" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>手機</label>
                        <input type="tel" id="edit-mobile" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="edit-email" class="form-input">
                    </div>
                </div>
                <div class="form-group">
                     <label>備註 (將附加於現有備註後)</label>
                     <textarea id="edit-notes" class="form-input" rows="3"></textarea>
                </div>
                <button type="submit" class="save-btn">儲存變更</button>
                <button type="button" id="delete-lead-btn" class="delete-btn" style="display: none; margin-top: 16px; margin-left: auto; width: fit-content; background: transparent; border: none; color: #dc2626; font-size: 0.85rem; text-decoration: underline; cursor: pointer; padding: 2px 4px;">刪除名片</button>
            </form>
        </div>
    </div>

    <div id="preview-modal" class="modal" style="z-index: 1105;">
        <button class="close-btn close-modal" style="position: absolute; top: 15px; right: 15px; z-index: 1110; border-radius: 50%; width: 44px; height: 44px; font-size: 1.5rem; background: var(--secondary-bg, #ffffff); box-shadow: 0 4px 12px rgba(0,0,0,0.3);">&times;</button>
        
        <div class="modal-content preview-content">
            <div id="preview-image-container">
                <div class="spinner"></div>
            </div>
            <a id="preview-download-link" href="#" target="_blank" class="download-link">在新視窗開啟原圖</a>
        </div>
    </div>

    <script src="scripts/core/utils.js"></script>
    <script src="scripts/services/api.js"></script>
    <script src="scripts/services/ui.js"></script>
    <script src="scripts/leads-view.js"></script>
</body>
</html>
</file>

<file path="public/scripts/leads-view.js">
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
</file>

<file path="public/styles/leads-view.css">
/*
File: public/styles/leads-view.css
Version: 15.4.0 (V6.3e Sticky Header Visual Polish)
Date: 2026-03-22
Changelog: 
  - V15.4.0 UI Polish: Upgraded .controls-section to act as a solid, anchored sticky header layer. Removed transparency to prevent card bleed and added a soft drop shadow for clear visual separation.
  - V6.3d Release: Simplified info section reading structure.
  - Kept single top divider on .info-body to separate identity from details.
  - Removed line-to-line separators for .info-line elements to achieve a cleaner look.
Description: V6.3e Business Card Organizer styling with anchored sticky header grouping.
*/

:root {
    --bg-color: #f8fafc;
    --card-bg: #ffffff;
    --primary-color: #3b82f6; 
    --text-main: #1e293b;
    --text-sub: #64748b;
    --border-color: #e2e8f0;
    --warning-color: #ef4444; 
    --divider-light: rgba(0,0,0,0.06);
}

body {
    background-color: var(--bg-color);
    color: var(--text-main);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    -webkit-font-smoothing: antialiased;
}

.app-container {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header */
.main-header {
    background: var(--card-bg);
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.logo-img {
    height: 36px;
    width: auto;
}

.user-area {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 500;
}

.user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--border-color);
    background-color: #eee;
}

.login-btn {
    background: #06c755; 
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
}

/* Controls Section (Sticky Header Group) */
.controls-section {
    padding: 16px 20px;
    background: var(--bg-color); /* Solid background to prevent card bleed */
    position: sticky;
    top: 61px;
    z-index: 90;
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05); /* Soft visual separation layer */
    display: flex;
    flex-direction: column;
}

@keyframes btn-pulse-glow {
    0% { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border-color: #cbd5e1; }
    50% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.6); border-color: rgba(139, 92, 246, 0.8); }
    100% { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border-color: #cbd5e1; }
}

@keyframes btn-shine {
    0% { left: -100%; opacity: 0; }
    20% { left: 100%; opacity: 0.5; } 
    100% { left: 100%; opacity: 0; } 
}

.line-bot-link {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background-color: #ffffff;
    color: #334155; 
    border: 1px solid #cbd5e1;
    text-decoration: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 16px;
    box-sizing: border-box;
    overflow: hidden; 
    transition: transform 0.1s ease;
    animation: btn-pulse-glow 3s infinite ease-in-out;
}

.line-bot-link::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
        to right,
        transparent 0%,
        rgba(139, 92, 246, 0.2) 50%, 
        transparent 100%
    );
    transform: skewX(-25deg);
    pointer-events: none;
    animation: btn-shine 4s infinite linear;
}

.line-bot-link:active {
    transform: scale(0.98);
    background-color: #f8fafc;
}

.line-bot-link .icon {
    font-size: 1.2rem;
    margin-right: 8px;
    z-index: 1;
}

/* Search Bar */
.search-bar {
    position: relative;
    margin-bottom: 12px;
}

.search-bar input {
    width: 100%;
    padding: 12px 16px;
    padding-right: 40px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    font-size: 1rem;
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    box-sizing: border-box;
}

.search-bar input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: #e2e8f0;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 14px;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Segmented Tabs */
.view-toggle {
    display: flex;
    background: #e2e8f0;
    padding: 4px;
    border-radius: 12px;
    position: relative;
}

.toggle-btn {
    flex: 1;
    border: none;
    background: transparent;
    padding: 8px;
    border-radius: 10px;
    font-weight: 600;
    color: var(--text-sub);
    cursor: pointer;
    position: relative;
    z-index: 2;
    transition: all 0.2s;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.toggle-btn.active {
    color: var(--primary-color);
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.toggle-btn[data-view="pending"].active {
    color: var(--warning-color);
}

.count-badge {
    font-size: 0.75rem;
    background: rgba(0,0,0,0.08);
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 700;
}

.toggle-btn.active .count-badge {
    background: rgba(59, 130, 246, 0.1);
    color: var(--primary-color);
}

.toggle-btn[data-view="pending"].active .count-badge {
    background: rgba(239, 68, 68, 0.1);
    color: var(--warning-color);
}

/* Main Container & List Layout */
.leads-container {
    padding: 16px 20px 40px;
    flex: 1;
}

.leads-list-view {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* V6.3 Card Structure - Relative for absolute pill positioning */
.v6-list-item {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    transition: box-shadow 0.2s;
    position: relative;
}

.v6-list-item.is-mine {
    border-color: rgba(59, 130, 246, 0.3);
}

@media (min-width: 1024px) {
    .v6-list-item {
        flex-direction: row;
        align-items: stretch;
    }
    .v6-list-item:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
}

/* ZONE A: Visual (Image) */
.item-image {
    position: relative;
    width: 100%;
    aspect-ratio: 1.58 / 1; 
    background: #f1f5f9;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
}

@media (min-width: 1024px) {
    .item-image {
        width: 300px;
        height: 190px;
        aspect-ratio: auto;
        border-bottom: none;
        border-right: 1px solid var(--border-color);
    }
}

.item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
}

.item-image .placeholder {
    font-size: 3rem;
    color: #cbd5e1;
    opacity: 0.5;
}

/* Image Overlays (Warning Badge Only) */
.badge {
    position: absolute;
    font-size: 0.7rem; 
    padding: 3px 8px; 
    border-radius: 6px;
    font-weight: 600;
    backdrop-filter: blur(2px);
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    z-index: 10;
    pointer-events: none;
}

.badge-top-left {
    top: 8px;
    left: 8px;
}

.warning-badge {
    background: rgba(239, 68, 68, 0.95);
    color: white;
}

/* Top-Right Control Group (Pills) V6.3 Desktop Refinement */
.image-top-right {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
    z-index: 10;
}

@media (min-width: 1024px) {
    .image-top-right {
        top: 10px;
        right: 12px;
    }
}

.owner-tag, .edit-pill-btn {
    background: rgba(255, 255, 255, 0.75);
    color: var(--text-sub);
    border: 1px solid var(--border-color);
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    box-sizing: border-box;
    backdrop-filter: blur(2px);
}

.owner-tag {
    pointer-events: none; 
}

.edit-pill-btn {
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}

.edit-pill-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    color: var(--text-main);
}

.v6-list-item.is-mine .owner-tag {
    color: var(--primary-color);
    border-color: rgba(59, 130, 246, 0.3);
}

/* Item Info Container */
.item-info {
    padding: 16px; 
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
}

@media (min-width: 1024px) {
    .item-info {
        padding: 48px 20px 18px 20px; /* Padding-top accommodates top-right pills on desktop */
    }
}

/* ZONE B: Identity */
.identity-zone {
    margin-bottom: 12px;
}

.info-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 8px;
}

.info-name.text-missing {
    color: #94a3b8;
    font-style: italic;
    font-weight: 500;
}

.company-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
}

.company-pill {
    background: #f1f5f9;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    color: var(--text-main);
    font-weight: 500;
    border: 1px solid var(--border-color);
}

.position-text {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 400;
}

/* Contact Info - V6.3d Single Info Divider Simplification */
.info-body {
    display: flex;
    flex-direction: column;
    gap: 0; 
    border-top: 1px solid var(--divider-light);
    margin-top: 10px;
    padding-top: 8px;
}

.info-line {
    font-size: 0.85rem;
    color: var(--text-sub);
    line-height: 1.4; 
    padding: 4px 0;
}

/* Modals */
.modal {
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.85);
    z-index: 200;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-content {
    background: white;
    border-radius: 16px;
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    max-height: 90vh;
    overflow-y: auto;
}

.preview-content {
    width: 95%;
    max-width: 600px;
    padding: 20px;
    text-align: center;
    background: transparent;
    box-shadow: none;
}

.preview-content .close-modal {
    color: white;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    position: absolute;
    top: -40px;
    right: 0;
}

.edit-content {
    width: 90%;
    max-width: 420px;
    padding: 24px;
}

/* Edit Modal Preview Styling */
.edit-preview {
    width: 100%;
    margin-bottom: 12px;
    border-radius: 10px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-height: 80px;
}

.edit-preview img {
    width: 100%;
    max-height: 180px;
    object-fit: contain;
    display: block;
}

.edit-preview .placeholder {
    font-size: 2.5rem;
    color: #cbd5e1;
    padding: 20px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 12px;
}

.modal-header h3 { margin: 0; font-size: 1.1rem; }

.close-modal {
    font-size: 26px;
    cursor: pointer;
    color: #94a3b8;
    line-height: 1;
}
.close-modal:hover { color: var(--text-main); }

#preview-image-container img {
    max-width: 100%;
    max-height: 70vh;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

.download-link {
    display: inline-block;
    margin-top: 16px;
    color: white;
    text-decoration: none;
    background: rgba(255,255,255,0.2);
    padding: 10px 20px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.4);
    font-size: 0.9rem;
    font-weight: 500;
}

/* Forms */
.form-group { margin-bottom: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
label { display: block; font-size: 0.85rem; color: var(--text-sub); margin-bottom: 6px; font-weight: 600; }
.form-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.95rem;
    box-sizing: border-box;
}
.form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
textarea.form-input {
    resize: vertical;
}

.save-btn {
    width: 100%;
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    margin-top: 12px;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}
.save-btn:hover { background-color: #2563eb; }
.save-btn:disabled { background-color: #94a3b8; cursor: not-allowed; box-shadow: none; }

/* Loading & Empty State */
.loading-state, .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-sub);
}
.spinner {
    width: 36px; height: 36px;
    border: 4px solid #e2e8f0;
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 4rem; margin-bottom: 16px; opacity: 0.3; }

/* Mobile Adaptations */
@media (max-width: 640px) {
    .controls-section { padding: 12px 16px; }
    .leads-container { padding: 12px 16px 80px; }
    .toggle-btn { font-size: 0.9rem; padding: 6px; }
}
</file>

<file path="routes/line-leads.routes.js">
/**
 * routes/line-leads.routes.js
 * @version 1.3.0
 * @date 2026-03-22
 * @description Line-Leads L1→L2：改由 services 容器注入 authService。新增 systemService 注入以支援展會設定讀取。
 * @changelog 
 * - [V1.3.0] Added DELETE /leads/:rowIndex endpoint for physical card deletion.
 * - [V1.2.0] Passed systemService into LineLeadsController constructor.
 */

const express = require('express');
const router = express.Router();
const LineLeadsController = require('../controllers/line-leads.controller');

// 依賴注入：從 app 中獲取 services
const getController = (req) => {
    const app = req.app;
    const services = app.get('services');

    const { contactService, authService, systemService } = services;

    if (!authService) {
        throw new Error("authService is not available in app.get('services'). Make sure services/index.js includes authService.");
    }

    return new LineLeadsController(contactService, authService, systemService);
};

// GET /api/line/leads - 取得所有名片資料
router.get('/leads', (req, res) => getController(req).getAllLeads(req, res));

// PUT /api/line/leads/:rowIndex - 更新特定名片狀態/資料
router.put('/leads/:rowIndex', (req, res) => getController(req).updateLead(req, res));

// DELETE /api/line/leads/:rowIndex - 刪除特定名片 (物理刪除)
router.delete('/leads/:rowIndex', (req, res) => getController(req).deleteLead(req, res));

module.exports = router;
</file>

<file path="services/external-service.js">
/**
 * services/external-service.js
 * 外部服務整合層 (AI & Google Drive)
 * * @version 1.0.0 (Phase 1 Refactor - L2 Upgrade)
 * @date 2026-01-26
 * @description 封裝 Gemini AI 策略、Prompt 建構與 Google Drive 串流邏輯。
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class ExternalService {
    /**
     * @param {GoogleClientService} googleClientService - 用於獲取 Drive Client
     */
    constructor(googleClientService) {
        this.googleClientService = googleClientService;
        
        // AI Configuration
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.MODEL_CONFIG = {
            primary: "gemini-2.5-flash-lite",
            fallbacks: ["gemini-1.5-flash", "gemini-pro"]
        };
    }

    /**
     * [Internal] 初始化 AI 模型
     */
    _initializeModel(modelName) {
        try {
            return this.genAI.getGenerativeModel({ model: modelName });
        } catch (error) {
            console.warn(`[AI] 模型 ${modelName} 初始化失敗:`, error.message);
            return null;
        }
    }

    /**
     * [Internal] 執行帶有備援機制的 AI 生成
     */
    async _generateWithFallback(prompt) {
        const modelsToTry = [this.MODEL_CONFIG.primary, ...this.MODEL_CONFIG.fallbacks];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 [AI] 嘗試使用模型: ${modelName}`);
                const model = this._initializeModel(modelName);
                if (!model) continue;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error) {
                console.warn(`⚠️ [AI] 模型 ${modelName} 生成失敗:`, error.message);
                lastError = error;
            }
        }
        throw lastError || new Error('所有 AI 模型皆無法回應');
    }

    /**
     * 生成公司簡介
     * @param {string} companyName 
     * @returns {Promise<string>} 生成的文字內容
     */
    async generateCompanyProfile(companyName) {
        const prompt = `
            請為一家名為「${companyName}」的公司撰寫一段簡短的專業簡介（約 150 字）。
            重點包含：
            1. 預測其可能的主營業務（基於名稱推測，若不確定請語帶保留）。
            2. 市場定位。
            3. 語氣專業且正面。
            請直接輸出內容，不要包含 Markdown 格式或額外說明。
        `;
        return await this._generateWithFallback(prompt);
    }

    /**
     * [Internal] 解析 Drive File ID
     */
    _parseFileId(fileId, link) {
        if (fileId) return fileId;
        if (!link) return null;
        
        try {
            const match = link.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || link.match(/id=([a-zA-Z0-9_-]{25,})/);
            return match && match[1] ? match[1] : null;
        } catch (e) {
            console.warn(`[Drive Service] ID 解析失敗: ${link}`, e);
            return null;
        }
    }

    /**
     * 取得 Drive 檔案串流與標頭資訊
     * @param {string} fileId 
     * @param {string} link 
     * @returns {Promise<{data: Stream, headers: Object}>}
     */
    async getDriveFileStream(fileId, link) {
        const targetFileId = this._parseFileId(fileId, link);
        if (!targetFileId) {
            throw new Error('Invalid File ID'); // Service 層拋出業務錯誤
        }

        if (!this.googleClientService) {
            throw new Error('GoogleClientService not initialized');
        }

        const drive = await this.googleClientService.getDriveClient();

        try {
            const response = await drive.files.get(
                { fileId: targetFileId, alt: 'media' },
                { responseType: 'stream' }
            );
            
            return {
                data: response.data,
                headers: response.headers
            };
        } catch (error) {
            console.error(`[Drive Service] 讀取失敗 (ID: ${targetFileId}):`, error.message);
            throw error; // 拋出給 Controller 處理 HTTP 狀態
        }
    }
}

module.exports = ExternalService;
</file>

</files>
