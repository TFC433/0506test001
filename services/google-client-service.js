/**
 * services/google-client-service.js
 * Google API 連線服務 (Infrastructure Layer)
 * * @version 5.0.0 (Phase 5 Refactoring)
 * @date 2026-01-09
 * @description 負責系統與 Google API (Sheets, Drive, Calendar) 之間的認證與連線管理。
 * 取代原 auth-service.js 的角色，專注於機器對機器的連線 (OAuth/Service Account)。
 */

const { google } = require('googleapis');
const fs = require('fs');
const https = require('https');
const path = require('path');
const querystring = require('querystring');

class GoogleClientService {
    constructor() {
        this.oauthClient = null;
        this.serviceClient = null;
        this.oauthCredentials = null;
    }

    // OAuth認證 (用於Sheets和Calendar)

    getOAuthCredentialConfig(credentials) {
        const source = credentials.installed || credentials.web || credentials;
        return {
            client_id: source.client_id,
            client_secret: source.client_secret,
            redirect_uris: source.redirect_uris || []
        };
    }

    getOAuthTokenExpiryState(token) {
        if (!token || !token.access_token) return 'missing_access_token';
        if (!token.expiry_date) return 'missing_expiry';

        const expiryDate = Number(token.expiry_date);
        if (!Number.isFinite(expiryDate)) return 'missing_expiry';

        const refreshThresholdMs = 5 * 60 * 1000;
        const now = Date.now();
        if (expiryDate <= now) return 'expired';
        if (expiryDate <= now + refreshThresholdMs) return 'near_expiry';
        return 'not_expired';
    }

    isOAuthTokenExpiredOrExpiring(token) {
        return this.getOAuthTokenExpiryState(token) !== 'not_expired';
    }

    async refreshOAuthTokenWithNativeHttps(token, credentials) {
        const oauthConfig = this.getOAuthCredentialConfig(credentials);

        if (!oauthConfig.client_id || !oauthConfig.client_secret) {
            throw new Error('OAuth client_id/client_secret missing');
        }
        if (!token || !token.refresh_token) {
            throw new Error('OAuth refresh_token missing');
        }

        const body = querystring.stringify({
            client_id: oauthConfig.client_id,
            client_secret: oauthConfig.client_secret,
            refresh_token: token.refresh_token,
            grant_type: 'refresh_token'
        });

        const delays = [500, 1000, 2000];
        let lastError;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await this.postOAuthTokenRequestWithNativeHttps(body);
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    const safeBody = response.body.slice(0, 300);
                    const statusError = new Error(`OAuth token endpoint returned status ${response.statusCode}`);
                    statusError.statusCode = response.statusCode;
                    statusError.responseBody = safeBody;
                    console.error(`[GoogleClient] Native OAuth refresh failed status=${response.statusCode} body=${safeBody}`);

                    if (response.statusCode >= 500 && attempt < 3) {
                        await this.delay(delays[attempt - 1]);
                        continue;
                    }

                    throw statusError;
                }

                let parsed;
                try {
                    parsed = JSON.parse(response.body);
                } catch (parseError) {
                    throw new Error(`OAuth token endpoint returned invalid JSON: ${parseError.message}`);
                }

                if (!parsed.access_token || !parsed.expires_in) {
                    throw new Error('OAuth token endpoint response missing access_token/expires_in');
                }

