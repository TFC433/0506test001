// views/scripts/map-manager.js

class MapManager {
    constructor() {
        this.chart = null;
        this.previewChart = null;
        this.isInitialized = false;
        this.normalizedGeoJson = null;
        this.latestSeriesData = [];
        this.currentOpportunityType = '';
        this.mapName = 'taiwan';
        this.geoJsonUrl = '/assets/maps/taiwan.json';
        this.excludedCounties = new Set(['澎湖縣', '金門縣', '連江縣']);
        this.nullMapColor = 'rgba(148, 163, 184, 0.22)';
        this.controlsBound = false;
    }

    async initialize(opportunityType = '') {
        const mapContainer = document.getElementById('taiwan-map-container');
        if (!mapContainer) return;

        this.currentOpportunityType = opportunityType || '';
        this.ensureStyles();
        this.renderFilterTabs();
        this.bindControls();

        if (!this.canRenderEChartsMap(mapContainer)) return;

        await this.fetchAndRender(this.currentOpportunityType);
    }

    async update(opportunityType = '') {
        this.currentOpportunityType = opportunityType || '';
        this.renderFilterTabs();

        if (!this.isInitialized) {
            await this.initialize(this.currentOpportunityType);
        } else {
            await this.fetchAndUpdateSeries(this.currentOpportunityType);
        }
    }

    canRenderEChartsMap(mapContainer) {
        if (!window.echarts || typeof window.echarts.registerMap !== 'function') {
            console.warn('[MapManager] ECharts map renderer is unavailable.');
            mapContainer.innerHTML = '<div class="alert alert-error">地圖元件尚未載入，無法顯示全台機會分布。</div>';
            return false;
        }

        if (typeof createEChartsThemedChart !== 'function') {
            console.warn('[MapManager] createEChartsThemedChart is unavailable.');
            mapContainer.innerHTML = '<div class="alert alert-error">圖表主題元件尚未載入，無法顯示全台機會分布。</div>';
            return false;
        }

        return true;
    }

    async fetchAndRender(opportunityType = '') {
        const mapContainer = document.getElementById('taiwan-map-container');
        if (!mapContainer) return;

        try {
            if (!this.canRenderEChartsMap(mapContainer)) return;

            await this.ensureTaiwanMapRegistered();
            const seriesData = await this.fetchMapData(opportunityType);
            const option = this.buildMapOption(seriesData);

            this.chart = createEChartsThemedChart('taiwan-map-container', option);
            this.renderTopSummary(seriesData);
            this.isInitialized = Boolean(this.chart);

            if (!this.chart) {
                mapContainer.innerHTML = '<div class="alert alert-error">全台機會分布圖建立失敗。</div>';
            }
        } catch (error) {
            console.error('[MapManager] Failed to render Taiwan opportunity map:', error);
            mapContainer.innerHTML = `<div class="alert alert-error"><strong>全台機會分布圖載入失敗</strong><br/>${error.message}</div>`;
        }
    }

    async fetchAndUpdateSeries(opportunityType = '') {
        const mapContainer = document.getElementById('taiwan-map-container');

        try {
            if (!mapContainer || !this.canRenderEChartsMap(mapContainer)) return;

            await this.ensureTaiwanMapRegistered();
            const seriesData = await this.fetchMapData(opportunityType);

            if (!this.chart || this.chart.isDisposed?.()) {
                await this.fetchAndRender(opportunityType);
                return;
            }

            this.chart.setOption({
                legend: { show: false },
                visualMap: this.buildVisualMap(seriesData),
                series: [{
                    data: seriesData,
                    label: this.buildTopCountyLabel(seriesData)
                }]
            });
            this.renderTopSummary(seriesData);

            if (this.isPreviewOpen()) {
                this.renderPreviewChart();
            }
        } catch (error) {
            console.error('[MapManager] Failed to update Taiwan opportunity map:', error);
            if (typeof showNotification === 'function') {
                showNotification('全台機會分布圖更新失敗', 'error');
            } else if (mapContainer) {
                mapContainer.innerHTML = `<div class="alert alert-error">全台機會分布圖更新失敗：${error.message}</div>`;
            }
        }
    }

    async ensureTaiwanMapRegistered() {
        const geoJson = await this.loadNormalizedGeoJson();
        window.echarts.registerMap(this.mapName, geoJson);
    }

