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