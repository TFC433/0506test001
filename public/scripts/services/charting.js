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

function getEChartsThemeOptions() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const rootStyle = getComputedStyle(document.documentElement);
    const textColorPrimary = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#f1f5f9' : '#1e293b');
    const textColorSecondary = rootStyle.getPropertyValue('--text-secondary').trim() || (isDark ? '#cbd5e1' : '#475569');
    const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
    const borderColor = rootStyle.getPropertyValue('--border-color').trim() || (isDark ? '#334155' : '#cbd5e1');
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)';

    return {
        color: ['#60a5fa', '#4ade80', '#fb923c', '#a78bfa', '#f87171', '#14b8a6', '#ec4899', '#6366f1'],
        backgroundColor: 'transparent',
        textStyle: {
            color: textColorPrimary,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: tooltipBg,
            borderColor,
            borderWidth: 1,
            textStyle: { color: textColorPrimary },
            extraCssText: 'box-shadow:none;border-radius:6px;'
        },
        legend: {
            bottom: 0,
            left: 'center',
            type: 'scroll',
            itemWidth: 10,
            itemHeight: 10,
            textStyle: {
                color: textColorPrimary,
                fontSize: 10,
                fontWeight: 500
            },
            pageTextStyle: { color: textColorSecondary },
            inactiveColor: textColorMuted
        },
        textColors: {
            primary: textColorPrimary,
            secondary: textColorSecondary,
            muted: textColorMuted,
            border: borderColor
        }
    };
}

function getEChartsSeriesDefaults(seriesType, themeOptions) {
    if (seriesType !== 'pie') return {};

    return {
        type: 'pie',
        radius: ['0%', '62%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: {
            show: true,
            color: themeOptions.textColors.muted,
            fontSize: 11,
            fontWeight: 500,
            formatter: '{b}: {d}%'
        },
        labelLine: {
            length: 8,
            length2: 6,
            lineStyle: { color: themeOptions.textColors.secondary }
        },
        emphasis: {
            scale: true,
            scaleSize: 4,
            label: {
                color: themeOptions.textColors.primary,
                fontWeight: 600
            }
        }
    };
}

function createEChartsThemedChart(elementId, option, extraOptions = {}) {
try {
    const registry = createEChartsThemedChart._registry || new Map();
    createEChartsThemedChart._registry = registry;
    const previous = registry.get(elementId);
    if (previous) {
        window.removeEventListener('resize', previous.resizeHandler);
        previous.chart.dispose();
        registry.delete(elementId);
    }

    const container = document.getElementById(elementId);
    if (!container) {
        console.error(`[createEChartsThemedChart] Container element #${elementId} not found.`);
        return null;
    }

    if (!window.echarts || typeof window.echarts.init !== 'function') {
        console.error('[createEChartsThemedChart] ECharts library not loaded or echarts.init is not a function.');
        container.innerHTML = `<div class="alert alert-error">圖表函式庫載入失敗</div>`;
        return null;
    }

    const existingChart = window.echarts.getInstanceByDom(container);
    if (existingChart) existingChart.dispose();

    if (container._echartsResizeHandler) {
        window.removeEventListener('resize', container._echartsResizeHandler);
        container._echartsResizeHandler = null;
    }

    const themeOptions = getEChartsThemeOptions();
    const mergedOptions = deepMerge(JSON.parse(JSON.stringify(themeOptions)), option || {});
    if (Array.isArray(mergedOptions.series)) {
        mergedOptions.series = mergedOptions.series.map(series => {
            const seriesDefaults = getEChartsSeriesDefaults(series && series.type, themeOptions);
            return deepMerge(JSON.parse(JSON.stringify(seriesDefaults)), series || {});
        });
    }

    container.innerHTML = '';

    const chart = window.echarts.init(container, null, extraOptions.initOptions || {});
    chart.setOption(mergedOptions, extraOptions.setOptionOptions || true);

    container._echartsResizeHandler = () => chart.resize();
    window.addEventListener('resize', container._echartsResizeHandler);
    registry.set(elementId, {
        chart,
        resizeHandler: container._echartsResizeHandler
    });

    return chart;
} catch (error) {
    console.error(`[createEChartsThemedChart] Error creating chart #${elementId}:`, error);
    const container = document.getElementById(elementId);
    if (container) {
        container.innerHTML = `<div class="alert alert-error">圖表建立失敗: ${error.message}</div>`;
    }
    return null;
}
}
