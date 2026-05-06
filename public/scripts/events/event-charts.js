// views/scripts/event-charts.js
// 職責：專門負責渲染「事件紀錄」頁面的儀表板圖表
// (已修改為使用 createThemedChart)

/**
 * 渲染儀表板區塊的主函式
 * @param {HTMLElement} container - 要渲染圖表的容器元素
 * @param {object} chartData - 從 API 獲取的圖表數據
 */
function renderEventsDashboardCharts(container, chartData) {
    if (!container) return;

    // 檢查 chartData 是否存在且有效
    if (!chartData) {
        console.warn('[Event Charts] 圖表渲染被跳過，因為 chartData 為空。');
        container.innerHTML = `<div class="alert alert-warning" style="grid-column: span 12; text-align: center;">無圖表資料可顯示</div>`;
        return;
    }

    container.className = 'dashboard-grid-flexible';
    container.innerHTML = `
        <div class="dashboard-widget grid-col-4">
            <div class="widget-header"><h2 class="widget-title">事件趨勢 (近30天)</h2></div>
            <div id="event-trend-chart" class="widget-content" style="height: 300px;"></div>
        </div>
        <div class="dashboard-widget grid-col-4">
            <div class="widget-header"><h2 class="widget-title">事件類型分佈</h2></div>
            <div id="event-type-chart" class="widget-content" style="height: 300px;"></div>
        </div>
        <div class="dashboard-widget grid-col-4">
            <div class="widget-header"><h2 class="widget-title">客戶規模分佈</h2></div>
            <div id="event-size-chart" class="widget-content" style="height: 300px;"></div>
        </div>
    `;

    // 使用 setTimeout 確保 DOM 元素已渲染完成且 Highcharts 函式庫已載入
    setTimeout(() => {
        if (typeof Highcharts !== 'undefined' && typeof createThemedChart === 'function') {
            renderEventsTrendChart(chartData.trend);
            renderEventsTypeChart(chartData.eventType);
            renderEventsSizeChart(chartData.size);
        } else if (typeof Highcharts === 'undefined') {
             console.error('[Event Charts] Highcharts 函式庫未載入。');
             // 可以在此處為每個圖表容器顯示錯誤訊息
             ['event-trend-chart', 'event-type-chart', 'event-size-chart'].forEach(id => {
                 const chartContainer = document.getElementById(id);
                 if (chartContainer) chartContainer.innerHTML = '<div class="alert alert-error" style="text-align: center; padding: 10px;">圖表函式庫載入失敗</div>';
             });
        } else if (typeof createThemedChart !== 'function') {
             console.error('[Event Charts] createThemedChart 函式未定義。');
              ['event-trend-chart', 'event-type-chart', 'event-size-chart'].forEach(id => {
                 const chartContainer = document.getElementById(id);
                 if (chartContainer) chartContainer.innerHTML = '<div class="alert alert-error" style="text-align: center; padding: 10px;">圖表渲染功能異常</div>';
             });
        }
    }, 0);
}

/**
 * 渲染事件趨勢圖 (折線圖) - 已修改
 * @param {Array} data - 圖表數據
 */
function renderEventsTrendChart(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('[Event Charts] 事件趨勢圖渲染失敗：無效的 data。', data);
        const container = document.getElementById('event-trend-chart');
        if (container) container.innerHTML = '<div class="alert alert-warning" style="text-align: center; padding: 10px;">無趨勢資料</div>';
        return;
    }

    const specificOptions = {
        chart: { type: 'line' },
        title: { text: '' },
        xAxis: {
            categories: data.map(d => d[0] ? d[0].substring(5) : '') // 增加保護
        },
        yAxis: {
            title: { text: '數量' },
            allowDecimals: false
        },
        legend: { enabled: false },
        series: [{
            name: '事件數',
            data: data.map(d => d[1] || 0) // 增加保護
            // 顏色會自動從主題繼承
        }]
    };
    createThemedChart('event-trend-chart', specificOptions);
}

/**
 * 渲染事件類型分佈圖 (圓餅圖) - 已修改
 * @param {Array} data - 圖表數據
 */
function renderEventsTypeChart(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('[Event Charts] 事件類型圖渲染失敗：無效的 data。', data);
        const container = document.getElementById('event-type-chart');
        if (container) container.innerHTML = '<div class="alert alert-warning" style="text-align: center; padding: 10px;">無類型資料</div>';
        return;
    }

    // 從系統設定中讀取事件類型的中文名稱和顏色
    const eventTypeConfig = new Map((window.CRM_APP?.systemConfig?.['事件類型'] || []).map(t => [t.value, { note: t.note, color: t.color }]));

    const chartData = data.map(d => {
        // 使用 name (value) 來查找設定
        const config = eventTypeConfig.get(d.name) || { note: (d.name || '未知').toUpperCase(), color: undefined };
        return {
            name: config.note, // 使用中文名稱 (note)
            y: d.y || 0,       // 確保 y 值存在
            color: config.color // 使用設定的顏色 (如果未設定，Highcharts 會自動選擇)
        };
    });

    const specificOptions = {
        chart: { type: 'pie' },
        title: { text: '' },
        tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y} 件)' },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    distance: 20,
                    // style 和 connectorColor 會從主題繼承
                },
                showInLegend: false
            }
        },
        // 注意：因為這裡指定了 color，所以不會使用 themeOptions.colors 的預設系列
        series: [{ name: '佔比', data: chartData }]
    };
    createThemedChart('event-type-chart', specificOptions);
}


/**
 * 渲染客戶規模分佈圖 (長條圖) - 已修改
 * @param {Array} data - 圖表數據
 */
function renderEventsSizeChart(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('[Event Charts] 客戶規模圖渲染失敗：無效的 data。', data);
        const container = document.getElementById('event-size-chart');
        if (container) container.innerHTML = '<div class="alert alert-warning" style="text-align: center; padding: 10px;">無規模資料</div>';
        return;
    }

     const specificOptions = {
        chart: { type: 'bar' },
        title: { text: '' },
        xAxis: {
            categories: data.map(d => d[0] || '未分類'), // 增加保護
             title: { text: null } // 確保不顯示 X 軸標題
        },
        yAxis: {
            min: 0,
            title: { text: '事件數量', align: 'high' }, // 確保 Y 軸標題文字正確
            allowDecimals: false
        },
        legend: { enabled: false },
        series: [{
            name: '數量',
            data: data.map(d => d[1] || 0) // 增加保護
            // 顏色會自動從主題繼承 (通常是第二個顏色)
        }]
    };
    createThemedChart('event-size-chart', specificOptions);
}