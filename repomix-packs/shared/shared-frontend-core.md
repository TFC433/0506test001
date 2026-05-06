This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: public/scripts/core/*.js, public/scripts/services/*.js, public/scripts/components/chip-wall.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/scripts/components/chip-wall.js
public/scripts/core/constants.js
public/scripts/core/layout-manager.js
public/scripts/core/login.js
public/scripts/core/main.js
public/scripts/core/router.js
public/scripts/core/sync-service.js
public/scripts/core/theme-toggle.js
public/scripts/core/utils.js
public/scripts/services/api.js
public/scripts/services/charting.js
public/scripts/services/ui.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/scripts/components/chip-wall.js">
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
        let html = `<div class="${containerClass}">`;

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
        this.stageGroups.forEach((stageData, stageId) => {
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
            stageData.items.sort((a, b) => (b.effectiveLastActivity || 0) - (a.effectiveLastActivity || 0));
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

    _renderChip(item) {
        const color = this.colorMap.get(item.opportunityType) || '#6b7280';
        const draggableAttr = this.options.isDraggable ? 'draggable="true"' : '';
        return `
            <div class="opportunity-chip" 
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
            .chip-wall-grid-container { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--spacing-3); align-items: flex-start; }
            .chip-wall-flex-container { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--spacing-3); }
            .chip-wall-flex-container::after { content: ""; flex: auto; }
            .chip-wall-stage-block {
                background-color: var(--primary-bg); border: 1px solid var(--border-color);
                border-radius: var(--rounded-lg); padding: var(--spacing-4);
                transition: all 0.3s ease; display: flex; flex-direction: column; min-width: 160px;
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
                padding: var(--spacing-1) var(--spacing-3); border-radius: var(--rounded-md);
                font-size: var(--font-size-xs); cursor: pointer; width: 100%;
                margin-top: var(--spacing-3); transition: all 0.2s ease;
            }
            .chip-expand-btn:hover { background: var(--secondary-bg); color: var(--text-primary); }
            .opportunity-chip {
                color: var(--text-secondary); font-size: var(--font-size-sm); font-weight: 500;
                padding: var(--spacing-1) var(--spacing-3); border-radius: var(--rounded-md);
                border: 1px solid transparent; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                --chip-color: var(--text-muted);
                background: radial-gradient(circle at 10% 10%, color-mix(in srgb, white 8%, transparent), transparent 40%),
                            color-mix(in srgb, var(--chip-color) 15%, transparent);
                border-color: color-mix(in srgb, var(--chip-color) 30%, transparent);
                transition: all 0.2s ease; cursor: pointer; max-width: 200px;
            }
            .opportunity-chip:hover {
                background: radial-gradient(circle at 10% 10%, color-mix(in srgb, white 15%, transparent), transparent 50%),
                            color-mix(in srgb, var(--chip-color) 25%, transparent);
                border-color: color-mix(in srgb, var(--chip-color) 50%, transparent);
                transform: translateY(-1px);
            }
            .opportunity-chip.dragging { opacity: 0.5; cursor: grabbing; }
            .chip-wall-stage-block.drag-over { background-color: color-mix(in srgb, var(--accent-blue) 10%, var(--primary-bg)); }
            .no-opps-text { color: var(--text-muted); font-size: var(--font-size-sm); font-style: italic; }
            .chip-wall-controls {
                display: flex; gap: var(--spacing-4); align-items: center; flex-wrap: wrap;
            }
            .chip-wall-filters { display: flex; gap: var(--spacing-3); flex-wrap: wrap; }
            .chip-wall-actions { display: flex; gap: var(--spacing-2); }
        `;
        document.head.appendChild(style);
    }
}
</file>

<file path="public/scripts/core/constants.js">
// public/scripts/core/constants.js

window.CRM_APP = window.CRM_APP || {};

// 1. 頁面配置定義
window.CRM_APP.pageConfig = {
    'dashboard': { title: '儀表板', subtitle: '以機會為核心的客戶關係管理平台', loaded: false },
    'contacts': { title: '潛在客戶管理', subtitle: '管理所有來自名片或其他來源的潛在客戶', loaded: false },
    'opportunities': { title: '機會案件管理', subtitle: '追蹤與管理所有進行中的機會案件', loaded: false },
    'sales-analysis': { title: '成交與金額分析', subtitle: '檢視已完成機會的績效指標與趨勢', loaded: false },
    'announcements': { title: '佈告欄管理', subtitle: '新增與管理團隊的公告訊息', loaded: false },
    'companies': { title: '公司管理', subtitle: '檢視與管理所有客戶公司', loaded: false },
    'interactions': { title: '互動總覽', subtitle: '檢視所有機會案件的互動紀錄', loaded: false },
    'weekly-business': { title: '週間業務總覽', subtitle: '檢視所有週次的業務摘要', loaded: false },
    'weekly-detail': { title: '週間業務詳情', subtitle: '檢視特定週次的業務紀錄', loaded: true },
    'events': { title: '事件紀錄列表', subtitle: '查看所有機會案件的詳細事件報告', loaded: false },
    'company-details': { title: '公司詳細資料', subtitle: '查看公司的完整關聯資訊', loaded: true },
    'opportunity-details': { title: '機會詳細資料', subtitle: '檢視機會的所有關聯資訊', loaded: true },
    
    // ★★★ 【新增】商品成本管理頁面 ★★★
    'products': { title: '商品成本管理', subtitle: '檢視市場商品成本與定價策略 (機密)', loaded: false },

    // ★★★ 【新增】內部運營頁面 ★★★
    'internal-ops': { title: '進度追蹤', subtitle: '內部運營與專案進度管理', loaded: false }
};
// 2. 下拉選單元素 ID 與 Config Key 的對應
window.CRM_APP.dropdownMappings = {
    'opportunity-type': '機會種類',
    'upgrade-opportunity-type': '機會種類',
    'current-stage': '機會階段',
    'upgrade-current-stage': '機會階段',
    'opportunity-source': '機會來源',
    'assignee': '團隊成員',
    'upgrade-assignee': '團隊成員',
    'interaction-event-type': '互動類型',
    'map-opportunity-filter': '機會種類',
    'edit-opportunity-type': '機會種類',
    'edit-opportunity-source': '機會來源',
    'edit-current-stage': '機會階段',
    'edit-assignee': '團隊成員'
};

// 3. 全域狀態初始化
window.CRM_APP.systemConfig = {};
window.CRM_APP.currentUser = '';
window.CRM_APP.formTemplates = {};
window.CRM_APP.pageModules = {};
</file>

<file path="public/scripts/core/layout-manager.js">
// public/scripts/core/layout-manager.js
// 職責：管理側邊欄 (Sidebar)、使用者資訊顯示、以及「角色定義」的單一真理來源
// @version 1.1.6
// @date 2026-04-28
// @changelog
// - (v1.1.6) Sidebar Final Polish: fixed internal order, enhanced active state, adjusted vertical spacing, and improved alignment.
// - (v1.1.5) Sidebar Final Fix: corrected admin insertion anchor and cleaned nav-header class usage.
// - (v1.1.4) Sidebar Phase B-2: added collapsible Main group, adjusted default expansion states, reordered internal items, and removed admin separator line.
// - (v1.1.3) Sidebar Phase B-1: fixed group state semantics, cleaned collapsible header pointer behavior, and normalized admin active styling.
// - (v1.1.2) Sidebar Phase B: implemented collapsible grouped navigation
// - (v1.1.1) Updated displayUser() to populate #user-display-account with username or role fallback.

window.CRM_APP = window.CRM_APP || {};

const LayoutManager = {
    isPinned: true,
    currentUserRole: 'sales', // 預設
    groupState: { main: true, analytics: true, internal: false }, // 預設狀態

    // 1. 定義預設的角色設定 (預設為中文，確保斷線時也顯示正常)
    defaultRoleDefs: {
        'admin': { title: '管理員', permission: 'System Admin', color: '#fee2e2', textColor: '#991b1b' },
        'sales': { title: '業務', permission: 'General User', color: '#dbeafe', textColor: '#1e40af' }
    },

    init() {
        console.log('🏗️ [Layout] 初始化 UI 佈局...');
        this.loadUserRole();
        
        // 嘗試建立角色定義 (如果 Config 已經在記憶體中)
        this.buildRoleDefinitions();
        
        this.setupSidebarGroups(); // Phase B: 初始化側邊欄群組收合邏輯
        this.setupSidebar();
        this.displayUser();
        this.injectAdminFeatures();
    },

    setupSidebarGroups() {
        const stored = localStorage.getItem('sidebar-group-state');
        if (stored) {
            try {
                this.groupState = JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to parse sidebar-group-state', e);
            }
        }

        document.querySelectorAll('.nav-collapsible').forEach(header => {
            header.addEventListener('click', () => {
                const group = header.getAttribute('data-group');
                if (group) {
                    this.groupState[group] = !this.groupState[group];
                    localStorage.setItem('sidebar-group-state', JSON.stringify(this.groupState));
                    this.applySidebarGroupState();
                }
            });
        });

        this.applySidebarGroupState();
    },

    applySidebarGroupState() {
        Object.entries(this.groupState).forEach(([group, isExpanded]) => {
            const header = document.querySelector(`.nav-collapsible[data-group="${group}"]`);
            if (header) {
                if (isExpanded) header.classList.remove('collapsed');
                else header.classList.add('collapsed');
            }

            const items = document.querySelectorAll(`.nav-item[data-group="${group}"]:not(.nav-collapsible)`);
            items.forEach(item => {
                if (isExpanded) item.classList.remove('group-hidden');
                else item.classList.add('group-hidden');
            });
        });
    },

    /**
     * ★★★ 核心方法：建立角色定義表 ★★★
     * 從系統設定 (Google Sheet) 讀取 UserRole，若無則使用預設值
     */
    buildRoleDefinitions() {
        const config = window.CRM_APP.systemConfig || {};
        const sheetRoles = config['UserRole']; // 對應 Sheet 的「設定類型」= UserRole

        // 準備一個容器
        const finalDefs = { ...this.defaultRoleDefs };

        if (Array.isArray(sheetRoles) && sheetRoles.length > 0) {
            sheetRoles.forEach(item => {
                // item.value = 'admin' (設定項目)
                // item.note = '管理員' (備註/顯示名稱)
                // item.color = '#fee2e2' (樣式規格/背景色)
                
                if (item.value) {
                    finalDefs[item.value] = {
                        title: item.note || item.value,
                        // 我們保留 permission 屬性在資料結構中，以備不時之需，但介面上不會顯示
                        permission: item.value3 || '一般權限',
                        color: item.color || '#f3f4f6',
                        textColor: item.color ? this.darkenColor(item.color, 60) : '#1f2937' 
                    };
                }
            });
        }

        // 將「真理」發布到全域變數
        window.CRM_APP.ROLE_DEFINITIONS = finalDefs;
        return finalDefs;
    },

    /**
     * 輔助：簡單的顏色變深 (為了文字可讀性)
     */
    darkenColor(hex, percent) {
        if (hex.includes('fee2e2')) return '#991b1b'; // 紅底配深紅
        if (hex.includes('dbeafe')) return '#1e40af'; // 藍底配深藍
        return '#374151'; // 預設深灰
    },

    loadUserRole() {
        this.currentUserRole = localStorage.getItem('crmUserRole') || 'sales';
        window.CRM_APP.currentUserRole = this.currentUserRole;
    },

    setupSidebar() {
        const pinBtn = document.getElementById('sidebar-pin-toggle');
        if (!pinBtn) return;

        const stored = localStorage.getItem('crm-sidebar-pinned');
        this.isPinned = stored === null ? true : (stored === 'true');

        pinBtn.addEventListener('click', () => {
            this.isPinned = !this.isPinned;
            localStorage.setItem('crm-sidebar-pinned', this.isPinned);
            this.updateSidebarUI();
        });

        this.updateSidebarUI();
    },

    updateSidebarUI() {
        const layout = document.querySelector('.app-layout');
        const pinBtn = document.getElementById('sidebar-pin-toggle');
        if (!layout || !pinBtn) return;

        const iconContainer = pinBtn.querySelector('.nav-icon');
        const textLabel = pinBtn.querySelector('.nav-text');

        if (this.isPinned) {
            layout.classList.remove('sidebar-collapsed');
            if (textLabel) textLabel.textContent = '收合側邊欄';
            if (iconContainer) iconContainer.innerHTML = this.getIcon('left');
        } else {
            layout.classList.add('sidebar-collapsed');
            if (textLabel) textLabel.textContent = '展開側邊欄';
            if (iconContainer) iconContainer.innerHTML = this.getIcon('right');
        }
    },

    getIcon(dir) {
        const pts = dir === 'left' ? "15 18 9 12 15 6" : "9 18 15 12 9 6";
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="${pts}"></polyline></svg>`;
    },

    displayUser() {
        // 確保定義是最新的
        this.buildRoleDefinitions(); 

        const el = document.getElementById('user-display-name');
        const accountEl = document.getElementById('user-display-account');
        const name = localStorage.getItem('crmCurrentUserName') || '使用者';
        
        const username = 
            localStorage.getItem('crmUsername') || 
            localStorage.getItem('crmUserRole') || 
            '帳號資訊';
        
        // 這裡依照您的需求：只顯示名字，不顯示任何職稱
        if (el) el.textContent = `${name}`; 
        if (accountEl) accountEl.textContent = username;
        
        window.CRM_APP.currentUser = name;
    },

    injectAdminFeatures() {
        if (this.currentUserRole !== 'admin') return;

        const sidebarNav = document.querySelector('.sidebar-nav ul') || document.querySelector('.sidebar-menu');
        if (!sidebarNav) return;
        if (document.getElementById('nav-cost-analysis')) return;

        const adminItem = document.createElement('li');
        adminItem.id = 'nav-cost-analysis';
        
        // ★★★ 套用 Admin 專屬樣式 Class ★★★
        adminItem.className = 'nav-item admin-restricted';
        adminItem.setAttribute('data-group', 'internal'); // 確保加入內部工具群組
        
        // ★★★ 修正：指向 'products' 頁面，且 SVG 結構正確 ★★★
        adminItem.innerHTML = `
            <a href="#" class="nav-link" onclick="event.preventDefault(); CRM_APP.navigateTo('products');">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span class="nav-text">商品成本</span>
            </a>
        `;

        const internalOpsLink = document.querySelector('.sidebar-nav .nav-link[data-page="internal-ops"]');

        if (internalOpsLink && internalOpsLink.closest('.nav-item')) {
            const internalOpsItem = internalOpsLink.closest('.nav-item');
            internalOpsItem.insertAdjacentElement('afterend', adminItem);
        } else {
            // fallback (keep existing safe behavior)
            const sidebarNav = document.querySelector('.sidebar-nav ul') || document.querySelector('.sidebar-menu');
            sidebarNav.appendChild(adminItem);
        }
        
        // 套用群組狀態以處理動態注入的選項
        this.applySidebarGroupState();
    },

    refreshRoleDisplay() {
        this.buildRoleDefinitions();
        this.displayUser();
    },

    updateDropdowns() {
        const config = window.CRM_APP.systemConfig;
        const mappings = window.CRM_APP.dropdownMappings;
        if (!config || !mappings) return;

        Object.entries(mappings).forEach(([id, key]) => {
            const select = document.getElementById(id);
            if (select && Array.isArray(config[key])) {
                const currentVal = select.value;
                const firstOption = select.querySelector('option:first-child')?.outerHTML || '<option value="">請選擇...</option>';
                select.innerHTML = firstOption;
                config[key]
                    .sort((a, b) => (a.order || 99) - (b.order || 99))
                    .forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.value;
                        opt.textContent = item.note || item.value;
                        select.appendChild(opt);
                    });
                if (currentVal) select.value = currentVal;
            }
        });
    }
};

window.CRM_APP.updateAllDropdowns = LayoutManager.updateDropdowns.bind(LayoutManager);
window.CRM_APP.refreshRoleDisplay = LayoutManager.refreshRoleDisplay.bind(LayoutManager);
</file>

<file path="public/scripts/core/login.js">
// public/scripts/core/login.js

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    // 【修正】這裡改回正確的 ID 'error-message'
    const messageEl = document.getElementById('error-message'); 
    const submitBtn = document.getElementById('login-btn');

    if (!loginForm) return;

    // ==========================================
    // 1. 自動登入檢查 (Auto-Login Check)
    // ==========================================
    const cachedToken = localStorage.getItem('crmToken') || localStorage.getItem('crm-token');

    if (cachedToken) {
        console.log('🔄 [Login] 偵測到 Token，正在驗證有效性...');
        
        // UI 回饋：避免使用者以為卡住
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '驗證身份中...';
        }

        try {
            // 呼叫後端驗證 API
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ [Login] Token 有效，自動跳轉...');
                
                // 確保雙重 Token 一致性 (修復無限重導問題)
                if (!localStorage.getItem('crm-token')) {
                    localStorage.setItem('crm-token', cachedToken);
                }
                if (!localStorage.getItem('crmToken')) {
                    localStorage.setItem('crmToken', cachedToken);
                }

                if (messageEl) {
                    messageEl.textContent = '歡迎回來，正在進入系統...';
                    messageEl.classList.add('text-success');
                }

                // 驗證成功：直接跳轉，不需要清除 Storage
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500); // 稍微延遲讓視覺更平滑
                return; // ★ 重要：中止後續程式碼執行
            }

        } catch (error) {
            console.warn('⚠ [Login] Token 驗證失敗或網路錯誤:', error);
            // 驗證失敗將繼續往下執行清除邏輯
        }
    }

    // ==========================================
    // 2. 清除舊 Session (驗證失敗或無 Token 時執行)
    // ==========================================
    console.log('ℹ [Login] 無有效 Session，重置登入狀態');
    localStorage.removeItem('crmToken');
    localStorage.removeItem('crm-token');
    localStorage.removeItem('crmCurrentUserName');
    localStorage.removeItem('crmUserRole');

    // 恢復按鈕狀態
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '登入系統';
    }

    // ==========================================
    // 3. 處理一般登入表單提交
    // ==========================================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI 狀態更新
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.classList.remove('text-danger', 'text-success');
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '登入中...';
        }

        // 收集表單資料
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (result.success) {
                // 1. 儲存 Token
                localStorage.setItem('crmToken', result.token);
                // 相容舊版 Key (部分頁面可能還在用 crm-token)
                localStorage.setItem('crm-token', result.token); 
                
                // 2. 儲存使用者資訊
                localStorage.setItem('crmCurrentUserName', result.name);
                
                // ★★★ 3. 儲存角色權限 ★★★
                localStorage.setItem('crmUserRole', result.role || 'sales');

                if (messageEl) {
                    messageEl.textContent = '登入成功，正在跳轉...';
                    messageEl.classList.add('text-success');
                }

                // 4. 延遲跳轉
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } else {
                throw new Error(result.message || '登入失敗');
            }

        } catch (error) {
            console.error('Login Error:', error);
            if (messageEl) {
                messageEl.textContent = error.message || '登入發生錯誤';
                messageEl.classList.add('text-danger');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '登入系統'; // 修正按鈕文字
            }
        }
    });
});
</file>

<file path="public/scripts/core/main.js">
// public/scripts/core/main.js
// 職責：System initialization entry + parallelized resource loading
// @version [Phase B] Stale Invalidation Mechanism Patch + Session Avatar
// @date 2026-04-28
// @changelog
// - Modified logout() to clear 'crmSessionAvatar' from sessionStorage
// - Added initSessionUserAvatar() for dynamic session-stable avatar injection
// - Parallelized loadResources fetches using Promise.all
// - Removal of unintended injected code
// - [Patch Phase B] Added CRM_APP.markStale utility for router cache invalidation

window.CRM_APP = window.CRM_APP || {};

// --- Main App Logic ---

CRM_APP.init = async function() {
    console.log('🚀 [Main] TFC CRM系統啟動中...');
    try {
        await this.loadResources();
        await this.loadConfig();
        LayoutManager.init();

        Router.init();

        if (window.kanbanBoardManager?.initialize) {
            window.kanbanBoardManager.initialize();
        }

        await this.handleInitialRoute();
        console.log('✅ [Main] 系統載入完成！');
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            console.error('❌ [Main] 初始化失敗:', err);
            showNotification(`初始化失敗: ${err.message}`, 'error', 10000);
        }
    }
};

CRM_APP.loadConfig = async function() {
    try {
        const data = await authedFetch('/api/config');
        if (data) {
            this.systemConfig = data;
            this.updateAllDropdowns();
        }
    } catch (err) {
        console.error('[Main] 載入 Config 失敗:', err);
    }
};

CRM_APP.handleInitialRoute = async function() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const [pageName, paramsString] = hash.split('?');
        if (this.pageConfig && this.pageConfig[pageName]) {
            let params = {};
            if (paramsString) params = Object.fromEntries(new URLSearchParams(paramsString));
            await this.navigateTo(pageName, params, false);
            return;
        }
    }
    await this.navigateTo('dashboard', {}, false);
    window.history.replaceState(null, '', '#dashboard');
};

CRM_APP.loadResources = async function() {
    // 定義要載入的組件列表
    const components = [
        'contact-modals', 'opportunity-modals', 'meeting-modals', 
        'system-modals', 'event-log-modal', 'link-contact-modal', 
        'link-opportunity-modal', 'announcement-modals'
    ];
    
    const container = document.getElementById('modal-container');
    if (container) {
        const htmlResults = await Promise.all(components.map(async (c) => {
            try {
                const res = await fetch(`/components/modals/${c}.html`);
                if (res.ok) {
                    return await res.text();
                } else {
                    console.warn(`[Main] ⚠ 載入模組失敗: ${c} (Status: ${res.status})`);
                    return '';
                }
            } catch (error) {
                console.error(`[Main] ❌ 載入模組發生錯誤: ${c}`, error);
                return '';
            }
        }));
        container.innerHTML = htmlResults.join('');
    }

    const types = ['general', 'iot', 'dt', 'dx'];
    
    this.formTemplates = this.formTemplates || {};
    
    await Promise.all(types.map(async (t) => {
        try {
            const file = `/components/forms/event-form-${t === 'dx' ? 'general' : t}.html`;
            const res = await fetch(file);
            if (res.ok) {
                const html = await res.text();
                // 儲存到全域變數中
                this.formTemplates[t] = html;
            } else {
                 console.warn(`[Main] ⚠ 載入表單失敗: ${t}`);
            }
        } catch (error) {
            console.error(`[Main] ❌ 載入表單發生錯誤: ${t}`, error);
        }
    }));
};

/**
 * [Patch Phase B] 標記特定 SPA 頁面為 Stale (髒資料)，強制 Router 在下次進入時重新載入
 * @param {string|string[]} pageNames - 要標記的頁面 ID
 */
CRM_APP.markStale = function(pageNames) {
    if (!this.pageConfig) return;
    if (!Array.isArray(pageNames)) pageNames = [pageNames];
    
    pageNames.forEach(page => {
        if (this.pageConfig[page]) {
            this.pageConfig[page].stale = true;
            console.log(`🔄 [Cache] 標記 SPA 頁面需更新 (Stale): ${page}`);
        }
    });
};

// Global Helpers
function getCurrentUser() {
    return window.CRM_APP?.currentUser || localStorage.getItem('crmCurrentUserName') || '系統';
}

function logout() {
    localStorage.removeItem('crm-token');
    localStorage.removeItem('crmToken');
    localStorage.removeItem('crmCurrentUserName');
    localStorage.removeItem('crmUserRole');
    
    try {
        sessionStorage.removeItem('crmSessionAvatar');
    } catch (e) {
        console.warn('[Avatar] Failed to clear session avatar on logout', e);
    }
    
    window.location.href = '/';
}

function initSessionUserAvatar() {
    const avatarEl = document.getElementById('user-avatar');
    if (!avatarEl) return;

    const images = [
        '/assets/avatars/avatar-1.png',
        '/assets/avatars/avatar-2.png',
        '/assets/avatars/avatar-3.png',
        '/assets/avatars/avatar-4.png',
        '/assets/avatars/avatar-5.png',
        '/assets/avatars/avatar-6.png',
        '/assets/avatars/avatar-7.png',
        '/assets/avatars/avatar-8.png',
        '/assets/avatars/avatar-9.png',
        '/assets/avatars/avatar-10.png',
        '/assets/avatars/avatar-11.png',
        '/assets/avatars/avatar-12.png',
        '/assets/avatars/avatar-13.png',
        '/assets/avatars/avatar-14.png',
        '/assets/avatars/avatar-15.png',
        '/assets/avatars/avatar-16.png',
        '/assets/avatars/avatar-17.png',
        '/assets/avatars/avatar-18.png',
        '/assets/avatars/avatar-19.png',
        '/assets/avatars/avatar-20.png',
        '/assets/avatars/avatar-21.png',
        '/assets/avatars/avatar-22.png',
        '/assets/avatars/avatar-23.png',
    ];
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

    let sessionData;
    try {
        const stored = sessionStorage.getItem('crmSessionAvatar');
        if (stored) {
            sessionData = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[Avatar] Failed to parse session avatar data', e);
    }

    if (!sessionData || !sessionData.image || !sessionData.color) {
        sessionData = {
            image: images[Math.floor(Math.random() * images.length)],
            color: colors[Math.floor(Math.random() * colors.length)]
        };
        try {
            sessionStorage.setItem('crmSessionAvatar', JSON.stringify(sessionData));
        } catch (e) {
            console.warn('[Avatar] Failed to set session avatar data', e);
        }
    }

    avatarEl.style.backgroundColor = sessionData.color;
    avatarEl.style.backgroundImage = `url("${sessionData.image}")`;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.CRM_APP_INITIALIZED) {
        window.CRM_APP_INITIALIZED = true;
        if (typeof loadWeeklyBusinessPage === 'function') window.CRM_APP.pageModules['weekly-business'] = loadWeeklyBusinessPage;
        if (typeof navigateToWeeklyDetail === 'function') window.CRM_APP.pageModules['weekly-detail'] = navigateToWeeklyDetail;
        if (typeof loadSalesAnalysisPage === 'function') window.CRM_APP.pageModules['sales-analysis'] = loadSalesAnalysisPage;
        
        // 註冊內部運營頁面模組
        if (typeof loadInternalOpsPage === 'function') window.CRM_APP.pageModules['internal-ops'] = loadInternalOpsPage;

        initSessionUserAvatar();
        
        CRM_APP.init();
    }
});
</file>

<file path="public/scripts/core/router.js">
/**
 * File: public/scripts/core/router.js
 * @version 1.0.5 (Phase B Patch)
 * @date 2026-04-23
 * @purpose Restore SPA cache flag for non-detail pages & introduce Stale Invalidation
 * @changelog
 * - Restored SPA cache behavior for non-detail pages to prevent redundant API fetches.
 * - [Patch Phase B] Integrated config.stale flag into needsLoad logic to force reload dirtied pages.
 */

// public/scripts/core/router.js
// 職責：處理 URL Hash 變更、頁面導航 (Navigation) 與 SPA 歷史紀錄

window.CRM_APP = window.CRM_APP || {};

const Router = {
    /**
     * 初始化導航監聽
     */
    init() {
        console.log('🌐 [Router] 初始化導航監聽...');
        
        // 監聽瀏覽器前進/後退 (Hash變更)
        window.addEventListener('hashchange', () => this.handleHashChange());

        // 監聽點擊事件 (data-page 屬性)
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-page]');
            if (target) {
                e.preventDefault();
                const pageName = target.dataset.page;
                let params = {};
                if (target.dataset.params) {
                    try {
                        params = JSON.parse(target.dataset.params);
                    } catch (err) {
                        console.error(`[Router] 解析參數失敗:`, target.dataset.params, err);
                    }
                }
                this.navigateTo(pageName, params);
                
                // 行動裝置自動收合選單
                if (document.body.classList.contains('sidebar-is-open')) {
                    this.toggleMobileNav(false);
                }
            }
        });

        // 初始化行動裝置切換鈕
        const mobileToggle = document.querySelector('.mobile-nav-toggle');
        const mobileBackdrop = document.querySelector('.mobile-nav-backdrop');
        if (mobileToggle) mobileToggle.addEventListener('click', () => this.toggleMobileNav());
        if (mobileBackdrop) mobileBackdrop.addEventListener('click', () => this.toggleMobileNav(false));
    },

    /**
     * 處理 Hash 變更邏輯
     */
    handleHashChange() {
        const hash = window.location.hash.substring(1);
        const [pageName, paramsString] = hash.split('?');
        let params = {};

        if (paramsString) {
            try {
                params = Object.fromEntries(new URLSearchParams(paramsString));
                Object.keys(params).forEach(key => params[key] = decodeURIComponent(params[key] ?? ''));
            } catch (e) { console.warn(`[Router] 解析 Hash 參數失敗:`, e); }
        }

        const currentPageId = document.querySelector('.page-view[style*="display: block"]')?.id.replace('page-', '');
        const targetConfig = window.CRM_APP.pageConfig[pageName];

        if (targetConfig && pageName !== currentPageId) {
            this.navigateTo(pageName, params, false);
        } else if (!hash && currentPageId !== 'dashboard') {
            this.navigateTo('dashboard', {}, false);
        } else if (targetConfig && pageName === currentPageId) {
            // 參數變更檢查
            const currentParams = new URLSearchParams(window.location.hash.split('?')[1] || '').toString();
            const newParams = new URLSearchParams(paramsString || '').toString();
            if (currentParams !== newParams) {
                this.navigateTo(pageName, params, false);
            }
        }
    },

    /**
     * 核心導航函式
     */
    async navigateTo(pageName, params = {}, updateHistory = true) {
        const config = window.CRM_APP.pageConfig[pageName];
        if (!config) {
            console.error(`[Router] 未知頁面: ${pageName}`);
            if (pageName !== 'dashboard') await this.navigateTo('dashboard', {}, updateHistory);
            return;
        }

        console.log(`[Router] 前往: ${pageName}`, params);

        // 1. 更新 URL 歷史紀錄
        if (updateHistory) {
            let newHash = `#${pageName}`;
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v != null) searchParams.set(k, String(v)); });
            if (searchParams.toString()) newHash += `?${searchParams.toString()}`;
            
            if (window.location.hash !== newHash) {
                window.history.pushState({ page: pageName, params }, '', newHash);
            }
        }

        // 2. 更新標題與側邊欄 Active 狀態
        const isDetailPage = pageName.includes('-details') || pageName === 'weekly-detail';
        if (!isDetailPage) {
            const titleEl = document.getElementById('page-title');
            const subtitleEl = document.getElementById('page-subtitle');
            if (titleEl) titleEl.textContent = config.title;
            if (subtitleEl) subtitleEl.textContent = config.subtitle;

            document.querySelectorAll('.nav-list .nav-item').forEach(i => i.classList.remove('active'));
            const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
            activeLink?.closest('.nav-item')?.classList.add('active');
        } else {
            // 詳細頁面時，將 Active 狀態設為對應的列表頁
            let listPage = 'dashboard';
            if (pageName === 'opportunity-details') listPage = 'opportunities';
            if (pageName === 'company-details') listPage = 'companies';
            if (pageName === 'weekly-detail') listPage = 'weekly-business';
            document.querySelectorAll('.nav-list .nav-item').forEach(i => i.classList.remove('active'));
            document.querySelector(`.nav-link[data-page="${listPage}"]`)?.closest('.nav-item')?.classList.add('active');
        }

        // 3. 切換顯示的 DOM 元素
        const targetView = document.getElementById(`page-${pageName}`) || (pageName === 'weekly-detail' ? document.getElementById('page-weekly-business') : null);
        document.querySelectorAll('.page-view').forEach(v => v.style.display = 'none');
        
        if (targetView) {
            targetView.style.display = 'block';
        } else {
            return this.navigateTo('dashboard', {}, false);
        }

        // 4. 執行模組載入邏輯
        if (pageName === 'dashboard') {
            // [Hotfix] 遵循 SPA 載入旗標，避免路由切換時重複發送 /api/dashboard 請求
            // [Patch Phase B] Support config.stale to force reload dirty dashboard
            if ((!config.loaded || config.stale) && window.dashboardManager?.refresh) {
                await window.dashboardManager.refresh();
                config.loaded = true;
                config.stale = false;
            }
        } else {
            const loadFn = window.CRM_APP.pageModules[pageName];

            // [Hotfix-1] event-editor：豁免一次性載入鎖定，允許每次進入都跑 loadFn
            // [Patch Phase B] Support config.stale to force reload dirty list pages
            const needsLoad = loadFn && (isDetailPage || pageName === 'event-editor' || !config.loaded || config.stale);

            if (needsLoad) {
                try {
                    if (isDetailPage) {
                        // 自動推斷參數 Key
                        let paramValue = params.weekId || params.opportunityId || params.companyName || Object.values(params)[0];
                        if (!paramValue) throw new Error(`缺少頁面所需參數: ${pageName}`);
                        await loadFn(paramValue);
                    } else {
                        // [Hotfix-2] event-editor：把 params 傳進去；其他頁維持原行為 (不傳參)
                        if (pageName === 'event-editor') {
                            await loadFn(params);
                        } else {
                            await loadFn();
                        }
                    }

                    // Restore SPA cache flag for non-detail pages to prevent redundant API fetches
                    if (!isDetailPage && pageName !== 'event-editor') {
                        config.loaded = true;
                        config.stale = false; // [Patch Phase B] Clear stale flag after loading
                    }

                } catch (err) {
                    console.error(`[Router] 載入頁面失敗:`, err);
                    targetView.innerHTML = `<div class="alert alert-error">載入失敗: ${err.message}</div>`;
                }
            } else if (loadFn) {
                // 執行樣式修復 (針對 SPA 樣式覆蓋問題)
                const compName = pageName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Components';
                if (window[compName]?.injectStyles) window[compName].injectStyles();
            }
        }
    },

    toggleMobileNav(forceOpen) {
        const body = document.body;
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.mobile-nav-backdrop');
        const isOpen = body.classList.contains('sidebar-is-open');
        const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

        if (shouldOpen) {
            sidebar?.classList.add('is-open');
            backdrop?.classList.add('is-open');
            body.classList.add('sidebar-is-open');
        } else {
            sidebar?.classList.remove('is-open');
            backdrop?.classList.remove('is-open');
            body.classList.remove('sidebar-is-open');
        }
    }
};

