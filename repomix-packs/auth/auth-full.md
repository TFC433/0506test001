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
- Only files matching these patterns are included: routes/auth.routes.js, controllers/auth.controller.js, services/auth-service.js, public/login.html, public/scripts/core/login.js, public/styles/login.css, middleware/auth.middleware.js, middleware/role.middleware.js, tools/authenticate.js, tools/hash-generator.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
controllers/auth.controller.js
middleware/auth.middleware.js
middleware/role.middleware.js
public/login.html
public/scripts/core/login.js
public/styles/login.css
routes/auth.routes.js
services/auth-service.js
tools/authenticate.js
tools/hash-generator.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="controllers/auth.controller.js">
// controllers/auth.controller.js
/**
 * AuthController Class
 * * @version 5.1.0 (Phase 5 - Class Refactoring)
 * @date 2026-01-12
 * @description 適配器層，負責將 HTTP 請求轉發給 AuthService。
 */

const { handleApiError } = require('../middleware/error.middleware');

class AuthController {
    /**
     * @param {AuthService} authService 
     */
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/login
     */
    login = async (req, res) => {
        try {
            const { username, password } = req.body;
            // 呼叫 Service
            const result = await this.authService.login(username, password);
            
            res.json({ 
                success: true, 
                ...result 
            });
        } catch (error) {
            // 特定錯誤回傳 401
            if (error.message === '帳號或密碼錯誤') {
                return res.status(401).json({ success: false, message: error.message });
            }
            handleApiError(res, error, 'Login');
        }
    };

    /**
     * GET /api/auth/verify
     * 驗證 Session (Token) 有效性
     */
    verifySession = (req, res) => {
        // 能進入此函式代表已通過 verifyToken middleware
        res.json({ 
            success: true, 
            message: 'Token Valid',
            user: req.user 
        });
    };

    /**
     * POST /api/auth/verify-password
     * 驗證舊密碼 (前端檢查用)
     */
    verifyPassword = async (req, res) => {
        try {
            const { password } = req.body;
            const { username } = req.user;

            const isValid = await this.authService.verifyPassword(username, password);
            
            if (!isValid) {
                 // 為了安全性，前端只知道 false，不回傳 404
                 return res.json({ success: true, valid: false });
            }

            res.json({ success: true, valid: true });

        } catch (error) {
            handleApiError(res, error, 'Verify Password');
        }
    };

    /**
     * POST /api/auth/change-password
     * 修改密碼
     */
    changePassword = async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const { username } = req.user;

            await this.authService.changePassword(username, oldPassword, newPassword);

            res.json({ success: true, message: '密碼修改成功' });

        } catch (error) {
            handleApiError(res, error, 'Change Password');
        }
    };
}

module.exports = AuthController;
</file>

<file path="middleware/auth.middleware.js">
/**
 * middleware/auth.middleware.js
 * 權限驗證中介軟體
 * * @version 6.1.6 (Fixed: Local Dev Backdoor)
 * @date 2026-01-15
 * @description 負責驗證 JWT Token。包含針對 'TEST_LOCAL_TOKEN' 的特殊放行邏輯，以支援 leads-view.html 的本地開發模式。
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Bearer <token>
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // 403 Forbidden: 伺服器理解請求但拒絕授權 (未提供 Token)
        return res.status(403).json({ success: false, message: '未提供驗證 Token' }); 
    }

    // ============================================================
    // 🚧 [Dev Mode] 本地開發後門 (Digital Forensics: Restore 0109 Behavior)
    // ============================================================
    // 前端 leads-view.js 在本地環境 (localhost) 會發送此固定 Token。
    // 為了不修改前端代碼，後端必須在此攔截並給予放行。
    if (token === 'TEST_LOCAL_TOKEN') {
        console.warn('🚧 [Auth Middleware] 偵測到本地測試 Token，略過 JWT 驗證並注入模擬身分。');
        
        // 注入模擬的 User 物件，確保後續 Controller 不會壞掉
        req.user = {
            userId: 'TEST_LOCAL_USER',
            name: 'Local Developer',
            email: 'dev@localhost',
            picture: '',
            role: 'admin' // 給予最高權限以利測試
        };
        
        return next(); // 直接放行
    }
    // ============================================================

    // 標準 JWT 驗證流程 (正式環境)
    jwt.verify(token, config.AUTH.JWT_SECRET, (err, user) => {
        if (err) {
            console.warn(`[Auth] Token 驗證失敗: ${err.message}`);
            // 401 Unauthorized: 身份驗證失敗 (Token 無效或過期)
            return res.status(401).json({ success: false, message: 'Token 無效或已過期' }); 
        }
        
        req.user = user; // 將解碼後的用戶資訊附加到 req 物件
        next();
    });
};
</file>

<file path="middleware/role.middleware.js">
// middleware/role.middleware.js

/**
 * 角色權限檢查中間件
 * @param {Array<string>|string} allowedRoles - 允許的角色 (例如 'admin', ['admin', 'manager'])
 */
