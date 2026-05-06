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
- Only files matching these patterns are included: app.js, config.js, config/supabase.js, routes/index.js, services/index.js, services/service-container.js, middleware/error.middleware.js, utils/date-helpers.js, package.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
app.js
config.js
config/supabase.js
middleware/error.middleware.js
package.json
routes/index.js
services/index.js
services/service-container.js
utils/date-helpers.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="app.js">
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
</file>

<file path="config.js">
/**
 * config.js
 * 系統核心設定檔
 * @version 5.2.0 (Phase 8.4 Internal Ops Support)
 * @date 2026-04-20
 * @description 定義全域環境變數、Sheet ID 路由表、資料源切換開關與系統常數。
 * 本次重構新增 IDS 與 DATA_SOURCES 物件以支援多資料源架構。
 * * Changelog:
 * - [V5.2.0] Added INTERNAL_OPS tracking fields and Google Sheet definitions.
 * - [V5.1.0] Repurposed CONTACT_FIELDS index 17 to EXHIBITION_NAME and index 18 to IS_EXHIBITION.
 * This enables the Fallback Auto-Tag feature safely within the A-Z column constraint.
 */

module.exports = {
    // 環境設定
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3001,
    
    // ============================================================
    // ★★★ Phase 5 Refactoring: 資料源 ID 路由表 (ID Routing Map) ★★★
    // ============================================================
    // 將所有 Sheet ID 集中管理，不再散落在各處。
    // 即使目前多數指向同一個 ID，邏輯上我們將其視為不同實體。
    IDS: {
        // 1. 核心業務資料 (High Value: 客戶, 機會, 互動)
        CORE: process.env.SPREADSHEET_ID, 

        // 2. 原始資料/暫存區 (High Frequency: OCR, Line Leads)
        // 若環境變數未設定 RAW_DATA_ID，暫時使用 CORE ID (向下相容方便測試)
        RAW: process.env.RAW_DATA_SPREADSHEET_ID,

        // 3. 系統設定 (Configuration: 下拉選單, 參數)
        // 這是我們第一個要實體分離的目標
        SYSTEM: process.env.SYSTEM_SETTING_SPREADSHEET_ID,

        // 4. 權限與使用者 (Security: User, Auth)
        // 使用既有的 AUTH_SPREADSHEET_ID
        AUTH: process.env.AUTH_SPREADSHEET_ID,

        // 5. 市場商品資料 (Domain: Products)
        // 使用既有的 MARKET_PRODUCT_SHEET_ID
        PRODUCT: process.env.MARKET_PRODUCT_SHEET_ID,

        // 6. 內部運營與進度追蹤 (Domain: Internal Operations)
        INTERNAL_OPS: process.env.INTERNAL_OPS_SHEET_ID
    },

    // ============================================================
    // ★★★ Phase 5 Refactoring: 資料源切換開關 (Source Toggles) ★★★
    // ============================================================
    // 決定各模組的資料來源是 'SHEET' 還是 'SQL'。
    // 目前階段全數預設為 'SHEET'。
    DATA_SOURCES: {
        CONTACT: 'SHEET',
        OPPORTUNITY: 'SHEET',
        INTERACTION: 'SHEET',
        EVENT_LOG: 'SHEET',
        SYSTEM: 'SHEET',
        PRODUCT: 'SHEET',
        AUTH: 'SHEET',
        WEEKLY: 'SHEET',
        INTERNAL_OPS: 'SHEET'
    },

    // --- 保留舊有設定以供尚未重構的模組讀取 (Legacy Support) ---
    SPREADSHEET_ID: process.env.SPREADSHEET_ID,
    AUTH_SPREADSHEET_ID: process.env.AUTH_SPREADSHEET_ID,
    MARKET_PRODUCT_SHEET_ID: process.env.MARKET_PRODUCT_SHEET_ID,
    
    // Google Drive 設定
    DRIVE_FOLDER_ID: process.env.DRIVE_FOLDER_ID,
    
    // Google Calendar 設定
    CALENDAR_ID: process.env.CALENDAR_ID,
    PERSONAL_CALENDAR_ID: process.env.PERSONAL_CALENDAR_ID,

    TEAM_CALENDAR_NAME: 'TFC CRM測試日曆',
    TIMEZONE: 'Asia/Taipei',
    
    // 工作表名稱定義 (Sheet Names)
    SHEETS: {
        CONTACTS: '原始名片資料',
        CONTACT_LIST: '聯絡人總表',
        COMPANY_LIST: '公司總表',
        OPPORTUNITIES: '機會案件工作表',
        INTERACTIONS: '互動紀錄工作表',
        SYSTEM_CONFIG: '系統設定工作表',
        CALENDAR_SYNC: '日曆整合工作表',
        
        // --- 事件紀錄表 ---
        EVENT_LOGS_GENERAL: '事件紀錄_一般',
        EVENT_LOGS_IOT: '事件紀錄_IOT',
        EVENT_LOGS_DT: '事件紀錄_DT',
        EVENT_LOGS_DX: '事件紀錄_DX',
        
        OPPORTUNITY_CONTACT_LINK: '機會-聯絡人關聯表',
        WEEKLY_BUSINESS: '週間業務工作表',
        ANNOUNCEMENTS: '佈告欄',

        // 市場商品資料
        MARKET_PRODUCTS: '市場商品資料',

        // 內部運營模組
        TEAM_WORKLOAD: '團隊成員負荷',
        DEV_PROJECTS: '開發案件追蹤',
        SUBSCRIPTION_OPS: '訂閱制管理'
    },

    // 重構：機會案件 - 標準標題名稱定義
    OPPORTUNITY_FIELD_NAMES: {
        ID: '機會ID',
        NAME: '機會名稱',
        CUSTOMER: '終端客戶',
        SALES_MODEL: '銷售模式',
        CHANNEL: '主要通路/下單方',
        CHANNEL_CONTACT: '通路窗口',
        CONTACT: '終端窗口',
        ASSIGNEE: '負責業務',
        TYPE: '機會種類',
        SOURCE: '機會來源',
        STAGE: '目前階段',
        CLOSE_DATE: '預計結案日',
        PROBABILITY: '下單機率',
        VALUE: '機會價值',
        VALUE_TYPE: '金額計算模式',
        PRODUCT_SPEC: '產品明細',       
        CHANNEL_DETAILS: '通路結構詳情', 
        DEVICE_SCALE: '設備規模',
        NOTES: '備註',
        DRIVE_LINK: 'Drive資料夾連結',
        STATUS: '目前狀態',
        HISTORY: '階段歷程',
        CREATED_TIME: '建立時間',
        LAST_UPDATE_TIME: '最後更新時間',
        LAST_MODIFIER: '最後變更者',
        PARENT_ID: '母機會ID'           
    },
    
    // --- 事件紀錄欄位結構 ---
    EVENT_LOG_COMMON_FIELDS: [
        '事件ID', '事件名稱', '關聯機會ID', '關聯公司ID', '建立者', 
        '建立時間', '最後修改時間', '我方與會人員', '客戶與會人員', 
        '會議地點', '會議內容', '客戶提問', '客戶情報', '備註',
        '修訂版次' 
    ],
    EVENT_LOG_IOT_FIELDS: [
        '設備規模', '生產線特徵', '生產現況', 'IoT現況', '痛點分類',
        '客戶痛點說明', '痛點分析與對策', '系統架構'
    ],
    EVENT_LOG_DT_FIELDS: [
        '設備規模', '加工類型', '加工產業別'
    ],

    // 佈告欄欄位
    ANNOUNCEMENT_FIELDS: {
        ID: 0, TITLE: 1, CONTENT: 2, CREATOR: 3, CREATE_TIME: 4, 
        LAST_UPDATE_TIME: 5, STATUS: 6, IS_PINNED: 7
    },

    // 機會-聯絡人關聯表欄位
    OPP_CONTACT_LINK_FIELDS: {
        LINK_ID: 0, OPPORTUNITY_ID: 1, CONTACT_ID: 2, 
        CREATE_TIME: 3, STATUS: 4, CREATOR: 5
    },

    // 原始名片資料欄位對應
    // [V5.1.0] Repurposed indexes 17 and 18 safely within 0-25 boundary limits
    CONTACT_FIELDS: {
        TIME: 0, NAME: 1, COMPANY: 2, POSITION: 3, DEPARTMENT: 4, PHONE: 5, MOBILE: 6, FAX: 7, EMAIL: 8, WEBSITE: 9, ADDRESS: 10, CONFIDENCE: 11, PROCESSING_TIME: 12, DRIVE_LINK: 13, SMART_FILENAME: 14, LOCAL_PATH: 15, RAW_TEXT: 16, EXHIBITION_NAME: 17, IS_EXHIBITION: 18, DATA_SOURCE: 19, LINE_USER_ID: 20, USER_NICKNAME: 21, USER_TAG: 22, ORIGINAL_ID: 23, STATUS: 24
    },
    
    // 互動紀錄工作表欄位
    INTERACTION_FIELDS: [
        '互動ID', '機會ID', '互動時間', '互動類型', '事件標題', '內容摘要',
        '參與人員', '下次行動', '附件連結', 'Calendar事件ID', '記錄人', '建立時間',
        '公司ID'
    ],
    
    // 系統設定工作表欄位
    SYSTEM_CONFIG_FIELDS: [
        '設定類型', '設定項目', '顯示順序', '啟用狀態', '備註'
    ],
    
    // 聯絡人總表欄位
    CONTACT_LIST_FIELDS: [
        '聯絡人ID', '來源ID', '姓名', '公司ID', '部門', 
        '職稱', '手機', '公司電話', 'Email', '建立時間', '最後更新時間',
        '建立者', '最後變更者'
    ],
    
    // 公司總表欄位
    COMPANY_LIST_FIELDS: [
        '公司ID', '公司名稱', '公司電話', '地址', '建立時間', '最後更新時間',
        '縣市', '建立者', '最後變更者', '公司簡介',
        '公司類型', '客戶階段', '互動評級'
    ],
    
    // 日曆整合工作表欄位
    CALENDAR_SYNC_FIELDS: [
        '紀錄ID', '機會ID', 'Calendar事件ID', '事件標題',
        '開始時間', '結束時間', '建立時間', '建立者'
    ],
    
    // 週間業務工作表欄位
    WEEKLY_BUSINESS_FIELDS: [
        '日期', 'Week ID', '分類', '主題', '參與人員', 
        '重點摘要', '待辦事項', '建立時間', '最後更新時間', 
        '建立者', '紀錄ID'
    ],

    // 市場商品資料欄位對應 (Index 0-21)
    MARKET_PRODUCT_FIELDS: {
        ID: 0,              // 商品ID
        NAME: 1,            // 商品
        CATEGORY: 2,        // 商品種類
        GROUP: 3,           // 群組
        COMBINATION: 4,     // 商品組合
        UNIT: 5,            // 單位
        SPEC: 6,            // 規格
        COST: 7,            // 成本 (機敏)
        PRICE_MTB: 8,       // MTB價格 (機敏)
        PRICE_SI: 9,        // SI價格 (機敏)
        PRICE_MTU: 10,      // MTU售價 (機敏)
        SUPPLIER: 11,       // 供應商
        SERIES: 12,         // 系列
        INTERFACE: 13,      // 介面
        PROPERTY: 14,       // 性質
        ASPECT: 15,         // 面向
        DESCRIPTION: 16,    // 說明資料
        STATUS: 17,         // 狀態
        CREATOR: 18,        // 建立者
        CREATE_TIME: 19,    // 資料建立日期
        LAST_MODIFIER: 20,  // 最後修改者
        LAST_UPDATE_TIME: 21 // 最後修改日期
    },

    // 分頁設定
    PAGINATION: {
        CONTACTS_PER_PAGE: 20,
        OPPORTUNITIES_PER_PAGE: 10,
        INTERACTIONS_PER_PAGE: 15,
        KANBAN_CARDS_PER_STAGE: 5,
        PRODUCTS_PER_PAGE: 50
    },
    
    // Follow-up 設定
    FOLLOW_UP: {
        DAYS_THRESHOLD: 7,
        ACTIVE_STAGES: ['01_初步接觸', '02_需求確認', '03_提案報價', '04_談判修正']
    },
    
    // Calendar 事件命名格式
    CALENDAR_EVENT: {
        TITLE_FORMAT: '[{assignee}][{stage}] {company} - {description}',
        DEFAULT_DURATION: 60,
        REMINDER_MINUTES: 15
    },
    
    // 系統常數
    CONSTANTS: {
        OPPORTUNITY_STATUS: {
            ACTIVE: '進行中',
            COMPLETED: '已完成', 
            CANCELLED: '已取消',
            ARCHIVED: '已封存'
        },
        CONTACT_STATUS: {
            UPGRADED: '已升級'
        },
        DEFAULT_VALUES: {
            OPPORTUNITY_VALUE: '',
            OPPORTUNITY_STAGE: null,
            OPPORTUNITY_STATUS: '進行中',
            INTERACTION_DURATION: 30
        }
    },
    
    // 錯誤訊息
    ERROR_MESSAGES: {
        AUTH_FAILED: 'Google認證失敗，請檢查設定',
        SHEET_NOT_FOUND: '找不到指定的工作表',
        INVALID_DATA: '資料格式不正確',
        NETWORK_ERROR: '網路連線錯誤，請稍後再試',
        PERMISSION_DENIED: '權限不足，請聯絡管理員',
        ADMIN_ONLY: '此功能僅限管理員使用 (機密資料)'
    },
    
    // 成功訊息
    SUCCESS_MESSAGES: {
        OPPORTUNITY_CREATED: '機會案件建立成功',
        CONTACT_UPGRADED: '聯絡人升級成功',
        EVENT_CREATED: 'Calendar事件建立成功',
        DATA_UPDATED: '資料更新成功'
    },

    // 認證相關設定
    AUTH: {
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: '8h'
    }
};
</file>

