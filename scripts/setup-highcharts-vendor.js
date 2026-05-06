/**
 * 檔案名稱: scripts/setup-highcharts-vendor.js
 * 版本: v2.0.0
 * 日期: 2026-03-10
 * 說明: 跨平台 Highcharts 資源提取與驗證腳本。
 * 從本地 node_modules 提取所需的 Highcharts 與地圖檔案至 public/assets 目錄。
 * 完全避免在安裝或執行階段連線至外部 CDN (解決企業防火牆 403 阻擋問題)。
 */

const fs = require('fs');
const path = require('path');

console.log('=== Highcharts Local Vendor Setup (NPM Copy) ===');

const projectRoot = path.join(__dirname, '..');
const targetDir = path.join(projectRoot, 'public', 'assets', 'vendor', 'highcharts');

// 確保目標資料夾存在
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`[建立] 目錄已建立: ${targetDir}`);
}

// 定義來源 (node_modules) 與目的 (public/assets) 的檔案映射合約
const fileMap = [
    {
        source: path.join(projectRoot, 'node_modules', 'highcharts', 'highmaps.js'),
        target: path.join(targetDir, 'highmaps.js'),
        name: 'highmaps.js'
    },
    {
        source: path.join(projectRoot, 'node_modules', 'highcharts', 'modules', 'data.js'),
        target: path.join(targetDir, 'data.js'),
        name: 'data.js'
    },
    {
        source: path.join(projectRoot, 'node_modules', '@highcharts', 'map-collection', 'countries', 'tw', 'tw-all.js'),
        target: path.join(targetDir, 'tw-all.js'),
        name: 'tw-all.js'
    },
    {
        source: path.join(projectRoot, 'node_modules', 'highcharts', 'modules', 'exporting.js'),
        target: path.join(targetDir, 'exporting.js'),
        name: 'exporting.js'
    },
    {
        source: path.join(projectRoot, 'node_modules', 'highcharts', 'modules', 'export-data.js'),
        target: path.join(targetDir, 'export-data.js'),
        name: 'export-data.js'
    },
    {
        source: path.join(projectRoot, 'node_modules', 'highcharts', 'modules', 'accessibility.js'),
        target: path.join(targetDir, 'accessibility.js'),
        name: 'accessibility.js'
    }
];

let missingFiles = false;

// 1. 驗證來源檔案是否存在
console.log('\n--- 檢查 NPM 依賴 ---');
fileMap.forEach(mapping => {
    if (!fs.existsSync(mapping.source)) {
        console.error(`❌ 找不到來源檔案: ${mapping.source}`);
        missingFiles = true;
    } else {
        console.log(`✅ 找到檔案: ${mapping.name}`);
    }
});

// 若有缺失，中斷執行並提示安裝指令
if (missingFiles) {
    console.error('\n[錯誤] 缺少必要的 npm 套件檔案！');
    console.error('請確認您已在專案根目錄執行過以下安裝指令：');
    console.error('npm install highcharts @highcharts/map-collection --save');
    process.exit(1);
}

// 2. 複製檔案至公開目錄
console.log('\n--- 複製檔案至 Vendor 目錄 ---');
fileMap.forEach(mapping => {
    try {
        fs.copyFileSync(mapping.source, mapping.target);
        console.log(`➡️ 成功複製: ${mapping.name}`);
    } catch (err) {
        console.error(`❌ 複製失敗: ${mapping.name}`, err.message);
        process.exit(1);
    }
});

// 3. 最終驗證
console.log('\n--- 最終 Vendor 合約驗證 ---');
let verificationFailed = false;
fileMap.forEach(mapping => {
    if (!fs.existsSync(mapping.target)) {
        console.error(`❌ 驗證失敗，目標檔案遺失: ${mapping.target}`);
        verificationFailed = true;
    }
});

if (verificationFailed) {
    console.error('\n[錯誤] Vendor 目錄建立失敗。請檢查權限設定。');
    process.exit(1);
}

console.log('\n✅ === 設定完成 ===');
console.log('所有 Highcharts 依賴已成功本地化。Dashboard 圖表可正常脫機/內網載入。');