window.CRM_APP.navigateTo = Router.navigateTo.bind(Router); // 導出供全域使用
</file>

<file path="public/scripts/core/sync-service.js">
// public/scripts/core/sync-service.js
// 職責：處理寫入後的局部視圖刷新 (View Refresh Utility)
// (Refactored Phase 2: Obsolete global polling logic removed completely)

window.CRM_APP = window.CRM_APP || {};

const SyncService = {
    /**
     * 核心：寫入後的視圖刷新邏輯 (Fallback/Alternative version)
     */
    async refreshCurrentView(successMessage = '資料重整中...') {
        console.log('[Sync] 執行視圖刷新...');

        // 1. 失效所有列表頁面的快取 (若存在快取機制)
        if (window.CRM_APP.pageConfig) {
            for (const key in window.CRM_APP.pageConfig) {
                const isListPage = !key.includes('-details') && key !== 'weekly-detail';
                if (isListPage) {
                    window.CRM_APP.pageConfig[key].loaded = false;
                }
            }
        }

        // 2. 獲取當前頁面與參數
        const hash = window.location.hash.substring(1);
        const [pageName, paramsString] = hash.split('?');
        let params = {};
        if (paramsString) params = Object.fromEntries(new URLSearchParams(paramsString));

        // 3. 重新導航 (觸發模組的 loadFn)
        try {
            await window.CRM_APP.navigateTo(pageName || 'dashboard', params, false);
        } catch (err) {
            if (typeof showNotification === 'function') {
                showNotification(`刷新失敗: ${err.message}`, 'error');
            } else {
                console.error('[Sync] 刷新失敗:', err);
            }
        }
    }
};

