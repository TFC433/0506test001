/**
 * services/external-service.js
 * 外部服務整合層 (AI & Google Drive)
 * * @version 1.0.0 (Phase 1 Refactor - L2 Upgrade)
 * @date 2026-01-26
 * @description 封裝 Gemini AI 策略、Prompt 建構與 Google Drive 串流邏輯。
 */

const { Readable } = require('stream');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DRIVE_SOURCE_REPRESENTATION = 'source';
const DRIVE_THUMBNAIL_REPRESENTATION = 'thumbnail';
const DRIVE_THUMBNAIL_PROFILES = Object.freeze({
    crm: { label: 'crm', cssWidth: 116, cssHeight: 76 },
    card: { label: 'card', cssWidth: 220, cssHeight: 139 },
    forms: { label: 'forms', cssWidth: 72, cssHeight: 46 }
});

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

    _normalizeDriveRepresentation(representation) {
        return String(representation || DRIVE_SOURCE_REPRESENTATION).toLowerCase() === DRIVE_THUMBNAIL_REPRESENTATION
            ? DRIVE_THUMBNAIL_REPRESENTATION
            : DRIVE_SOURCE_REPRESENTATION;
    }

    _normalizeDriveThumbnailProfile(profile) {
        return DRIVE_THUMBNAIL_PROFILES[String(profile || '').toLowerCase()] || DRIVE_THUMBNAIL_PROFILES.card;
    }

    /**
     * 取得 Drive 檔案串流與標頭資訊
     * @param {string} fileId 
     * @param {string} link 
     * @param {{representation?: string, profile?: string}} options
     * @returns {Promise<{data: Stream, headers: Object}>}
     */
    async getDriveFileStream(fileId, link, options = {}) {
        const targetFileId = this._parseFileId(fileId, link);
        if (!targetFileId) {
            throw new Error('Invalid File ID'); // Service 層拋出業務錯誤
        }

        if (!this.googleClientService) {
            throw new Error('GoogleClientService not initialized');
        }

        const drive = await this.googleClientService.getDriveClient();
        const representation = this._normalizeDriveRepresentation(options.representation);

        try {
            if (representation === DRIVE_THUMBNAIL_REPRESENTATION) {
                const profile = this._normalizeDriveThumbnailProfile(options.profile);
                const metadata = await drive.files.get({
                    fileId: targetFileId,
                    fields: 'thumbnailLink,mimeType',
                    supportsAllDrives: true
                });
                const thumbnailLink = metadata && metadata.data && metadata.data.thumbnailLink;
                if (!thumbnailLink) {
                    const error = new Error('Drive thumbnailLink not available');
                    error.code = 404;
                    throw error;
                }

                const auth = await this.googleClientService.getAuthClient();
                const response = await auth.request({
                    url: thumbnailLink,
                    method: 'GET',
                    responseType: 'stream'
                });
                return {
                    data: response.data,
                    headers: {
                        ...response.headers,
                        'x-drive-image-representation': DRIVE_THUMBNAIL_REPRESENTATION,
                        'x-drive-thumbnail-profile': profile.label,
                        'x-drive-thumbnail-css-size': `${profile.cssWidth}x${profile.cssHeight}`
                    }
                };
            }

            const response = await drive.files.get(
                { fileId: targetFileId, alt: 'media' },
                { responseType: 'stream' }
            );
            
            return {
                data: response.data,
                headers: {
                    ...response.headers,
                    'x-drive-image-representation': DRIVE_SOURCE_REPRESENTATION
                }
            };
        } catch (error) {
            console.error(`[Drive Service] 讀取失敗 (ID: ${targetFileId}):`, error.message);
            throw error; // 拋出給 Controller 處理 HTTP 狀態
        }
    }

    async uploadDriveFile({ folderId, fileName, mimeType, buffer }) {
        if (!folderId) throw new Error('Drive folder ID is required');
        if (!fileName) throw new Error('Drive file name is required');
        if (!mimeType) throw new Error('Drive MIME type is required');
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Drive file buffer is required');
        if (!this.googleClientService) throw new Error('GoogleClientService not initialized');

        const drive = await this.googleClientService.getDriveClient();
        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                mimeType,
                parents: [folderId]
            },
            media: {
                mimeType,
                body: Readable.from(buffer)
            },
            fields: 'id,name,mimeType',
            supportsAllDrives: true
        });

        return {
            fileId: response.data.id,
            fileName: response.data.name,
            mimeType: response.data.mimeType
        };
    }
}

module.exports = ExternalService;
