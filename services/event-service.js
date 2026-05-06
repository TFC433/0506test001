/**
 * services/event-service.js
 * 會議排程與同步服務
 * * @version 1.0.1 (Phase A - Final Dependency Fix)
 * @date 2026-01-22
 * @description 專責處理 Google Calendar 排程，並同步寫入 Interaction 與 Weekly Business。
 * [Fix] 改為依賴 Service 層，不再直接呼叫 Writer。
 */

class EventService {
    /**
     * @param {CalendarService} calendarService
     * @param {InteractionService} interactionService
     * @param {WeeklyBusinessService} weeklyBusinessService
     * @param {OpportunityService} opportunityService
     * @param {Object} config - 系統設定
     * @param {Object} dateHelpers - 日期輔助工具
     */
    constructor(calendarService, interactionService, weeklyBusinessService, opportunityService, config, dateHelpers) {
        this.calendarService = calendarService;
        this.interactionService = interactionService;
        this.weeklyBusinessService = weeklyBusinessService;
        this.opportunityService = opportunityService;
        this.config = config;
        this.dateHelpers = dateHelpers;
    }

    /**
     * 建立日曆事件並執行多方同步
     * @param {Object} eventData - 來自 req.body 的資料
     * @param {Object} user - 來自 req.user 的使用者物件
     */
    async createCalendarEventAndSync(eventData, user) {
        const { 
            title, startTime, duration, location, description, 
            opportunityId, participants, createInteraction, showTimeInTitle
        } = eventData;

        // 1. 獲取機會詳細資料 (保留原始 try-catch 與 fallback 邏輯)
        let opportunityInfo = null;
        let category = 'DT'; 
        let customerName = '客戶'; // Fallback A: 預設值

        if (opportunityId) {
            try {
                const oppResult = await this.opportunityService.getOpportunityDetails(opportunityId);
                opportunityInfo = oppResult.opportunityInfo;
                
                // 保留原始分類邏輯 (字串包含)
                const type = (opportunityInfo.opportunityType || '').toLowerCase();
                if (type.includes('iot') || type.includes('智慧') || type.includes('連網')) {
                    category = 'IoT';
                } else {
                    category = 'DT';
                }
                
                // Fallback B: 若欄位為空則顯示 '未知客戶'
                customerName = opportunityInfo.customerCompany || '未知客戶';
            } catch (e) {
                console.warn('無法獲取機會詳細資料，將使用預設值:', e.message);
                // 發生錯誤時 customerName 維持 '客戶'
            }
        }

        // 2. 準備資料 payload (保留原始時區設定)
        const start = new Date(startTime);
        
        // 格式化時間 HH:MM (zh-TW, config.TIMEZONE)
        const timeString = start.toLocaleTimeString('zh-TW', { 
            timeZone: this.config.TIMEZONE, 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
        
        // 格式化日期 YYYY-MM-DD (en-CA, config.TIMEZONE)
        const dateString = start.toLocaleDateString('en-CA', { 
            timeZone: this.config.TIMEZONE 
        });

        // 組合 Google Calendar 標題 (保留 showTimeInTitle 邏輯)
        let calendarTitle = title;
        if (showTimeInTitle) {
             calendarTitle = `${title} (${timeString})`;
        }
        
        const companyNote = `關聯公司: ${customerName}`;

        // 組合 Google Calendar 描述 (保留原始 Template)
        const fullDescription = `
【會議詳情】
時間: ${dateString} ${timeString}
地點: ${location || '未指定'}
參與: ${participants || '無'}

【備註內容】
${description || '無'}

【關聯資訊】
${companyNote}
        `.trim();

        // 準備三個寫入動作的 Promise (保留原始架構)
        const actions = [];

        // Action A: 寫入 Google Calendar (保留強制 isAllDay: true)
        actions.push(this.calendarService.createCalendarEvent({
            title: calendarTitle,
            description: fullDescription,
            location: location,
            startTime: startTime, 
            isAllDay: true 
        }));

        const userName = user.name || user.displayName || 'System';

        // Action B: 寫入互動紀錄 (如果勾選)
        if (createInteraction && opportunityId) {
            const interactionData = {
                opportunityId: opportunityId,
                interactionTime: startTime, 
                eventType: '會議討論',
                eventTitle: title, 
                contentSummary: `[參與人員]: ${participants || '無'}\n[地點]: ${location || '無'}\n\n${description || ''}\n(${companyNote})`,
                recorder: userName,
                participants: participants
            };
            // [Fix] 改為呼叫 Service
            actions.push(this.interactionService.createInteraction(interactionData, user));
        }

        // Action C: 寫入週間業務 (如果勾選)
        if (createInteraction && opportunityId) {
            // 使用 dateHelpers 計算 WeekID
            const weekId = this.dateHelpers.getWeekId(start);
            
            const weeklyData = {
                date: dateString, // 使用修正時區後的日期
                weekId: weekId, 
                category: category, 
                topic: title, 
                participants: participants,
                summary: `${description || '(預排行程)'}\n\n(${companyNote})`, 
                actionItems: '',
                creator: userName,
                userId: user.userId 
            };
            
            // [Fix] 改為呼叫 Service
            actions.push(this.weeklyBusinessService.createWeeklyBusinessEntry(weeklyData));
        }

        // 3. 並行執行所有寫入 (保留 Promise.allSettled 策略)
        const results = await Promise.allSettled(actions);
        
        // 檢查 Calendar 結果 (Calendar 成功才算 API 成功)
        const calendarResult = results[0].status === 'fulfilled' ? results[0].value : null;
        const calendarError = results[0].status === 'rejected' ? results[0].reason : null;

        if (calendarResult && calendarResult.success) {
            return calendarResult;
        } else {
            throw calendarError || new Error('建立 Google Calendar 事件失敗');
        }
    }
    
    /**
     * 獲取本週事件 (透傳 CalendarService)
     */
    async getThisWeekEvents() {
        return await this.calendarService.getThisWeekEvents();
    }
}

module.exports = EventService;