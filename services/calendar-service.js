/**
 * services/calendar-service.js
 * 日曆服務模組 (Service Layer)
 * * @version 6.0.0 (Added getEventsForPeriod for Weekly Module)
 * @date 2026-01-14
 * @description 負責處理與 Google Calendar 的互動，包含通用活動查詢、建立與假日判斷。
 * 修正：補上 WeeklyBusinessService 所需的 getEventsForPeriod 方法。
 */

const config = require('../config');

class CalendarService {
    /**
     * @param {Object} calendarClient - 已認證的 Google Calendar API 實例
     */
    constructor(calendarClient) {
        if (!calendarClient) throw new Error('CalendarService 初始化失敗：需要 calendarClient');
        
        this.calendar = calendarClient;
        this.config = config;
        this.holidayCalendarId = 'zh-TW.taiwan#holiday@group.v.calendar.google.com';

        // 內部快取機制
        this._cache = {
            weekEvents: { data: null, timestamp: 0 }
        };
        this.CACHE_DURATION = 60 * 1000; // 60 秒
    }

    /**
     * API 自動重試輔助函式 (保留自 v5.0.0)
     */
    async _executeWithRetry(apiCallFn, maxRetries = 3) {
        let attempt = 0;
        while (true) {
            try {
                return await apiCallFn();
            } catch (error) {
                attempt++;
                const isRateLimit = error.code === 429 || error.code === 403 || 
                                   (error.message && error.message.includes('Rate Limit Exceeded'));
                const isServerError = error.code >= 500 && error.code < 600;

                if ((isRateLimit || isServerError) && attempt <= maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                    console.warn(`⏳ [CalendarService] API 重試 (${attempt}/${maxRetries}) - 等待 ${Math.round(delay)}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }
    }

    /**
     * 【關鍵修復】取得指定期間與日曆的活動
     * WeeklyBusinessService 依賴此方法來撈取 DX/AT 日曆資料
     * @param {Date} startDate - 開始時間
     * @param {Date} endDate - 結束時間
     * @param {string} calendarId - 日曆 ID (預設為 primary)
     */
    async getEventsForPeriod(startDate, endDate, calendarId = 'primary') {
        try {
            const response = await this._executeWithRetry(() => 
                this.calendar.events.list({
                    calendarId: calendarId,
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    singleEvents: true, // 展開循環事件
                    orderBy: 'startTime',
                })
            );

            return response.data.items || [];
        } catch (error) {
            console.error(`❌ [CalendarService] 讀取期間活動失敗 (${calendarId}):`, error.message);
            // 回傳空陣列避免業務層崩潰
            return [];
        }
    }

    /**
     * 取得本週行事曆活動 (包含快取 - 保留自 v5.0.0)
     */
    async getThisWeekEvents() {
        const now = Date.now();
        if (this._cache.weekEvents.data && (now - this._cache.weekEvents.timestamp < this.CACHE_DURATION)) {
            return this._cache.weekEvents.data;
        }

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        try {
            const targetCalendarId = this.config.CALENDAR_ID || 'primary';
            
            // 使用內部的 getEventsForPeriod 實作，保持邏輯一致
            const events = await this.getEventsForPeriod(startOfWeek, endOfWeek, targetCalendarId);
            
            const todayStr = today.toISOString().split('T')[0];
            const result = {
                todayEvents: events.filter(e => {
                    const eventDate = e.start.dateTime || e.start.date;
                    return eventDate && eventDate.startsWith(todayStr);
                }),
                todayCount: 0,
                weekCount: events.length
            };
            
            result.todayCount = result.todayEvents.length;

            this._cache.weekEvents = { data: result, timestamp: now };
            return result;

        } catch (error) {
            console.error('❌ [CalendarService] 讀取本週行事曆失敗:', error.message);
            return { todayEvents: [], todayCount: 0, weekCount: 0 };
        }
    }

    /**
     * 建立行事曆事件 (保留自 v5.0.0)
     */
    async createEvent(eventData) {
        try {
            const targetCalendarId = this.config.CALENDAR_ID || 'primary';
            const response = await this._executeWithRetry(() => 
                this.calendar.events.insert({
                    calendarId: targetCalendarId,
                    resource: eventData,
                })
            );
            // 清除快取以確保即時性
            this._cache.weekEvents = { data: null, timestamp: 0 };
            return response.data;
        } catch (error) {
            console.error('❌ [CalendarService] 建立事件失敗:', error.message);
            throw error;
        }
    }

    /**
     * 取得國定假日 (保留自 v5.0.0)
     */
    async getHolidaysForPeriod(startDate, endDate) {
        try {
            const response = await this._executeWithRetry(() => 
                this.calendar.events.list({
                    calendarId: this.holidayCalendarId,
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                })
            );

            const holidays = new Map();
            if (response.data.items) {
                response.data.items.forEach(event => {
                    const holidayDate = event.start.date; 
                    if (holidayDate) {
                        holidays.set(holidayDate, event.summary);
                    }
                });
            }
            return holidays;
        } catch (error) {
            console.error('❌ [CalendarService] 獲取國定假日失敗:', error.message);
            return new Map();
        }
    }
}

module.exports = CalendarService;