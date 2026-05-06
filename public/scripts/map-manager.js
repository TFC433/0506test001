// views/scripts/map-manager.js

class MapManager {
    constructor() {
        this.chart = null;
        this.isInitialized = false;
        // 零值縣市使用透明藍色
        this.nullMapColor = 'rgba(59, 130, 246, 0.3)';
    }

    async initialize(opportunityType = '') {
        const mapContainer = document.getElementById('taiwan-map-container');
        if (!mapContainer) return;

        const render = async () => {
            // 確保 Highcharts 函式庫和地圖資料已載入
            if (typeof Highcharts !== 'undefined' && Highcharts.maps && Highcharts.maps['countries/tw/tw-all']) {
                await this.fetchAndRender(opportunityType);
            } else {
                mapContainer.innerHTML = `<div class="alert alert-error">地圖資料庫載入失敗。</div>`;
            }
        };
        // 確保 Highcharts 函式庫已載入
        if (typeof Highcharts === 'undefined') {
            setTimeout(render, 500);
        } else {
            await render();
        }
    }

    async update(opportunityType = '') {
        // 更新地圖，如果尚未初始化則先初始化
        if (!this.isInitialized) {
            await this.initialize(opportunityType);
        } else {
            await this.fetchAndUpdateSeries(opportunityType);
        }
    }

    async fetchAndRender(opportunityType = '') {
        const mapContainer = document.getElementById('taiwan-map-container');
        try {
            // 獲取地圖數據
            const seriesData = await this.fetchMapData(opportunityType);
            // 計算數據中的最大值 (最小值設為 1，以確保有範圍)
            const maxValue = Math.max(1, ...seriesData.map(d => d.value).filter(v => typeof v === 'number' && v !== null)); // 確保 maxValue 至少為 1
            // 清空容器，準備渲染
            mapContainer.innerHTML = '';

            // 獲取當前主題的 Highcharts 選項 (包含文字顏色等)
            const themeOptions = getHighchartsThemeOptions();
            // 獲取台灣地圖的原始數據
            const originalMapData = Highcharts.maps['countries/tw/tw-all'];
            // 複製一份地圖數據，並過濾掉離島，只保留本島
            const mainIslandMap = JSON.parse(JSON.stringify(originalMapData));
            mainIslandMap.features = mainIslandMap.features.filter(feature => !['Penghu', 'Kinmen', 'Lienchiang'].includes(feature.properties.name));

            // 使用 Highcharts.mapChart 建立地圖
            this.chart = Highcharts.mapChart(mapContainer, {
                ...themeOptions, // 應用基礎主題樣式 (包含文字顏色)
                chart: {
                    ...themeOptions.chart,
                    map: mainIslandMap, // 使用處理過的台灣本島地圖
                    margin: [0, 0, 0, 0] // 設定邊界為0，讓地圖填滿容器
                },
                title: { text: '' }, // 不顯示標題
                mapNavigation: { enabled: false }, // 禁用縮放和平移

                // --- 修改 colorAxis 以使用更像熱成像的色階 ---
                colorAxis: {
                    min: 1, // 維持最小值為 1 (零值由 nullColor 處理)
                    max: maxValue, // <--- 使用動態計算的最大值
                    // 使用 stops 定義熱成像色階 (深藍 -> 藍 -> 綠 -> 黃 -> 橘 -> 紅)
                    stops: [
                        [0, '#00008B'],    // 0% (對應 min=1): 深藍 (冷)
                        [0.2, '#00FFFF'],  // 20%: 青色
                        [0.4, '#00FF00'],  // 40%: 綠色
                        [0.6, '#FFFF00'],  // 60%: 黃色
                        [0.8, '#FFA500'],  // 80%: 橘色
                        [1, '#FF0000']     // 100% (對應 max): 紅色 (熱)
                    ],
                    // 指定色階軸上的標籤樣式，使其也能跟隨主題
                    labels: {
                        style: {
                            color: themeOptions.textColors ? themeOptions.textColors.secondary : '#666' // 使用主題次要文字顏色
                        }
                    }
                },
                // --- 修改結束 ---

                legend: {
                    ...themeOptions.legend, // 沿用主題的圖例樣式 (包含 itemStyle 來控制標籤文字顏色)
                    layout: 'vertical',    // 垂直排列
                    align: 'right',        // 靠右對齊
                    verticalAlign: 'middle', // 垂直置中
                    y: 70,                 // 垂直位置微調
                    floating: true,        // 浮動，不受圖表內容影響位置
                    padding: 4,            // 內邊距
                    symbolHeight: 100,     // 色階條高度
                    title: {
                        style: { // 確保圖例標題也使用主題顏色
                             color: themeOptions.textColors ? themeOptions.textColors.primary : '#333',
                             fontWeight: 'bold'
                         },
                        text: '機會數'      // 設定圖例標題文字
                    }
                },
                series: [{
                    data: seriesData,          // 地圖數據 (包含 null 值)
                    nullColor: this.nullMapColor, // 指定零值 (null) 縣市的顏色 (透明藍)
                    name: '機會案件數量',    // 系列名稱 (用於提示框)
                    states: {
                        hover: {
                            brightness: -0.2 // 滑鼠移上去時，顏色加深 20%
                        }
                    },
                    borderColor: themeOptions.chart?.backgroundColor === 'transparent' ? (themeOptions.plotOptions?.series?.borderColor || '#ffffff') : '#ffffff', // 根據背景調整邊界顏色
                    borderWidth: 1,            // 縣市邊界寬度
                    dataLabels: { enabled: false } // 不顯示數據標籤
                }],
                tooltip: {
                    ...themeOptions.tooltip, // 沿用主題的提示框樣式 (包含文字顏色)
                    // 自訂提示框內容格式
                    formatter: function() {
                        // this.point.chineseName 是在 fetchMapData 中加入的屬性
                        // 檢查 value 是否為 null，若是則顯示 0
                        const valueDisplay = this.point.value === null ? 0 : this.point.value;
                        return `<b>${this.point.chineseName}</b><br/>機會案件：<b>${valueDisplay}</b> 件`;
                    }
                }
            });
            this.isInitialized = true; // 標記地圖已初始化
        } catch (error) {
            // 如果載入或渲染失敗，顯示錯誤訊息
            mapContainer.innerHTML = `<div class="alert alert-error"><strong>地圖載入失敗</strong><br/>${error.message}</div>`;
        }
    }