<file path="config/supabase.js">
/**
 * config/supabase.js
 * Supabase client (SQL Read enabled)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase env vars missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

module.exports = { supabase };
</file>

<file path="middleware/error.middleware.js">
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
</file>

<file path="package.json">
{
  "name": "tfc-crm-system",
  "version": "1.0.0",
  "description": "TFC CRM系統 - 以機會為核心的客戶關係管理",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "node test.js"
  },
  "keywords": [
    "CRM",
    "Google Sheets",
    "Calendar",
    "Node.js"
  ],
  "author": "TFC Team",
  "license": "MIT",
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@highcharts/map-collection": "^2.3.2",
    "@supabase/supabase-js": "^2.93.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "googleapis": "^126.0.1",
    "highcharts": "^12.5.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
</file>

<file path="routes/index.js">
/**
 * routes/index.js
 * API 總路由入口
 * * @version 6.2.0 (Added Internal Ops Routes)
 * @date 2026-04-20
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// --- Controllers ---
const externalController = require('../controllers/external.controller');

// --- Routes ---
const authRoutes = require('./auth.routes');
const systemRoutes = require('./system.routes');
const announcementRoutes = require('./announcement.routes');
const contactRoutes = require('./contact.routes');
const companyRoutes = require('./company.routes');
const opportunityRoutes = require('./opportunity.routes');
const productRoutes = require('./product.routes');
const weeklyRoutes = require('./weekly.routes');
const salesRoutes = require('./sales.routes');
const interactionRoutes = require('./interaction.routes');
const eventRoutes = require('./event.routes');
const lineLeadsRoutes = require('./line-leads.routes');
const externalRoutes = require('./external.routes');
const calendarRoutes = require('./calendar.routes');
const internalOpsRoutes = require('./internal-ops.routes');

// ==========================================
// 1. 公開/特殊驗證路由 (Public / Custom Auth)
// ==========================================
router.use('/auth', authRoutes);

// ★★★ 關鍵修正：LINE 路由必須移出標準 Auth 保護區 ★★★
router.use('/line', lineLeadsRoutes);

// Legacy: 名片預覽
router.get('/drive/thumbnail', externalController.getDriveThumbnail);

// ==========================================
// 2. 系統標準保護區域 (System Protected)
// ==========================================
router.use(authMiddleware.verifyToken);

router.use('/', systemRoutes);
router.use('/external', externalRoutes);
router.use('/announcements', announcementRoutes);
router.use('/contacts', contactRoutes);
router.use('/contact-list', contactRoutes);
router.use('/companies', companyRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/products', productRoutes);
router.use('/business/weekly', weeklyRoutes);

// ✅ 原本路由
router.use('/sales', salesRoutes);
// ✅ 相容前端用的 alias（不動前端）
router.use('/sales-analysis', salesRoutes);

router.use('/interactions', interactionRoutes);
router.use('/events', eventRoutes);
router.use('/calendar', calendarRoutes);
router.use('/internal-ops', internalOpsRoutes);

// ==========================================
// 3. 404 與 根路徑
// ==========================================
router.get('/', (req, res) => {
    res.json({ status: 'online', message: 'TFC CRM API v6.2.0' });
});

router.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'API Endpoint Not Found' });
});

module.exports = router;
</file>

<file path="services/index.js">
/**
 * services/index.js
 * 業務服務層入口 (Service Factory)
 * * @version 6.0.1 (Line-Leads L1→L2 minimal)
 * @date 2026-01-26
 * @description 僅為 Line-Leads L1→L2 增補 authService 注入，不改動既有 DI 架構與回傳容器型態。
 * 確保低層級 Service (如 Opportunity) 先初始化，再注入到聚合型 Service (如 Weekly) 中。
 */

