// controllers/sales.controller.js
const { handleApiError } = require('../middleware/error.middleware');

// 輔助函式：從 req.app 獲取服務
const getServices = (req) => req.app.get('services');

// GET /api/sales-analysis
exports.getSalesAnalysis = async (req, res) => {
    try {
        const { salesAnalysisService } = getServices(req);
        const { startDate, endDate } = req.query;
        const analysisData = await salesAnalysisService.getSalesAnalysisData(startDate, endDate);
        res.json({ success: true, data: analysisData });
    } catch (error) { 
        handleApiError(res, error, 'Sales Analysis'); 
    }
};