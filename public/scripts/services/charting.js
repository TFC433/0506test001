// public/scripts/services/charting.js
/**
 * @version 1.0.1
 * @date 2026-05-07
 * @changelog
 * - [Phase A] Tightened shared Highcharts text, grid, legend, and tooltip contrast for operational dashboard readability.
 */
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
    const textColorMuted = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#64748b');
    const borderColor = rootStyle.getPropertyValue('--border-color').trim() || (isDark ? '#334155' : '#cbd5e1');
    const surfaceColor = rootStyle.getPropertyValue('--secondary-bg').trim() || (isDark ? '#1e293b' : '#ffffff');
    const gridLineColor = isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.22)';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)';
    const chartColors = ['#60a5fa', '#4ade80', '#fb923c', '#a78bfa', '#f87171', '#14b8a6', '#ec4899', '#6366f1']; // 主題顏色

    // 統一的標籤樣式 (非粗體、無外框、使用次要文字顏色)
    const commonLabelStyle = {
        color: textColorMuted,
        fontWeight: '500', // 確保圖表輔助文字維持可讀
        textOutline: 'none'   // 確保沒有外框
    };

    return {
        colors: chartColors, // 使用定義好的顏色
        chart: {
            backgroundColor: 'transparent',
            plotBorderColor: borderColor,
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
                color: textColorPrimary,
                fontWeight: '500' // 圖例可以稍微加粗
            },
            itemHoverStyle: { color: textColorPrimary }
        },
        tooltip: {
            backgroundColor: tooltipBg,
            style: { color: textColorPrimary },
            borderColor: borderColor,
            borderWidth: 1,
            shadow: false
        },
        plotOptions: {
            series: { // 所有系列的基礎設定
                marker: {
                    radius: 2
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
            secondary: textColorSecondary,
            muted: textColorMuted,
            border: borderColor,
            surface: surfaceColor,
            grid: gridLineColor
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
