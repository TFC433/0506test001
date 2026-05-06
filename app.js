// app.js (Phase 5 Vertical Slice Fix)
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// --- 服務初始化 ---
const config = require('./config');
// 【修改】只引入 Service Container (它是新的唯一真神)
const initializeServices = require('./services/service-container'); 

// ❌ 移除舊的服務載入器
// const initializeBusinessServices = require('./services'); 

// --- 引入中介軟體和路由 ---
const { globalErrorHandler } = require('./middleware/error.middleware');
const allApiRoutes = require('./routes'); 

const app = express();

// --- 中介軟體設定 ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 靜態資源目錄
app.use(express.static(path.join(__dirname, 'public')));

// ==================== 伺服器啟動函式 ====================
async function startServer() {
    try {
        // 1. 初始化所有服務 (由 Service Container 統一處理)
        // ★★★ 修改：直接取得 services 物件，不再經過舊的轉換層
        const services = await initializeServices();

        // 2. 將服務注入到 app 中
        app.set('services', services);
        console.log('✅ 所有服務已成功注入 app');

        // 3. 設定 API 路由
        
        // 公開路由：健康檢查
        app.get('/health', async (req, res) => {
            const { authService } = req.app.get('services');
            // 簡單保護：如果 AuthService 還沒好，回傳錯誤
            if (!authService) return res.status(503).json({ status: 'initializing' });
            
            const healthStatus = await authService.checkAuthStatus();
            res.json({ status: 'ok', timestamp: new Date().toISOString(), services: healthStatus });
        });

        // 掛載所有 API 路由
        app.use('/api', allApiRoutes);
        
        console.log('✅ API 路由準備就緒...');

        // 4. 設定前端頁面路由
        app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

        // SPA Fallback
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
        });

        // 5. 全局錯誤處理
        app.use(globalErrorHandler);

        // ==================== 伺服器啟動 ====================
        app.listen(config.PORT, () => {
            console.log(`🚀 CRM 系統已在 http://localhost:${config.PORT} 啟動`);
        });

    } catch (error) {
        console.error('⚠ 系統啟動失敗:', error.message);
        // 印出 Stack Trace 以便除錯
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

// 啟動伺服器
startServer();