const config = require('../config');
const AuthService = require('./auth-service');
const DashboardService = require('./dashboard-service');
const OpportunityService = require('./opportunity-service');
const CompanyService = require('./company-service');
const EventLogService = require('./event-log-service');
const WeeklyBusinessService = require('./weekly-business-service');
const SalesAnalysisService = require('./sales-analysis-service');

// 日期輔助函式 (保留原始邏輯)
const dateHelpers = {
    getWeekId: (d) => {
        if (!(d instanceof Date)) {
            try {
                d = new Date(d);
                if (isNaN(d.getTime())) throw new Error();
            } catch {
                d = new Date();
                console.warn("Invalid date passed to getWeekId, using current date.");
            }
        }
        // 使用 UTC 計算以避免時區問題
        d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    },
    getWeekInfo: (weekId) => {
        const [year, week] = weekId.split('-W').map(Number);
        const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
        const day = d.getUTCDay() || 7;
        if (day !== 1) d.setUTCDate(d.getUTCDate() - day + 1);
        const start = d;
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 4);
        const weekOfMonth = Math.ceil(start.getUTCDate() / 7);
        const month = start.toLocaleString('zh-TW', { month: 'long', timeZone: 'UTC' });
        const formatDate = (dt) => `${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${String(dt.getUTCDate()).padStart(2, '0')}`;
        const days = Array.from({length: 5}, (_, i) => {
            const dayDate = new Date(start);
            dayDate.setUTCDate(start.getUTCDate() + i);
            return {
                dayIndex: i + 1,
                date: dayDate.toISOString().split('T')[0],
                displayDate: formatDate(dayDate)
            };
        });
        return {
            title: `${year}年 ${month}, 第 ${weekOfMonth} 週`,
            dateRange: `(${formatDate(start)} - ${formatDate(end)})`,
            month, weekOfMonth, shortDateRange: `${formatDate(start)} - ${formatDate(end)}`, days
        };
    }
};

