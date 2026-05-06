// views/scripts/kanban-board.js
// (V2 - 修正 stageHistory 儲存格式 與 刷新函式呼叫)

const kanbanBoardManager = {
    initialize() {
        const kanbanBoard = document.getElementById('kanban-board');
        if (!kanbanBoard) return;

        // 移除舊的監聽器以防重複綁定
        kanbanBoard.removeEventListener('dragover', this.handleDragOver);
        kanbanBoard.removeEventListener('drop', this.handleDrop.bind(this));
        
        // 綁定新的監聽器
        kanbanBoard.addEventListener('dragover', this.handleDragOver);
        kanbanBoard.addEventListener('drop', this.handleDrop.bind(this));
        console.log('✅ [Kanban] 拖曳功能已初始化');
    },

    drag(event) {
        event.dataTransfer.setData("text/plain", event.target.id.replace('opp-card-', ''));
    },

    handleDragOver(event) {
        event.preventDefault();
    },

    handleDrop(event) {
        event.preventDefault();
        const opportunityId = event.dataTransfer.getData("text/plain");
        const targetColumn = event.target.closest('.kanban-column');

        if (targetColumn && opportunityId) {
            const newStageId = targetColumn.dataset.stageId;
            this.handleOpportunityStageChange(opportunityId, newStageId);
        }
    },

    async handleOpportunityStageChange(opportunityId, newStageId) {
        const kanbanData = window.dashboardManager.kanbanRawData;
        let opportunity;
        let oldStageId;

        for (const stageId in kanbanData) {
            const foundOpp = kanbanData[stageId].opportunities.find(o => o.opportunityId === opportunityId);
            if (foundOpp) {
                opportunity = foundOpp;
                oldStageId = stageId;
                break;
            }
        }

        if (!opportunity || oldStageId === newStageId) {
            return;
        }

        showLoading('正在更新階段...');
        try {
            // 【修改】準備新的 stageHistory 字串
            const existingHistory = opportunity.stageHistory ? opportunity.stageHistory.split(',') : [];
            const historySet = new Set(existingHistory);
            
            // --- 【*** 關鍵修正 #1：儲存時加入 'C:' 前綴 ***】 ---
            historySet.add(`C:${newStageId}`); // 將新階段加入歷程
            // --- 【*** 修正結束 ***】 ---
            
            const newStageHistory = Array.from(historySet).join(',');

            // 【修改】API請求中同時傳送 currentStage 和 stageHistory
            const updateResult = await authedFetch(`/api/opportunities/${opportunity.rowIndex}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    currentStage: newStageId,
                    stageHistory: newStageHistory, // <--- 傳送新欄位
                    modifier: getCurrentUser() 
                })
            });

            if (updateResult.success) {
                // 直接在前端更新資料狀態，避免重新請求 API
                const oldStageOpportunities = kanbanData[oldStageId].opportunities;
                const oppIndex = oldStageOpportunities.findIndex(o => o.opportunityId === opportunityId);
                if (oppIndex > -1) {
                    oldStageOpportunities.splice(oppIndex, 1);
                }
                
                // 【修改】同步更新前端物件的狀態
                opportunity.currentStage = newStageId;
                opportunity.stageHistory = newStageHistory; // <--- 更新本地物件狀態
                kanbanData[newStageId].opportunities.unshift(opportunity);
                
                // --- 【*** 關鍵修正 #2：呼叫正確的刷新函式 ***】 ---
                window.dashboardManager.renderKanbanView(); // <-- 原本是 filterAndRenderKanban()
                // --- 【*** 修正結束 ***】 ---
                
                showNotification(`機會 "${opportunity.opportunityName}" 已更新階段`, 'success');
            } else {
                throw new Error(updateResult.details || '更新失敗');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                showNotification('更新階段失敗，將還原操作', 'error');
                // 失敗時也重新渲染以還原外觀
                window.dashboardManager.renderKanbanView();
            }
        } finally {
            hideLoading();
        }
    }
};

// 將 manager 掛載到 window，以便 HTML 中的 ondragstart 可以呼叫
window.kanbanBoardManager = kanbanBoardManager;