// 導出全域函式 (若 main.js 已經宣告了更完整的版本，此處可能作為後備方案)
window.CRM_APP.refreshCurrentView = SyncService.refreshCurrentView.bind(SyncService);
</file>

<file path="public/scripts/core/theme-toggle.js">
// views/scripts/theme-toggle.js
// ==================== 主題切換功能 ====================
class ThemeManager {
    constructor() {
        // 恢復自動檢測邏輯
        const storedTheme = this.getStoredTheme();
        this.theme = storedTheme || this.getSystemTheme(); // 優先使用儲存的，其次是系統偏好
        this.init();
    }

    // 初始化主題管理器
    init() {
        // 讀取儲存的主題或系統主題
        const storedTheme = this.getStoredTheme();
        this.theme = storedTheme || this.getSystemTheme();

        // 在頁面載入時就應用正確的主題
        document.documentElement.setAttribute('data-theme', this.theme);

        // 創建按鈕並更新其初始狀態
        this.createToggleButton();
        this.updateToggleButton(); // 更新按鈕圖示

        // 綁定事件 (點擊按鈕會觸發 toggleTheme -> reload)
        this.bindEvents();
        console.log(`🎨 主題管理器初始化完成 - 當前主題: ${this.theme}`);
    }

    // 獲取儲存的主題
    getStoredTheme() {
        return localStorage.getItem('crm-theme');
    }