exports.requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // 1. 確保使用者已登入 (req.user 存在)
        if (!req.user) {
            return res.status(401).json({ success: false, message: '未經授權：使用者未登入' });
        }

        // 2. 統一轉為陣列處理
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // 3. 檢查權限
        // 假設 req.user.role 來自 decoded JWT payload
        const userRole = req.user.role || 'sales'; // 預設降級為 sales

        if (roles.includes(userRole)) {
            next(); // 通行
        } else {
            console.warn(`⛔ [Access Denied] User: ${req.user.username}, Role: ${userRole}, Required: ${roles.join(',')}`);
            return res.status(403).json({ success: false, message: '權限不足：您無法存取此資源' });
        }
    };
};
</file>

<file path="public/login.html">
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FATDX CRM 系統 - 登入</title>
    
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="any">
    
    <script>document.documentElement.setAttribute('data-theme', 'light');</script>
    
    <link rel="stylesheet" href="styles/login.css">
    <meta name="description" content="FATDX CRM 客戶關係管理系統 - 安全登入入口">
    <meta name="keywords" content="CRM, 客戶關係管理, TFC, 登入">
</head>
<body>
    <div class="login-container">
        <div class="login-box">
            <div class="logo-container">
                <img src="images/logo-full.svg" alt="FATDX CRM" class="login-logo">
            </div>
            <p>以機會為核心的客戶關係管理平台</p>
            
            <form id="login-form" novalidate>
                <div class="form-group with-icon username">
                    <label for="username">使用者帳號</label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        placeholder="請輸入您的帳號" 
                        required 
                        autocomplete="username"
                        autofocus
                    >
                </div>
                
                <div class="form-group with-icon password">
                    <label for="password">登入密碼</label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        placeholder="請輸入您的密碼" 
                        required 
                        autocomplete="current-password"
                    >
                </div>

                <div class="remember-me">
                    <input type="checkbox" id="remember" name="remember">
                    <label for="remember">記住我的登入狀態</label>
                </div>
                
                <button type="submit" class="submit-btn" id="login-btn">
                    <span class="btn-text">登入系統</span>
                </button>
                
                <div id="error-message" class="error-message"></div>
            </form>

            <div class="forgot-password">
                <a href="#" onclick="showForgotPasswordModal()">忘記密碼？</a>
            </div>

            <div class="social-login">
                <div class="social-login-title">或使用其他方式登入</div>
                <div class="social-buttons">
                    <button class="social-btn" onclick="loginWithGoogle()" title="使用 Google 登入">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    </button>
                    
                    <button class="social-btn" onclick="loginWithMicrosoft()" title="使用 Microsoft 登入">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                        </svg>
                    </button>
                    
                    <button class="social-btn" onclick="loginWithApple()" title="使用 Apple 登入">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <script src="scripts/core/theme-toggle.js"></script>
    <script src="scripts/services/api.js"></script>
    <script src="scripts/services/ui.js"></script>
    <script src="scripts/core/utils.js"></script>
    <script src="scripts/core/login.js"></script>
