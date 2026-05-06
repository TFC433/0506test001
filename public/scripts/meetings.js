// views/scripts/meetings.js

let meetingSearchTimeout;

// ==================== 主要功能函式 ====================

// 顯示建立會議模態框
async function showNewMeetingModal() {
    showModal('new-meeting-modal');
    
    // 1. 渲染參與人員標籤
    renderParticipantSelector();
    
    // 2. 設定預設日期與時間
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    
    // 填入日期 (YYYY-MM-DD)
    const localDateStr = now.toISOString().split('T')[0];
    document.getElementById('meeting-date').value = localDateStr;
    
    // 填入時間 (HH:MM) - 預設值
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('meeting-time').value = `${hours}:${minutes}`;

    // 3. 重置時間開關狀態 (預設不勾選)
    const timeCheckbox = document.getElementById('enable-meeting-time');
    if (timeCheckbox) {
        timeCheckbox.checked = false;
        toggleTimeInput(false); // 執行停用邏輯
        // 綁定切換事件
        timeCheckbox.onchange = (e) => toggleTimeInput(e.target.checked);
    }

    // 4. 重置其他表單欄位
    document.getElementById('meeting-title').value = '';
    document.getElementById('meeting-location').value = '';
    document.getElementById('meeting-description').value = '';
    
    // 重置機會選擇器
    clearMeetingOpportunitySelection();

    // 5. 綁定搜尋相關事件
    const searchInput = document.getElementById('meeting-opportunity-search');
    const clearBtn = document.getElementById('meeting-opportunity-clear');

    if (searchInput) {
        searchInput.removeEventListener('keyup', handleMeetingSearch);
        searchInput.removeEventListener('click', handleMeetingClick);
        searchInput.addEventListener('keyup', handleMeetingSearch);
        searchInput.addEventListener('click', handleMeetingClick);
    }
    
    if (clearBtn) {
        clearBtn.onclick = (e) => {
            e.stopPropagation();
            clearMeetingOpportunitySelection();
        };
    }
}

// 切換時間輸入框的啟用狀態
function toggleTimeInput(isEnabled) {
    const wrapper = document.getElementById('meeting-time-wrapper');
    const input = document.getElementById('meeting-time');
    
    if (isEnabled) {
        wrapper.classList.remove('disabled');
        input.disabled = false;
    } else {
        wrapper.classList.add('disabled');
        input.disabled = true;
    }
}

function handleMeetingClick() {
    const resultsContainer = document.getElementById('meeting-opportunity-results');
    if (resultsContainer && resultsContainer.style.display === 'none') {
        searchMeetingOpportunities(this.value);
    }
}

function handleMeetingSearch(e) {
    const query = e.target.value;
    clearTimeout(meetingSearchTimeout);
    meetingSearchTimeout = setTimeout(() => {
        searchMeetingOpportunities(query);
    }, 300);
}

// 執行搜尋
async function searchMeetingOpportunities(query) {
    const resultsContainer = document.getElementById('meeting-opportunity-results');
    if (!resultsContainer) return;

    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<div class="loading" style="display:block; padding:10px; text-align:center;"><div class="spinner" style="width:20px; height:20px; border-width:2px;"></div></div>';

    try {
        const result = await authedFetch(`/api/opportunities?q=${encodeURIComponent(query)}&page=0`);
        const opportunities = Array.isArray(result) ? result : (result.data || []);

        if (opportunities.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item" style="cursor: default; color: var(--text-muted);">找不到符合的機會</div>';
            return;
        }

        resultsContainer.innerHTML = opportunities.slice(0, 10).map(opp => {
            const safeOpp = JSON.stringify({
                id: opp.opportunityId,
                name: opp.opportunityName,
                company: opp.customerCompany,
                stage: opp.currentStage
            }).replace(/'/g, "&apos;");

            return `
                <div class="search-result-item" onclick='selectMeetingOpportunity(${safeOpp})'>
                    <strong>${opp.opportunityName}</strong>
                    <small>[${opp.currentStage}] ${opp.customerCompany}</small>
                </div>
            `;
        }).join('');

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('搜尋失敗:', error);
            resultsContainer.innerHTML = '<div class="search-result-item" style="color:var(--accent-red);">搜尋失敗</div>';
        }
    }
}

