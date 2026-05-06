/**
 * routes/weekly.routes.js
 * 週間業務路由設定
 * * @version 6.0.2 (Fix Middleware Name mismatch)
 * @date 2026-01-14
 */

const express = require('express');
const router = express.Router();
// 修正：Middleware 匯出名稱為 verifyToken
const { verifyToken } = require('../middleware/auth.middleware');

// 輔助函式：從 Container 獲取 Controller 實例
const getController = (req) => req.app.get('services').weeklyController;

// 使用 verifyToken 作為認證中介軟體
router.use(verifyToken);

// 讀取列表摘要
router.get('/summary', (req, res, next) => 
    getController(req).getSummaryList(req, res, next)
);

// 讀取週次選項
router.get('/week-options', (req, res, next) => 
    getController(req).getWeekOptions(req, res, next)
);

// 讀取詳細資料
router.get('/details/:weekId', (req, res, next) => 
    getController(req).getWeeklyDetails(req, res, next)
);

// 建立週報
router.post('/', (req, res, next) => 
    getController(req).createEntry(req, res, next)
);

// 更新週報
router.put('/:recordId', (req, res, next) => 
    getController(req).updateEntry(req, res, next)
);

// 刪除週報
router.delete('/:recordId', (req, res, next) => 
    getController(req).deleteEntry(req, res, next)
);

module.exports = router;