    async loadNormalizedGeoJson() {
        if (this.normalizedGeoJson) return this.normalizedGeoJson;

        const response = await fetch(this.geoJsonUrl);
        if (!response.ok) {
            throw new Error(`Taiwan GeoJSON 載入失敗 (${response.status})`);
        }

        const sourceGeoJson = await response.json();
        const normalizedGeoJson = this.cloneGeoJson(sourceGeoJson);

        if (!normalizedGeoJson || normalizedGeoJson.type !== 'FeatureCollection' || !Array.isArray(normalizedGeoJson.features)) {
            throw new Error('Taiwan GeoJSON 格式不正確');
        }

        normalizedGeoJson.features = normalizedGeoJson.features
            .map(feature => {
                const properties = feature.properties || {};
                const rawName = properties.name || properties.COUNTYNAME;
                const normalizedName = this.normalizeCountyName(rawName);

                if (!normalizedName || this.excludedCounties.has(normalizedName)) {
                    return null;
                }

                feature.properties = {
                    ...properties,
                    name: normalizedName
                };

                if (properties.COUNTYNAME !== undefined) {
                    feature.properties.COUNTYNAME = this.normalizeCountyName(properties.COUNTYNAME);
                }

                return feature;
            })
            .filter(Boolean);

        this.normalizedGeoJson = normalizedGeoJson;
        return this.normalizedGeoJson;
    }

    cloneGeoJson(geoJson) {
        if (typeof structuredClone === 'function') {
            return structuredClone(geoJson);
        }

        return JSON.parse(JSON.stringify(geoJson));
    }

    async fetchMapData(opportunityType = '') {
        await this.loadNormalizedGeoJson();

        const apiUrl = opportunityType
            ? `/api/opportunities/by-county?opportunityType=${encodeURIComponent(opportunityType)}`
            : '/api/opportunities/by-county';
        const countyData = await authedFetch(apiUrl);

        const countyCountMap = new Map();
        if (Array.isArray(countyData)) {
            countyData.forEach(item => {
                if (item && item.county) {
                    countyCountMap.set(this.normalizeCountyName(item.county), Number(item.count) || 0);
                }
            });
        }

        this.latestSeriesData = this.normalizedGeoJson.features.map(feature => {
            const name = this.normalizeCountyName(feature.properties && feature.properties.name);
            const count = countyCountMap.get(name) || 0;

            return {
                name,
                value: count > 0 ? count : null
            };
        });

        return this.latestSeriesData;
    }

    normalizeCountyName(name) {
        return String(name || '').trim().replace(/台/g, '臺');
    }

    buildMapOption(seriesData, options = {}) {
        const rootStyle = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColorPrimary = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a');
        const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
        const borderColor = rootStyle.getPropertyValue('--border-color').trim() || (isDark ? '#334155' : '#cbd5e1');
        const cardBg = rootStyle.getPropertyValue('--card-bg').trim() || (isDark ? '#1e293b' : '#ffffff');
        const mapBorderColor = isDark ? 'rgba(226, 232, 240, 0.58)' : 'rgba(255, 255, 255, 0.92)';
        const isPreview = Boolean(options.preview);
        const topCountyLabel = this.buildTopCountyLabel(seriesData, textColorPrimary);

        return {
            legend: { show: false },
            tooltip: {
                trigger: 'item',
                backgroundColor: cardBg,
                borderColor,
                textStyle: { color: textColorPrimary },
                formatter: params => {
                    const countyName = params.name || '';
                    const value = Number.isFinite(Number(params.value)) ? Number(params.value) : 0;
                    return `<b>${countyName}</b><br/>機會案件：<b>${value}</b> 件`;
                }
            },
            visualMap: this.buildVisualMap(seriesData, textColorMuted, isPreview),
            series: [{
                name: '機會案件',
                type: 'map',
                map: this.mapName,
                roam: false,
                data: seriesData,
                layoutCenter: ['50%', '50%'],
                layoutSize: isPreview ? '96%' : '104%',
                aspectScale: 0.95,
                showLegendSymbol: false,
                label: topCountyLabel,
                emphasis: {
                    disabled: false,
                    label: topCountyLabel,
                    itemStyle: {
                        areaColor: '#f97316',
                        borderColor: mapBorderColor,
                        borderWidth: 1
                    }
                },
                select: { disabled: true },
                itemStyle: {
                    areaColor: this.nullMapColor,
                    borderColor: mapBorderColor,
                    borderWidth: 1
                }
            }]
        };
    }