</body>
</html>
</file>

<file path="public/scripts/core/login.js">
// public/scripts/core/login.js

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    // 【修正】這裡改回正確的 ID 'error-message'
    const messageEl = document.getElementById('error-message'); 
    const submitBtn = document.getElementById('login-btn');

    if (!loginForm) return;

    // ==========================================
    // 1. 自動登入檢查 (Auto-Login Check)
    // ==========================================
    const cachedToken = localStorage.getItem('crmToken') || localStorage.getItem('crm-token');

    if (cachedToken) {
        console.log('🔄 [Login] 偵測到 Token，正在驗證有效性...');
        
        // UI 回饋：避免使用者以為卡住
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '驗證身份中...';
        }

        try {
            // 呼叫後端驗證 API
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ [Login] Token 有效，自動跳轉...');
                
                // 確保雙重 Token 一致性 (修復無限重導問題)
                if (!localStorage.getItem('crm-token')) {
                    localStorage.setItem('crm-token', cachedToken);
                }
                if (!localStorage.getItem('crmToken')) {
                    localStorage.setItem('crmToken', cachedToken);
                }

                if (messageEl) {
                    messageEl.textContent = '歡迎回來，正在進入系統...';
                    messageEl.classList.add('text-success');
                }

                // 驗證成功：直接跳轉，不需要清除 Storage
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500); // 稍微延遲讓視覺更平滑
                return; // ★ 重要：中止後續程式碼執行
            }

        } catch (error) {
            console.warn('⚠ [Login] Token 驗證失敗或網路錯誤:', error);
            // 驗證失敗將繼續往下執行清除邏輯
        }
    }

    // ==========================================
    // 2. 清除舊 Session (驗證失敗或無 Token 時執行)
    // ==========================================
    console.log('ℹ [Login] 無有效 Session，重置登入狀態');
    localStorage.removeItem('crmToken');
    localStorage.removeItem('crm-token');
    localStorage.removeItem('crmCurrentUserName');
    localStorage.removeItem('crmUserRole');

    // 恢復按鈕狀態
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '登入系統';
    }

    // ==========================================
    // 3. 處理一般登入表單提交
    // ==========================================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI 狀態更新
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.classList.remove('text-danger', 'text-success');
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '登入中...';
        }

        // 收集表單資料
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (result.success) {
                // 1. 儲存 Token
                localStorage.setItem('crmToken', result.token);
                // 相容舊版 Key (部分頁面可能還在用 crm-token)
                localStorage.setItem('crm-token', result.token); 
                
                // 2. 儲存使用者資訊
                localStorage.setItem('crmCurrentUserName', result.name);
                
                // ★★★ 3. 儲存角色權限 ★★★
                localStorage.setItem('crmUserRole', result.role || 'sales');

                if (messageEl) {
                    messageEl.textContent = '登入成功，正在跳轉...';
                    messageEl.classList.add('text-success');
                }

                // 4. 延遲跳轉
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } else {
                throw new Error(result.message || '登入失敗');
            }

        } catch (error) {
            console.error('Login Error:', error);
            if (messageEl) {
                messageEl.textContent = error.message || '登入發生錯誤';
                messageEl.classList.add('text-danger');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '登入系統'; // 修正按鈕文字
            }
        }
    });
});
</file>