    // 獲取系統主題偏好
    getSystemTheme() {
        // 預設為暗色，如果系統偏好亮色則返回 'light'
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark'; // 預設暗色
    }

    // 儲存主題到本地存儲
    setStoredTheme(theme) {
        localStorage.setItem('crm-theme', theme);
    }

    // 應用主題 (主要在 init 時使用)
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;
        // setStoredTheme 移到 toggleTheme 中，在 reload 前執行
        this.updateToggleButton();

        // 觸發自定義事件 (在 reload 方案下可能意義不大，但保留無妨)
        const event = new CustomEvent('themeChanged', {
            detail: { theme: theme }
        });
        document.dispatchEvent(event);
    }

    // 切換主題並強制重新載入頁面
    toggleTheme() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';

        // 1. 先儲存新的主題設定到 localStorage
        this.setStoredTheme(newTheme);
        console.log(`[Theme] New theme set to: ${newTheme}. Reloading page...`);

        // 2. 直接觸發頁面重新整理
        // 瀏覽器重新載入時，新的主題會從 localStorage 讀取並應用
        location.reload();

        // --- 以下程式碼將不會被執行，因為頁面已重新載入 ---
    }


    // 主題切換動畫 (在 reload 方案下不會被呼叫)
    animateThemeTransition() {
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            toggleBtn.style.transform = 'scale(0.8) rotate(180deg)';
            setTimeout(() => {
                toggleBtn.style.transform = 'scale(1) rotate(0deg)';
            }, 200);
        }
    }

    // 創建主題切換按鈕
    createToggleButton() {
        // 檢查是否已經存在切換按鈕
        if (document.querySelector('.theme-toggle')) {
            return;
        }

        const toggleButton = document.createElement('button');
        toggleButton.className = 'theme-toggle action-btn icon-btn'; // 使用現有按鈕樣式
        toggleButton.setAttribute('aria-label', '切換主題');
        toggleButton.setAttribute('title', '切換明暗主題');

        // SVG 圖標
        toggleButton.innerHTML = `
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;

        // 將按鈕添加到頁首的操作區域
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            // 找到主題切換按鈕的理想插入位置（例如，在用戶信息之前）
            const userDisplay = headerActions.querySelector('.user-info');
            if (userDisplay) {
                headerActions.insertBefore(toggleButton, userDisplay);
            } else {
                headerActions.appendChild(toggleButton); // 如果找不到用戶信息，添加到末尾
            }
        } else {
            console.warn('[Theme] Header actions container not found, appending toggle to body.');
            document.body.appendChild(toggleButton); // Fallback
        }
    }


    // 更新切換按鈕狀態
    updateToggleButton() {
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            const title = this.theme === 'dark' ? '切換至明亮主題' : '切換至暗色主題';
            toggleBtn.setAttribute('title', title);
            toggleBtn.setAttribute('aria-label', title);
            // 控制 SVG 顯示
            const sunIcon = toggleBtn.querySelector('.sun-icon');
            const moonIcon = toggleBtn.querySelector('.moon-icon');
            if (sunIcon && moonIcon) {
                sunIcon.style.display = this.theme === 'light' ? 'block' : 'none';
                moonIcon.style.display = this.theme === 'dark' ? 'block' : 'none';
            }
        }
    }

    // 綁定事件監聽器
    bindEvents() {
        // 主題切換按鈕點擊事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle')) {
                e.preventDefault();
                this.toggleTheme(); // 這個函式現在會觸發 reload
            }
        });

        // 鍵盤快捷鍵 (Ctrl/Cmd + Shift + L)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
                e.preventDefault();
                this.toggleTheme(); // 這個函式現在會觸發 reload
            }
        });

        // 監聽系統主題變化
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            mediaQuery.addEventListener('change', (e) => {
                // 只有在使用者沒有手動選擇過主題時，才跟隨系統
                if (!this.getStoredTheme()) {
                    const systemTheme = e.matches ? 'light' : 'dark';
                    // 不再呼叫 applyTheme，因為會觸發 reload
                    console.log(`[Theme] System theme changed to ${systemTheme}. Reloading...`);
                    // 需要儲存新的系統偏好嗎？取決於需求，這裡先不存，讓下次 reload 時自動偵測
                    location.reload();
                }
            });
        }

        // 監聽存儲變化（多標籤頁同步）
        window.addEventListener('storage', (e) => {
            if (e.key === 'crm-theme' && e.newValue !== this.theme) {
                // 其他分頁的主題被改變了，本分頁也重新載入以同步
                console.log(`[Theme] Theme changed in another tab to ${e.newValue}. Reloading current tab...`);
                location.reload();
            }
        });
    }

    // 獲取當前主題
    getCurrentTheme() {
        return this.theme;
    }

    // 檢查是否為暗色主題
    isDarkTheme() {
        return this.theme === 'dark';
    }

    // 檢查是否為明亮主題
    isLightTheme() {
        return this.theme === 'light';
    }

    // 強制設置主題 (主要用於外部呼叫，並會觸發 reload)
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.setStoredTheme(theme);
            location.reload();
        } else {
            console.warn('⚠️ 無效的主題值:', theme);
        }
    }

    // 重置為系統主題 (並觸發 reload)
    resetToSystemTheme() {
        localStorage.removeItem('crm-theme');
        const systemTheme = this.getSystemTheme(); // 取得要套用的系統主題
        console.log(`🔄 已重置為系統主題: ${systemTheme}. Reloading...`);
        location.reload();
    }

    // 獲取主題相關的CSS變數值
    getThemeVariable(variableName) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(`--${variableName}`)
            .trim();
    }

    // 設置主題相關的CSS變數 (在 reload 方案下較少用到)
    setThemeVariable(variableName, value) {
        document.documentElement.style.setProperty(`--${variableName}`, value);
    }

    // 導出主題設定
    exportThemeSettings() {
        return {
            currentTheme: this.theme,
            storedTheme: this.getStoredTheme(),
            systemTheme: this.getSystemTheme(),
            timestamp: new Date().toISOString()
        };
    }

    // 銷毀主題管理器
    destroy() {
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            toggleBtn.remove();
        }
        // 移除事件監聽器 (如果需要精確控制)
        console.log('🗑️ 主題管理器已銷毀');
    }
}

// ==================== 主題相關工具函數 ====================

// 獲取當前主題顏色值
function getThemeColors() {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    return {
        primaryBg: computedStyle.getPropertyValue('--primary-bg').trim(),
        secondaryBg: computedStyle.getPropertyValue('--secondary-bg').trim(),
        textPrimary: computedStyle.getPropertyValue('--text-primary').trim(),
        textSecondary: computedStyle.getPropertyValue('--text-secondary').trim(),
        accentBlue: computedStyle.getPropertyValue('--accent-blue').trim(),
        accentGreen: computedStyle.getPropertyValue('--accent-green').trim(),
        accentOrange: computedStyle.getPropertyValue('--accent-orange').trim(),
        accentRed: computedStyle.getPropertyValue('--accent-red').trim()
    };
}

// 檢查是否支援深色模式
function supportsDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// 檢查是否支援明亮模式
function supportsLightMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
}

// 為特定元素應用主題類別
function applyThemeToElement(element, theme) {
    if (!element) return;

    element.classList.remove('theme-dark', 'theme-light');
    element.classList.add(`theme-${theme}`);
}

// 主題變化時的回調函數管理
class ThemeCallbackManager {
    constructor() {
        this.callbacks = new Set();
        this.setupThemeListener();
    }

    // 註冊主題變化回調
    register(callback) {
        if (typeof callback === 'function') {
            this.callbacks.add(callback);
            return () => this.callbacks.delete(callback); // 返回取消註冊函數
        }
    }

    // 設置主題變化監聽器
    setupThemeListener() {
        document.addEventListener('themeChanged', (e) => {
            this.callbacks.forEach(callback => {
                try {
                    callback(e.detail.theme, getThemeColors());
                } catch (error) {
                    console.error('主題變化回調執行錯誤:', error);
                }
            });
        });
    }

    // 清除所有回調
    clear() {
        this.callbacks.clear();
    }
}

// ==================== 全域實例和初始化 ====================

// 創建全域主題管理器實例
let themeManager = null;
let themeCallbackManager = null;

// 初始化主題系統
function initializeThemeSystem() {
    // 確保只初始化一次
    if (themeManager) return themeManager;

    try {
        themeManager = new ThemeManager();
        themeCallbackManager = new ThemeCallbackManager();

        // 將主題管理器掛載到 window 對象，方便除錯
        if (typeof window !== 'undefined') {
            window.themeManager = themeManager;
            window.getThemeColors = getThemeColors;
        }

        console.log('🎨 主題系統初始化完成');
        return themeManager;
    } catch (error) {
        console.error('❌ 主題系統初始化失敗:', error);
        return null;
    }
}

// ==================== 主題切換相關的實用函數 ====================

// 平滑主題切換動畫 (在 reload 方案下不會被呼叫，但保留無妨)
function smoothThemeTransition(duration = 300) {
    if (document.getElementById('smooth-theme-transition-style')) return;

    const css = `
        *, *::before, *::after {
            transition: background-color ${duration}ms ease,
                       color ${duration}ms ease,
                       border-color ${duration}ms ease,
                       box-shadow ${duration}ms ease !important;
        }
    `;

    const style = document.createElement('style');
    style.id = 'smooth-theme-transition-style';
    style.textContent = css;
    document.head.appendChild(style);

    setTimeout(() => {
        const existingStyle = document.getElementById('smooth-theme-transition-style');
        if (existingStyle) {
            document.head.removeChild(existingStyle);
        }
    }, duration);
}

// 主題切換時執行平滑動畫 (在 reload 方案下不會被觸發，但保留)
document.addEventListener('themeChanged', () => {
    smoothThemeTransition(300);
});

// 調試用：顯示當前主題資訊
function debugThemeInfo() {
    if (themeManager) {
        console.table({
            '當前主題': themeManager.getCurrentTheme(),
            '儲存的主題': themeManager.getStoredTheme(),
            '系統主題': themeManager.getSystemTheme(),
            '是否為暗色主題': themeManager.isDarkTheme(),
            '支援深色模式': supportsDarkMode(),
            '主題顏色': getThemeColors()
        });
    } else {
        console.log('主題管理器尚未初始化');
    }
}

// 將調試函數掛載到 window
if (typeof window !== 'undefined') {
    window.debugThemeInfo = debugThemeInfo;
}

// 確保在 DOMContentLoaded 時執行初始化 (由 main.js 觸發)
document.addEventListener('DOMContentLoaded', initializeThemeSystem);
</file>

<file path="public/scripts/core/utils.js">
// public/scripts/core/utils.js
// @version 1.0.1
// @date 2026-04-28
// @changelog 
// - Added User Dropdown D2 logic (toggle User Dropdown, close on outside click, safely close on Escape).

// ==================== 全域變數與設定 ====================
let searchDebounceTimer;

// ==================== 通用資料處理函式 ====================

// Debounce utility for search inputs
function handleSearch(searchFunction, delay = 400) {
    clearTimeout(searchDebounceTimer); // Clear existing timer
    searchDebounceTimer = setTimeout(() => {
        if (typeof searchFunction === 'function') {
            searchFunction(); // Execute the search
        }
    }, delay); // Wait for specified delay
}

// ==================== 通用工具函式 ====================

// Formats date string (accepts ISO string, Date object, or timestamp number)
function formatDateTime(dateInput) {
    if (!dateInput) return '-'; // Return dash if input is null, undefined, or empty string

    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        // [Strict Digital Forensics Patch] UTC Naive String Normalization
        // Supabase/PostgreSQL 'timestamp' returns naive ISO strings without 'Z'.
        // JS new Date() parses naive 'T' strings as Local Time. Append 'Z' to force UTC.
        let safeInput = dateInput;
        if (typeof safeInput === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(safeInput)) {
            safeInput += 'Z';
        }
        // Try parsing string or number
        date = new Date(safeInput);
    }

    // Check if the resulting date is valid
    if (isNaN(date.getTime())) {
        console.warn(`[Util] Invalid date input for formatDateTime:`, dateInput);
        // Return the original input or a placeholder if it's invalid
        return typeof dateInput === 'string' ? dateInput.split('T')[0] : '無效日期'; // Show at least the date part if possible
    }

    // Use Intl.DateTimeFormat for locale-aware formatting
    try {
        return new Intl.DateTimeFormat('zh-TW', { // Taiwan locale
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false // 24-hour format
        }).format(date).replace(/\//g, '-'); // Replace slashes with dashes
    } catch (error) {
        console.error("[Util] Error formatting date:", error);
        // Fallback formatting
        return date.toISOString().slice(0, 16).replace('T', ' ');
    }
}

// Close modal on escape key press
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // Find the topmost visible modal
        const modals = Array.from(document.querySelectorAll('.modal[style*="display: block"]'));
        if (modals.length > 0) {
            // Sort by z-index descending to find the top one
            modals.sort((a, b) => (parseInt(b.style.zIndex || 0)) - (parseInt(a.style.zIndex || 0)));
            const topModal = modals[0];
            console.log(`[UI] Escape key pressed, closing modal: #${topModal.id}`);
            closeModal(topModal.id); // closeModal is now in ui.js, but loaded globally
        }
        // Also close panel if open
        const panel = document.getElementById('active-panel');
        if (panel && panel.classList.contains('is-open')) {
            console.log(`[UI] Escape key pressed, closing panel.`);
            closePanel(); // closePanel is now in ui.js, but loaded globally
        }
        
        // [D2 Patch] Safely close User Dropdown menu
        if (typeof window.closeUserDropdown === 'function') {
            window.closeUserDropdown();
        }
    }
});

