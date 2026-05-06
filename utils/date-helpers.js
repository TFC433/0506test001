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