    buildTopCountyLabel(seriesData, textColor = null) {
        const topCountyValueMap = new Map(this.getTopCountyEntries(seriesData).map(item => [item.name, item.value]));

        return {
            show: true,
            formatter: params => topCountyValueMap.has(params.name) ? `${params.name} ${topCountyValueMap.get(params.name)}` : '',
            color: textColor || this.getPrimaryTextColor(),
            fontSize: 11,
            fontWeight: 600,
            textBorderColor: 'rgba(255, 255, 255, 0.72)',
            textBorderWidth: 2
        };
    }

    getTopCountyNames(seriesData) {
        return this.getTopCountyEntries(seriesData).map(item => item.name);
    }

    getTopCountyEntries(seriesData) {
        return seriesData
            .filter(item => typeof item.value === 'number' && item.value > 0)
            .slice()
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }

    buildVisualMap(seriesData, textColor = null, isPreview = false) {
        const positiveValues = seriesData
            .map(item => item.value)
            .filter(value => typeof value === 'number' && value > 0);
        const maxValue = Math.max(1, ...positiveValues);

        return {
            type: 'continuous',
            min: 1,
            max: maxValue,
            calculable: false,
            orient: 'vertical',
            right: isPreview ? 24 : 8,
            top: 'middle',
            itemWidth: 10,
            itemHeight: isPreview ? 132 : 96,
            text: ['高', '低'],
            textStyle: {
                color: textColor || this.getMutedTextColor(),
                fontSize: 12
            },
            inRange: {
                color: ['#ede9fe', '#c4b5fd', '#8b5cf6', '#5b21b6']
            },
            outOfRange: {
                color: this.nullMapColor
            }
        };
    }

    renderFilterTabs() {
        const container = document.getElementById('map-filter-tabs-container');
        if (!container) return;

        const options = this.getFilterOptions();
        container.innerHTML = `
            <div class="map-tab-filter" role="group" aria-label="機會種類">
                <span class="map-tab-label">機會種類</span>
                <div class="map-tab-list">
                    ${options.map(option => `
                        <button type="button"
                                class="map-filter-tab${option.value === this.currentOpportunityType ? ' is-active' : ''}"
                                data-map-filter-value="${this.escapeAttribute(option.value)}"
                                aria-pressed="${option.value === this.currentOpportunityType ? 'true' : 'false'}">
                            ${this.escapeHtml(option.label)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTopSummary(seriesData = this.latestSeriesData) {
        const mapContainer = document.querySelector('#map-widget .map-container');
        if (!mapContainer) return;

        let summary = document.getElementById('map-top-summary');
        if (!summary) {
            summary = document.createElement('div');
            summary.id = 'map-top-summary';
            summary.className = 'map-top-summary';
            mapContainer.appendChild(summary);
        }

        const topEntries = this.getTopCountyEntries(seriesData);
        if (!topEntries.length) {
            summary.innerHTML = `
                <div class="map-top-summary-title">TOP 5</div>
                <div class="map-top-summary-row">
                    <span class="map-top-summary-empty">暫無機會資料</span>
                </div>
            `;
            return;
        }

        const renderItem = (item, index) => `
            <span class="map-top-summary-item">
                <span class="map-top-summary-rank">Top${index + 1}</span>
                <span class="map-top-summary-name">${this.escapeHtml(item.name)}</span>
                <span class="map-top-summary-count">${Number(item.value).toLocaleString()}</span>
            </span>
        `;
        const firstRow = topEntries.slice(0, 3);
        const secondRow = topEntries.slice(3, 5);

        summary.innerHTML = `
            <div class="map-top-summary-title">TOP 5</div>
            <div class="map-top-summary-row map-top-summary-row-primary">
                ${firstRow.map(renderItem).join('')}
            </div>
            ${secondRow.length ? `
                <div class="map-top-summary-row map-top-summary-row-secondary">
                    ${secondRow.map((item, offset) => renderItem(item, offset + 3)).join('')}
                </div>
            ` : ''}
        `;
    }

    getFilterOptions() {
        const configuredTypes = window.CRM_APP?.systemConfig?.['機會種類'];
        const sourceTypes = Array.isArray(configuredTypes) && configuredTypes.length
            ? configuredTypes
            : [
                { value: 'DT（數位雙生）', note: 'DT（數位雙生）' },
                { value: 'IoT（物聯網）', note: 'IoT（物聯網）' },
                { value: 'DT/IoT', note: 'DT/IoT' },
                { value: 'DX', note: 'DX' }
            ];

        const sortedTypes = sourceTypes.slice().sort((a, b) => this.getDisplayOrder(a) - this.getDisplayOrder(b));
        return [{ value: '', label: '全部' }].concat(sortedTypes.map(item => ({
            value: item.value || '',
            label: this.getCompactFilterLabel(item)
        })));
    }

    getCompactFilterLabel(item) {
        const originalLabel = item.note || item.label || item.value || '';
        const searchable = `${item.value || ''} ${originalLabel}`;
        if (!searchable.trim()) return '全部';
        if (/DT\s*\/\s*IoT/i.test(searchable)) return 'DT/IoT';
        if (/IoT|IOT|物聯網|物联网/.test(searchable)) return 'IoT';
        if (/數位雙生|数位双生|DT/i.test(searchable)) return 'DT';
        if (/DX/i.test(searchable)) return 'DX';
        return originalLabel;
    }

    getDisplayOrder(option) {
        const order = option?.displayOrder ?? option?.display_order;
        const parsed = Number(order);
        return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
    }

    bindControls() {
        if (this.controlsBound) return;
        this.controlsBound = true;

        const tabsContainer = document.getElementById('map-filter-tabs-container');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', event => {
                const tab = event.target.closest('.map-filter-tab');
                if (!tab) return;
                this.update(tab.dataset.mapFilterValue || '');
            });
        }