/**
 * 初始化業務邏輯服務
 * @param {Object} coreServices - 包含 Google Clients, Readers, Writers 的核心服務容器
 */
function initializeBusinessServices(coreServices) {
    // 將 config 和 dateHelpers 加入基礎依賴中
    const servicesWithUtils = { ...coreServices, config, dateHelpers };

    // Line-Leads L1→L2：提供 authService 給 routes/line-leads.routes.js 注入
    const authService = new AuthService(coreServices.systemReader, coreServices.systemWriter);

    // ============================================================
    // Level 1: 基礎業務服務 (Base Domain Services)
    // 這些服務只依賴 Reader/Writer，不依賴其他 Service
    // ============================================================
    const companyService = new CompanyService(servicesWithUtils);
    const eventLogService = new EventLogService(servicesWithUtils);
    const opportunityService = new OpportunityService(servicesWithUtils);
    const salesAnalysisService = new SalesAnalysisService(servicesWithUtils);

    // ============================================================
    // Level 2: 聚合型服務 (Aggregator Services)
    // 這些服務需要呼叫 Level 1 的 Service 來組裝數據
    // ============================================================

    // WeeklyBusinessService 需要 OpportunityService 來獲取本週商機
    const servicesForWeekly = {
        ...servicesWithUtils,
        opportunityService: opportunityService // 明確注入已實例化的 opportunityService
    };
    const weeklyBusinessService = new WeeklyBusinessService(servicesForWeekly);

    // ============================================================
    // Level 3: 儀表板與總覽 (Dashboard & Overview)
    // 依賴所有已初始化的 Service
    // ============================================================
    const allInitializedServices = {
        ...servicesWithUtils,
        opportunityService,
        companyService,
        eventLogService,
        weeklyBusinessService,
        salesAnalysisService
    };

    const dashboardService = new DashboardService(allInitializedServices);

    // 回傳完整的服務容器
    return {
        // Google API 客戶端
        sheets: coreServices.sheets,
        calendar: coreServices.calendar,
        drive: coreServices.drive,

        // 工具函式
        dateHelpers,

        // 身分驗證服務（供 Line-Leads 注入）
        authService,

        // 業務邏輯服務 (Business Services)
        dashboardService,
        opportunityService,
        companyService,
        eventLogService,
        weeklyBusinessService,
        salesAnalysisService,

        // 核心工作流服務 (Core Workflow)
        workflowService: coreServices.workflowService,
        calendarService: coreServices.calendarService,

        // 資料層 Readers
        contactReader: coreServices.contactReader,
        opportunityReader: coreServices.opportunityReader,
        companyReader: coreServices.companyReader,
        interactionReader: coreServices.interactionReader,
        systemReader: coreServices.systemReader,
        weeklyBusinessReader: coreServices.weeklyBusinessReader,
        eventLogReader: coreServices.eventLogReader,
        announcementReader: coreServices.announcementReader,
        productReader: coreServices.productReader, // 確保 Product 相關也被匯出

        // 資料層 Writers
        companyWriter: coreServices.companyWriter,
        contactWriter: coreServices.contactWriter,
        opportunityWriter: coreServices.opportunityWriter,
        interactionWriter: coreServices.interactionWriter,
        eventLogWriter: coreServices.eventLogWriter,
        weeklyBusinessWriter: coreServices.weeklyBusinessWriter,
        announcementWriter: coreServices.announcementWriter,
        systemWriter: coreServices.systemWriter, // 用於寫入系統設定 (如分類排序)
        productWriter: coreServices.productWriter
    };
}

