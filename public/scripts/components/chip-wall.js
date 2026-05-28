// views/scripts/components/chip-wall.js
/**
 * @version 1.1.2
 * @date 2026-03-12
 * @description (Stability Overhaul: Zero-Dimension Fix + Backend effectiveLastActivity trust + opportunityId route fix)
 */

class ChipWall {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) throw new Error(`ChipWall container not found: ${containerSelector}`);

        this.options = {
            stages: [],
            items: [],
            colorConfigKey: '機會種類',
            isDraggable: false,
            isCollapsible: false,
            useDynamicSize: false,
            showControls: false,
            showFilters: true,
            onItemUpdate: null,
            onFilterChange: null,
            ...options
        };

        this.viewMode = localStorage.getItem('chipWallViewMode') || 'grid';
        this.filters = { type: 'all', source: 'all', time: 'all', year: 'all' };
        this.availableYears = []; 
        
        // Phase 8.2: No longer passing interactions payload. Trusting backend item.effectiveLastActivity.
        this.allItems = this._processAllItems(JSON.parse(JSON.stringify(this.options.items)));
        
        const yearSet = new Set(this.allItems.map(item => item.creationYear).filter(Boolean));
        this.availableYears = Array.from(yearSet).sort((a, b) => b - a); 
        
        this.stageGroups = new Map();
        this.colorMap = new Map((window.CRM_APP?.systemConfig?.[this.options.colorConfigKey] || []).map(item => [item.value, item.color]));

        // Bind methods for delegation
        this._handleContainerClick = this._handleContainerClick.bind(this);
        this._handleDragStart = this._handleDragStart.bind(this);
        this._handleDragEnd = this._handleDragEnd.bind(this);
        this._handleDragOver = this._handleDragOver.bind(this);
        this._handleDragLeave = this._handleDragLeave.bind(this);
        this._handleDrop = this._handleDrop.bind(this);
        this._handleResize = this._handleResize.bind(this);

        // ResizeObserver for Zero-Dimension Trap
        this.resizeObserver = new ResizeObserver(this._handleResize);
    }

    _processAllItems(items) {
        return items.map(item => {
            // Trust backend DTO effectiveLastActivity with strict fallback guard honoring legacy timestamp keys
            if (typeof item.effectiveLastActivity !== 'number' || Number.isNaN(item.effectiveLastActivity)) {
                item.effectiveLastActivity = new Date(item.lastUpdateTime || item.createdTime || 0).getTime();
            }
            
            const year = item.createdTime ? new Date(item.createdTime).getFullYear() : null;
            item.creationYear = year;
            
            return item;
        });
    }

    render() {
        if (!this.container) return;
        
        // Disconnect old observers to prevent Zombies
        this.resizeObserver.disconnect();
        
        this._injectStyles();
        
        let widgetContent = this.container.querySelector('.widget-content');
        if (!widgetContent) {
            this.container.innerHTML = '<div class="widget-content"></div>';
            widgetContent = this.container.querySelector('.widget-content');
        }

        if (this.options.showControls) {
            const widgetHeader = this.container.closest('.dashboard-widget')?.querySelector('.widget-header');
            if (widgetHeader) {
                this._renderHeaderControls(widgetHeader);
            }
        }
        
        const itemsToRender = this.options.showFilters ? this._filterItems() : this.allItems;
        this._prepareData(itemsToRender);

        const containerClass = this.viewMode === 'grid' ? 'chip-wall-grid-container' : 'chip-wall-flex-container';
        let html = `
            <div class="chip-wall-legend">
                <span class="chip-wall-legend-marker"></span>
                <span>灰色為 90 天未活動案件</span>
            </div>
            <div class="${containerClass}">
        `;

        const totalItems = itemsToRender.length;
        const GRID_COLUMNS = 12;
        const MIN_ITEMS_FOR_WIDE = 5; 

        let adjustedSpans = [];
        if (this.options.useDynamicSize && this.viewMode === 'grid' && totalItems > 0) {
            const stageInfo = [];
            this.stageGroups.forEach((stageData) => {
                const itemCount = stageData.items.length;
                const proportion = itemCount / totalItems;
                let span = Math.max(2, Math.ceil(proportion * GRID_COLUMNS));
                stageInfo.push({
                    itemCount,
                    idealSpan: span,
                    isSmall: itemCount < MIN_ITEMS_FOR_WIDE 
                });
            });
            
            adjustedSpans = this._adjustSpansToFillRowsWithSmallStages(stageInfo, GRID_COLUMNS);
        }
        
        let spanIndex = 0;
        const stageEntries = Array.from(this.stageGroups.entries());
        const primaryRowCount = Math.min(stageEntries.length, 6);
        const secondaryRowCount = Math.max(stageEntries.length - 6, 0);
        this._staleSeparatorStage = null;
        this._staleSeparatorRendered = false;
        stageEntries.forEach(([stageId, stageData], stageIndex) => {
            let blockStyle = '';
            if (this.options.useDynamicSize) {
                if (this.viewMode === 'grid') {
                    if (totalItems > 0) {
                        const span = adjustedSpans[spanIndex++];
                        blockStyle = `style="grid-column: span ${span};"`;
                    }
                } else { 
                    const flexGrow = stageData.items.length > 0 ? stageData.items.length : 0.5;
                    const flexBasis = '160px'; 
                    blockStyle = `style="flex-grow: ${flexGrow}; flex-basis: ${flexBasis};"`;
                }
            }

            if (stageIndex === 0) {
                html += `<div class="chip-wall-stage-row chip-wall-stage-row-primary" style="--chip-wall-row-columns: ${primaryRowCount};">`;
            }
            if (stageIndex === 6) {
                html += `</div><div class="chip-wall-stage-row chip-wall-stage-row-secondary" style="--chip-wall-row-columns: ${secondaryRowCount};">`;
            }
            blockStyle = '';

            html += `
                <div class="chip-wall-stage-block" ${blockStyle} data-stage-id="${stageId}">
                    <h3 class="chip-wall-stage-title ${this.options.isCollapsible ? 'is-collapsible' : ''}">
                        <span class="stage-name">${stageData.name}</span>
                        <span class="chip-wall-stage-count">(${stageData.items.length})</span>
                    </h3>
                    <div class="chip-container">
                        ${stageData.items.length > 0 ? stageData.items.map(item => this._renderChip(item)).join('') : '<span class="no-opps-text">尚無案件</span>'}
                    </div>
                </div>
            `;
        });
        if (stageEntries.length > 0) html += '</div>';
        html += '</div>';
        widgetContent.innerHTML = html;
        
        this._setupEventListeners();
    }

    _adjustSpansToFillRowsWithSmallStages(stageInfo, maxColumns) {
        const MIN_SPAN = 2;
        const rows = [];
        let currentRow = [];
        let currentSum = 0;
        
        stageInfo.forEach((info) => {
            const span = info.idealSpan;
            if (currentSum + span > maxColumns) {
                rows.push([...currentRow]);
                currentRow = [info];
                currentSum = span;
            } else {
                currentRow.push(info);
                currentSum += span;
            }
        });
        if (currentRow.length > 0) rows.push(currentRow);
        
        const adjusted = [];
        rows.forEach(row => {
            const hasLargeStage = row.some(info => !info.isSmall); 
            
            if (hasLargeStage) {
                let remainingColumns = maxColumns;
                const smallStages = row.filter(info => info.isSmall);
                const largeStages = row.filter(info => !info.isSmall);
                
                smallStages.forEach(() => {
                    remainingColumns -= MIN_SPAN;
                });
                
                const largeTotalProportion = largeStages.reduce((sum, info) => sum + info.idealSpan, 0);
                
                const largeSpans = largeStages.map((info, idx) => {
                    if (idx === largeStages.length - 1) {
                        return remainingColumns;
                    }
                    const proportion = info.idealSpan / largeTotalProportion;
                    const span = Math.round(proportion * remainingColumns);
                    remainingColumns -= span;
                    return span;
                });
                
                let largeIdx = 0;
                row.forEach(info => {
                    if (info.isSmall) {
                        adjusted.push(MIN_SPAN);
                    } else {
                        adjusted.push(largeSpans[largeIdx++]);
                    }
                });
                
            } else {
                const totalIdealSpan = row.reduce((sum, info) => sum + info.idealSpan, 0);
                const scaledRow = row.map(info => (info.idealSpan / totalIdealSpan) * maxColumns);
                const roundedRow = scaledRow.map(Math.round);
                
                const diff = maxColumns - roundedRow.reduce((a, b) => a + b, 0);
                if (diff !== 0) {
                    const maxIndex = roundedRow.indexOf(Math.max(...roundedRow));
                    roundedRow[maxIndex] += diff;
                }
                
                adjusted.push(...roundedRow);
            }
        });
        
        return adjusted;
    }
    
    _renderHeaderControls(headerElement) {
        headerElement.querySelector('.chip-wall-controls')?.remove();
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'chip-wall-controls';
        const { systemConfig } = window.CRM_APP;
        const { type, source, time, year } = this.filters;

        const viewModeButtonText = this.viewMode === 'grid' ? '切換流體模式' : '切換網格模式';

        let filtersHTML = '';
        if (this.options.showFilters) {
            
            const yearFilterHTML = `
                <select data-filter="year" class="form-select-sm">
                    <option value="all" ${year === 'all' ? 'selected' : ''}>全部年度</option>
                    ${this.availableYears.map(y => `<option value="${y}" ${year === String(y) ? 'selected' : ''}>${y}年</option>`).join('')}
                </select>
            `;

            filtersHTML = `
                <div class="chip-wall-filters">
                    ${yearFilterHTML} 
                    <select data-filter="type" class="form-select-sm">
                        <option value="all" ${type === 'all' ? 'selected' : ''}>全部種類</option>
                        ${(systemConfig['機會種類'] || []).map(opt => `<option value="${opt.value}" ${type === opt.value ? 'selected' : ''}>${opt.note || opt.value}</option>`).join('')}
                    </select>
                    <select data-filter="source" class="form-select-sm">
                        <option value="all" ${source === 'all' ? 'selected' : ''}>全部來源</option>
                        ${(systemConfig['機會來源'] || []).map(opt => `<option value="${opt.value}" ${source === opt.value ? 'selected' : ''}>${opt.note || opt.value}</option>`).join('')}
                    </select>
                    <select data-filter="time" class="form-select-sm">
                        <option value="all" ${time === 'all' ? 'selected' : ''}>不限時間</option>
                        <option value="7" ${time === '7' ? 'selected' : ''}>近 7 天</option>
                        <option value="30" ${time === '30' ? 'selected' : ''}>近 30 天</option>
                        <option value="90" ${time === '90' ? 'selected' : ''}>近 90 天</option>
                    </select>
                </div>
            `;
        }

        controlsContainer.innerHTML = `
            ${filtersHTML}
            <div class="chip-wall-actions">
                <button class="action-btn small secondary chip-wall-view-mode-btn">${viewModeButtonText}</button>
                <button class="action-btn small secondary chip-wall-toggle-all-btn">全部展開</button>
            </div>
        `;
        headerElement.appendChild(controlsContainer);

        if (this.options.showFilters) {
            controlsContainer.querySelectorAll('select[data-filter]').forEach(select => {
                select.addEventListener('change', this._handleFilterChange.bind(this));
            });
        }
        controlsContainer.querySelector('.chip-wall-view-mode-btn')?.addEventListener('click', this._handleViewModeToggle.bind(this));
        controlsContainer.querySelector('.chip-wall-toggle-all-btn')?.addEventListener('click', this._handleToggleAll.bind(this));
    }

    _prepareData(items) {
        this.stageGroups.clear();
        this.options.stages.forEach(stageInfo => {
            this.stageGroups.set(stageInfo.value, { name: stageInfo.note || stageInfo.value, items: [] });
        });
        items.forEach(item => {
            if (this.stageGroups.has(item.currentStage)) {
                this.stageGroups.get(item.currentStage).items.push(item);
            }
        });
        this.stageGroups.forEach(stageData => {
            stageData.items.sort((a, b) => {
                const aStale = this._isStaleItem(a);
                const bStale = this._isStaleItem(b);
                if (aStale !== bStale) return aStale ? 1 : -1;
                return (b.effectiveLastActivity || 0) - (a.effectiveLastActivity || 0);
            });
        });
    }

    _filterItems() {
        const now = Date.now();
        const timeThresholds = { '7': 7, '30': 30, '90': 90 };
        const daysAgo = timeThresholds[this.filters.time];
        const threshold = daysAgo ? now - daysAgo * 24 * 60 * 60 * 1000 : 0;

        return this.allItems.filter(item => {
            if (this.filters.year !== 'all' && String(item.creationYear) !== this.filters.year) return false;
            if (this.filters.type !== 'all' && item.opportunityType !== this.filters.type) return false;
            if (this.filters.source !== 'all' && item.opportunitySource !== this.filters.source) return false;
            if (threshold > 0 && item.effectiveLastActivity < threshold) return false;
            return true;
        });
    }

    _isStaleItem(item) {
        const lastActivity = Number(item.effectiveLastActivity);
        const staleCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        return Number.isFinite(lastActivity) && lastActivity > 0 && lastActivity < staleCutoff;
    }

    _renderChip(item) {
        const color = this.colorMap.get(item.opportunityType) || '#6b7280';
        const draggableAttr = this.options.isDraggable ? 'draggable="true"' : '';
        const isStale = this._isStaleItem(item);
        const chipClass = isStale ? 'opportunity-chip is-stale' : 'opportunity-chip';
        let separatorHTML = '';
        if (this._staleSeparatorStage !== item.currentStage) {
            this._staleSeparatorStage = item.currentStage;
            this._staleSeparatorRendered = false;
        }
        if (isStale && !this._staleSeparatorRendered) {
            separatorHTML = '<div class="chip-stale-separator">90 天以上未活動</div>';
            this._staleSeparatorRendered = true;
        }
        return `
            ${separatorHTML}
            <div class="${chipClass}"
                 ${draggableAttr}
                 data-item-id="${item.opportunityId}" 
                 style="--chip-color: ${color};"
                 title="${item.opportunityName}">
                ${item.opportunityName}
            </div>
        `;
    }

    _setupEventListeners() {
        // 1. Delegation: Remove old listeners and attach a fresh one to the container
        this.container.removeEventListener('click', this._handleContainerClick);
        this.container.addEventListener('click', this._handleContainerClick);

        if (this.options.isDraggable) {
            this.container.removeEventListener('dragstart', this._handleDragStart);
            this.container.addEventListener('dragstart', this._handleDragStart);
            
            // For drop zones (stages), we still need to identify the target, but we can delegate too
            this.container.removeEventListener('dragover', this._handleDragOver);
            this.container.addEventListener('dragover', this._handleDragOver);

            this.container.removeEventListener('dragleave', this._handleDragLeave);
            this.container.addEventListener('dragleave', this._handleDragLeave);

            this.container.removeEventListener('drop', this._handleDrop);
            this.container.addEventListener('drop', this._handleDrop);
            
            this.container.removeEventListener('dragend', this._handleDragEnd);
            this.container.addEventListener('dragend', this._handleDragEnd);
        }

        // 2. Zero-Dimension Trap Fix: Observe all chip containers
        if (this.options.isCollapsible) {
            this.container.querySelectorAll('.chip-container').forEach(el => {
                this.resizeObserver.observe(el);
            });
        }
    }

    // --- Event Handlers (Delegated) ---

    _handleContainerClick(e) {
        // 1. Chip Click
        const chip = e.target.closest('.opportunity-chip');
        if (chip) {
            if (chip.classList.contains('dragging')) return;
            CRM_APP.navigateTo('opportunity-details', { opportunityId: chip.dataset.itemId });
            return;
        }

        // 2. Collapse Toggle (Title or Button)
        if (this.options.isCollapsible) {
            const title = e.target.closest('.chip-wall-stage-title');
            const btn = e.target.closest('.chip-expand-btn');
            
            if (title || btn) {
                const block = e.target.closest('.chip-wall-stage-block');
                if (block) {
                    this._toggleCollapse(block);
                }
            }
        }
    }

    _toggleCollapse(block) {
        const container = block.querySelector('.chip-container');
        const btn = block.querySelector('.chip-expand-btn');
        if (container) {
            const isExpanded = container.classList.toggle('is-expanded');
            if (btn) btn.textContent = isExpanded ? '收合' : '展開更多...';
        }
    }

    _handleResize(entries) {
        for (const entry of entries) {
            const el = entry.target;
            // Only add button if overflow exists. logic: scrollHeight > clientHeight
            // Note: If display:none, clientHeight is 0, but scrollHeight is also 0.
            // ResizeObserver fires when it becomes visible.
            if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
                const block = el.closest('.chip-wall-stage-block');
                if (block && !block.querySelector('.chip-expand-btn')) {
                    const expandBtn = document.createElement('button');
                    expandBtn.className = 'chip-expand-btn';
                    expandBtn.textContent = '展開更多...';
                    block.appendChild(expandBtn);
                }
            }
        }
    }

    _handleDragStart(e) {
        const chip = e.target.closest('.opportunity-chip');
        if (!chip) return;
        e.dataTransfer.setData('text/plain', chip.dataset.itemId);
        setTimeout(() => chip.classList.add('dragging'), 0);
    }

    _handleDragEnd(e) {
        const chip = e.target.closest('.opportunity-chip');
        if (chip) chip.classList.remove('dragging');
    }

    _handleDragOver(e) {
        const block = e.target.closest('.chip-wall-stage-block');
        if (block) {
            e.preventDefault();
            block.classList.add('drag-over');
        }
    }

    _handleDragLeave(e) {
        const block = e.target.closest('.chip-wall-stage-block');
        if (block) {
            block.classList.remove('drag-over');
        }
    }

    async _handleDrop(e) {
        e.preventDefault();
        const block = e.target.closest('.chip-wall-stage-block');
        if (!block) return;
        
        block.classList.remove('drag-over');
        const opportunityId = e.dataTransfer.getData('text/plain');
        const newStageId = block.dataset.stageId;
        
        const item = this.allItems.find(i => i.opportunityId === opportunityId);
        if (!item || item.currentStage === newStageId) return;

        showLoading('正在更新階段...');
        try {
            const historySet = new Set((item.stageHistory || '').split(',').filter(Boolean));
            historySet.add(`C:${newStageId}`); 
            const newStageHistory = Array.from(historySet).join(',');
            
            const result = await authedFetch(`/api/opportunities/${opportunityId}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    currentStage: newStageId, 
                    stageHistory: newStageHistory, 
                    modifier: getCurrentUser() 
                }),
            });
            
            if (result.success) {
                item.currentStage = newStageId;
                item.stageHistory = newStageHistory; 
                this.render();
                showNotification(`機會 "${item.opportunityName}" 已移至新階段`, 'success');
                if (typeof this.options.onItemUpdate === 'function') this.options.onItemUpdate();
            } else { throw new Error(result.error); }
        } catch (error) { 
            if (error.message !== 'Unauthorized') showNotification(`更新失敗: ${error.message}`, 'error');
        } finally { 
            hideLoading(); 
        }
    }

    _handleViewModeToggle() {
        this.viewMode = this.viewMode === 'grid' ? 'flex' : 'grid';
        localStorage.setItem('chipWallViewMode', this.viewMode);
        this.render();
    }
    
    _handleFilterChange(event) { 
        this.filters[event.target.dataset.filter] = event.target.value; 
        this.render();
        if (typeof this.options.onFilterChange === 'function') {
            this.options.onFilterChange(this.filters);
        }
    }
    
    _handleToggleAll(event) {
        const btn = event.currentTarget;
        const isExpanding = btn.textContent.includes('展開');
        this.container.querySelectorAll('.chip-container').forEach(c => { c.classList.toggle('is-expanded', isExpanding); });
        this.container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = isExpanding ? '收合' : '展開更多...'; });
        btn.textContent = isExpanding ? '全部收合' : '全部展開';
    }

    _injectStyles() {
        const styleId = 'chip-wall-styles-final-grid';
        if (document.getElementById(styleId)) return;
        
        document.querySelectorAll('[id^="chip-wall-styles-"]').forEach(el => el.remove());

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .chip-wall-grid-container { display: flex; flex-direction: column; gap: var(--spacing-3); }
            .chip-wall-flex-container { display: flex; flex-direction: column; gap: var(--spacing-3); }
            .chip-wall-flex-container::after { content: none; }
            .chip-wall-stage-row {
                display: grid;
                grid-template-columns: repeat(var(--chip-wall-row-columns), minmax(0, 1fr));
                gap: var(--spacing-3);
                align-items: start;
            }
            .chip-wall-legend {
                display: inline-flex; align-items: center; gap: var(--spacing-2);
                color: var(--text-muted); font-size: 12px; line-height: 1.2;
                margin-bottom: var(--spacing-3);
            }
            .chip-wall-legend-marker {
                width: 8px; height: 8px; background: var(--secondary-bg);
                border: 1px solid var(--border-color); display: inline-block;
            }
            .chip-wall-stage-block {
                background-color: var(--primary-bg); border: 1px solid var(--border-color);
                border-radius: 0; padding: var(--spacing-4);
                transition: all 0.3s ease; display: flex; flex-direction: column; min-width: 160px;
                align-self: start;
            }
            .chip-wall-stage-title {
                display: flex; justify-content: space-between; align-items: center;
                font-size: var(--font-size-base); font-weight: 600; color: var(--text-primary);
                margin-bottom: var(--spacing-3); padding-bottom: var(--spacing-3);
                border-bottom: 1px solid var(--border-color);
            }
            .chip-wall-stage-title.is-collapsible .stage-name::before { content: '▾ '; }
            .is-expanded .chip-wall-stage-title.is-collapsible .stage-name::before { content: '▴ '; }
            .chip-wall-stage-title.is-collapsible { cursor: pointer; }
            .chip-wall-stage-count { color: var(--text-muted); font-weight: 500; }
            .chip-container {
                display: flex; flex-wrap: wrap; gap: var(--spacing-2);
                flex-grow: 1; transition: max-height 0.4s ease-out;
                overflow: hidden; max-height: 200px;
                padding-top: var(--spacing-1);
            }
            .chip-container.is-expanded { max-height: 1000px; }
            .chip-expand-btn {
                background: var(--glass-bg); color: var(--text-secondary); border: 1px solid var(--border-color);
                padding: 3px 7px; border-radius: 0;
                font-size: 11px; line-height: 1.2; cursor: pointer; width: 100%;
                margin-top: var(--spacing-3); transition: all 0.2s ease;
            }
            .chip-expand-btn:hover { background: var(--secondary-bg); color: var(--text-primary); }
            .opportunity-chip {
                color: var(--text-secondary); font-size: 12px; font-weight: 400; line-height: 1.2;
                padding: 3px 7px; border-radius: 0; letter-spacing: 0;
                border: 1px solid transparent; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                --chip-color: var(--text-muted);
                background: color-mix(in srgb, var(--chip-color) 10%, var(--primary-bg));
                border-color: color-mix(in srgb, var(--chip-color) 22%, var(--border-color));
                transition: all 0.2s ease; cursor: pointer; max-width: 200px;
            }
            .opportunity-chip:hover {
                background: color-mix(in srgb, var(--chip-color) 16%, var(--primary-bg));
                border-color: color-mix(in srgb, var(--chip-color) 34%, var(--border-color));
            }
            .opportunity-chip.is-stale {
                background: var(--secondary-bg);
                color: var(--text-muted);
                border-color: var(--border-color);
                box-shadow: none;
                opacity: 0.78;
            }
            .opportunity-chip.is-stale:hover {
                background: var(--secondary-bg);
                color: var(--text-secondary);
                border-color: var(--border-color);
                opacity: 0.85;
            }
            .chip-stale-separator {
                flex: 0 0 100%; display: flex; align-items: center; gap: var(--spacing-2);
                color: var(--text-muted); font-size: 12px; font-weight: 400; line-height: 1.2;
                margin: var(--spacing-2) 0 0;
            }
            .chip-stale-separator::before,
            .chip-stale-separator::after {
                content: ""; height: 1px; background: var(--border-color); opacity: 0.75;
            }
            .chip-stale-separator::before { flex: 0 0 18px; }
            .chip-stale-separator::after { flex: 1 1 auto; }
            .opportunity-chip.dragging { opacity: 0.5; cursor: grabbing; }
            .chip-wall-stage-block.drag-over { background-color: color-mix(in srgb, var(--accent-blue) 10%, var(--primary-bg)); }
            .no-opps-text { color: var(--text-muted); font-size: var(--font-size-sm); font-style: italic; }
            .chip-wall-controls {
                display: flex; gap: var(--spacing-4); align-items: center; flex-wrap: wrap;
            }
            .chip-wall-filters { display: flex; gap: var(--spacing-3); flex-wrap: wrap; }
            .chip-wall-actions { display: flex; gap: var(--spacing-2); }
            @media (max-width: 900px) {
                .chip-wall-stage-row { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
            }
        `;
        document.head.appendChild(style);
    }
}
