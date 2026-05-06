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