        const openButton = document.getElementById('map-preview-open');
        if (openButton) {
            openButton.title = '放大全台機會分布';
            openButton.setAttribute('aria-label', '放大全台機會分布');
            openButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M21 3l-7 7"></path><path d="M9 21H3v-6"></path><path d="M3 21l7-7"></path></svg>';
            openButton.addEventListener('click', () => this.openPreviewModal());
        }

        const modal = document.getElementById('map-preview-modal');
        if (modal) {
            modal.addEventListener('click', event => {
                if (event.target.closest('[data-map-preview-close]')) {
                    this.closePreviewModal();
                }
            });
        }

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isPreviewOpen()) {
                this.closePreviewModal();
            }
        });
    }

    async openPreviewModal() {
        const modal = document.getElementById('map-preview-modal');
        if (!modal) return;

        modal.hidden = false;
        document.body.classList.add('map-preview-open');

        if (!this.latestSeriesData.length) {
            await this.fetchMapData(this.currentOpportunityType);
        }

        this.renderPreviewChart();
    }

    renderPreviewChart() {
        const canvas = document.getElementById('map-preview-canvas');
        if (!canvas || !this.latestSeriesData.length || typeof createEChartsThemedChart !== 'function') return;

        this.disposePreviewChart();
        this.previewChart = createEChartsThemedChart('map-preview-canvas', this.buildMapOption(this.latestSeriesData, { preview: true }));
    }

    closePreviewModal() {
        const modal = document.getElementById('map-preview-modal');
        if (!modal) return;

        this.disposePreviewChart();
        modal.hidden = true;
        document.body.classList.remove('map-preview-open');
    }

    disposePreviewChart() {
        const canvas = document.getElementById('map-preview-canvas');
        if (canvas && canvas._echartsResizeHandler) {
            window.removeEventListener('resize', canvas._echartsResizeHandler);
            canvas._echartsResizeHandler = null;
        }

        if (this.previewChart && !this.previewChart.isDisposed?.()) {
            this.previewChart.dispose();
        } else if (window.echarts && canvas) {
            const existingChart = window.echarts.getInstanceByDom(canvas);
            if (existingChart) existingChart.dispose();
        }

        if (canvas) canvas.innerHTML = '';
        this.previewChart = null;
    }

    isPreviewOpen() {
        const modal = document.getElementById('map-preview-modal');
        return Boolean(modal && !modal.hidden);
    }

    ensureStyles() {
        const styleId = 'map-manager-refinement-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #map-widget .widget-header { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); flex-wrap: wrap; }
            #map-widget .widget-title { white-space: nowrap; flex-shrink: 0; }
            #map-widget .map-filter { display: flex; align-items: center; justify-content: flex-end; gap: 4px; min-width: 0; flex: 1 1 auto; }
            .map-tab-filter { display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; min-width: 0; flex: 0 1 auto; }
            .map-tab-label { color: var(--text-muted); font-size: 11px; line-height: 1.2; white-space: nowrap; }
            .map-tab-list { display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px; flex-wrap: wrap; max-height: 48px; overflow: hidden; }
            .map-filter-tab {
                min-height: 22px;
                padding: 2px 6px;
                border: 1px solid var(--border-color);
                border-radius: 2px;
                background: var(--primary-bg);
                color: var(--text-secondary);
                font-size: 11px;
                line-height: 1.2;
                cursor: pointer;
                white-space: nowrap;
            }
            .map-filter-tab:hover { background: var(--secondary-bg); color: var(--text-primary); }
            .map-filter-tab.is-active {
                background: color-mix(in srgb, #8b5cf6 12%, transparent);
                border-color: color-mix(in srgb, #8b5cf6 45%, var(--border-color));
                color: #7c3aed;
                font-weight: 600;
            }
            .map-preview-open-btn,
            .map-preview-close {
                border: 1px solid var(--border-color);
                border-radius: 3px;
                background: var(--primary-bg);
                color: var(--text-secondary);
                cursor: pointer;
            }
            .map-preview-open-btn {
                width: 24px;
                height: 24px;
                min-height: 24px;
                padding: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
            }
            .map-preview-open-btn svg { width: 13px; height: 13px; }
            .map-preview-open-btn:hover,
            .map-preview-close:hover { background: var(--secondary-bg); color: var(--text-primary); }
            .map-top-summary {
                position: absolute;
                left: 50%;
                bottom: 16px;
                transform: translateX(-50%);
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                width: calc(100% - 24px);
                max-width: 260px;
                min-height: 54px;
                padding: 5px 7px;
                border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
                border-radius: 4px;
                background: color-mix(in srgb, var(--card-bg) 86%, transparent);
                color: var(--text-secondary);
                font-size: 10.5px;
                line-height: 1.25;
                pointer-events: none;
                overflow: hidden;
            }
            .map-top-summary-title {
                color: var(--text-muted);
                font-weight: 700;
                letter-spacing: 0;
                white-space: nowrap;
            }
            .map-top-summary-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
            }
            .map-top-summary-item {
                display: inline-flex;
                align-items: baseline;
                gap: 3px;
                min-width: 0;
                white-space: nowrap;
            }
            .map-top-summary-rank { color: var(--text-muted); font-weight: 600; }
            .map-top-summary-name { color: var(--text-secondary); }
            .map-top-summary-count { color: var(--text-primary); font-weight: 600; }
            .map-top-summary-empty { color: var(--text-muted); white-space: nowrap; }
            .map-preview-modal[hidden] { display: none; }
            .map-preview-modal {
                position: fixed;
                inset: 0;
                z-index: 1200;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 28px;
            }
            .map-preview-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(15, 23, 42, 0.62);
            }
            .map-preview-panel {
                position: relative;
                width: min(820px, 92vw);
                height: min(720px, 84vh);
                display: flex;
                flex-direction: column;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--card-bg);
                box-shadow: 0 18px 48px rgba(15, 23, 42, 0.32);
                overflow: hidden;
            }
            .map-preview-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--spacing-3);
                padding: 12px 14px;
                border-bottom: 1px solid var(--border-color);
            }
            .map-preview-title {
                margin: 0;
                color: var(--text-primary);
                font-size: 16px;
                font-weight: 600;
            }
            .map-preview-close {
                width: 28px;
                height: 28px;
                font-size: 20px;
                line-height: 1;
            }
            .map-preview-canvas {
                flex: 1;
                min-height: 0;
            }
            body.map-preview-open { overflow: hidden; }
        `;
        document.head.appendChild(style);
    }

    getMutedTextColor() {
        const rootStyle = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
    }

    getPrimaryTextColor() {
        const rootStyle = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a');
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value);
    }
}

window.mapManager = new MapManager();