// 選擇機會
function selectMeetingOpportunity(opp) {
    document.getElementById('meeting-opportunity-id').value = opp.id;
    document.getElementById('meeting-opportunity-search').value = `${opp.name} (${opp.company})`;
    document.getElementById('meeting-opportunity-results').style.display = 'none';
    
    document.getElementById('meeting-opportunity-clear').style.display = 'block';
    document.querySelector('.dropdown-icon').style.display = 'none';
}

// 清除選擇
function clearMeetingOpportunitySelection() {
    document.getElementById('meeting-opportunity-id').value = '';
    document.getElementById('meeting-opportunity-search').value = '';
    document.getElementById('meeting-opportunity-results').style.display = 'none';
    
    document.getElementById('meeting-opportunity-clear').style.display = 'none';
    document.querySelector('.dropdown-icon').style.display = 'block';
    
    const input = document.getElementById('meeting-opportunity-search');
    input.focus();
    searchMeetingOpportunities('');
}

// 渲染參與人員標籤
function renderParticipantSelector() {
    const container = document.getElementById('meeting-participants-container');
    if (!container) return;

    const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
    const members = systemConfig['團隊成員'] || [];

    if (members.length === 0) {
        container.innerHTML = '<span style="color: var(--text-muted);">未設定團隊成員</span>';
        return;
    }

    const currentUser = getCurrentUser();

    let html = '';
    members.forEach(member => {
        const isChecked = member.note === currentUser ? 'checked' : '';
        html += `
            <label class="participant-tag">
                <input type="checkbox" name="meeting-participants" value="${member.note}" ${isChecked}>
                <span class="tag-text">${member.note}</span>
            </label>
        `;
    });
    container.innerHTML = html;
}

// 顯示本週活動模態框
async function showWeekEventsModal() {
    showModal('week-events-modal');
    await loadWeekEvents();
}

// ==================== 表單提交 ====================
document.addEventListener('submit', async function(e) {
    if (e.target && e.target.id === 'new-meeting-form') {
        e.preventDefault();
        
        const opportunityId = document.getElementById('meeting-opportunity-id').value;
        
        if (!opportunityId) {
            showConfirmDialog('尚未選擇關聯的「機會案件」。\n建立會議必須關聯機會以啟用自動分類。\n\n是否立即建立新機會？', () => {
                closeModal('new-meeting-modal');
                showNewOpportunityModal();
            });
            return;
        }

        showLoading('正在建立並同步...');
        
        try {
            const selectedParticipants = Array.from(document.querySelectorAll('input[name="meeting-participants"]:checked'))
                                              .map(cb => cb.value)
                                              .join(', ');
            
            // 【修改】組合日期與時間
            const dateStr = document.getElementById('meeting-date').value;
            const showTimeInTitle = document.getElementById('enable-meeting-time').checked;
            const timeStr = showTimeInTitle ? document.getElementById('meeting-time').value : '00:00';
            
            // 建立 ISO 字串 (YYYY-MM-DDTHH:mm:00)
            // 注意：這裡直接組合字串再 new Date，會視為本地時間，這符合預期
            const startTime = new Date(`${dateStr}T${timeStr}`).toISOString();

            let eventData = {
                title: document.getElementById('meeting-title').value,
                startTime: startTime,
                location: document.getElementById('meeting-location').value,
                description: document.getElementById('meeting-description').value,
                
                opportunityId: opportunityId,
                participants: selectedParticipants,
                createInteraction: true,
                showTimeInTitle: showTimeInTitle // 傳遞此參數控制標題顯示
            };
            
            const result = await authedFetch('/api/calendar/events', {
                method: 'POST',
                body: JSON.stringify(eventData)
            });
            
            hideLoading();
            
            if (result.success) {
                showNotification('✅ 會議已建立！(日曆、互動、週報已同步)', 'success');
                closeModal('new-meeting-modal');
                
                if (typeof loadSystemStats === 'function') await loadSystemStats(); 
                if (window.CRM_APP && window.CRM_APP.refreshCurrentView) window.CRM_APP.refreshCurrentView();

            } else {
                throw new Error(result.details || '建立會議失敗');
            }
        } catch (error) {
            hideLoading();
            if (error.message !== 'Unauthorized') {
                console.error('❌ 建立會議失敗:', error);
                showNotification(`建立會議失敗: ${error.message}`, 'error');
            }
        }
    }
});

