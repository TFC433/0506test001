// public/scripts/dashboard/dashboard_ui.js

const DashboardUI = {
    showLoading(widgetId, message = '載入中...') {
        const widget = document.getElementById(widgetId);
        if (!widget) return;
        
        let loadingEl = widget.querySelector('.loading');
        if (!loadingEl) {
            const content = widget.querySelector('.widget-content') || widget;
            if (!content.querySelector('.loading')) {
                loadingEl = document.createElement('div');
                loadingEl.className = 'loading';
                loadingEl.innerHTML = `<div class="spinner"></div><p>${message}</p>`;
                content.appendChild(loadingEl);
            } else {
                loadingEl = content.querySelector('.loading');
            }
        }
        
        if (loadingEl) {
            const msgP = loadingEl.querySelector('p');
            if (msgP) msgP.textContent = message;
            loadingEl.classList.add('show');
        }
    },

    hideLoading(widgetId) {
        const widget = document.getElementById(widgetId);
        if (!widget) return;
        const loadingEl = widget.querySelector('.loading');
        if (loadingEl) loadingEl.classList.remove('show');
    },

    showGlobalLoading(message = '正在同步儀表板資料...') {
        if (typeof showLoading === 'function') showLoading(message);
    },

    hideGlobalLoading() {
        if (typeof hideLoading === 'function') hideLoading();
    },

    showError(widgetId, errorMessage) {
        const widget = document.getElementById(widgetId);
        if (!widget) return;
        const content = widget.querySelector('.widget-content') || widget;
        content.innerHTML = `<div class="alert alert-error">${errorMessage}</div>`;
    }
};

window.DashboardUI = DashboardUI;


