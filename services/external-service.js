/**
 * services/external-service.js
 * 外部服務整合層 (AI & Google Drive)
 * * @version 1.0.0 (Phase 1 Refactor - L2 Upgrade)
 * @date 2026-01-26
 * @description 封裝 Gemini AI 策略、Prompt 建構與 Google Drive 串流邏輯。
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

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

    /**
     * 取得 Drive 檔案串流與標頭資訊
     * @param {string} fileId 
     * @param {string} link 
     * @returns {Promise<{data: Stream, headers: Object}>}
     */
    async getDriveFileStream(fileId, link) {
        const targetFileId = this._parseFileId(fileId, link);
        if (!targetFileId) {
            throw new Error('Invalid File ID'); // Service 層拋出業務錯誤
        }

        if (!this.googleClientService) {
            throw new Error('GoogleClientService not initialized');
        }

        const drive = await this.googleClientService.getDriveClient();

        try {
            const response = await drive.files.get(
                { fileId: targetFileId, alt: 'media' },
                { responseType: 'stream' }
            );
            
            return {
                data: response.data,
                headers: response.headers
            };
        } catch (error) {
            console.error(`[Drive Service] 讀取失敗 (ID: ${targetFileId}):`, error.message);
            throw error; // 拋出給 Controller 處理 HTTP 狀態
        }
    }
}

module.exports = ExternalService;