// Detect county from address string
function detectCountyFromAddress(address) {
    if (!address || typeof address !== 'string') return null;
    // Use a more robust list including common variations if needed
    const counties = ['臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市', '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', /* Add '台' variations if common in data */ '台北市', '台中市', '台南市', '台東縣'];
    // Find the first matching county name (case-insensitive check might be better)
    for (let county of counties) {
        if (address.includes(county)) {
            // Return the standard '臺' version
            return county.replace('台', '臺');
        }
    }
    return null; // No match found
}

// Auto-populate county dropdown based on address data
function populateCountyFromAddress(dataObject, countySelectId) {
    const countySelect = document.getElementById(countySelectId);
    if (!countySelect) {
        console.warn(`[Util] County select element #${countySelectId} not found.`);
        return;
    }
    // Reset selection first
    countySelect.selectedIndex = 0;

    if (!dataObject || !dataObject.address) return; // Exit if no address data

    const detectedCounty = detectCountyFromAddress(dataObject.address);
    if (detectedCounty) {
        let found = false;
        // Iterate through options to find and select the match
        for (let option of countySelect.options) {
            if (option.value === detectedCounty) {
                option.selected = true;
                found = true;
                console.log(`[Util] Auto-selected county: ${detectedCounty} for #${countySelectId}`);
                if (typeof showNotification === 'function') {
                    showNotification(`已自動辨識縣市：${detectedCounty}`, 'info', 1500); // Shorter duration
                }
                break;
            }
        }
        if (!found) {
            console.warn(`[Util] Detected county "${detectedCounty}" not found in select options for #${countySelectId}.`);
        }
    } else {
        console.log(`[Util] Could not detect county from address for #${countySelectId}.`);
    }
}

