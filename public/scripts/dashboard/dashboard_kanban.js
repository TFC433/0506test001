// public/scripts/dashboard/dashboard_kanban.js
// (Stability Overhaul: Duplicate Init Fix + Delegation)

const DashboardKanban = {
    viewMode: 'chip-wall',
    chipWallInstance: null,
    isInitialized: false, // Flag to prevent duplicate initialization
    currentFilters: { time: 'history', type: 'all' },
    
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
        
        document.getElementById('chip-wall-view-mode-toggle')?.addEventListener('click', () => {
            if (this.chipWallInstance) {
                this.chipWallInstance.viewMode = this.chipWallInstance.viewMode === 'grid' ? 'flex' : 'grid';
                localStorage.setItem('chipWallViewMode', this.chipWallInstance.viewMode);
                this.chipWallInstance.render();
                this._expandChipWallByDefault();
                document.getElementById('chip-wall-view-mode-toggle').textContent = this.chipWallInstance.viewMode === 'grid' ? '切換流體模式' : '切換網格模式';
            }
        });

        document.getElementById('chip-wall-toggle-all')?.addEventListener('click', (e) => {
            if (this.chipWallInstance) {
                const btn = e.currentTarget;
                const isExpanding = btn.textContent.includes('全部展開');
                this.chipWallInstance.container.querySelectorAll('.chip-container').forEach(c => c.classList.toggle('is-expanded', isExpanding));
                this.chipWallInstance.container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = isExpanding ? '收合' : '展開'; });
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

        if (container.querySelector('[data-filter-group]')) {
            this._updateFilterTabStates();
            return;
        }

        const typeTabs = [
            { value: 'all', label: '全部' },
            ...this._getEnabledOpportunityTypes().map(opt => ({
                value: opt.value,
                label: opt.note || opt.value
            }))
        ];

        const filtersHTML = `
            <div class="kanban-filter">
                ${this._renderFilterTabs('時間', 'time', [
                    { value: 'history', label: '歷史' },
                    { value: 'this_year', label: '今年' }
                ])}
                ${this._renderFilterTabs('種類', 'type', typeTabs)}
            </div>
        `;

        /* const actionsHTML = `
            <div class="kanban-actions-group">
                <div class="chip-wall-extra-controls">
                    <button class="action-btn small secondary" id="chip-wall-view-mode-toggle">切換模式</button>
                    <button class="action-btn small secondary" id="chip-wall-toggle-all">全部收合</button>
                </div>
            </div>
        `; */ const actionsHTML = '';

        container.innerHTML = filtersHTML;
        this._updateFilterTabStates();

        container.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-filter-group]');
            if (!tab) return;
            this.currentFilters[tab.dataset.filterGroup] = tab.dataset.filterValue;
            this._updateFilterTabStates();
            this.render();
        });

        const chipToggle = document.getElementById('chip-wall-view-mode-toggle');
        if (chipToggle) {
             chipToggle.addEventListener('click', () => {
                if (this.chipWallInstance) {
                    this.chipWallInstance.viewMode = this.chipWallInstance.viewMode === 'grid' ? 'flex' : 'grid';
                    localStorage.setItem('chipWallViewMode', this.chipWallInstance.viewMode);
                    this.chipWallInstance.render();
                    this._expandChipWallByDefault();
                    chipToggle.textContent = this.chipWallInstance.viewMode === 'grid' ? '切換流體模式' : '切換網格模式';
                }
            });
        }
        
        const expandAllBtn = document.getElementById('chip-wall-toggle-all');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', (e) => {
                if (this.chipWallInstance) {
                    const btn = e.currentTarget;
                    const isExpanding = btn.textContent.includes('全部展開');
                    this.chipWallInstance.container.querySelectorAll('.chip-container').forEach(c => c.classList.toggle('is-expanded', isExpanding));
                    this.chipWallInstance.container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = isExpanding ? '收合' : '展開'; });
                    btn.textContent = isExpanding ? '全部收合' : '全部展開';
                }
            });
        }
    },

    toggleView() {
        this.viewMode = 'chip-wall';
        this.render();
    },

    render() {
        this.viewMode = 'chip-wall';
        const filteredOpportunities = this.data.opportunities.filter(opp => this._matchesCurrentFilters(opp));

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
                this._expandChipWallByDefault();
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

    _expandChipWallByDefault() {
        const container = this.chipWallInstance?.container || document.getElementById('chip-wall-board-container');
        if (!container) return;

        container.querySelectorAll('.chip-container').forEach(c => c.classList.add('is-expanded'));
        container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = '收合'; });

        const expandAllBtn = document.getElementById('chip-wall-toggle-all');
        if (expandAllBtn) expandAllBtn.textContent = '全部收合';
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

        const opportunitiesToShow = this.data.opportunities.filter(opp => {
            if (opp.currentStage !== stageId) return false;
            return this._matchesCurrentFilters(opp);
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

    _getEnabledOpportunityTypes() {
        const systemConfig = window.CRM_APP?.systemConfig || {};
        return (systemConfig['機會種類'] || [])
            .filter(opt => this._isEnabledConfigOption(opt))
            .sort((a, b) => this._getDisplayOrder(a) - this._getDisplayOrder(b));
    },

    _isEnabledConfigOption(opt) {
        return opt?.enabled === true || opt?.enabled === 'TRUE' || opt?.enabled === 'true' || opt?.enabled === '1';
    },

    _getDisplayOrder(opt) {
        const order = opt?.displayOrder ?? opt?.display_order;
        const parsed = Number(order);
        return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
    },

    _renderFilterTabs(label, group, options) {
        return `
            <div class="kanban-tab-filter" role="group" aria-label="${label}">
                <span class="kanban-tab-label">${label}</span>
                <div class="kanban-tab-list">
                    ${options.map(opt => `
                        <button type="button"
                                class="kanban-filter-tab"
                                data-filter-group="${group}"
                                data-filter-value="${opt.value}">
                            ${opt.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    _updateFilterTabStates() {
        document.querySelectorAll('#kanban-widget [data-filter-group]').forEach(tab => {
            const isActive = this.currentFilters[tab.dataset.filterGroup] === tab.dataset.filterValue;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    },

    _matchesCurrentFilters(opp) {
        if (this.currentFilters.time === 'this_year' && String(opp.creationYear) !== String(new Date().getFullYear())) return false;
        if (this.currentFilters.type !== 'all' && opp.opportunityType !== this.currentFilters.type) return false;
        return true;
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
                .kanban-tab-filter { display: inline-flex; align-items: center; gap: var(--spacing-2); }
                .kanban-tab-label { font-size: 0.8rem; color: var(--text-muted); line-height: 1.2; }
                .kanban-tab-list { display: inline-flex; align-items: center; gap: var(--spacing-1); flex-wrap: wrap; }
                .kanban-filter-tab {
                    min-height: 24px; padding: 3px 8px; border-radius: 2px;
                    border: 1px solid var(--border-color); background: var(--primary-bg);
                    color: var(--text-secondary); font-size: 12px; line-height: 1.2; cursor: pointer;
                }
                .kanban-filter-tab:hover { background: var(--secondary-bg); color: var(--text-primary); }
                .kanban-filter-tab.is-active {
                    background: var(--secondary-bg); border-color: var(--text-muted);
                    color: var(--text-primary); font-weight: 500;
                }
            `;
            document.head.appendChild(style);
        }
    }
};

window.DashboardKanban = DashboardKanban;
