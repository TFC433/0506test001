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
- Only files matching these patterns are included: middleware/auth.middleware.js, middleware/role.middleware.js, tools/authenticate.js, tools/hash-generator.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
middleware/auth.middleware.js
middleware/role.middleware.js
tools/authenticate.js
tools/hash-generator.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

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