<file path="public/styles/login.css">
/* ==================== 基本重置與變數 ==================== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* ==================== 主題變數定義（與 main.css 保持一致） ==================== */
:root {
    /* 色彩 */
    --primary-bg: #1a1d29;
    --secondary-bg: #252836;
    --card-bg: rgba(255, 255, 255, 0.05);
    --glass-bg: rgba(255, 255, 255, 0.1);
    --text-primary: #ffffff;
    --text-secondary: #e2e8f0;
    --text-muted: #94a3b8;
    --accent-blue: #4f8df7;
    --accent-purple: #8b5cf6;
    --accent-red: #ef4444;
    --border-color: rgba(255, 255, 255, 0.1);
    --gradient-bg: linear-gradient(135deg, #1a1d29 0%, #2a2d3a 100%);

    /* 間距與尺寸 */
    --spacing-2: 8px;
    --spacing-3: 12px;
    --spacing-4: 16px;
    --spacing-5: 20px;
    --spacing-6: 24px;
    --spacing-10: 40px;
    --spacing-12: 48px;

    /* 圓角 */
    --rounded-lg: 12px;
    --rounded-xl: 16px;
    --rounded-2xl: 24px;
    --rounded-full: 9999px;
    
    /* 陰影 */
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

[data-theme="light"] {
    --primary-bg: #f1f5f9;
    --secondary-bg: #ffffff;
    --card-bg: #ffffff;
    --glass-bg: rgba(255, 255, 255, 0.8);
    --text-primary: #1e293b;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --border-color: #e2e8f0;
    --gradient-bg: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
    
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05);
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    background: var(--gradient-bg);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text-primary);
    overflow: hidden;
    position: relative;
    transition: all 0.3s ease;
}

/* ==================== 登入容器 ==================== */
.login-container {
    padding: var(--spacing-5);
    z-index: 1;
    position: relative;
}
.login-box {
    background: var(--card-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    padding: var(--spacing-12);
    border-radius: var(--rounded-2xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 420px;
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}
.login-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
    border-radius: var(--rounded-2xl) var(--rounded-2xl) 0 0;
}

/* --- 【修改】LOGO 樣式 --- */
.logo-container {
    margin-bottom: var(--spacing-4);
    display: flex;
    justify-content: center;
}

.login-logo {
    width: 100%;
    height: auto;
    /* 【修改】尺寸縮小 50% (原 300px -> 150px) */
    max-width: 180px; 
    display: block;
}

.login-box p {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-10);
    font-weight: 500;
}

/* ==================== 表單樣式 ==================== */
#login-form { text-align: left; }
.form-group { margin-bottom: var(--spacing-6); position: relative; }
.form-group label {
    display: block;
    margin-bottom: var(--spacing-2);
    font-weight: 700;
    color: var(--text-primary);
    font-size: 0.9rem;
}
.form-group input {
    width: 100%;
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--glass-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-lg);
    font-size: 1rem;
    color: var(--text-primary);
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}
.form-group input::placeholder { color: var(--text-muted); font-weight: 500; }
.form-group input:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(79, 141, 247, 0.1);
    background: rgba(255, 255, 255, 0.08);
}

/* ==================== 提交按鈕 ==================== */
.submit-btn {
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    color: white;
    border: none;
    padding: var(--spacing-4) var(--spacing-8);
    border-radius: var(--rounded-lg);
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    box-shadow: var(--shadow-md);
    position: relative;
    overflow: hidden;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.submit-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.submit-btn:active { transform: translateY(0); }
.submit-btn:disabled { background: var(--text-muted); cursor: not-allowed; transform: none; box-shadow: none; opacity: 0.6; }
.submit-btn.loading::after {
    content: ''; position: absolute; top: 50%; left: 50%;
    width: 20px; height: 20px; margin: -10px 0 0 -10px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* ==================== 錯誤訊息 ==================== */
.error-message {
    color: var(--accent-red); margin-top: var(--spacing-5);
    font-weight: 600; font-size: 0.9rem; min-height: 24px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--rounded-lg);
    padding: var(--spacing-2) var(--spacing-4); opacity: 0;
    transition: all 0.3s ease;
}
.error-message:not(:empty) { opacity: 1; }
.error-message::before { content: "⚠"; margin-right: var(--spacing-2); font-size: 1rem; }

/* ==================== 記住我 & 忘記密碼 ==================== */
.remember-me {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin: var(--spacing-4) 0;
    font-size: 0.9rem;
}
.remember-me input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent-blue); cursor: pointer; }
.remember-me label { color: var(--text-secondary); cursor: pointer; font-weight: 500; }
.forgot-password { text-align: center; margin-top: var(--spacing-4); }
.forgot-password a { color: var(--accent-blue); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: all 0.3s ease; }
.forgot-password a:hover { color: var(--accent-purple); text-decoration: underline; }