// ★★★ UserProfile 管理器 (讀取 LayoutManager 的單一真理) ★★★
const UserProfile = {
    modalId: 'user-profile-modal',
    
    init() {
        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                const card = modal.querySelector('.profile-card');
                card.classList.remove('modal-shake');
                void card.offsetWidth; 
                card.classList.add('modal-shake');
            }
        });

        this.bindEvents();
    },

    open() {
        const modal = document.getElementById(this.modalId);
        
        // 1. 讀取使用者資訊
        const storedName = localStorage.getItem('crmCurrentUserName') || '使用者';
        const storedRole = localStorage.getItem('crmUserRole') || 'sales'; 
        
        const nameEl = document.getElementById('profile-name-large');
        const avatarEl = document.getElementById('profile-avatar');
        const roleTagEl = document.getElementById('profile-role-tag');
        
        // 2. 更新基本資訊
        if (nameEl) nameEl.textContent = storedName;
        if (avatarEl) avatarEl.textContent = (storedName[0] || 'U').toUpperCase();
        
        // ★★★ 3. 角色 (從全域定義讀取) ★★★
        
        // 確保定義是最新的 (如果 Config 剛載入)
        if (window.CRM_APP.refreshRoleDisplay) {
             window.CRM_APP.refreshRoleDisplay(); 
        }

        // 取得定義表 (由 layout-manager.js 產生)
        const defs = window.CRM_APP.ROLE_DEFINITIONS || {};
        
        // 查找當前角色的設定
        const roleConfig = defs[storedRole] || defs['sales'] || { 
            title: storedRole, 
            color: '#f3f4f6',
            textColor: '#374151'
        };

        // 更新 Tag 文字與樣式
        if (roleTagEl) {
            roleTagEl.textContent = roleConfig.title; // 顯示: 管理員 / 業務
            roleTagEl.style.backgroundColor = roleConfig.color; 
            roleTagEl.style.color = roleConfig.textColor;
        }

        // 權限標籤已在 HTML 中移除，程式碼亦不需要再處理它
        
        // 重置狀態
        this.switchView('profile');
        this.resetForm();
        
        modal.classList.add('show');
    },

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.classList.remove('show');
    },

    switchView(viewName) {
        const views = document.getElementById('profile-views');
        if (viewName === 'password') {
            views.style.transform = 'translateX(-50%)';
        } else {
            views.style.transform = 'translateX(0)';
        }
    },

    resetForm() {
        const form = document.getElementById('change-password-form');
        if (form) form.reset();
        
        ['cp-old', 'cp-new', 'cp-confirm'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('is-valid', 'is-invalid');
            const fb = document.getElementById(id.replace('cp', 'fb'));
            if (fb) {
                fb.textContent = '';
                fb.className = 'feedback-text';
            }
        });
        
        const meter = document.getElementById('strength-meter');
        if (meter) meter.className = 'strength-meter';
        
        const btn = document.getElementById('btn-save-password');
        if (btn) btn.disabled = true;
    },

    bindEvents() {
        const oldInput = document.getElementById('cp-old');
        const newInput = document.getElementById('cp-new');
        const confirmInput = document.getElementById('cp-confirm');
        const form = document.getElementById('change-password-form');

        if (!form) return;

        oldInput.addEventListener('blur', async () => {
            const val = oldInput.value;
            if (!val) return;
            const isValid = await this.verifyOldPassword(val);
            this.setValidationState(oldInput, isValid, isValid ? '' : '舊密碼錯誤');
            this.checkFormValidity();
        });
        
        oldInput.addEventListener('input', () => {
             oldInput.classList.remove('is-invalid');
             document.getElementById('fb-old').textContent = '';
             this.checkFormValidity();
        });

        newInput.addEventListener('input', () => {
            const val = newInput.value;
            const strength = this.checkStrength(val);
            this.updateStrengthMeter(strength);
            const isValid = strength >= 1;
            this.setValidationState(newInput, isValid, isValid ? '' : '密碼長度至少 6 碼');
            if (confirmInput.value) confirmInput.dispatchEvent(new Event('input'));
            this.checkFormValidity();
        });

        confirmInput.addEventListener('input', () => {
            const val = confirmInput.value;
            const origin = newInput.value;
            if (!val) {
                confirmInput.classList.remove('is-valid', 'is-invalid');
                return;
            }
            const isMatch = val === origin;
            this.setValidationState(confirmInput, isMatch, isMatch ? '' : '密碼不一致');
            this.checkFormValidity();
        });

        form.addEventListener('submit', (e) => this.handleSubmit(e));
    },

    setValidationState(el, isValid, msg = '') {
        const feedback = document.getElementById(el.id.replace('cp', 'fb'));
        if (isValid) {
            el.classList.remove('is-invalid');
            el.classList.add('is-valid');
            feedback.textContent = msg || '';
            feedback.className = 'feedback-text text-success';
        } else {
            el.classList.remove('is-valid');
            el.classList.add('is-invalid');
            feedback.textContent = msg;
            feedback.className = 'feedback-text text-danger';
        }
    },

    checkStrength(pwd) {
        if (pwd.length < 6) return 0;
        let score = 1;
        if (pwd.length >= 8) score++;
        if (/[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
        return Math.min(score, 3);
    },

    updateStrengthMeter(level) {
        const meter = document.getElementById('strength-meter');
        meter.className = 'strength-meter';
        if (level === 1) meter.classList.add('strength-weak');
        if (level === 2) meter.classList.add('strength-medium');
        if (level === 3) meter.classList.add('strength-strong');
    },

    checkFormValidity() {
        const oldValid = document.getElementById('cp-old').classList.contains('is-valid');
        const newValid = document.getElementById('cp-new').classList.contains('is-valid');
        const confirmValid = document.getElementById('cp-confirm').classList.contains('is-valid');
        document.getElementById('btn-save-password').disabled = !(oldValid && newValid && confirmValid);
    },

    async verifyOldPassword(password) {
        try {
            const token = localStorage.getItem('crm-token');
            const res = await fetch('/api/auth/verify-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            return data.success && data.valid;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-save-password');
        const oldPassword = document.getElementById('cp-old').value;
        const newPassword = document.getElementById('cp-new').value;

        btn.disabled = true;
        btn.textContent = '更新中...';

        try {
            const token = localStorage.getItem('crm-token');
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const result = await res.json();

            if (result.success) {
                alert('✅ 修改成功！請使用新密碼重新登入');
                logout(); 
            } else {
                alert('❌ 修改失敗: ' + (result.message || '未知錯誤'));
                btn.disabled = false;
                btn.textContent = '確認修改';
            }
        } catch (error) {
            alert('網路錯誤');
            btn.disabled = false;
            btn.textContent = '確認修改';
        }
    }
};

window.UserProfile = UserProfile;

document.addEventListener('DOMContentLoaded', () => {
    UserProfile.init();
});