// 點擊外部關閉搜尋結果
document.addEventListener('click', function(e) {
    const searchInput = document.getElementById('meeting-opportunity-search');
    const resultsContainer = document.getElementById('meeting-opportunity-results');
    const clearBtn = document.getElementById('meeting-opportunity-clear');
    
    if (resultsContainer && searchInput && 
        !resultsContainer.contains(e.target) && 
        e.target !== searchInput && 
        e.target !== clearBtn) {
        resultsContainer.style.display = 'none';
    }
});

// ==================== 其他輔助功能 ====================

async function loadWeekEvents() {
    const content = document.getElementById('week-events-content');
    content.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入本週活動中...</p></div>';
    try {
        const result = await authedFetch('/api/calendar/week');
        content.innerHTML = renderWeekEvents(result);
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('❌ 載入本週活動失敗:', error);
            content.innerHTML = '<div class="alert alert-error">載入本週活動失敗</div>';
        }
    }
}

function renderWeekEvents(data) {
    const events = data.allEvents || [];
    let html = `
        <div class="alert alert-info">
            📊 本週共有 ${data.weekCount} 個活動，其中今日有 ${data.todayCount} 個。
        </div>`;

    if (events.length === 0) {
        html += '<div class="alert alert-warning" style="text-align: center;">本週沒有安排活動</div>';
    } else {
        html += '<div class="events-list">';
        events.forEach(event => {
            const isAllDay = !!event.start.date;
            const startTimeStr = isAllDay ? event.start.date : (event.start.dateTime || '');
            const startTime = new Date(startTimeStr);
            const isToday = new Date().toDateString() === startTime.toDateString();
            
            const timeDisplay = isAllDay ? '全天' : formatDateTime(startTime).split(' ')[1];
            const dateDisplay = isAllDay ? startTimeStr : formatDateTime(startTime).split(' ')[0];

            html += `
                <div class="event-item" style="padding: 15px; border-bottom: 1px solid #e9ecef; ${isToday ? 'background: #fff3cd;' : ''}">
                    <strong>${event.summary || '無標題'}</strong>
                    ${isToday ? '<span style="color: #856404; font-weight: bold; margin-left: 10px; font-size: 0.8em;">今日</span>' : ''}
                    <br>
                    <small>📅 ${dateDisplay} (${timeDisplay})</small><br>
                    ${event.location ? `<small>📍 ${event.location}</small><br>` : ''}
                </div>
            `;
        });
        html += '</div>';
    }
    return html;
}

// 快捷建立會議
function quickCreateMeeting(opportunityId) {
    showNewMeetingModal().then(() => {
        authedFetch(`/api/opportunities/${opportunityId}/details`).then(res => {
            if (res.success && res.data && res.data.opportunityInfo) {
                const opp = res.data.opportunityInfo;
                selectMeetingOpportunity({
                    id: opp.opportunityId,
                    name: opp.opportunityName,
                    company: opp.customerCompany
                });
            }
        });
    });
}