/* ==================== 社交登入 ==================== */
.social-login { margin-top: var(--spacing-6); padding-top: var(--spacing-6); border-top: 1px solid var(--border-color); }
.social-login-title { text-align: center; color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--spacing-4); }
.social-buttons { display: flex; gap: var(--spacing-3); justify-content: center; }
.social-btn {
    width: var(--spacing-12); height: var(--spacing-12); border-radius: var(--rounded-lg);
    border: 1px solid var(--border-color); background: var(--glass-bg);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}
.social-btn:hover { background: var(--secondary-bg); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.social-btn svg { width: 20px; height: 20px; color: var(--text-primary); }

/* ==================== 響應式設計 ==================== */
@media (max-width: 480px) {
    .login-box { padding: var(--spacing-6) var(--spacing-5); }
}
</file>

<file path="routes/auth.routes.js">
// routes/auth.routes.js
/**
 * Auth Routes
 * * @version 5.1.0 (Phase 5 - Service Locator Pattern)
 * @date 2026-01-12
 * @description 使用 req.app.get('services') 動態獲取 Controller 實例，
 * 避免直接 require 檔案導致的循環依賴或未初始化問題。
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');

// 輔助函式：動態獲取 Controller
const getController = (req) => {
    const services = req.app.get('services');
    if (!services || !services.authController) {
        throw new Error('AuthController尚未初始化');
    }
    return services.authController;
};

// 1. 登入 (公開)
router.post('/login', (req, res, next) => {
    getController(req).login(req, res, next);
});

// 2. 檢查 Token 有效性 (需登入)
router.get('/verify', verifyToken, (req, res, next) => {
    getController(req).verifySession(req, res, next);
});

// 3. 驗證舊密碼 (需登入)
router.post('/verify-password', verifyToken, (req, res, next) => {
    getController(req).verifyPassword(req, res, next);
});

// 4. 修改密碼 (需登入)
router.post('/change-password', verifyToken, (req, res, next) => {
    getController(req).changePassword(req, res, next);
});

module.exports = router;
</file>

<file path="services/auth-service.js">
/*
 * FILE: services/auth-service.js
 * VERSION: 5.2.4
 * DATE: 2026-03-19
 * CHANGELOG:
 * - [PATCH] Added displayName to JWT payload to fix recorder identity issue
 * - [FIX] Ensure downstream services receive correct displayName instead of username fallback
 * - Line-Leads L1→L2：新增 verifyLineIdToken，其餘既有登入/密碼流程保持不變。
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

class AuthService {
    /**
     * @param {SystemReader} systemReader - 負責讀取使用者資料
     * @param {SystemWriter} systemWriter - 負責寫入使用者資料 (修改密碼用)
     */
    constructor(systemReader, systemWriter) {
        if (!systemReader) throw new Error('AuthService 需要 SystemReader 實例');
        // systemWriter 是選擇性的，但為了修改密碼功能，建議注入
        this.systemReader = systemReader;
        this.systemWriter = systemWriter;

        // [Line-Leads L2] 使用與原 line-leads.controller.js 相同的環境變數邏輯
        this.LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || '2006367469';
    }

    /**
     * 驗證 LINE ID Token（Line-Leads L1→L2）
     * - 邏輯遷移自 controllers/line-leads.controller.js 的 _verifyLineToken + TEST_LOCAL_TOKEN 分流
     * - 回傳 null 表示驗證失敗（保持原 controller 行為：401）
     * @param {string} token
     * @returns {Promise<Object|null>}
     */
    async verifyLineIdToken(token) {
        try {
            // Dev 特權 Token（保持原行為）
            if (token === 'TEST_LOCAL_TOKEN') {
                return { sub: 'TEST_USER', name: 'Developer' };
            }

            const params = new URLSearchParams();
            params.append('id_token', token);
            params.append('client_id', this.LINE_CHANNEL_ID);

            const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[AuthService] LINE Verify Failed:', errText);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('[AuthService] LINE Verify Exception:', error.message);
            return null;
        }
    }

    /**
     * 內部輔助：取得並驗證使用者
     * @param {string} username
     * @returns {Promise<Object>} user object
     */
    async _findUser(username) {
        // 強制刷新快取以確保資料最新 (特別是修改密碼後)
        if (this.systemReader.cache && this.systemReader.cache['users']) {
            delete this.systemReader.cache['users'];
        }

        const users = await this.systemReader.getUsers();
        // 不區分大小寫
        return users.find(u => u.username.toLowerCase() === username.toLowerCase());
    }

    /**
     * 使用者登入驗證
     * @param {string} username
     * @param {string} password
     * @returns {Promise<Object>} { user, token }
     */
    async login(username, password) {
        if (!username || !password) {
            throw new Error('請輸入帳號和密碼');
        }

        const user = await this._findUser(username);

        if (!user) {
            console.warn(`[Auth] 登入失敗：找不到使用者 ${username}`);
            throw new Error('帳號或密碼錯誤');
        }

        // 支援 bcrypt 雜湊比對與明碼比對 (向下相容)
        let isMatch = false;
        if (user.passwordHash && user.passwordHash.startsWith('$2')) {
            isMatch = bcrypt.compareSync(password, user.passwordHash);
        } else {
            // Fallback: 舊系統可能存明碼
            isMatch = (password === user.passwordHash) || (password === user.password);
        }

        if (!isMatch) {
            console.warn(`[Auth] 登入失敗：使用者 ${username} 密碼錯誤`);
            throw new Error('帳號或密碼錯誤');
        }

        // 簽發 Token
        const payload = {
            username: user.username,
            name: user.displayName || user.username,
            displayName: user.displayName || user.username,
            role: user.role || 'sales'
        };

        const token = jwt.sign(
            payload,
            config.AUTH.JWT_SECRET,
            { expiresIn: config.AUTH.JWT_EXPIRES_IN }
        );

        console.log(`[Auth] 使用者 ${username} (${user.role}) 登入成功`);

        return {
            name: user.displayName,
            role: user.role,
            token
        };
    }

    /**
     * 驗證使用者密碼 (用於敏感操作前的確認)
     * @param {string} username
     * @param {string} password
     * @returns {Promise<boolean>}
     */
    async verifyPassword(username, password) {
        const user = await this._findUser(username);
        if (!user) return false;

        if (user.passwordHash && user.passwordHash.startsWith('$2')) {
            return bcrypt.compareSync(password, user.passwordHash);
        } else {
            return (password === user.passwordHash);
        }
    }

    /**
     * 修改使用者密碼
     * @param {string} username
     * @param {string} oldPassword
     * @param {string} newPassword
     * @returns {Promise<boolean>}
     */
    async changePassword(username, oldPassword, newPassword) {
        if (!this.systemWriter) {
            throw new Error('AuthService 未配置 SystemWriter，無法修改密碼');
        }

        if (newPassword.length < 6) {
            throw new Error('新密碼長度至少需 6 碼');
        }

        // 1. 驗證舊密碼
        const user = await this._findUser(username);
        if (!user) throw new Error('找不到使用者資料');

        // 使用 verifyPassword 邏輯
        const isMatch = await this.verifyPassword(username, oldPassword);
        if (!isMatch) {
            throw new Error('舊密碼輸入錯誤');
        }

        // 2. 產生新 Hash
        const salt = bcrypt.genSaltSync(10);
        const newHash = bcrypt.hashSync(newPassword, salt);

        // 3. 檢查是否有 rowIndex
        if (!user.rowIndex) {
            throw new Error('無法取得使用者資料行號 (RowIndex)，請聯繫管理員');
        }

        // 4. 寫入
        await this.systemWriter.updatePassword(user.rowIndex, newHash);

        // 5. 清除快取
        if (this.systemReader.cache && this.systemReader.cache['users']) {
            delete this.systemReader.cache['users'];
        }

        console.log(`✅ [Auth] 使用者 ${username} 密碼修改成功`);
        return true;
    }

    /**
     * 檢查 Auth Service 狀態 (Health Check)
     */
    async checkAuthStatus() {
        try {
            // 嘗試讀取一次 Users 來確認連線
            await this.systemReader.getUsers();
            return { status: 'healthy', source: config.IDS.SYSTEM };
        } catch (error) {
            return { status: 'degraded', error: error.message };
        }
    }
}

