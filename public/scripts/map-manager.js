// views/scripts/map-manager.js

class MapManager {
    constructor() {
        this.chart = null;
        this.isInitialized = false;
        this.normalizedGeoJson = null;
        this.mapName = 'taiwan';
        this.geoJsonUrl = '/assets/maps/taiwan.json';
        this.excludedCounties = new Set(['澎湖縣', '金門縣', '連江縣']);
        this.nullMapColor = 'rgba(59, 130, 246, 0.18)';
    }

    async initialize(opportunityType = '') {
        const mapContainer = document.getElementById('taiwan-map-container');
        if (!mapContainer) return;

        if (!this.canRenderEChartsMap(mapContainer)) return;

        await this.fetchAndRender(opportunityType);
    }

    async update(opportunityType = '') {
        if (!this.isInitialized) {
            await this.initialize(opportunityType);
        } else {
            await this.fetchAndUpdateSeries(opportunityType);
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
                visualMap: this.buildVisualMap(seriesData),
                series: [{ data: seriesData }]
            });
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

        return this.normalizedGeoJson.features.map(feature => {
            const name = this.normalizeCountyName(feature.properties && feature.properties.name);
            const count = countyCountMap.get(name) || 0;

            return {
                name,
                value: count > 0 ? count : null
            };
        });
    }

    normalizeCountyName(name) {
        return String(name || '').trim().replace(/台/g, '臺');
    }

    buildMapOption(seriesData) {
        const rootStyle = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColorPrimary = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a');
        const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
        const borderColor = rootStyle.getPropertyValue('--border-color').trim() || (isDark ? '#334155' : '#cbd5e1');
        const cardBg = rootStyle.getPropertyValue('--card-bg').trim() || (isDark ? '#1e293b' : '#ffffff');
        const mapBorderColor = isDark ? 'rgba(226, 232, 240, 0.58)' : 'rgba(255, 255, 255, 0.92)';

        return {
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
            visualMap: this.buildVisualMap(seriesData, textColorMuted),
            series: [{
                name: '機會案件',
                type: 'map',
                map: this.mapName,
                roam: false,
                data: seriesData,
                label: { show: false },
                emphasis: {
                    disabled: false,
                    label: { show: false },
                    itemStyle: {
                        areaColor: '#f59e0b',
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

    buildVisualMap(seriesData, textColor = null) {
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
            right: 8,
            top: 'middle',
            itemWidth: 10,
            itemHeight: 96,
            text: ['高', '低'],
            textStyle: {
                color: textColor || this.getMutedTextColor(),
                fontSize: 11
            },
            inRange: {
                color: ['#00008B', '#00FFFF', '#00FF00', '#FFFF00', '#FFA500', '#FF0000']
            },
            outOfRange: {
                color: this.nullMapColor
            }
        };
    }

    getMutedTextColor() {
        const rootStyle = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
    }
}

window.mapManager = new MapManager();