module.exports = initializeBusinessServices;
</file>

<file path="services/service-container.js">
// ============================================================================
// File: services/service-container.js
// ============================================================================
/**
 * services/service-container.js
 * 服務容器 (IoC Container)
 * @version 9.5.0
 * @date 2026-04-20
 * @changelog
 * - [V9.5.0] Added initialization and dependency injection for Internal Operations module.
 * - [V9.4.0] Instantiated ContactService with systemService injection for Fallback Auto-Tag requirements.
 * - [PATCH] Enforced architectural rule: InteractionService is the single authoritative entry point for interaction creation. Removed deprecated `interactionWriter` from exported services. Cleaned up stale DI comments.
 * - [PATCH] Updated dependency injection: replaced interactionWriter with interactionService for OpportunityService and CompanyService to unify interaction logging entry point.
 * - [PHASE 9.3.2] Injected contactSqlWriter into OpportunityService for SQL-safe contact scaffolding.
 * - [PHASE 9.3.1] Patched dependency injection wiring to securely provide systemService to OpportunityService, EventLogService, SalesAnalysisService, and ProductService.
 * - [PHASE 9.3] Verified and fixed all semantic RAW vs OFFICIAL mismatches in domain logic.
 * - [PHASE 9.3] Successfully and safely eradicated 100% of CORE Legacy Sheet Readers/Writers instantiations.
 * - [PHASE 9.3] Retained contactRawReader explicitly and exclusively for RAW (leads) mapping.
 */

const config = require('../config');
const dateHelpers = require('../utils/date-helpers');

// --- Import Infrastructure Services ---
const GoogleClientService = require('./google-client-service');