module.exports = AuthService;
</file>

<file path="tools/authenticate.js">
// authenticate.js - 用於手動獲取 Google OAuth 2.0 權杖

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ==================== 設定 ====================

// 授權範圍：確保這裡的權限與您應用程式需要的一致
// 根據您舊的 oauth-token.json 檔案，我們使用以下三個
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/calendar'
];

// 檔案路徑
const CREDENTIALS_PATH = path.join(__dirname, '..', 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'oauth-token.json');

// ==================== 主要邏輯 ====================

/**
 * 讀取本地憑證檔案，並觸發授權流程
 */
function authorize() {
    let credentials;
    try {
        const content = fs.readFileSync(CREDENTIALS_PATH);
        credentials = JSON.parse(content);
    } catch (err) {
        console.error('❌ 讀取 oauth-credentials.json 失敗:', err.message);
        console.log('請確認您已經從 Google Cloud Console 下載了憑證，並將其命名為 "oauth-credentials.json" 放在專案根目錄。');
        return;
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    console.log('🔑 已準備好進行授權...');
    getNewToken(oAuth2Client);
}

/**
 * 產生授權 URL，並引導使用者獲取授權碼，最終換取權杖
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 */
function getNewToken(oAuth2Client) {
    // 產生授權 URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // 'offline' is crucial for getting a refresh_token
        scope: SCOPES,
    });

    console.log('\n================================================================================');
    console.log('請在您的瀏覽器中開啟以下網址來授權此應用程式：');
    console.log(`\n${authUrl}\n`);
    console.log('授權後，您會得到一個授權碼 (code)，請將其複製並貼到下方。');
    console.log('================================================================================\n');

    // 建立 readline 介面來接收使用者輸入
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('請在此貼上授權碼 (code): ', (code) => {
        rl.close();
        
        // 使用授權碼換取權杖 (access_token 和 refresh_token)
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                console.error('❌ 換取權杖時發生錯誤:', err.response ? err.response.data : err.message);
                console.log('\n可能原因：');
                console.log('1. 複製的授權碼不完整或不正確。');
                console.log('2. 授權碼已過期 (通常有時效性)。');
                console.log('請重新執行 `node authenticate.js` 來產生新的授權網址。');
                return;
            }
            
            // 將獲取的權杖設定到 oAuth2Client
            oAuth2Client.setCredentials(token);
            
            // 將權杖儲存到檔案中供未來使用
            try {
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
                console.log('\n================================================================================');
                console.log('✅ 權杖已成功儲存至:', TOKEN_PATH);
                console.log('現在您可以重新啟動您的主應用程式 (`npm run dev`) 了！');
                console.log('================================================================================');
            } catch (writeErr) {
                console.error('❌ 寫入 token 檔案失敗:', writeErr);
            }
        });
    });
}

// 執行授權
authorize();
</file>

<file path="tools/hash-generator.js">
// hash-generator.js
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- TFC CRM 密碼加密產生器 ---');
rl.question('請輸入您想設定的新密碼 (例如: tfc-crm-2025): ', (password) => {
  if (!password) {
    console.error('錯誤：未輸入密碼。');
    rl.close();
    return;
  }

  // 產生加密鹽值並進行加密
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  console.log('\n================================================================');
  console.log('✅ 加密完成！');
  console.log('請將以下這整行 Hash 複製到您的 config.js 檔案中，取代 LOGIN_HASH 的值：');
  console.log(`\n'${hash}'\n`);
  console.log('================================================================');
  
  rl.close();
});
</file>

</files>
