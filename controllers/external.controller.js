/**
 * controllers/external.controller.js
 * 外部服務控制器
 * * @version 7.0.0 (L2 Refactor: Logic Moved to Service)
 * @date 2026-01-26
 * @description 僅負責路由參數轉發與回應串流處理，所有 AI 與 Drive 邏輯移至 ExternalService。
 */

const { handleApiError } = require('../middleware/error.middleware');
const ExternalService = require('../services/external-service');

// 輔助：取得 Service 實例 (支援依賴注入)
const getExternalService = (req) => {
    const services = req.app.get('services');
    // 若 Service Container 已註冊則使用，否則即時實例化 (相容性)
    return services.externalService || new ExternalService(services.googleClientService);
};

// POST /api/external/companies/:companyName/profile
exports.generateCompanyProfile = async (req, res) => {
    const { companyName } = req.params;

    if (!companyName) {
        return res.status(400).json({ success: false, error: '缺少公司名稱' });
    }

    try {
        const service = getExternalService(req);
        const aiResponse = await service.generateCompanyProfile(companyName);
        
        res.json({ 
            success: true, 
            profile: aiResponse,
            source: 'Gemini AI'
        });

    } catch (error) {
        handleApiError(res, error, 'Generate Company Profile');
    }
};

// GET /api/external/thumbnail
exports.getDriveThumbnail = async (req, res) => {
    const { fileId, link } = req.query;

    try {
        const service = getExternalService(req);
        
        // 呼叫 Service 取得串流與標頭
        const { data: stream, headers } = await service.getDriveFileStream(fileId, link);

        // 設定回應標頭 (Controller 職責: HTTP Protocol)
        if (headers['content-type']) {
            res.setHeader('Content-Type', headers['content-type']);
        }
        if (headers['content-length']) {
            res.setHeader('Content-Length', headers['content-length']);
        }

        // Pipe 串流
        stream.pipe(res);

        // 錯誤監聽
        stream.on('error', (streamErr) => {
            console.error('[Controller] Stream Error:', streamErr);
            if (!res.headersSent) res.status(500).send('Image Stream Error');
        });

    } catch (error) {
        // 針對 Service 拋出的特定錯誤轉換為 HTTP 狀態
        if (error.message === 'Invalid File ID') {
            return res.status(400).send('Invalid File ID');
        }
        if (error.code === 404 || error.message.includes('File not found')) {
            return res.status(404).send('Image Not Found');
        }
        
        console.error('[Controller] Get Thumbnail Error:', error.message);
        if (!res.headersSent) res.status(500).send('Internal Server Error');
    }
};