// --- Import Readers ---
const ContactReader = require('../data/contact-reader'); // EXCLUSIVELY FOR RAW
const ContactSqlReader = require('../data/contact-sql-reader');
const CompanySqlReader = require('../data/company-sql-reader');
const OpportunitySqlReader = require('../data/opportunity-sql-reader');
const InteractionSqlReader = require('../data/interaction-sql-reader');
const EventLogSqlReader = require('../data/event-log-sql-reader');
const SystemReader = require('../data/system-reader');
const WeeklyBusinessReader = require('../data/weekly-business-reader');
const WeeklyBusinessSqlReader = require('../data/weekly-business-sql-reader');
const AnnouncementReader = require('../data/announcement-reader');
const AnnouncementSqlReader = require('../data/announcement-sql-reader');
const ProductReader = require('../data/product-reader');
const InternalOpsReader = require('../data/internal-ops-reader');

// --- Import Writers ---
const ContactWriter = require('../data/contact-writer'); // EXCLUSIVELY FOR RAW
const ContactSqlWriter = require('../data/contact-sql-writer');
const CompanySqlWriter = require('../data/company-sql-writer');
const OpportunitySqlWriter = require('../data/opportunity-sql-writer');
const InteractionSqlWriter = require('../data/interaction-sql-writer');
const EventLogSqlWriter = require('../data/event-log-sql-writer');
const SystemWriter = require('../data/system-writer');
const WeeklyBusinessWriter = require('../data/weekly-business-writer');
const WeeklyBusinessSqlWriter = require('../data/weekly-business-sql-writer');
const AnnouncementWriter = require('../data/announcement-writer');
const AnnouncementSqlWriter = require('../data/announcement-sql-writer');
const ProductWriter = require('../data/product-writer');
const InternalOpsWriter = require('../data/internal-ops-writer');

// --- Import Domain Services ---
const AuthService = require('./auth-service');
const DashboardService = require('./dashboard-service');
const OpportunityService = require('./opportunity-service');
const ContactService = require('./contact-service');
const CompanyService = require('./company-service');
const InteractionService = require('./interaction-service');
const EventLogService = require('./event-log-service');
const CalendarService = require('./calendar-service');
const SalesAnalysisService = require('./sales-analysis-service');
const WeeklyBusinessService = require('./weekly-business-service');
const WorkflowService = require('./workflow-service');
const ProductService = require('./product-service');
const AnnouncementService = require('./announcement-service');
const EventService = require('./event-service');
const SystemService = require('./system-service');
const InternalOpsService = require('./internal-ops-service');

// --- Import Controllers ---
const AuthController = require('../controllers/auth.controller');
const SystemController = require('../controllers/system.controller');
const AnnouncementController = require('../controllers/announcement.controller');
const OpportunityController = require('../controllers/opportunity.controller');
const ContactController = require('../controllers/contact.controller');
const CompanyController = require('../controllers/company.controller');
const InteractionController = require('../controllers/interaction.controller');
const ProductController = require('../controllers/product.controller');
const WeeklyController = require('../controllers/weekly.controller');

let services = null;

