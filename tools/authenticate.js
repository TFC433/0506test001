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