// *** 函數從 opportunity-modals.js 移入 ***
/**
 * 填充下拉選單 (來自 opportunity-modals.js)
 * @param {string} selectId - 下拉選單的 ID
 * @param {Array<object>} options - 選項陣列 [{value: '...', note: '...'}]
 * @param {string} [selectedValue] - (可選) 預設選中的值
 */
function populateSelect(selectId, options, selectedValue) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">請選擇...</option>';
    (options || []).forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.note || option.value;
        if (option.value === selectedValue) optionElement.selected = true;
        select.appendChild(optionElement);
    });
}

// *** 函數從 opportunity-modals.js 移入 ***
/**
 * 填充縣市下拉選單 (來自 opportunity-modals.js)
 * @param {string} selectId - 下拉選單的 ID
 */
function populateCountyDropdown(selectId) {
    const counties = ["臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣"];
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">請選擇縣市...</option>';
    counties.forEach(county => {
        select.innerHTML += `<option value="${county}">${county}</option>`;
    });
}

// Add CSS for pagination buttons if not already present
const paginationStyleId = 'pagination-styles';
if (!document.getElementById(paginationStyleId)) {
    const style = document.createElement('style');
    style.id = paginationStyleId;
    style.innerHTML = `
        .pagination { display: flex; align-items: center; justify-content: center; gap: var(--spacing-2); margin-top: var(--spacing-4); }
        .pagination-btn {
            padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-color);
            background: var(--glass-bg); color: var(--text-secondary); border-radius: var(--rounded-md);
            cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: all 0.2s ease;
        }
        .pagination-btn:hover:not(:disabled) { background: var(--accent-blue); color: white; border-color: var(--accent-blue); }
        .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination-info { color: var(--text-muted); font-size: var(--font-size-sm); margin: 0 var(--spacing-2); }
    `;
    document.head.appendChild(style);
}

// Add CSS for notification animations if not already present
const notificationAnimationStyleId = 'notification-animation-styles';
if (!document.getElementById(notificationAnimationStyleId)) {
    const style = document.createElement('style');
    style.id = notificationAnimationStyleId;
    style.innerHTML = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .notification { animation: slideInRight 0.3s ease forwards; }
    `;
    document.head.appendChild(style);
}


// ==================== Header User Dropdown (D2 Patch) ====================

// Toggle dropdown visibility and block event bubbling to avoid instant closure
window.toggleUserDropdown = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const container = document.getElementById('user-dropdown-container');
    if (container) {
        container.classList.toggle('open');
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) {
            menu.setAttribute('aria-hidden', !container.classList.contains('open'));
        }
    }
};

// Close dropdown if it is currently open
window.closeUserDropdown = function() {
    const container = document.getElementById('user-dropdown-container');
    if (container && container.classList.contains('open')) {
        container.classList.remove('open');
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) {
            menu.setAttribute('aria-hidden', 'true');
        }
    }
};

// Global click-outside listener
document.addEventListener('click', function(event) {
    if (!event.target.closest('.user-dropdown-container')) {
        if (typeof window.closeUserDropdown === 'function') {
            window.closeUserDropdown();
        }
    }
});
</file>

<file path="public/scripts/services/api.js">
// File: public/scripts/services/api.js
// 職責：專門處理 API 請求、認證 Token、錯誤處理以及流量控制 (Traffic Control)
// Version: 1.0.1 (Phase B - Cleanup)
// Date: 2026-04-23
// Purpose: API Request wrapper with centralized rate limiting, authentication, and error handling.
// Changelog:
// - [Patch Phase B] Wired successful write operations to CRM_APP.markStale to invalidate frontend SPA cache.
// - [Patch Phase B - Cleanup] Removed legacy refreshCurrentView / location.reload behavior. Stale-based router refresh is now the intended mechanism.

// --- Traffic Control Configuration ---
const RATE_LIMIT_CONFIG = {
    maxRequestsPerSecond: 5,  // Max requests allowed per second
    interval: 1000 / 5,       // Interval between requests (200ms)
    maxRetries: 3,            // Max retry attempts for 429
    backoffBase: 1000         // Base wait time for backoff (1s)
};

// Request Queue for Throttling
const requestQueue = [];
let isProcessingQueue = false;
let lastRequestTime = 0;

let isRedirectingToLogin = false;

/**
 * 經過認證與流量控制的 fetch 函式
 * @param {string} url - API 的 URL
 * @param {object} [options={}] - fetch 的選項
 * @returns {Promise<any>}
 */
async function authedFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        // Enqueue the request
        requestQueue.push({ url, options, resolve, reject, attempts: 0 });
        processQueue();
    });
}

/**
 * Process the request queue with throttling
 */
async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const delay = Math.max(0, RATE_LIMIT_CONFIG.interval - timeSinceLastRequest);

    isProcessingQueue = true;

    setTimeout(async () => {
        const req = requestQueue.shift();
        if (req) {
            lastRequestTime = Date.now();
            try {
                const result = await executeFetch(req.url, req.options, req.attempts);
                req.resolve(result);
            } catch (error) {
                req.reject(error);
            }
        }
        isProcessingQueue = false;
        if (requestQueue.length > 0) {
            processQueue();
        }
    }, delay);
}

/**
 * Execute the actual fetch with Retry logic
 */
async function executeFetch(url, options, attempts) {
    const token = localStorage.getItem('crm-token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const method = options.method ? options.method.toUpperCase() : 'GET';
    const isWriteOperation = ['POST', 'PUT', 'DELETE'].includes(method);

    try {
        console.log(`[authedFetch] Requesting: ${method} ${url}`);
        const response = await fetch(url, { ...options, headers });

        // --- Handle 429 Too Many Requests (Exponential Backoff) ---
        if (response.status === 429) {
            if (attempts < RATE_LIMIT_CONFIG.maxRetries) {
                const waitTime = RATE_LIMIT_CONFIG.backoffBase * Math.pow(2, attempts);
                console.warn(`[authedFetch] 429 Rate Limit. Retrying in ${waitTime}ms... (Attempt ${attempts + 1})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return executeFetch(url, options, attempts + 1);
            } else {
                throw new Error('Server is busy (429). Please try again later.');
            }
        }

        // --- Handle Unauthorized ---
        if (response.status === 401 || response.status === 403) {
            if (!isRedirectingToLogin) {
                isRedirectingToLogin = true;
                localStorage.removeItem('crm-token');
                localStorage.removeItem('crmToken');
                localStorage.removeItem('crmCurrentUserName');
                localStorage.removeItem('crmUserRole');
                showNotification('您的登入已過期或無效，將跳轉至登入頁面。', 'error', 3000);
                setTimeout(() => { window.location.href = '/login.html'; }, 2000);
            }
            throw new Error('Unauthorized');
        }

        // --- Parse Response ---
        let result = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            try {
                result = await response.json();
            } catch (jsonError) {
                if (!response.ok) throw new Error(`API 請求失敗，狀態碼: ${response.status}，且回應非有效 JSON。`);
                throw new Error(`API 請求成功，但回應的 JSON 格式無效。`);
            }
        }

        if (!response.ok) {
            const errorDetails = result?.details || result?.message || result?.error || response.statusText || `HTTP error ${response.status}`;
            throw new Error(errorDetails);
        }

        // --- Smart Refresh on Write ---
        // [Bugfix] Added `result?.success !== false` to prevent false positive success toasts 
        // and forced reloads when the backend gracefully blocks an action (e.g., relation validation)
        if (isWriteOperation && response.ok && result?.success !== false && !options.skipRefresh) {
            
            // [Patch Phase B] Intercept success and mark related SPA list pages as stale
            if (window.CRM_APP && typeof window.CRM_APP.markStale === 'function') {
                const affectedPages = ['dashboard'];
                
                if (url.includes('/api/companies')) {
                    affectedPages.push('companies');
                } else if (url.includes('/api/opportunities')) {
                    affectedPages.push('opportunities', 'companies');
                } else if (url.includes('/api/contacts')) {
                    affectedPages.push('contacts', 'companies', 'opportunities');
                } else if (url.includes('/api/events') || url.includes('/api/event-logs') || url.includes('/api/interactions')) {
                    affectedPages.push('companies', 'opportunities');
                } else if (url.includes('/api/weekly')) {
                    affectedPages.push('weekly-business');
                }
                
                window.CRM_APP.markStale(affectedPages);
            }

            const successMsg = result?.message || (method === 'DELETE' ? '刪除成功！' : '操作成功！');
            showNotification(successMsg, 'success', 2000);
        }

        return result;

    } catch (error) {
        if (error.message !== 'Unauthorized' && !isRedirectingToLogin) {
            const displayError = error.message.length > 100 ? error.message.substring(0, 97) + '...' : error.message;
            showNotification(`操作失敗: ${displayError}`, 'error');
        }
        throw error;
    }
}
</file>

