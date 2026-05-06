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