    async fetchAndUpdateSeries(opportunityType = '') {
        // 僅更新地圖數據，不重新渲染整個圖表
        try {
            const seriesData = await this.fetchMapData(opportunityType);
            if (this.chart) {
                // 更新色階的最大值
                const maxValue = Math.max(1, ...seriesData.map(d => d.value).filter(v => typeof v === 'number' && v !== null)); // 確保 max 至少為 1
                this.chart.colorAxis[0].update({ max: maxValue }); // <--- 動態更新最大值
                // 更新地圖系列數據
                this.chart.series[0].setData(seriesData, true); // true 表示重繪圖表
            }
        } catch (error) {
            // 如果更新失敗，顯示通知
            showNotification('地圖資料更新失敗', 'error');
        }
    }

    async fetchMapData(opportunityType = '') {
        // 從後端 API 獲取各縣市的機會數量
        const apiUrl = opportunityType
            ? `/api/opportunities/by-county?opportunityType=${encodeURIComponent(opportunityType)}`
            : '/api/opportunities/by-county';
        const countyData = await authedFetch(apiUrl);

        // 將 API 回傳的數據轉換成 Map，方便查找
        const countyCountMap = new Map();
        countyData.forEach(item => {
            if(item.county) {
                // 將 "台" 統一轉換成 "臺"，並移除前後空白
                countyCountMap.set(item.county.trim().replace(/台/g, '臺'), item.count);
            }
        });

        // 獲取 Highcharts 內建的台灣地圖資料
        const mapSource = Highcharts.maps['countries/tw/tw-all'];
        // 過濾掉離島，只保留本島的 feature
        const mainIslandFeatures = mapSource.features.filter(feature => !['Penghu', 'Kinmen', 'Lienchiang'].includes(feature.properties.name));

        // 建立英文縣市名到中文縣市名的映射
        const countyNameMap = {
            'Taipei City': '臺北市', 'New Taipei City': '新北市', 'Taoyuan': '桃園市',
            'Taichung City': '臺中市', 'Tainan City': '臺南市', 'Kaohsiung City': '高雄市',
            'Keelung City': '基隆市', 'Hsinchu City': '新竹市', 'Chiayi City': '嘉義市',
            'Hsinchu': '新竹縣', 'Miaoli': '苗栗縣', 'Changhua': '彰化縣',
            'Nantou': '南投縣', 'Yunlin': '雲林縣', 'Chiayi': '嘉義縣',
            'Pingtung': '屏東縣', 'Yilan': '宜蘭縣', 'Hualien': '花蓮縣',
            'Taitung': '臺東縣'
        };

        // 將後端數據和地圖 feature 結合，產生 Highcharts 需要的格式
        return mainIslandFeatures.map(feature => {
            const englishName = feature.properties.name;
            const chineseName = countyNameMap[englishName] || englishName; // 獲取中文名
            const count = countyCountMap.get(chineseName) || 0; // 對應的機會數量，找不到則為 0
            return {
                'hc-key': feature.properties['hc-key'], // Highcharts 地圖的 key
                value: count > 0 ? count : null, // 如果數量為 0，則設為 null
                chineseName: chineseName // 將中文名也加入數據點，方便 tooltip 使用
            };
        });
    }
}

// 建立全域實例，讓 dashboard.js 可以呼叫
window.mapManager = new MapManager();