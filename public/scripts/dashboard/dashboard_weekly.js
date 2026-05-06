// public/scripts/dashboard/dashboard_weekly.js

const DashboardWeekly = {
    /**
     * 渲染週間業務區塊 (含雙日曆)
     * @param {Array} entries - 本週業務項目列表
     * @param {Object} weekInfo - 當週詳細資訊 (標題、日期結構、假日)
     */
    render(entries, weekInfo) {
        const widget = document.getElementById('weekly-business-widget');
        if (!widget) return;
        
        const container = widget.querySelector('.widget-content');
        const header = widget.querySelector('.widget-header');
        const titleEl = header.querySelector('.widget-title');
        const systemConfig = window.CRM_APP?.systemConfig || {};

        // 設定標題
        if (weekInfo && weekInfo.title) {
            titleEl.innerHTML = `本週業務重點 <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${weekInfo.title}</span>`;
        }

        // 新增/更新「查看週報」按鈕
        let button = header.querySelector('.action-btn');
        if (!button) {
            button = document.createElement('button');
            button.className = 'action-btn small secondary';
            header.appendChild(button);
        }
        button.textContent = '查看週報';
        button.onclick = () => { 
            if (weekInfo?.weekId) { 
                sessionStorage.setItem('navigateToWeekId', weekInfo.weekId); 
                CRM_APP.navigateTo('weekly-business'); 
            }
        };
        button.disabled = !weekInfo?.weekId;

        const themes = systemConfig['週間業務主題'] || [{value: 'IoT', note: 'IoT'}, {value: 'DT', note: 'DT'}];
        const todayString = new Date().toISOString().split('T')[0];

        // 建立表格 HTML
        let gridHtml = `
            <div class="weekly-grid-container">
                <div class="weekly-grid-header">
                    <div class="day-label-placeholder"></div>
                    ${themes.map(t => `<div class="topic-header ${t.value.toLowerCase()}">${t.note}</div>`).join('')}
                </div>
                <div class="weekly-grid-body">`;

        (weekInfo.days || []).forEach(dayInfo => {
            const dayIndex = dayInfo.dayIndex;
            if (dayIndex < 1 || dayIndex > 5) return;
            const holidayClass = dayInfo.holidayName ? 'is-holiday' : '';

            const isToday = dayInfo.date === todayString;
            const todayClass = isToday ? 'is-today' : '';
            const todayIndicator = isToday ? '<span class="today-indicator">今天</span>' : '';

            gridHtml += `<div class="weekly-day-row ${holidayClass}">
                            <div class="day-label ${todayClass}">
                                ${['週一','週二','週三','週四','週五'][dayIndex-1]}<br>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">(${dayInfo.displayDate})</span>
                                ${holidayClass ? `<span class="holiday-name">${dayInfo.holidayName}</span>` : ''}
                                ${todayIndicator}
                            </div>
                            
                            ${themes.map(t => {
                                // --- 雙日曆分流顯示邏輯 (DX左/AT右) ---
                                let calendarEventsHtml = '';
                                
                                // 左欄 (IoT)：顯示 DX 日曆 (dxCalendarEvents)
                                if (t.value === 'IoT' && dayInfo.dxCalendarEvents && dayInfo.dxCalendarEvents.length > 0) {
                                    calendarEventsHtml = `<div class="calendar-events-list" style="margin-bottom:6px;">`;
                                    dayInfo.dxCalendarEvents.forEach(evt => {
                                       calendarEventsHtml += `<div class="calendar-text-item" style="font-size:0.75rem; padding:1px 4px; margin-bottom:2px; color: #94a3b8; font-weight: 700;">📅 ${evt.summary}</div>`;
                                    });
                                    calendarEventsHtml += `<div class="calendar-separator" style="margin:4px 0;"></div></div>`;
                                }

                                // 右欄 (DT)：顯示 AT 日曆 (atCalendarEvents)
                                if (t.value === 'DT' && dayInfo.atCalendarEvents && dayInfo.atCalendarEvents.length > 0) {
                                    calendarEventsHtml = `<div class="calendar-events-list" style="margin-bottom:6px;">`;
                                    dayInfo.atCalendarEvents.forEach(evt => {
                                       calendarEventsHtml += `<div class="calendar-text-item" style="font-size:0.75rem; padding:1px 4px; margin-bottom:2px; color: #94a3b8; font-weight: 700;">📅 ${evt.summary}</div>`;
                                    });
                                    calendarEventsHtml += `<div class="calendar-separator" style="margin:4px 0;"></div></div>`;
                                }
                                // --- 結束 ---

                                return `<div class="topic-cell ${holidayClass} ${todayClass}" id="wb-dash-${dayIndex}-${t.value.toLowerCase()}">
                                    ${calendarEventsHtml}
                                </div>`;
                            }).join('')}
                         </div>`;
        });
        gridHtml += '</div></div>';
        
        container.innerHTML = gridHtml;

        // 填入業務紀錄 (entries)
        (entries || []).forEach(entry => {
            try {
                if (entry && entry['日期'] && /^\d{4}-\d{2}-\d{2}$/.test(entry['日期'])) {
                    const [y, m, d] = entry['日期'].split('-').map(Number);
                    const entryDateUTC = new Date(Date.UTC(y, m - 1, d));
                    if (!isNaN(entryDateUTC.getTime())) {
                        const dayOfWeek = entryDateUTC.getUTCDay();
                        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                            const category = (entry['category'] || themes[0].value).toLowerCase();
                            const cell = document.getElementById(`wb-dash-${dayOfWeek}-${category}`);
                            if (cell) cell.innerHTML += `<div class="wb-item"><div class="wb-topic">${entry['主題']}</div><div class="wb-participants">👤 ${entry['參與人員'] || 'N/A'}</div></div>`;
                        }
                    }
                }
            } catch (e) {
                 console.warn('渲染儀表板業務紀錄時出錯:', entry, e);
            }
        });
    }
};

window.DashboardWeekly = DashboardWeekly;