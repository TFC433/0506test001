// middleware/error.middleware.js

// 統一的 API 錯誤處理函式
exports.handleApiError = (res, error, context = 'API') => {
    console.error(`⚠ ${context} 執行錯誤:`, error.message);
    // 檢查是否為我們自訂的業務邏輯錯誤
    if (error.message.startsWith('無法刪除：') || error.message.startsWith('無法建檔：')) {
         return res.status(400).json({ success: false, error: error.message, details: error.message });
    }

    // 其他所有錯誤均回傳 500
    const userFriendlyMessage = '伺服器內部錯誤，請稍後再試或聯絡管理員。';
    res.status(500).json({ success: false, error: userFriendlyMessage, details: error.message });
};

// 全局錯誤處理中介軟體 (用於 app.js 的 app.use)
exports.globalErrorHandler = (err, req, res, next) => {
    if (!res.headersSent) {
        console.error('💥 未處理的伺服器錯誤:', err.stack || err);
        exports.handleApiError(res, err, 'Unhandled Server Error');
    } else {
        console.error('💥 錯誤發生在回應已發送之後:', err.stack || err);
    }
};