async function initializeServices() {
    if (services) return services;

    console.log('🚀 [System] 正在初始化 Service Container (v9.5.0 SQL-Only CORE + Internal Ops)...');

    try {
        // 1. Infrastructure
        const googleClientService = new GoogleClientService();
        const sheets = await googleClientService.getSheetsClient();
        const drive = await googleClientService.getDriveClient();
        const calendar = await googleClientService.getCalendarClient();

        // 2. Readers
        // RAW Keep
        const contactRawReader = new ContactReader(sheets, config.IDS.RAW); 
        
        // SQL Keep
        const contactSqlReader = new ContactSqlReader();
        const companySqlReader = new CompanySqlReader();
        const opportunitySqlReader = new OpportunitySqlReader();
        const interactionSqlReader = new InteractionSqlReader();
        const eventLogSqlReader = new EventLogSqlReader();

        // SYSTEM Keep
        const weeklyReader = new WeeklyBusinessReader(sheets, config.IDS.CORE);
        const weeklySqlReader = new WeeklyBusinessSqlReader();
        const announcementReader = new AnnouncementReader(sheets, config.IDS.CORE);
        const announcementSqlReader = new AnnouncementSqlReader();
        const systemReader = new SystemReader(sheets, config.IDS.SYSTEM);
        const productReader = new ProductReader(sheets, config.IDS.PRODUCT);
        const internalOpsReader = new InternalOpsReader(sheets, config.IDS.INTERNAL_OPS);

        // 3. Writers
        // RAW Keep
        const contactWriter = new ContactWriter(sheets, config.IDS.RAW, contactRawReader);
        
        // SQL Keep
        const contactSqlWriter = new ContactSqlWriter();
        const companySqlWriter = new CompanySqlWriter();
        const opportunitySqlWriter = new OpportunitySqlWriter();
        const interactionSqlWriter = new InteractionSqlWriter();
        const eventLogSqlWriter = new EventLogSqlWriter();

        // SYSTEM Keep
        const weeklyWriter = new WeeklyBusinessWriter(sheets, config.IDS.CORE, weeklyReader);
        const weeklySqlWriter = new WeeklyBusinessSqlWriter();
        const announcementWriter = new AnnouncementWriter(sheets, config.IDS.CORE, announcementReader);
        const announcementSqlWriter = new AnnouncementSqlWriter();
        const systemWriter = new SystemWriter(sheets, config.IDS.SYSTEM, systemReader);
        const productWriter = new ProductWriter(sheets, config.IDS.PRODUCT, productReader);
        const internalOpsWriter = new InternalOpsWriter(sheets, config.IDS.INTERNAL_OPS, internalOpsReader);

        // 4. Domain Services
        const calendarService = new CalendarService(calendar);
        const authService = new AuthService(systemReader, systemWriter);

        const announcementService = new AnnouncementService({
            announcementSqlReader,
            announcementSqlWriter
        });

        const systemService = new SystemService(systemReader, systemWriter);

        // DI Constructor Mapping: 
        // Official slots strictly mapped to SQL variants.
        
        const interactionService = new InteractionService(
            interactionSqlReader,
            interactionSqlWriter,
            opportunitySqlReader, 
            companySqlReader      
        );

        // [V9.4.0] Added explicit injection of systemService to allow safe execution of Fallback Auto-Tag
        const contactService = new ContactService(
            contactRawReader, // explicit RAW
            contactSqlReader, // contactCoreReader => SQL Official
            contactWriter,
            companySqlReader, 
            config,
            contactSqlReader,
            contactSqlWriter,
            companySqlReader, // Passed implicitly previously
            systemService     // Required for strict deterministic settings resolution
        );

        const companyService = new CompanyService(
            companySqlReader,      // companyReader => SQL
            companySqlWriter,      // companyWriter => SQL
            contactSqlReader,      // contactReader => SQL
            contactWriter,
            opportunitySqlReader,  // opportunityReader => SQL
            opportunitySqlWriter,  // opportunityWriter => SQL
            interactionSqlReader,  // interactionReader => SQL
            interactionService,    // interactionService (Authoritative entry point)
            eventLogSqlReader,     // eventLogReader => SQL
            systemReader,
            companySqlReader,
            contactService,        // ContactService exposes RAW getPotentialContacts securely
            companySqlWriter,
            eventLogSqlReader, 
            contactSqlReader,       
            opportunitySqlReader,   
            interactionSqlReader    
        );

        const opportunityService = new OpportunityService({
            config,
            opportunityWriter: opportunitySqlWriter, // opportunityWriter => SQL
            contactReader: contactSqlReader, // contactReader => SQL
            contactWriter,
            companyWriter: companySqlWriter, // companyWriter => SQL
            interactionReader: interactionSqlReader, // interactionReader => SQL
            interactionService, // interactionService (Authoritative entry point)
            eventLogReader: eventLogSqlReader, // eventLogReader => SQL
            systemReader,
            systemService, // [Patch 9.3.1] Wire newly required systemService
            opportunitySqlReader,
            opportunitySqlWriter,
            eventLogSqlReader,     
            companySqlReader,      
            interactionSqlReader,   
            contactSqlReader,
            contactSqlWriter // [PHASE 9.3.2] Inject for SQL contact scaffolding
        });

        const eventLogService = new EventLogService(
            eventLogSqlReader, 
            opportunitySqlReader, 
            companySqlReader, 
            systemService, // [Patch 9.3.1] Replaced systemReader with systemService
            calendarService,
            eventLogSqlReader, 
            eventLogSqlWriter  
        );

        const weeklyBusinessService = new WeeklyBusinessService({
            weeklyBusinessReader: weeklyReader,
            weeklyBusinessSqlReader: weeklySqlReader,
            weeklyBusinessSqlWriter: weeklySqlWriter,
            dateHelpers,
            calendarService,
            systemService, 
            opportunityService,
            config
        });

        const salesAnalysisService = new SalesAnalysisService(
            opportunitySqlReader, 
            systemService, // [Patch 9.3.1] Replaced systemReader with systemService
            config
        );
        
        // [Patch 9.3.1] Appended systemService as 5th argument
        const productService = new ProductService(productReader, productWriter, systemReader, systemWriter, systemService);

        const dashboardService = new DashboardService(
            config,
            contactService,
            eventLogSqlReader,
            systemReader,
            weeklyBusinessService,
            calendarService,
            contactSqlReader,
            interactionSqlReader,
            companySqlReader,
            opportunitySqlReader,
            systemService
        );

        const workflowService = new WorkflowService(
            opportunityService,
            interactionService,
            contactService
        );

        const eventService = new EventService(
            calendarService,
            interactionService,
            weeklyBusinessService,
            opportunityService,
            config,
            dateHelpers
        );

        const internalOpsService = new InternalOpsService(internalOpsReader, internalOpsWriter, config);

        // 5. Controllers
        const authController = new AuthController(authService);
        const systemController = new SystemController(systemService, dashboardService);
        const announcementController = new AnnouncementController(announcementService);
        const contactController = new ContactController(contactService, workflowService, contactWriter);
        const companyController = new CompanyController(companyService);
        const opportunityController = new OpportunityController(
            opportunityService,
            workflowService,
            dashboardService,
            opportunitySqlReader, 
            opportunitySqlWriter  
        );
        const interactionController = new InteractionController(interactionService);
        const productController = new ProductController(productService);
        const weeklyController = new WeeklyController(weeklyBusinessService);

        console.log('✅ Service Container 初始化完成');

        services = {
            googleClientService,
            authService, contactService, companyService,
            opportunityService, interactionService, eventLogService, calendarService,
            weeklyBusinessService, salesAnalysisService, dashboardService,
            workflowService, productService,
            announcementService,
            eventService,
            systemService,
            internalOpsService,
            authController,
            systemController,
            announcementController,
            contactController,
            companyController,
            opportunityController,
            interactionController,
            productController,
            weeklyController,
            contactWriter,
            contactRawReader,
            contactCoreReader: contactSqlReader, // Expose explicitly mapped SQL core
            weeklyBusinessReader: weeklyReader,
            weeklyBusinessWriter: weeklyWriter,
            systemReader, systemWriter,
            eventLogReader: eventLogSqlReader,
            internalOpsReader,
            internalOpsWriter
        };

        return services;

    } catch (error) {
        console.error('⚠ 系統啟動失敗 (Service Container):', error.message);
        console.error(error.stack);
        throw error;
    }
}

