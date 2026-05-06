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