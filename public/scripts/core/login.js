// public/scripts/core/login.js

function normalizeLoginRole(role) {
    return String(role || '').trim().toLowerCase();
}

function redirectPathForLoginRole(role) {
    return normalizeLoginRole(role) === 'system_manager' ? 'portal.html' : 'dashboard.html';
}

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
                const verifiedUser = result.user || {};
                const verifiedRole = verifiedUser.role || localStorage.getItem('crmUserRole') || 'sales';
                
                // 確保雙重 Token 一致性 (修復無限重導問題)
                if (!localStorage.getItem('crm-token')) {
                    localStorage.setItem('crm-token', cachedToken);
                }
                if (!localStorage.getItem('crmToken')) {
                    localStorage.setItem('crmToken', cachedToken);
                }
                localStorage.setItem('crmUserRole', verifiedRole);
                if (verifiedUser.displayName || verifiedUser.name) {
                    localStorage.setItem('crmCurrentUserName', verifiedUser.displayName || verifiedUser.name);
                }

                if (messageEl) {
                    messageEl.textContent = '歡迎回來，正在進入系統...';
                    messageEl.classList.add('text-success');
                }

                // 驗證成功：直接跳轉，不需要清除 Storage
                setTimeout(() => {
                    window.location.href = redirectPathForLoginRole(verifiedRole);
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
                const loginRole = result.role || 'sales';
                // 1. 儲存 Token
                localStorage.setItem('crmToken', result.token);
                // 相容舊版 Key (部分頁面可能還在用 crm-token)
                localStorage.setItem('crm-token', result.token); 
                
                // 2. 儲存使用者資訊
                localStorage.setItem('crmCurrentUserName', result.name);
                
                // ★★★ 3. 儲存角色權限 ★★★
                localStorage.setItem('crmUserRole', loginRole);

                if (messageEl) {
                    messageEl.textContent = '登入成功，正在跳轉...';
                    messageEl.classList.add('text-success');
                }

                // 4. 延遲跳轉
                setTimeout(() => {
                    window.location.href = redirectPathForLoginRole(loginRole);
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