module.exports = initializeServices;
</file>

<file path="utils/date-helpers.js">
/**
 * utils/date-helpers.js
 * 日期處理工具函式庫
 * * @version 6.0.0 (Added getWeekInfo for WeeklyService)
 * @date 2026-01-14
 * @description 提供週次計算、日期範圍轉換等通用功能。
 */

const dateHelpers = {
    /**
     * 取得日期的週次 ID (格式: YYYY-Www)
     * @param {Date|string} date - 日期物件或字串
     * @returns {string} e.g., "2026-W03"
     */
    getWeekId: (date) => {
        let d = date;
        if (!(d instanceof Date)) {
            try {
                d = new Date(d);
                if (isNaN(d.getTime())) throw new Error();
            } catch {
                d = new Date();
                console.warn("[DateHelpers] Invalid date passed to getWeekId, using current date.");
            }
        }
        // 使用 ISO 8601 週次計算邏輯
        d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    },

    /**
     * 取得本週的起始與結束日期 (週一 ~ 週日)
     * @param {Date} date - 基準日期
     * @returns {Object} { start: Date, end: Date }
     */
    getWeekRange: (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        
        return { start, end };
    },

    /**
     * 【關鍵修復】根據 Week ID 解析詳細週次資訊
     * WeeklyBusinessService 依賴此方法來產生列表標題與日期範圍
     * @param {string} weekId - e.g., "2026-W03"
     * @returns {Object} { title, dateRange, month, days: [...] }
     */
    getWeekInfo: (weekId) => {
        // 容錯處理：如果傳入的不是標準格式，嘗試解析或回傳預設值
        if (!weekId || !weekId.includes('-W')) {
            console.warn(`[DateHelpers] Invalid weekId format: ${weekId}`);
            // 嘗試當作日期處理
            const d = new Date(weekId);
            if (!isNaN(d.getTime())) {
                // 如果是日期字串，遞迴呼叫自己正確的 ID
                return dateHelpers.getWeekInfo(dateHelpers.getWeekId(d));
            }
            return { title: 'Unknown Week', dateRange: '', days: [] };
        }

        const [yearStr, weekStr] = weekId.split('-W');
        const year = parseInt(yearStr, 10);
        const week = parseInt(weekStr, 10);

        // 計算該週週一的日期
        const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
        const day = d.getUTCDay() || 7;
        if (day !== 1) d.setUTCDate(d.getUTCDate() - day + 1);
        
        const start = d;
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 4); // 週五 (若要週日改 +6)

        // 計算這是該月的第幾週 (約略)
        const weekOfMonth = Math.ceil(start.getUTCDate() / 7);
        const month = start.toLocaleString('zh-TW', { month: 'long', timeZone: 'UTC' });
        
        // 格式化日期 MM/DD
        const formatDate = (dt) => `${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${String(dt.getUTCDate()).padStart(2, '0')}`;
        const formatFullDate = (dt) => dt.toISOString().split('T')[0]; // YYYY-MM-DD

        // 產生週一到週五(或週日)的每一天
        // WeeklyService 的日曆功能需要這部分
        const days = Array.from({length: 7}, (_, i) => { // 改為 7 天以支援完整日曆
            const dayDate = new Date(start);
            dayDate.setUTCDate(start.getUTCDate() + i);
            return {
                dayIndex: i + 1,
                date: formatFullDate(dayDate),
                displayDate: formatDate(dayDate)
            };
        });

        const endDateForRange = new Date(start);
        endDateForRange.setUTCDate(start.getUTCDate() + 6); // 顯示到週日

        return {
            title: `${year}年 ${month}, 第 ${weekOfMonth} 週`,
            dateRange: `(${formatDate(start)} - ${formatDate(endDateForRange)})`,
            shortDateRange: `${formatDate(start)} - ${formatDate(endDateForRange)}`,
            month, 
            weekOfMonth, 
            days
        };
    }
};

module.exports = dateHelpers;
</file>

</files>