<file path="public/scripts/services/charting.js">
// public/scripts/services/charting.js
// 職責：專門處理所有 Highcharts 圖表的通用主題和建立邏輯

/**
 * 共用的 Highcharts 圖表主題設定 (加強版 + 統一標籤樣式 + 折線圖漸層)
 * @returns {object} Highcharts 的主題選項物件
 */
function getHighchartsThemeOptions() {
    // Determine theme based on data-theme attribute
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Get CSS variables for colors
    const rootStyle = getComputedStyle(document.documentElement);
    const textColorPrimary = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f1f5f9' : '#1e293b');
    const textColorSecondary = rootStyle.getPropertyValue('--text-secondary').trim() || (isDark ? '#cbd5e1' : '#475569');
    const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
    const tooltipBg = isDark ? 'rgba(31, 41, 55, 0.85)' : 'rgba(255, 255, 255, 0.85)';
    const chartColors = ['#60a5fa', '#4ade80', '#fb923c', '#a78bfa', '#f87171', '#14b8a6', '#ec4899', '#6366f1']; // 主題顏色

    // 統一的標籤樣式 (非粗體、無外框、使用次要文字顏色)
    const commonLabelStyle = {
        color: textColorSecondary,
        fontWeight: 'normal', // 確保不是粗體
        textOutline: 'none'   // 確保沒有外框
    };

    return {
        colors: chartColors, // 使用定義好的顏色
        chart: {
            backgroundColor: 'transparent',
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
            }
        },
        title: {
            style: {
                color: textColorPrimary,
                fontSize: '1.1em',
                fontWeight: 'bold' // 標題可以保持粗體
            }
        },
        subtitle: {
            style: {
                color: textColorSecondary
            }
        },
        xAxis: {
            labels: {
                style: commonLabelStyle // 應用統一的標籤樣式
            },
            title: {
                style: { // 座標軸標題樣式
                    color: textColorPrimary,
                    fontWeight: '500' // 可以稍微加粗，但不是 bold
                }
            },
            lineColor: gridLineColor,
            tickColor: gridLineColor,
        },
        yAxis: {
            labels: {
                style: commonLabelStyle // 應用統一的標籤樣式
            },
            title: {
                style: { // 座標軸標題樣式
                    color: textColorPrimary,
                    fontWeight: '500'
                }
            },
            gridLineColor: gridLineColor,
        },
        legend: {
            itemStyle: { // 圖例項目樣式
                color: textColorSecondary,
                fontWeight: '500' // 圖例可以稍微加粗
            },
            itemHoverStyle: { color: textColorPrimary }
        },
        tooltip: {
            backgroundColor: tooltipBg,
            style: { color: textColorPrimary },
            borderWidth: 0,
            shadow: false
        },
        plotOptions: {
            series: { // 所有系列的基礎設定
                marker: {
                    radius: 3
                },
                dataLabels: {
                    style: commonLabelStyle // 為所有系列的 dataLabels 設定基礎樣式
                }
            },
            // --- 新增：為 area (區域圖) 添加漸層填充效果 ---
            area: {
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        // 從主題的第一個顏色開始，設定 50% 透明度
                        // 注意：這裡使用 chartColors[0] 作為基底，個別圖表若想用不同顏色需在 specificOptions 中覆蓋 series color
                        [0, Highcharts.color(chartColors[0]).setOpacity(0.5).get('rgba')],
                        // 到底部時完全透明
                        [1, Highcharts.color(chartColors[0]).setOpacity(0).get('rgba')]
                    ]
                },
                marker: { radius: 2 }, // area 特有的 marker
                lineWidth: 2,
                states: { hover: { lineWidth: 3 } },
                threshold: null
            },
            // --- 結束新增 ---
            pie: {
                dataLabels: {
                    connectorColor: textColorSecondary, // 連接線顏色
                    style: commonLabelStyle // 確保 pie dataLabels 也是統一的
                }
            },
            bar: {
                dataLabels: {
                    // 繼承 series.dataLabels.style
                }
            },
            column: {
                dataLabels: {
                    // 繼承 series.dataLabels.style
                }
            },
            line: { // 如果只想讓折線本身有效果，可以在這裡加，但 area 通常更常用
                dataLabels: {
                    // 繼承 series.dataLabels.style
                }
            }
        },
        credits: {
            enabled: false // 禁用 Highcharts 版權標示
        },
        // 儲存文字顏色供內部參考 (可選)
        textColors: {
            primary: textColorPrimary,
            secondary: textColorSecondary
        }
    };
}


/**
 * 簡易的深度合併函式 (處理 Highcharts 選項常用情況)
 * @param {object} target - 目標物件
 * @param {object} source - 來源物件
 * @returns {object} 合併後的目標物件
 */
function deepMerge(target, source) {
for (const key in source) {
    if (source.hasOwnProperty(key)) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
        targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        // 如果來源和目標都是物件 (非陣列)，遞迴合併
        deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
        // 否則，直接覆蓋或設定值 (包括陣列、基本類型、null)
        target[key] = sourceValue;
    }
    }
}
return target;
}

/**
 * 建立帶有當前主題的 Highcharts 圖表
 * @param {string} elementId - 圖表容器的 ID
 * @param {object} specificOptions - 此圖表特定的 Highcharts 選項
 * @returns {Highcharts.Chart|null} Highcharts 圖表物件或 null (如果失敗)
 */
function createThemedChart(elementId, specificOptions) {
try {
    const themeOptions = getHighchartsThemeOptions(); // 獲取當前主題設定

    // 進行深度合併，specificOptions 會覆蓋 themeOptions 中的同名屬性
    const mergedOptions = deepMerge(JSON.parse(JSON.stringify(themeOptions)), specificOptions);

    // 檢查容器是否存在
    const container = document.getElementById(elementId);
    if (!container) {
    console.error(`[createThemedChart] Container element #${elementId} not found.`);
    return null;
    }
    // 檢查 Highcharts 是否載入
    if (typeof Highcharts === 'undefined' || typeof Highcharts.chart !== 'function') {
        console.error(`[createThemedChart] Highcharts library not loaded or Highcharts.chart is not a function.`);
        container.innerHTML = `<div class="alert alert-error">圖表函式庫載入失敗</div>`;
        return null;
    }

    // 清空容器內容，避免重複渲染或殘留舊圖表/錯誤訊息
    container.innerHTML = '';

    return Highcharts.chart(elementId, mergedOptions); // 使用合併後的選項建立圖表
} catch (error) {
    console.error(`[createThemedChart] Error creating chart #${elementId}:`, error);
    const container = document.getElementById(elementId);
    if (container) {
    container.innerHTML = `<div class="alert alert-error">圖表建立失敗: ${error.message}</div>`;
    }
    return null;
}
}
</file>

<file path="public/scripts/services/ui.js">
/**
 * public/scripts/services/ui.js
 * * 職責：管理所有全域 UI 元素，如彈窗、通知、面板、載入畫面和共用元件渲染器
 * * @version 6.3.1 (Phase 8.3 Toast Extensibility Patch)
 * * @date 2026-03-17
 * @description
 * 1. [UX Polish] Relocated toast notifications from bottom-right to top-right.
 * 2. [UX Polish] Applied SaaS-style background colors to toast types (Success=White, Error/Info=Light Red, Warning=Light Orange).
 * 3. [Bugfix] Auto-creation of `#toast-container` remains to prevent silent failures.
 * 4. Retained legacy adapters (`renderPagination`, `showBusinessCardPreview`, `showConfirmDialog`).
 * 5. [Patch] Extended `showToast` to support optional HTML rendering and persistent display modes.
 */

