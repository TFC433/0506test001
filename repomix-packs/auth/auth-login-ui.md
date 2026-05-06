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
- Only files matching these patterns are included: public/login.html, public/scripts/core/login.js, public/styles/login.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/login.html
public/scripts/core/login.js
public/styles/login.css
</directory_structure>

<files>
This section contains the contents of the repository's files.

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

</files>
