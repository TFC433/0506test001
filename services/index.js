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