let zIndexCounter = 3000;
window.confirmActionCallback = null;
let currentPreviewDriveLink = null;

// ==========================================
// Toast Notification System (Modern UI)
// ==========================================

function injectToastStyles() {
    if (document.getElementById('crm-toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'crm-toast-styles';
    style.textContent = `
        #toast-container {
            position: fixed;
            top: 28px;
            right: 28px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        }
        .toast {
            background: var(--card-bg, #ffffff);
            color: var(--text-primary, #334155);
            padding: 14px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border-color, #e2e8f0);
            border-left: 4px solid #cbd5e1;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.5;
            pointer-events: auto;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.21, 1.02, 0.73, 1), opacity 0.4s ease;
            max-width: 380px;
            min-width: 250px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        /* Type Accents & Backgrounds */
        .toast-success { border-left-color: #10b981; background: #ffffff; }
        .toast-error { border-left-color: #ef4444; background: #fef2f2; }
        .toast-info { border-left-color: #ef4444; background: #fef2f2; } /* visually mirrors error for block/warning UX */
        .toast-warning { border-left-color: #f59e0b; background: #fffbeb; }

        /* Dark Mode Support Overrides */
        [data-theme="dark"] .toast {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        [data-theme="dark"] .toast-success { background: #1e293b; color: #f8fafc; border-color: #334155; }
        [data-theme="dark"] .toast-error, [data-theme="dark"] .toast-info { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
        [data-theme="dark"] .toast-warning { background: #451a03; color: #fde68a; border-color: #78350f; }
        
        /* Inline SVG Icons for Polish */
        .toast::before {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            margin-top: 1px;
        }
        .toast-success::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'%3E%3C/path%3E%3Cpolyline points='22 4 12 14.01 9 11.01'%3E%3C/polyline%3E%3C/svg%3E");
        }
        .toast-error::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='15' y1='9' x2='9' y2='15'%3E%3C/line%3E%3Cline x1='9' y1='9' x2='15' y2='15'%3E%3C/line%3E%3C/svg%3E");
        }
        .toast-info::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='16' x2='12' y2='12'%3E%3C/line%3E%3Cline x1='12' y1='8' x2='12.01' y2='8'%3E%3C/line%3E%3C/svg%3E");
        }
        .toast-warning::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'%3E%3C/path%3E%3Cline x1='12' y1='9' x2='12' y2='13'%3E%3C/line%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E");
        }
    `;
    document.head.appendChild(style);
}

function showToast(message, type = 'info', duration = 3000, options = {}) {
    // 1. Ensure our modern CSS is injected
    injectToastStyles();

    let toastContainer = document.getElementById('toast-container');
    
    // 2. Auto-create the toast container if it does not exist in the layout
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // 3. Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // 4. Content wrapper to ensure text aligns properly next to the injected ::before icon
    const textWrapper = document.createElement('div');
    textWrapper.style.flex = '1';
    
    if (options.allowHtml) {
        textWrapper.innerHTML = message;
    } else {
        textWrapper.textContent = message;
    }
    
    toast.appendChild(textWrapper);

    toastContainer.appendChild(toast);

    // 5. Trigger reflow for slide-in animation
    void toast.offsetWidth;
    toast.classList.add('show');

    // 6. Auto-dismiss (only when not persistent and duration is positive)
    if (!options.persistent && duration > 0) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400); // Matches the new 0.4s CSS transition
        }, duration);
    }
}

// ==========================================
// Shared Modals & UI Loaders
// ==========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        zIndexCounter++; 
        modal.style.zIndex = zIndexCounter; 
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; 
    } else {
        console.error(`[UI] Error: Modal with ID "${modalId}" not found.`);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        const anyModalOpen = document.querySelector('.modal[style*="display: block"]');
        if (!anyModalOpen) {
            document.body.style.overflow = ''; 
        }
    }
}

function showLoading(message = '載入中...') {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (overlay && text) {
        text.textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function confirmAction(message, callback) {
    const modal = document.getElementById('confirm-modal');
    const msgElement = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('btn-confirm-yes');

    if (modal && msgElement && confirmBtn) {
        msgElement.textContent = message;

        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.addEventListener('click', () => {
            closeModal('confirm-modal');
            if (callback) callback();
        });

        showModal('confirm-modal');
    } else {
        if (confirm(message)) {
            if (callback) callback();
        }
    }
}

// ==========================================
// Status Chips & Renderers
// ==========================================

function renderStatusChip(status) {
    if (!status) return '';

    const statusColors = {
        'New': 'bg-blue-100 text-blue-800',
        'Contacted': 'bg-yellow-100 text-yellow-800',
        'Qualified': 'bg-green-100 text-green-800',
        'Lost': 'bg-red-100 text-red-800',
        'Won': 'bg-purple-100 text-purple-800',
        'Pending': 'bg-gray-100 text-gray-800'
    };

    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${colorClass}">${status}</span>`;
}

function renderPriorityChip(priority) {
    if (!priority) return '';

    const priorityColors = {
        'High': 'text-red-600 font-bold',
        'Medium': 'text-yellow-600 font-medium',
        'Low': 'text-green-600'
    };

    const classStr = priorityColors[priority] || 'text-gray-500';
    return `<span class="${classStr}">${priority}</span>`;
}

async function showBusinessCardPreview(driveLink) {
    currentPreviewDriveLink = driveLink;

    const contentArea = document.getElementById('business-card-preview-content');
    const modalId = 'business-card-preview-modal';

    if (!contentArea) {
        showToast('無法開啟預覽：UI 元件缺失', 'error');
        return;
    }

    contentArea.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem;">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">正在讀取高清影像...</p>
        </div>
    `;

    showModal(modalId);

    const proxyUrl = `/api/drive/thumbnail?link=${encodeURIComponent(driveLink)}`;
    const img = new Image();

    img.onload = () => {
        if (currentPreviewDriveLink !== driveLink) return;

        contentArea.innerHTML = ''; 

        const linkWrapper = document.createElement('a');
        linkWrapper.href = driveLink;   
        linkWrapper.target = '_blank';  
        linkWrapper.title = '點擊開啟原始檔案 (Google Drive)';
        linkWrapper.style.display = 'block';
        linkWrapper.style.textAlign = 'center';
        linkWrapper.style.cursor = 'zoom-in'; 

        img.style.maxWidth = '100%';
        img.style.maxHeight = '70vh'; 
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        img.style.borderRadius = '4px';
        img.style.border = '1px solid #eee';

        linkWrapper.appendChild(img);
        contentArea.appendChild(linkWrapper);

        const hint = document.createElement('div');
        hint.innerHTML = '<small style="color: #888; margin-top: 8px; display: block;"><i class="fas fa-external-link-alt"></i> 點擊圖片可開啟原檔</small>';
        hint.style.textAlign = 'center';
        contentArea.appendChild(hint);
    };

    img.onerror = () => {
        if (currentPreviewDriveLink !== driveLink) return;
        console.warn('[UI] 名片預覽載入失敗');

        contentArea.innerHTML = `
            <div class="alert alert-warning" style="text-align: center; margin: 1rem;">
                <p><strong>預覽載入失敗</strong></p>
                <p class="text-muted small">無法直接顯示此圖片。</p>
                <a href="${driveLink}" target="_blank" class="btn btn-primary btn-sm mt-2">
                    <i class="fas fa-external-link-alt"></i> 開啟 Google Drive 原檔
                </a>
            </div>
        `;
    };

    img.src = proxyUrl;
}

function closeBusinessCardPreview() {
    currentPreviewDriveLink = null;

    const contentArea = document.getElementById('business-card-preview-content');

    const iframe = document.getElementById('business-card-iframe');
    if (iframe) {
        iframe.src = 'about:blank';
        iframe.remove();
    }

    if (contentArea) {
        contentArea.innerHTML = '';
    }

    closeModal('business-card-preview-modal');
}

function renderPagination(containerId, pagination, callbackName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!pagination || !pagination.totalItems || pagination.totalItems <= 0) {
        container.innerHTML = '';
        return;
    }

    const current = Number(pagination.current) || 1;
    const total = Number(pagination.total) || 1;
    const hasNext = !!pagination.hasNext;
    const hasPrev = !!pagination.hasPrev;

    container.innerHTML = `
        <div class="pagination-wrap" style="display:flex; gap:12px; align-items:center; justify-content:center;">
            <button type="button" class="pagination-btn" id="${containerId}-prev" ${hasPrev ? '' : 'disabled'}>
                <i class="fas fa-chevron-left"></i> 上一頁
            </button>
            <span class="pagination-info">第 ${current} 頁 / 共 ${total} 頁</span>
            <button type="button" class="pagination-btn" id="${containerId}-next" ${hasNext ? '' : 'disabled'}>
                下一頁 <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    const prevBtn = document.getElementById(`${containerId}-prev`);
    const nextBtn = document.getElementById(`${containerId}-next`);

    const invoke = (page) => {
        const fn = window[callbackName];
        if (typeof fn !== 'function') {
            console.warn(`[UI] renderPagination: callback "${callbackName}" not found on window.`);
            return;
        }
        fn(page);
    };

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!hasPrev) return;
            invoke(Math.max(1, current - 1));
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (!hasNext) return;
            invoke(Math.min(total, current + 1));
        });
    }
}

// Native Exports
window.showModal = showModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.confirmAction = confirmAction;
window.renderStatusChip = renderStatusChip;
window.renderPriorityChip = renderPriorityChip;
window.showBusinessCardPreview = showBusinessCardPreview;
window.closeBusinessCardPreview = closeBusinessCardPreview;

// Adapter Layer
window.renderPagination = renderPagination;

// Legacy Aliases
window.showNotification = showToast;         
window.showConfirmDialog = confirmAction;
</file>

</files>