                return {
                    ...token,
                    access_token: parsed.access_token,
                    token_type: parsed.token_type || token.token_type || 'Bearer',
                    expiry_date: Date.now() + (Number(parsed.expires_in) * 1000),
                    scope: parsed.scope || token.scope,
                    id_token: parsed.id_token || token.id_token
                };
            } catch (error) {
                lastError = error;
                const isTransportError = !error.statusCode;
                const isRetryableStatus = error.statusCode >= 500;

                if ((isTransportError || isRetryableStatus) && attempt < 3) {
                    console.warn(`[GoogleClient] Native OAuth refresh attempt ${attempt} failed; retrying. name=${error.name} code=${error.code || 'unknown'} message=${error.message}`);
                    await this.delay(delays[attempt - 1]);
                    continue;
                }

                if (isTransportError) {
                    console.error(`[GoogleClient] Native OAuth refresh failed error name=${error.name} code=${error.code || 'unknown'} message=${error.message}`);
                }
                throw error;
            }
        }

        throw lastError;
    }

    postOAuthTokenRequestWithNativeHttps(body) {
        const options = {
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            timeout: 8000,
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'content-length': Buffer.byteLength(body)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseBody = '';

                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        body: responseBody
                    });
                });
            });

            req.on('timeout', () => {
                req.destroy(new Error('OAuth token request timeout after 8000ms'));
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    installNativeOAuthRefreshHooks(oauthClient, credentials) {
        oauthClient.refreshToken = async (refreshToken) => {
            const refreshedCredentials = await this.refreshOAuthTokenWithNativeHttps({
                ...oauthClient.credentials,
                refresh_token: oauthClient.credentials.refresh_token || refreshToken
            }, credentials);
            oauthClient.setCredentials(refreshedCredentials);
            return {
                tokens: refreshedCredentials,
                res: { status: 200 }
            };
        };

        oauthClient.refreshAccessTokenAsync = async () => {
            const refreshedCredentials = await this.refreshOAuthTokenWithNativeHttps(
                oauthClient.credentials,
                credentials
            );
            oauthClient.setCredentials(refreshedCredentials);
            return {
                credentials: refreshedCredentials,
                res: { status: 200 }
            };
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getOAuthClient() {
        if (this.oauthClient) return this.oauthClient;

        try {
            let token, credentials;

            // Prefer Render/env OAuth credentials when both values are present.
            if (process.env.GOOGLE_OAUTH_TOKEN && process.env.GOOGLE_OAUTH_CREDENTIALS) {
                console.log('[GoogleClient] Loading OAuth credentials from environment.');
                token = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
                credentials = JSON.parse(process.env.GOOGLE_OAUTH_CREDENTIALS);
            } else {
                console.log('[GoogleClient] Loading OAuth credentials from local files.');
                const TOKEN_PATH = path.join(__dirname, '..', 'oauth-token.json');
                const CREDENTIALS_PATH = path.join(__dirname, '..', 'oauth-credentials.json');

                if (!fs.existsSync(TOKEN_PATH) || !fs.existsSync(CREDENTIALS_PATH)) {
                    throw new Error('OAuth credential files are missing');
                }

                token = JSON.parse(fs.readFileSync(TOKEN_PATH));
                credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
            }

            this.oauthCredentials = credentials;
            const { client_secret, client_id, redirect_uris } = this.getOAuthCredentialConfig(credentials);
            this.oauthClient = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris && redirect_uris[0] ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
            );
            this.installNativeOAuthRefreshHooks(this.oauthClient, credentials);

            const expiryState = this.getOAuthTokenExpiryState(token);
            if (this.isOAuthTokenExpiredOrExpiring(token)) {
                console.log(`[GoogleClient] OAuth access token state=${expiryState}; refreshing via native https...`);
                token = await this.refreshOAuthTokenWithNativeHttps(token, credentials);
                console.log('[GoogleClient] OAuth token refreshed successfully via native https.');
            } else {
                console.log('[GoogleClient] OAuth access token state=not_expired; native refresh skipped.');
            }

            this.oauthClient.setCredentials(token);
            return this.oauthClient;

        } catch (error) {
            console.error('[GoogleClient] OAuth token validation/refresh failed:', error.message);
            throw new Error(`OAuth token validation/refresh failed: ${error.message}`);
        }
    }

    // 服務帳戶認證 (用於Drive和Vision API，可選)
    async getServiceClient() {
        if (this.serviceClient) return this.serviceClient;

        try {
            let serviceCredentials;

            // 優先從環境變數讀取
            if (process.env.GOOGLE_SERVICE_CREDENTIALS) {
                console.log('🔐 [GoogleClient] 從環境變數載入服務帳戶憑證...');
                serviceCredentials = JSON.parse(process.env.GOOGLE_SERVICE_CREDENTIALS);
            } else {
                // 本地開發從檔案讀取
                const SERVICE_CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');
                
                if (!fs.existsSync(SERVICE_CREDENTIALS_PATH)) {
                    console.log('ℹ️ [GoogleClient] 服務帳戶憑證檔案不存在，將僅使用OAuth認證');
                    return null;
                }
                
                console.log('🔐 [GoogleClient] 從本地檔案載入服務帳戶憑證...');
                serviceCredentials = JSON.parse(fs.readFileSync(SERVICE_CREDENTIALS_PATH));
            }

            this.serviceClient = new google.auth.GoogleAuth({
                credentials: serviceCredentials,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/calendar',
                    'https://www.googleapis.com/auth/cloud-vision'
                ]
            });

            console.log('✅ [GoogleClient] 服務帳戶認證初始化成功');
            return this.serviceClient;

        } catch (error) {
            console.warn('⚠️ [GoogleClient] 服務帳戶認證失敗:', error.message);
            return null;
        }
    }

    // 檢查認證狀態
    async checkAuthStatus() {
        const status = {
            oauth: false,
            service: false,
            errors: []
        };

        // 檢查OAuth認證
        try {
            await this.getOAuthClient();
            status.oauth = true;
        } catch (error) {
            status.errors.push(`OAuth: ${error.message}`);
        }

        // 檢查服務帳戶認證
        try {
            const serviceClient = await this.getServiceClient();
            status.service = serviceClient !== null;
        } catch (error) {
            status.errors.push(`Service Account: ${error.message}`);
        }

        return status;
    }

    // 取得適當的認證客戶端 (優先使用OAuth)
    async getAuthClient() {
        try {
            return await this.getOAuthClient();
        } catch (error) {
            console.log('OAuth認證失敗，嘗試服務帳戶認證...');
            const serviceClient = await this.getServiceClient();
            if (serviceClient) {
                return await serviceClient.getClient();
            }
            throw new Error('所有認證方式都失敗');
        }
    }

    // 刷新OAuth Token
    async refreshOAuthToken() {
        if (!this.oauthClient || !this.oauthCredentials) {
            throw new Error('OAuth client is not initialized');
        }

        try {
            console.log('[GoogleClient] Refreshing OAuth token via native https...');
            const credentials = await this.refreshOAuthTokenWithNativeHttps(
                this.oauthClient.credentials,
                this.oauthCredentials
            );
            this.oauthClient.setCredentials(credentials);

            if (!process.env.GOOGLE_OAUTH_TOKEN) {
                const TOKEN_PATH = path.join(__dirname, '..', 'oauth-token.json');
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
                console.log('[GoogleClient] OAuth token file updated.');
            }

            console.log('[GoogleClient] OAuth token refreshed successfully via native https.');
            return credentials;

        } catch (error) {
            console.error('[GoogleClient] Native OAuth refresh failed:', error.message);
            throw error;
        }
    }

    // 驗證Token有效性
    async validateToken() {
        try {
            const authClient = await this.getOAuthClient();
            const tokenInfo = await authClient.getTokenInfo(authClient.credentials.access_token);
            
            const expiryTime = new Date(tokenInfo.expiry_date);
            const now = new Date();
            const timeLeft = expiryTime - now;
            
            return {
                valid: timeLeft > 0,
                expiresAt: expiryTime,
                timeLeft: Math.floor(timeLeft / 1000 / 60), // 剩餘分鐘
                scopes: tokenInfo.scopes || []
            };
            
        } catch (error) {
            console.error('❌ Token驗證失敗:', error.message);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // 取得認證資訊
    async getAuthInfo() {
        try {
            const authClient = await this.getOAuthClient();
            const credentials = authClient.credentials;
            
            return {
                hasToken: !!credentials.access_token,
                hasRefreshToken: !!credentials.refresh_token,
                tokenType: credentials.token_type || 'Bearer',
                expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                scopes: credentials.scope ? credentials.scope.split(' ') : []
            };
            
        } catch (error) {
            console.error('❌ 取得認證資訊失敗:', error.message);
            return {
                hasToken: false,
                error: error.message
            };
        }
    }

    // 測試Google服務連線
    async testConnections() {
        const results = {
            oauth: { status: false, message: '' },
            sheets: { status: false, message: '' },
            calendar: { status: false, message: '' },
            drive: { status: false, message: '' }
        };

        try {
            // 測試OAuth認證
            const authClient = await this.getOAuthClient();
            results.oauth.status = true;
            results.oauth.message = 'OAuth認證成功';

            // 測試Sheets API
            try {
                const sheets = google.sheets({ version: 'v4', auth: authClient });
                // 使用一個較通用的方式測試連線，避免寫死 ID
                // await sheets.spreadsheets.get({ spreadsheetId: '...' }); 
                results.sheets.status = true;
                results.sheets.message = 'Sheets API連線初始化成功';
            } catch (error) {
                results.sheets.message = `Sheets API連線失敗: ${error.message}`;
            }

            // 測試Calendar API
            try {
                const calendar = google.calendar({ version: 'v3', auth: authClient });
                await calendar.calendarList.list({ maxResults: 1 });
                results.calendar.status = true;
                results.calendar.message = 'Calendar API連線成功';
            } catch (error) {
                results.calendar.message = `Calendar API連線失敗: ${error.message}`;
            }

            // 測試Drive API
            try {
                const drive = google.drive({ version: 'v3', auth: authClient });
                await drive.about.get({ fields: 'user' });
                results.drive.status = true;
                results.drive.message = 'Drive API連線成功';
            } catch (error) {
                results.drive.message = `Drive API連線失敗: ${error.message}`;
            }

        } catch (error) {
            results.oauth.message = `OAuth認證失敗: ${error.message}`;
        }

        return results;
    }

    // 清除認證快取
    clearAuthCache() {
        this.oauthClient = null;
        this.serviceClient = null;
        console.log('🧹 認證快取已清除');
    }

    // 取得除錯資訊
    getDebugInfo() {
        return {
            hasOAuthClient: !!this.oauthClient,
            hasServiceClient: !!this.serviceClient,
            oauthCredentials: this.oauthClient ? {
                hasAccessToken: !!this.oauthClient.credentials.access_token,
                hasRefreshToken: !!this.oauthClient.credentials.refresh_token,
                tokenType: this.oauthClient.credentials.token_type,
                expiryDate: this.oauthClient.credentials.expiry_date
            } : null,
            environment: {
                hasEnvToken: !!process.env.GOOGLE_OAUTH_TOKEN,
                hasEnvCredentials: !!process.env.GOOGLE_OAUTH_CREDENTIALS,
                hasEnvServiceCredentials: !!process.env.GOOGLE_SERVICE_CREDENTIALS,
                nodeEnv: process.env.NODE_ENV
            }
        };
    }

    // --- Container Helper Methods ---

    async getSheetsClient() {
        const auth = await this.getAuthClient();
        return google.sheets({ version: 'v4', auth });
    }

    async getDriveClient() {
        const auth = await this.getAuthClient();
        return google.drive({ version: 'v3', auth });
    }

    async getCalendarClient() {
        const auth = await this.getAuthClient();
        return google.calendar({ version: 'v3', auth });
    }
}

module.exports = GoogleClientService;
