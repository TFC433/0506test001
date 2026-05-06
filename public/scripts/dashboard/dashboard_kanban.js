// public/scripts/dashboard/dashboard_kanban.js
// (Stability Overhaul: Duplicate Init Fix + Delegation)

const DashboardKanban = {
    viewMode: localStorage.getItem('dashboardKanbanViewMode') || 'kanban',
    chipWallInstance: null,
    isInitialized: false, // Flag to prevent duplicate initialization
    
    // Internal data
    data: {
        opportunities: [],
        rawKanbanData: {},
        availableYears: [] 
    },

    /**
     * Initialization (Idempotent)
     */
    init(refreshCallback) {
        if (this.isInitialized) return; // Prevent multiple runs

        this.refreshCallback = refreshCallback; 
        
        document.getElementById('kanban-view-toggle')?.addEventListener('click', () => this.toggleView());

        document.getElementById('chip-wall-view-mode-toggle')?.addEventListener('click', () => {
            if (this.chipWallInstance) {
                this.chipWallInstance.viewMode = this.chipWallInstance.viewMode === 'grid' ? 'flex' : 'grid';
                localStorage.setItem('chipWallViewMode', this.chipWallInstance.viewMode);
                this.chipWallInstance.render();
                document.getElementById('chip-wall-view-mode-toggle').textContent = this.chipWallInstance.viewMode === 'grid' ? '切換流體模式' : '切換網格模式';
            }
        });

        document.getElementById('chip-wall-toggle-all')?.addEventListener('click', (e) => {
            if (this.chipWallInstance) {
                const btn = e.currentTarget;
                const isExpanding = btn.textContent.includes('展開');
                this.chipWallInstance.container.querySelectorAll('.chip-container').forEach(c => c.classList.toggle('is-expanded', isExpanding));
                this.chipWallInstance.container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = isExpanding ? '收合' : '展開更多...'; });
                btn.textContent = isExpanding ? '全部收合' : '全部展開';
            }
        });

        // We do NOT bind board events here anymore. 
        // We bind them in render() to ensure they are always attached to the current container.
        
        this.isInitialized = true;
    },

    update(processedOpportunities, rawKanbanData, availableYears) {
        this.data.opportunities = processedOpportunities;
        this.data.rawKanbanData = rawKanbanData;
        this.data.availableYears = availableYears;

        this.renderControls();
        this.render();
    },

    renderControls() {
        const container = document.querySelector('#kanban-widget .kanban-controls-container');
        if (!container) return;

        this._ensureStyles();

        if (document.getElementById('kanban-year-filter')) {
            return;
        }

        const systemConfig = window.CRM_APP?.systemConfig || {};
        
        const yearFilterHTML = `
            <div>
                <label for="kanban-year-filter">年度</label>
                <select id="kanban-year-filter" class="form-select-sm">
                    <option value="all">全部年度</option>
                    ${this.data.availableYears.map(y => `<option value="${y}">${y}年</option>`).join('')}
                </select>
            </div>
        `;

        const filtersHTML = `
            <div class="kanban-filter">
                ${yearFilterHTML}
                <div>
                    <label for="kanban-type-filter">種類</label>
                    <select id="kanban-type-filter" class="form-select-sm">
                        <option value="all">所有種類</option>
                        ${(systemConfig['機會種類'] || []).map(opt => `<option value="${opt.value}">${opt.note || opt.value}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="kanban-source-filter">來源</label>
                    <select id="kanban-source-filter" class="form-select-sm">
                        <option value="all">所有來源</option>
                         ${(systemConfig['機會來源'] || []).map(opt => `<option value="${opt.value}">${opt.note || opt.value}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="kanban-time-filter">活動時間</label>
                    <select id="kanban-time-filter" class="form-select-sm">
                        <option value="all">不限</option>
                        <option value="7">近 7 天</option>
                        <option value="30">近 30 天</option>
                        <option value="90">近 90 天</option>
                    </select>
                </div>
            </div>
        `;

        const actionsHTML = `
            <div class="kanban-actions-group">
                <div class="chip-wall-extra-controls">
                    <button class="action-btn small secondary" id="chip-wall-view-mode-toggle">切換模式</button>
                    <button class="action-btn small secondary" id="chip-wall-toggle-all">全部展開</button>
                </div>
                <div class="kanban-main-toggle">
                    <button class="action-btn small secondary" id="kanban-view-toggle" title="切換檢視模式">切換晶片牆</button>
                </div>
            </div>
        `;

        container.innerHTML = filtersHTML + actionsHTML;

        ['kanban-year-filter', 'kanban-type-filter', 'kanban-source-filter', 'kanban-time-filter'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.render());
        });

        document.getElementById('kanban-view-toggle')?.addEventListener('click', () => this.toggleView());
        
        const chipToggle = document.getElementById('chip-wall-view-mode-toggle');
        if (chipToggle) {
             chipToggle.addEventListener('click', () => {
                if (this.chipWallInstance) {
                    this.chipWallInstance.viewMode = this.chipWallInstance.viewMode === 'grid' ? 'flex' : 'grid';
                    localStorage.setItem('chipWallViewMode', this.chipWallInstance.viewMode);
                    this.chipWallInstance.render();
                    chipToggle.textContent = this.chipWallInstance.viewMode === 'grid' ? '切換流體模式' : '切換網格模式';
                }
            });
        }
        
        const expandAllBtn = document.getElementById('chip-wall-toggle-all');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', (e) => {
                if (this.chipWallInstance) {
                    const btn = e.currentTarget;
                    const isExpanding = btn.textContent.includes('展開');
                    this.chipWallInstance.container.querySelectorAll('.chip-container').forEach(c => c.classList.toggle('is-expanded', isExpanding));
                    this.chipWallInstance.container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = isExpanding ? '收合' : '展開更多...'; });
                    btn.textContent = isExpanding ? '全部收合' : '全部展開';
                }
            });
        }
    },

    toggleView() {
        this.viewMode = this.viewMode === 'kanban' ? 'chip-wall' : 'kanban';
        localStorage.setItem('dashboardKanbanViewMode', this.viewMode);
        this.render();
    },

    render() {
        const year = document.getElementById('kanban-year-filter')?.value || 'all';
        const type = document.getElementById('kanban-type-filter')?.value || 'all';
        const source = document.getElementById('kanban-source-filter')?.value || 'all';
        const time = document.getElementById('kanban-time-filter')?.value || 'all';

        let filteredOpportunities = this.data.opportunities;

        if (year !== 'all') filteredOpportunities = filteredOpportunities.filter(opp => String(opp.creationYear) === year);
        if (type !== 'all') filteredOpportunities = filteredOpportunities.filter(opp => opp.opportunityType === type);
        if (source !== 'all') filteredOpportunities = filteredOpportunities.filter(opp => opp.opportunitySource === source);
        if (time !== 'all') {
            const days = parseInt(time);
            const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
            filteredOpportunities = filteredOpportunities.filter(opp => opp.effectiveLastActivity && opp.effectiveLastActivity >= cutoff);
        }

        const kanbanWidget = document.getElementById('kanban-widget');
        const kanbanContainer = document.getElementById('kanban-board-container');
        const chipWallContainer = document.getElementById('chip-wall-board-container');
        const toggleBtn = document.getElementById('kanban-view-toggle');

        if (this.viewMode === 'chip-wall') {
            kanbanWidget.classList.add('chip-wall-active');
            kanbanContainer.style.display = 'none';
            chipWallContainer.style.display = 'block';
            if (toggleBtn) toggleBtn.textContent = '切換看板';

            if (typeof ChipWall !== 'undefined') {
                this.chipWallInstance = new ChipWall('#chip-wall-board-container', {
                    stages: CRM_APP.systemConfig['機會階段'] || [],
                    items: filteredOpportunities, 
                    colorConfigKey: '機會種類',
                    isDraggable: true,
                    isCollapsible: true,
                    useDynamicSize: true,
                    showControls: false, 
                    onItemUpdate: () => { if(this.refreshCallback) this.refreshCallback(true); } 
                });
                this.chipWallInstance.render();
            } else {
                chipWallContainer.innerHTML = `<div class="alert alert-error">晶片牆元件載入失敗</div>`;
            }

        } else {
            kanbanWidget.classList.remove('chip-wall-active');
            kanbanContainer.style.display = 'block';
            chipWallContainer.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = '切換晶片牆';

            const filteredKanbanData = {};
            (CRM_APP.systemConfig['機會階段'] || []).forEach(stageInfo => {
                filteredKanbanData[stageInfo.value] = { name: stageInfo.note, opportunities: [], count: 0 };
            });
            
            filteredOpportunities.forEach(opp => {
                if (filteredKanbanData[opp.currentStage]) {
                    filteredKanbanData[opp.currentStage].opportunities.push(opp);
                }
            });
            
            Object.keys(filteredKanbanData).forEach(stageId => {
                filteredKanbanData[stageId].opportunities.sort((a, b) => b.effectiveLastActivity - a.effectiveLastActivity);
                filteredKanbanData[stageId].count = filteredKanbanData[stageId].opportunities.length;
            });
            
            this.renderKanbanColumns(filteredKanbanData);
        }
    },

    renderKanbanColumns(stagesData) {
        const kanbanBoard = document.getElementById('kanban-board-container');
        const systemConfig = window.CRM_APP?.systemConfig || {};
        if (!kanbanBoard || !stagesData || !systemConfig['機會階段']) {
            if(kanbanBoard) kanbanBoard.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            return;
        };

        // Ensure we bind events to the container every time we render columns,
        // because we are about to overwrite its innerHTML (or maybe the container itself if logic changed).
        // To be safe against "Zombie Elements" if the container IS recreated, we bind here.
        this._bindBoardEvents(kanbanBoard);

        let html = '<div class="kanban-board">';
        systemConfig['機會階段'].forEach(stageInfo => {
            const stage = stagesData[stageInfo.value] || { name: stageInfo.note, opportunities: [], count: 0 };
            html += `<div class="kanban-column" data-stage-id="${stageInfo.value}">
                        <div class="kanban-header">
                            <div class="kanban-title">${stage.name}</div>
                            <div class="kanban-count">${stage.count}</div>
                        </div>
                        <div class="opportunities-list">`;

            (stage.opportunities || []).slice(0, 5).forEach(opp => {
                const oppTypeConfig = (systemConfig['機會種類'] || []).find(t => t.value === opp.opportunityType);
                const cardColor = oppTypeConfig?.color || 'var(--border-color)';
                html += `<div id="opp-card-${opp.opportunityId}" 
                              class="kanban-card" 
                              draggable="true" 
                              data-opportunity-id="${opp.opportunityId}"
                              style="--card-brand-color: ${cardColor};">
                            <div class="card-title">${opp.opportunityName}</div>
                            <div class="card-company">🏢 ${opp.customerCompany}</div>
                            <div class="card-tags">
                                <span class="card-tag assignee">👤 ${opp.assignee}</span>
                                ${opp.opportunityType ? `<span class="card-tag type">📖 ${oppTypeConfig?.note || opp.opportunityType}</span>` : ''}
                            </div>
                            ${opp.opportunityValue ? `<div class="card-value">💰 ${opp.opportunityValue}</div>` : ''}
                        </div>`;
            });

            if (stage.opportunities && stage.opportunities.length > 5) {
                html += `<button class="expand-btn" data-stage-id="${stageInfo.value}">展開 (+${stage.opportunities.length - 5})</button>`;
            }
            html += `</div></div>`;
        });
        html += '</div>';
        kanbanBoard.innerHTML = html;
    },

    _bindBoardEvents(boardContainer) {
        // Remove old listeners to avoid duplicates (important since we call this in render)
        boardContainer.removeEventListener('click', this._handleBoardClick);
        boardContainer.addEventListener('click', this._handleBoardClick.bind(this));
        
        boardContainer.removeEventListener('dragstart', this._handleDragStart);
        boardContainer.addEventListener('dragstart', this._handleDragStart.bind(this));
    },

    _handleBoardClick(e) {
        // 1. Card Click
        const card = e.target.closest('.kanban-card');
        if (card) {
            const oppId = card.dataset.opportunityId;
            if (oppId) CRM_APP.navigateTo('opportunity-details', { opportunityId: oppId });
            return;
        }

        // 2. Expand Button Click
        const btn = e.target.closest('.expand-btn');
        if (btn) {
            const stageId = btn.dataset.stageId;
            if (stageId) this.expandStage(stageId);
        }
    },

    _handleDragStart(e) {
        const card = e.target.closest('.kanban-card');
        if (card && typeof kanbanBoardManager !== 'undefined') {
             if (kanbanBoardManager.drag) kanbanBoardManager.drag(e);
        }
    },

    expandStage(stageId) {
        const stageData = this.data.rawKanbanData[stageId]; 
        if (!stageData) return;
        
        const year = document.getElementById('kanban-year-filter')?.value || 'all';
        const type = document.getElementById('kanban-type-filter')?.value || 'all';
        const source = document.getElementById('kanban-source-filter')?.value || 'all';
        const time = document.getElementById('kanban-time-filter')?.value || 'all';

        const opportunitiesToShow = this.data.opportunities.filter(opp => {
            if (opp.currentStage !== stageId) return false;
            if (year !== 'all' && String(opp.creationYear) !== year) return false;
            if (type !== 'all' && opp.opportunityType !== type) return false;
            if (source !== 'all' && opp.opportunitySource !== source) return false;
            if (time !== 'all') {
                const days = parseInt(time);
                const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
                if (!opp.effectiveLastActivity || opp.effectiveLastActivity < cutoff) return false;
            }
            return true;
        });

        const modalTitle = document.getElementById('kanban-expand-title');
        const modalContent = document.getElementById('kanban-expand-content');
        
        if (modalTitle && modalContent) {
            modalTitle.textContent = `階段: ${stageData.name} (${opportunitiesToShow.length} 筆)`;
            modalContent.innerHTML = (typeof renderOpportunitiesTable === 'function') 
                ? renderOpportunitiesTable(opportunitiesToShow) 
                : '<div class="alert alert-error">無法渲染，找不到表格生成函式</div>';
            showModal('kanban-expand-modal');
        }
    },

    _ensureStyles() {
        const styleId = 'dashboard-kanban-styles-final';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                #kanban-widget .widget-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; }
                #kanban-widget .widget-title { white-space: nowrap; flex-shrink: 0; }
                .kanban-controls-container { display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-5); flex-grow: 1; flex-wrap: wrap; }
                .kanban-filter, .kanban-actions-group { display: flex; align-items: center; gap: var(--spacing-3); }
                .chip-wall-extra-controls { display: none; gap: var(--spacing-3); }
                #kanban-widget.chip-wall-active .chip-wall-extra-controls { display: flex; }
                .kanban-filter label { font-size: 0.8rem; color: var(--text-muted); }
            `;
            document.head.appendChild(style);
        }
    }
};

window.DashboardKanban = DashboardKanban;