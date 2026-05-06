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
- Only files matching these patterns are included: public/styles/main.css, public/styles/modules/*.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/styles/main.css
public/styles/modules/base.css
public/styles/modules/components.css
public/styles/modules/features.css
public/styles/modules/layout.css
public/styles/modules/navigation.css
public/styles/modules/responsive.css
public/styles/modules/variables.css
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/styles/main.css">
/* ==================== main.css - 入口文件 ==================== */
/* 模組化CSS架構 - 統一載入所有樣式模組 */

/* 基礎設定模組 */
@import url('./modules/variables.css');   /* 主題與設計系統變數 */
@import url('./modules/base.css');        /* 基本重置與字體 */

/* 【新增】將 forms.css 和 modals.css 的內容納入模組系統 */
@import url('forms.css');
@import url('modals.css');

/* 佈局系統模組 */
@import url('./modules/layout.css');      /* 應用程式佈局 */
@import url('./modules/navigation.css');  /* 側邊欄 */

/* UI組件模組 */
@import url('./modules/components.css');  /* UI組件與通用元素 */
@import url('./modules/features.css');    /* 業務功能組件 */

/* 響應式模組 */
@import url('./modules/responsive.css');  /* 響應式與手機版導覽樣式 + 新增優化 */
</file>

<file path="public/styles/modules/base.css">
/* ==================== modules/base.css ==================== */
/* 基本重置與字體 - 第2個模組 */

/* 基本重置與字體 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    background: var(--primary-bg);
    min-height: 100vh;
    color: var(--text-primary);
    overflow-x: hidden;
    transition: background 0.3s ease, color 0.3s ease;
    font-size: var(--font-size-base);
}

/* 輔助工具 */
.loading { 
    display: none; 
    text-align: center; 
    padding: 60px; 
    color: var(--text-secondary); 
}

.loading.show { 
    display: block; 
}

.spinner { 
    border: 3px solid var(--border-color); 
    border-top: 3px solid var(--accent-blue); 
    border-radius: 50%; 
    width: 40px; 
    height: 40px; 
    animation: spin 1s linear infinite; 
    margin: 0 auto 16px; 
}

@keyframes spin { 
    0% { transform: rotate(0deg); } 
    100% { transform: rotate(360deg); } 
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.text-link { 
    color: inherit; 
    text-decoration: none; 
    font-weight: 600; 
    transition: color 0.2s ease; 
}

.text-link:hover { 
    color: var(--accent-blue); 
    text-decoration: underline; 
}

/* 使用者選單 */
.user-info {
    display: flex;
    align-items: center;
}



/* 響應式與手機版導覽樣式 */
.mobile-nav-toggle { 
    display: none; 
    background: none; 
    border: none; 
    cursor: pointer; 
    color: var(--text-primary); 
    padding: 0; 
}

.mobile-nav-backdrop { 
    display: none; 
    position: fixed; 
    top: 0; 
    left: 0; 
    width: 100%; 
    height: 100%; 
    background: rgba(0,0,0,0.5); 
    z-index: 999; 
}

.mobile-nav-backdrop.is-open { 
    display: block; 
}
</file>

<file path="public/styles/modules/components.css">
/* ==================== modules/components.css ==================== */
/* UI 組件與通用元素 - 第5個模組 */

/* 按鈕系統 */
.action-btn {
    display: flex; 
    align-items: center; 
    justify-content: center;
    gap: var(--spacing-2); 
    padding: var(--spacing-3) var(--spacing-5);
    border: none; 
    border-radius: var(--rounded-lg); 
    font-size: var(--font-size-sm);
    font-weight: 600; 
    cursor: pointer; 
    transition: all 0.2s ease; 
    text-decoration: none;
}

.action-btn.primary { 
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); 
    color: white; 
    box-shadow: var(--shadow-md); 
}

.action-btn.primary:hover { 
    transform: translateY(-2px); 
    box-shadow: var(--shadow-lg); 
}

.action-btn.secondary { 
    background: var(--card-bg); 
    color: var(--text-secondary); 
    border: 1px solid var(--border-color); 
}

.action-btn.secondary:hover { 
    background: var(--glass-bg); 
    color: var(--text-primary); 
}

.action-btn.danger { 
    background: var(--accent-red); 
    color: white; 
}

.action-btn.danger:hover { 
    background: #dc2626; 
    box-shadow: var(--shadow-md); 
}

.action-btn svg { 
    width: 16px; 
    height: 16px; 
    flex-shrink: 0; 
}

.action-btn.icon-btn {
    background: var(--card-bg);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    width: 44px;
    height: 44px;
    padding: 0;
}

.action-btn.icon-btn:hover {
    background: var(--glass-bg);
    color: var(--text-primary);
}

.action-btn.icon-btn svg {
    width: 20px;
    height: 20px;
}

.btn-text {
    transition: all 0.2s ease;
}

.action-buttons-container { 
    display: flex; 
    flex-wrap: wrap; 
    gap: var(--spacing-2); 
    align-items: center; 
}

.action-btn.small { 
    padding: var(--spacing-2) var(--spacing-3); 
    font-size: var(--font-size-xs); 
    margin: 0; 
    border: none; 
    color: white; 
    cursor: pointer; 
    border-radius: var(--rounded-md); 
    transition: all 0.2s ease; 
    display: inline-flex; 
    align-items: center; 
    text-align: center; 
    font-weight: 500; 
}

.action-btn.small:hover { 
    transform: translateY(-1px); 
    box-shadow: var(--shadow-sm); 
}

.action-btn.small { 
    background-color: var(--accent-blue); 
}

.action-btn.small.secondary { 
    background-color: var(--text-muted); 
}

.action-btn.small.warn { 
    background-color: var(--accent-orange); 
}

.action-btn.small.info { 
    background-color: var(--accent-blue); 
}

.action-btn.small.danger { 
    background-color: var(--accent-red); 
}

/* 統計卡片 */
.stats-grid {
    display: grid;
    /* 【修改】改為 3 欄佈局 (原本是 4) */
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-6);
    /* 【關鍵】確保佔滿父容器的 12 欄 */
    grid-column: span 12;
}

.stat-card {
    background: var(--secondary-bg); 
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-xl); 
    padding: var(--spacing-5);
    cursor: pointer; 
    transition: all 0.3s ease;
    position: relative; 
    overflow: hidden; 
    box-shadow: var(--shadow-md);
}

.stat-card:hover { 
    transform: translateY(-4px); 
    box-shadow: var(--shadow-lg); 
    background: var(--card-bg); 
}

/* 新增卡片顏色樣式 (紫、青、藍綠) */
.stat-card.purple .stat-icon { background: #8b5cf6; }
.stat-card.purple { border-left: 4px solid #8b5cf6; } /* 視覺強化 */

.stat-card.cyan .stat-icon { background: #06b6d4; }
.stat-card.cyan { border-left: 4px solid #06b6d4; }

.stat-card.teal .stat-icon { background: #14b8a6; }
.stat-card.teal { border-left: 4px solid #14b8a6; }


.stat-header { 
    display: flex; 
    align-items: center; 
    gap: var(--spacing-3); 
    margin-bottom: var(--spacing-4); 
}

.stat-icon { 
    width: 40px; 
    height: 40px; 
    border-radius: var(--rounded-lg); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
}

.stat-icon svg { 
    width: 20px; 
    height: 20px; 
    color: white; 
}

.stat-card.blue .stat-icon { 
    background: var(--accent-blue); 
}

.stat-card.green .stat-icon { 
    background: var(--accent-green); 
}

.stat-card.orange .stat-icon { 
    background: var(--accent-orange); 
}

.stat-card.red .stat-icon { 
    background: var(--accent-red); 
}

.stat-label { 
    font-size: var(--font-size-sm); 
    color: var(--text-secondary); 
    font-weight: 600; 
}

.stat-content { 
    display: flex; 
    justify-content: space-between; 
    align-items: baseline; 
}

.stat-number { 
    font-size: var(--font-size-3xl); 
    font-weight: 800; 
    color: var(--text-primary); 
    line-height: 1; 
}

.stat-trend { 
    font-size: var(--font-size-base); 
    font-weight: 600; 
    color: var(--accent-green); 
    white-space: nowrap; 
}

/* 資料表格 */
.data-table { 
    width: 100%; 
    border-collapse: collapse; 
    background: var(--secondary-bg); 
    border-radius: var(--rounded-lg); 
    overflow: hidden; 
    border: 1px solid var(--border-color); 
}

.data-table th { 
    background: var(--primary-bg); 
    padding: var(--spacing-4); 
    text-align: left; 
    font-weight: 600; 
    color: var(--text-secondary); 
    border-bottom: 1px solid var(--border-color); 
    font-size: var(--font-size-sm); 
    text-transform: uppercase; 
}

.data-table td { 
    padding: var(--spacing-4); 
    border-bottom: 1px solid var(--border-color); 
    vertical-align: middle; 
    font-size: var(--font-size-sm); 
    color: var(--text-primary); 
    font-weight: 500; 
}

.data-table tr:not(.locked):hover { 
    background: var(--glass-bg); 
}

/* Locked Row Styles */
.data-table tr.locked,
.data-table tr.disabled {
    background-color: var(--bg-locked);
    color: var(--text-locked);
    cursor: not-allowed;
}

.data-table tr.locked td,
.data-table tr.disabled td {
    color: var(--text-locked);
}

.data-table tr.locked button,
.data-table tr.disabled button,
.data-table tr.locked a,
.data-table tr.disabled a {
    pointer-events: none;
    opacity: 0.6;
}


/* 【新增】讓帶有品牌色的表格列顯示特殊樣式 */
.data-table tr[style*="--card-brand-color"] {
    background: color-mix(in srgb, var(--card-brand-color, transparent) 10%, var(--secondary-bg));
    border-left: 4px solid var(--card-brand-color, var(--border-color));
    transition: background 0.2s ease;
}

.data-table tr[style*="--card-brand-color"]:hover {
    background: color-mix(in srgb, var(--card-brand-color, transparent) 20%, var(--secondary-bg));
}

.data-table tr:last-child td { 
    border-bottom: none; 
}

/* ==================== 特殊按鈕樣式 (含動畫與亮色模式優化) ==================== */

/* 1. 定義動畫 */
@keyframes btn-shine {
    0% { left: -100%; opacity: 0; }
    20% { left: 100%; opacity: 0.5; }
    100% { left: 100%; opacity: 0; }
}

@keyframes btn-pulse-shadow {
    0% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
    50% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.6); }
    100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
}

@keyframes btn-pulse-shadow-light {
    0% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.4); }
    50% { box-shadow: 0 0 18px rgba(139, 92, 246, 0.75); }
    100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.4); }
}

/* 2. 按鈕基本樣式 */
.action-btn.btn-gradient-highlight {
    position: relative;
    overflow: hidden;
    border: 2px solid transparent !important;
    background-image: linear-gradient(var(--secondary-bg), var(--secondary-bg)),
                      linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    background-origin: border-box;
    background-clip: padding-box, border-box;
    color: var(--text-primary);
    font-weight: 700;
    animation: btn-pulse-shadow 3s infinite ease-in-out;
}

.action-btn.btn-gradient-highlight::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
    transform: skewX(-25deg);
    pointer-events: none;
    animation: btn-shine 4s infinite linear;
}

.action-btn.btn-gradient-highlight:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.6);
    background-image: linear-gradient(var(--glass-bg), var(--glass-bg)), 
                      linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    animation: none;
}

/* ==================== 亮色模式特別優化 ==================== */
[data-theme="light"] .action-btn.btn-gradient-highlight {
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5); 
    animation: btn-pulse-shadow-light 3s infinite ease-in-out;
}

[data-theme="light"] .action-btn.btn-gradient-highlight::after {
    background: linear-gradient(to right, transparent 0%, rgba(139, 92, 246, 0.25) 50%, transparent 100%);
}

@keyframes pulse-orange {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-orange) 50%, transparent); }
    70% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--accent-orange) 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-orange) 0%, transparent); }
}
</file>

<file path="public/styles/modules/features.css">
/* ==================== modules/features.css ==================== */
/* 業務功能組件 - 第6個模組 */

/* 資訊摘要卡片 */
.summary-card {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-6);
    background-color: var(--secondary-bg);
    padding: var(--spacing-6);
    border-radius: var(--rounded-xl);
    border: 1px solid var(--border-color);
    position: relative;
    box-shadow: var(--shadow-md);
}
.summary-item {
    display: flex;
    flex-direction: column;
}
.summary-label {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    margin-bottom: var(--spacing-2);
    font-weight: 500;
}
.summary-value {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--text-primary);
}
.summary-value a.text-link {
    color: var(--accent-blue);
    text-decoration: none;
}
 .summary-value a.text-link:hover {
    text-decoration: underline;
}

/* 地圖與看板 */
.map-container {
    position: relative;
    min-height: 400px;
    border-radius: var(--rounded-lg);
    overflow: hidden;
}

#taiwan-map-container {
    width: 100%;
    height: 400px;
}

.map-filter select {
    background: var(--primary-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-md);
    padding: var(--spacing-2) var(--spacing-4);
    cursor: pointer;
    font-size: var(--font-size-sm);
}

.kanban-board {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-5);
}

.kanban-column {
    background: var(--primary-bg);
    border-radius: var(--rounded-lg);
    padding: var(--spacing-4);
}

.kanban-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-4);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--border-color);
}

.kanban-title {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--text-primary);
}

.kanban-count {
    background: var(--glass-bg);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--rounded-full);
    min-width: 24px;
    text-align: center;
}

.kanban-card {
    background: color-mix(in srgb, var(--card-brand-color, transparent) 15%, var(--secondary-bg));
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-lg);
    padding: var(--spacing-4);
    margin-bottom: var(--spacing-3);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    box-shadow: var(--shadow-sm);
    border-left: 4px solid var(--card-brand-color, var(--border-color));
}

.kanban-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md), 0 0 15px 0 color-mix(in srgb, var(--card-brand-color, transparent) 20%, transparent);
}

.card-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-2);
    font-size: var(--font-size-sm);
    line-height: 1.3;
}

.card-company {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    margin-bottom: var(--spacing-3);
    font-weight: 500;
}

.card-tags {
    display: flex;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
    flex-wrap: wrap;
}

.card-tag {
    font-size: var(--font-size-xs);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--rounded-md);
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    font-weight: 500;
}

.card-tag.assignee {
    background: rgba(79, 141, 247, 0.1);
    color: var(--accent-blue);
}

.card-tag.type {
    background: rgba(34, 197, 94, 0.1);
    color: var(--accent-green);
}

.card-value {
    color: var(--accent-green);
    font-weight: 600;
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-2);
}

.expand-btn {
    background: var(--glass-bg);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--rounded-md);
    font-size: var(--font-size-xs);
    cursor: pointer;
    width: 100%;
    margin-top: var(--spacing-3);
    transition: all 0.2s ease;
}

.expand-btn:hover {
    background: var(--secondary-bg);
    color: var(--text-primary);
}

/* 潛在客戶緊湊卡片 */
.contact-card-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-4);
}

.contact-card {
    background: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-lg);
    padding: var(--spacing-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-4);
    transition: all 0.2s ease;
}

.contact-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-blue);
}

.contact-card-main {
    flex-grow: 1;
    min-width: 0; /* 讓 flexbox 內容可以縮小 */
}

.contact-card-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-2);
}

.contact-card-name {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.contact-card-status {
    font-size: var(--font-size-xs);
    padding: 2px 8px;
    border-radius: var(--rounded-full);
    font-weight: 600;
    flex-shrink: 0;
}

.contact-card-status.pending {
    background-color: rgba(245, 158, 11, 0.1); /* 橘色 */
    color: var(--accent-orange);
}

.contact-card-status.upgraded {
    background-color: rgba(107, 114, 128, 0.15); /* 灰色 */
    color: var(--text-muted);
}

.contact-card-status.archived,
.contact-card-status.filed {
    background-color: rgba(107, 114, 128, 0.15); /* 灰色 */
    color: var(--text-muted);
}

.contact-card-company, .contact-card-position {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.contact-card-actions {
    display: flex;
    gap: var(--spacing-2);
    flex-shrink: 0;
}

/* 最新動態 Feed */
.activity-feed-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.activity-feed-item {
    display: flex;
    gap: var(--spacing-4);
    padding: var(--spacing-3) 0;
    border-bottom: 1px solid var(--border-color);
}

.activity-feed-item:last-child {
    border-bottom: none;
}

.feed-icon {
    font-size: var(--font-size-lg);
    width: 24px;
    text-align: center;
    flex-shrink: 0;
}

.feed-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    font-size: var(--font-size-sm);
    min-width: 0;
}

.feed-text {
    color: var(--text-secondary);
    line-height: 1.4;
}

.feed-text strong {
    color: var(--text-primary);
    font-weight: 600;
}

.feed-summary {
    color: var(--text-muted);
    font-style: italic;
    padding-left: var(--spacing-2);
    border-left: 2px solid var(--border-color);
    font-size: var(--font-size-xs);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.feed-time {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
}

/* 互動紀錄卡片 */
.interaction-card-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-5);
}

.interaction-card {
    background-color: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-lg);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
}

.interaction-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--border-color);
}

.interaction-opportunity-link {
    font-weight: 600;
    color: var(--text-primary);
    text-decoration: none;
    transition: color 0.2s;
}

.interaction-opportunity-link:hover {
    color: var(--accent-blue);
}

.interaction-time {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
}

.interaction-card-body {
    padding: var(--spacing-4);
}

.interaction-title {
    font-weight: 600;
    margin-bottom: var(--spacing-2);
    color: var(--text-secondary);
}

.interaction-summary {
    color: var(--text-secondary);
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
}

.interaction-card-footer {
    padding: var(--spacing-2) var(--spacing-4);
    margin-top: auto;
    text-align: right;
    font-size: var(--font-size-sm);
    color: var(--text-muted);
}

/* 週間業務卡片 V2 */
.weekly-grid-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
}

.weekly-grid-header, .weekly-day-row {
    display: grid;
    grid-template-columns: 100px 1fr 1fr; /* 星期標籤, IoT, DT */
    gap: var(--spacing-3);
    align-items: stretch;
}

.topic-header {
    text-align: center;
    font-weight: 700;
    font-size: var(--font-size-sm);
    padding: var(--spacing-2);
    border-radius: var(--rounded-md);
    color: white;
}

.topic-header.iot {
    background-color: var(--accent-blue);
}

.topic-header.dt {
    background-color: var(--accent-purple);
}

.day-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: var(--font-size-sm);
    background-color: var(--primary-bg);
    border-radius: var(--rounded-md);
    color: var(--text-secondary);
}

.weekly-day-row {
    border-bottom: 1px solid var(--border-color);
    padding-bottom: var(--spacing-2);
}

.weekly-day-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.topic-cell {
    background-color: var(--primary-bg);
    border-radius: var(--rounded-lg);
    padding: var(--spacing-2);
    min-height: 60px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
}

.topic-cell .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    font-size: var(--font-size-sm);
}

.wb-item {
    background: var(--secondary-bg);
    padding: var(--spacing-2);
    border-radius: var(--rounded-sm);
    border-left: 2px solid var(--border-color);
}

.wb-topic {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-xs);
    margin-bottom: var(--spacing-1);
    line-height: 1.4;
}

.wb-participants {
    font-size: 0.7rem;
    color: var(--text-muted);
}

/* ========== 【修改】假日顯示樣式 (改為綠色系) ========== */
.grid-day-label.is-holiday,
.topic-cell.is-holiday,
.weekly-day-row.is-holiday > .day-label,
.grid-cell.is-holiday {
    /* 改為綠色系 */
    background: color-mix(in srgb, var(--accent-green) 10%, var(--primary-bg));
}

.holiday-name {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--accent-green); /* 改為綠色 */
    margin-top: 4px;
}

/* 【新增】讓儀表板假日格子內的「小卡片」也呈現綠色風格 */
.topic-cell.is-holiday .wb-item {
    border-left-color: var(--accent-green);
    background: color-mix(in srgb, var(--accent-green) 5%, var(--secondary-bg));
}

/* 【新增】讓詳細頁假日格子內的「業務紀錄卡片」也呈現綠色風格 */
.grid-cell.is-holiday .entry-card-read {
    background: color-mix(in srgb, var(--accent-green) 5%, var(--secondary-bg));
    border-left-color: var(--accent-green);
}

/* 今天日期的標示樣式 */
.day-label.is-today,
.grid-day-label.is-today,
.grid-cell.is-today,
.topic-cell.is-today {
    background: color-mix(in srgb, var(--accent-blue) 10%, var(--primary-bg));
    border: 1px solid var(--accent-blue);
}

.today-indicator {
    display: block;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--accent-blue);
    margin-top: 4px;
}

.interaction-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-8);
}
.interaction-history-section {
    /* padding-right: var(--spacing-4); */ /* <-- 【*** 程式碼修改點：移除此行 ***】 */
}
</file>

<file path="public/styles/modules/layout.css">
/* File: public/styles/modules/layout.css */
/*
 * File Path: public/styles/modules/layout.css
 * Version: 1.1.38
 * Date: 2026-04-29
 * Changelog: 
 * - (v1.1.38) Dashboard Phase T2.1 - Trend Widget final semantics alignment.
 * - (v1.1.37) Dashboard Phase T2 - Official release of Dashboard Trend Widget with Cumulative view.
 * - (v1.1.36) Dashboard Phase T1/T1.1 - Added KPI Trend Widget styles.
 * - (v1.1.35) Dashboard Phase 3 - Upgrade KPI cards with visual accents, subtle hover interaction, spacing hierarchy, and trend typography.
 * - (v1.1.34) Dashboard Phase 2-B - Tune dashboard tokens for business KPI and information-feed balance.
 * - (v1.1.33) Dashboard Phase 2-A - Introduce local dashboard design tokens.
 * - (v1.1.32) Dashboard Phase 1.9-E - Balance 6/6 layout and compact announcement widget.
 * - (v1.1.31) Dashboard Phase 1.9-D - Restore fixed 3x2 KPI grid with no-overflow guard.
 * - (v1.1.30) Dashboard Phase 1.9-C - Fix stats-grid grid span conflict for KPI announcement two-column layout.
 * - (v1.1.29) Dashboard Phase 1.9-B - Adaptive KPI grid to preserve 3-column layout without breaking container width.
 * - (v1.1.28) Dashboard Phase 1.9 - KPI and announcement two-column top layout.
 * - (v1.1.27) Dashboard Phase 1.8 - Sharp dashboard blocks and half-width KPI cards.
 * - (v1.1.26) Dashboard Phase 1.7 - Sharp compact KPI cards and temporary announcement removal.
 * - (v1.1.25) Dashboard Phase 1.6 - Restore KPI grid and slim stat cards.
 * - (v1.1.24) Dashboard Phase 1.5 - Density & Alignment Polish.
 * - (v1.1.23) Dashboard Phase 1 - Industry Layout Structure (Section headers & KPI row).
 * - (v1.1.22) Dashboard Layout Debug Grid overlay.
 * - (v1.1.21) Centralized sidebar width variables.
 * - (v1.1.20) Header Icon Final Polish: removed remaining button feel and standardized icon control behavior.
 * - (v1.1.19) Header Polish V2 final format regeneration
 * - (v1.1.19) Removed system icon button feel
 * - (v1.1.19) Refined header typography
 * - (v1.1.19) Scoped compact primary header actions
 * - (v1.1.18) Header Polish V2: removed system icon button feel and refined header typography.
 * - (v1.1.17) Header Polish V2: refined ghost icon controls and scoped compact header primary actions.
 * - (v1.1.16) Header Refinement Patch: Added .header-ghost-btn for system controls and adjusted .header-action-group-user margin-left to spacing-4.
 * - (v1.1.15) Header Hierarchy Patch: Implemented product-grade header grouping with distinct user identity zone using margin-left separation.
 * - (v1.1.14) Header User Identity Patch: Implemented strict two-line flex layout with 2px gap, removed margin hacks, and normalized text line styles.
 * - (v1.1.13) Header User Identity Spacing Patch: Increased gap to 12px and refined 2-line identity text styles.
 * - (v1.1.5) Restored subtle border-bottom to .page-header to provide separation during scrolling.
 * - (v1.1.5) Removed border-top from #page-content-container. Ensured border-left defines the left boundary.
 * - (v1.1.4) Added border-left to #page-content-container to complete the content boundary.
 * - (v1.1.3) Removed border-bottom from .page-header to seamlessly unify it with the app shell.
 * - (v1.1.3) Added a very subtle border-top to #page-content-container.
 * - (v1.1.2) Added flex layout to .header-content > div to place title and subtitle inline.
 * - (v1.1.1) Modified .page-header padding to reduce height and align left edge with sidebar.
 * - (v1.1.0) Modified .main-content to set padding: 0. Modified .page-header to sticky app bar.
 */

/* ==================== modules/layout.css ==================== */

/* 應用程式佈局 */
.app-layout {
    display: flex;
    min-height: 100vh;
    position: relative;
}

/* 主要內容區域 */
.main-content {
    flex: 1; 
    margin-left: var(--sidebar-width);
    background: var(--primary-bg); 
    min-height: 100vh;
    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
}

/* ========== 收合狀態下主內容區的樣式 ========== */
.app-layout.sidebar-collapsed .main-content {
    margin-left: var(--sidebar-collapsed-width);
}

.page-header {
    background: var(--secondary-bg);
    border-bottom: 1px solid rgba(148, 163, 184, 0.25);
    padding: var(--spacing-2) var(--spacing-6) var(--spacing-2) var(--spacing-3);
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: var(--spacing-5);
    border-radius: 0;
    box-shadow: none;
    margin: 0;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content { 
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-4);
    min-width: 0;
    flex: 1;
}

.header-content > div {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: nowrap;
    min-width: 0;
}

.header-content h1 {
    font-size: calc(var(--font-size-xl) + 2px);
    font-weight: 700; 
    margin-bottom: 0;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.page-subtitle { 
    color: var(--text-secondary); 
    font-size: 13px; 
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.header-actions {
    display: flex;
    gap: var(--spacing-5);
    flex-wrap: wrap;
    align-items: center;
    margin-left: auto;
}

.header-action-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex-wrap: nowrap;
}

.header-action-group-primary .action-btn {
    height: 32px;
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 14px;
}

.header-action-group-primary .action-btn svg {
    width: 16px;
    height: 16px;
}

.header-action-group-user {
    margin-left: var(--spacing-4);
}

.header-ghost-btn {
    padding: 6px;
    width: 30px;
    min-width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: transparent;
    border: none !important;
    box-shadow: none !important;
    outline: none;
    transform: none;
}

.header-ghost-btn:hover {
    background: rgba(148, 163, 184, 0.08);
    transform: none;
    opacity: 1;
}

.header-ghost-btn svg {
    width: 16px;
    height: 16px;
    display: block;
}

#page-content-container {
    padding: var(--spacing-7, 28px);
    border-left: 1px solid rgba(148, 163, 184, 0.25);
}

/* 儀表板網格 */
.dashboard-grid-flexible {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--spacing-5);
}

.grid-col-3 { grid-column: span 3; }
.grid-col-4 { grid-column: span 4; }
.grid-col-5 { grid-column: span 5; }
.grid-col-6 { grid-column: span 6; }
.grid-col-7 { grid-column: span 7; }
.grid-col-8 { grid-column: span 8; }
.grid-col-12 { grid-column: span 12; }

.dashboard-widget {
    background: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-xl);
    padding: var(--spacing-6);
    box-shadow: var(--shadow-md);
    display: flex;
    flex-direction: column;
}

.widget-header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    margin-bottom: var(--spacing-5);
    flex-shrink: 0;
}

.widget-title { 
    font-size: var(--font-size-lg); 
    font-weight: 700; 
    color: var(--text-primary); 
    margin: 0; 
}

.widget-content { 
    flex-grow: 1;
    min-height: 1px;
}

/* ==================== Dashboard Layout Debug Grid ==================== */
.dashboard-grid-flexible.debug-grid {
    position: relative;
}

.dashboard-grid-flexible.debug-grid::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 999;
    background-image: repeating-linear-gradient(
        to right,
        transparent 0%,
        transparent calc(100% / 12 - 1px),
        rgba(148, 163, 184, 0.15) calc(100% / 12 - 1px),
        rgba(148, 163, 184, 0.15) calc(100% / 12)
    );
}

/* ==================== Header User Area Consolidation ==================== */

.header-actions .action-btn.danger {
    display: none !important;
}

.header-actions .user-info {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 4px 6px;
    border-radius: 0; 
    cursor: pointer;
    background: transparent;
    transition: opacity 0.2s ease;
}

.header-actions .user-info:hover {
    opacity: 0.8;
    background: transparent;
}

.header-actions .user-info svg {
    flex-shrink: 0;
    margin-left: 4px;
    opacity: 0.6;
}

/* ==================== Session User Avatar Styles ==================== */

.user-avatar {
    width: 38px;
    height: 38px;
    margin-right: 12px; 
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
    background-color: var(--glass-bg);
    background-size: 70%;
    background-repeat: no-repeat;
    background-position: center;
    border: 1px solid rgba(148, 163, 184, 0.15); 
}

/* ==================== Header User Identity Block Styles ==================== */

.user-identity-text {
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.15;
    min-width: 0;
    gap: 2px;
}

.user-identity-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    margin: 0;
}

.user-identity-account {
    font-size: 12px;
    color: var(--text-secondary);
    opacity: 0.65;
    white-space: nowrap;
    margin: 0;
}

/* ==================== Header User Dropdown ==================== */

.user-dropdown-container {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.user-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 160px;
    background: var(--secondary-bg);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 6px;
    z-index: 200;
    display: none;
}

.user-dropdown-container.open .user-dropdown-menu {
    display: block;
}

.user-dropdown-menu .user-dropdown-item {
    width: 100%;
    display: flex !important;
    align-items: center;
    justify-content: flex-start;
    margin: 0;
    padding: 8px 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
    text-align: left;
    height: auto;
    backdrop-filter: none;
}

.user-dropdown-menu .user-dropdown-item:hover {
    background: var(--glass-bg);
}

.user-dropdown-menu .user-dropdown-item.danger {
    color: var(--accent-red);
}

/* ==================== Dashboard Sharp & Dual-Column Layout (Phase 2-B) ==================== */

#page-dashboard {
    --dashboard-card-radius: 0;
    --dashboard-kpi-card-padding: 16px 18px;
    --dashboard-kpi-icon-size: 30px;
    --dashboard-kpi-number-size: 36px;
    --dashboard-kpi-number-line-height: 1.05;
    --dashboard-kpi-label-size: 14px;
    --dashboard-kpi-trend-size: 13px;
    --dashboard-announcement-title-size: 14px;
    --dashboard-announcement-body-size: 12px;
    --dashboard-announcement-item-padding: 7px 10px;
    --dashboard-announcement-max-height: 250px;
}

/* Sharp edges for all dashboard blocks */
#page-dashboard .dashboard-widget {
    border-radius: var(--dashboard-card-radius);
}

/* Fix stats-grid grid span conflict (cite: Phase 1.9-C) */
#page-dashboard .dashboard-grid-flexible > .stats-grid.grid-col-6 {
    grid-column: span 6;
}

/* Fixed 3x2 KPI Grid with Balance (cite: Phase 1.9-E) */
#page-dashboard .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-5);
    min-width: 0;
}

/* Compact Announcement Widget (cite: Phase 1.9-E) */
#page-dashboard #announcement-widget {
    max-height: var(--dashboard-announcement-max-height);
    overflow: hidden;
}

#page-dashboard #announcement-widget .widget-header {
    margin-bottom: 8px;
}

#page-dashboard #announcement-widget .widget-title {
    font-size: var(--dashboard-announcement-title-size);
}

#page-dashboard #announcement-widget .widget-content {
    overflow-y: auto;
    min-height: 0;
    font-size: var(--dashboard-announcement-body-size);
}

#page-dashboard #announcement-widget button,
#page-dashboard #announcement-widget .action-btn,
#page-dashboard #announcement-widget a {
    font-size: var(--dashboard-announcement-body-size);
}

#page-dashboard #announcement-widget .announcement-item,
#page-dashboard #announcement-widget .announcement-card,
#page-dashboard #announcement-widget .announcement-content {
    padding: var(--dashboard-announcement-item-padding);
}

/* Compact KPI Card Styles & Overflow Guard (cite: Phase 1.9-E) */
#page-dashboard .stat-card {
    padding: var(--dashboard-kpi-card-padding);
    min-height: auto;
    border-radius: var(--dashboard-card-radius);
    box-shadow: var(--shadow-md);
    width: 100%;
    min-width: 0;
    overflow: hidden;
    transition: transform 120ms ease, box-shadow 120ms ease;
}

#page-dashboard .stat-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}

#page-dashboard .stat-label,
#page-dashboard .stat-number,
#page-dashboard .stat-trend {
    min-width: 0;
    white-space: nowrap;
}

#page-dashboard .stat-header {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
}

#page-dashboard .stat-icon {
    width: var(--dashboard-kpi-icon-size);
    height: var(--dashboard-kpi-icon-size);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
}

#page-dashboard .stat-icon svg {
    width: 18px;
    height: 18px;
}

#page-dashboard .stat-label {
    font-size: var(--dashboard-kpi-label-size);
    font-weight: 500;
    opacity: 0.85;
    color: var(--text-secondary);
}

#page-dashboard .stat-number {
    font-size: var(--dashboard-kpi-number-size);
    line-height: var(--dashboard-kpi-number-line-height);
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--text-primary);
}

#page-dashboard .stat-trend {
    margin-top: 4px;
    font-size: var(--dashboard-kpi-trend-size);
    font-weight: 500;
    opacity: 0.9;
}

#page-dashboard .stat-trend.trend-positive { color: #10b981; }
#page-dashboard .stat-trend.trend-negative { color: #ef4444; }
#page-dashboard .stat-trend.trend-neutral { color: #94a3b8; }

/* KPI Card Colors & Accents */
#page-dashboard .stat-card.blue { border-top: 2px solid #3b82f6; }
#page-dashboard .stat-card.blue .stat-icon { background: rgba(59, 130, 246, 0.7); color: #3b82f6; }

#page-dashboard .stat-card.green { border-top: 2px solid #10b981; }
#page-dashboard .stat-card.green .stat-icon { background: rgba(16, 185, 129, 0.7); color: #10b981; }

#page-dashboard .stat-card.orange { border-top: 2px solid #f97316; }
#page-dashboard .stat-card.orange .stat-icon { background: rgba(249, 115, 22, 0.7); color: #f97316; }

#page-dashboard .stat-card.purple { border-top: 2px solid #8b5cf6; }
#page-dashboard .stat-card.purple .stat-icon { background: rgba(139, 92, 246, 0.7); color: #8b5cf6; }

#page-dashboard .stat-card.cyan { border-top: 2px solid #06b6d4; }
#page-dashboard .stat-card.cyan .stat-icon { background: rgba(6, 182, 212, 0.7); color: #06b6d4; }

#page-dashboard .stat-card.teal { border-top: 2px solid #14b8a6; }
#page-dashboard .stat-card.teal .stat-icon { background: rgba(20, 184, 166, 0.7); color: #14b8a6; }

/* ==================== KPI Trend Widget (Phase T1/T1.1/T2/T2.1) ==================== */
#kpi-trend-widget {
    display: flex;
    flex-direction: column;
}
#kpi-trend-widget .widget-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
}
#trend-chart-container {
    width: 100%;
    height: 100%;
    min-height: 280px;
}
</file>

<file path="public/styles/modules/navigation.css">
/*
 * File Path: public/styles/modules/navigation.css
 * Version: 1.1.10
 * Date: 2026-04-28
 * Changelog: 
 * - (v1.1.10) Sidebar Logo Dual Mode (Expanded vs Collapsed).
 * - (v1.1.9) Sidebar UX S-2.1: Force display of group-hidden items in collapsed state.
 * - (v1.1.8) Sidebar UX S-2: Clean icon rail in collapsed state with CSS tooltips.
 * - (v1.1.7) Centralized sidebar width variables.
 * - (v1.1.6) Sidebar Final Polish: fixed internal order, enhanced active state, adjusted vertical spacing, and improved alignment.
 * - (v1.1.5) Sidebar Phase B-2: added collapsible Main group, adjusted default expansion states, reordered internal items, and removed admin separator line.
 * - (v1.1.4) Sidebar Phase B-1: fixed group state semantics, cleaned collapsible header pointer behavior, and normalized admin active styling.
 * - (v1.1.3) Sidebar Phase B: implemented collapsible grouped navigation
 * - (v1.1.2) Sidebar Phase A: refined navigation density, removed hover motion, simplified active state, and normalized section labels.
 * - (v1.1.1) Applied Header Consolidation D1 Patch: Visually hide .theme-toggle.
 * - (v1.1.0) Modified .sidebar to remove border-right for visual fusion with header.
 * - Modified .sidebar-header to remove border-bottom to unify the logo area.
 */

/* ==================== modules/navigation.css ==================== */
/* 側邊欄 - 第4個模組 */

/* 側邊欄 */
.sidebar {
    width: var(--sidebar-width);
    background: var(--secondary-bg);
    border-right: none;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: fixed;
    height: 100vh;
    z-index: 1000;
    display: flex;
    flex-direction: column;
}

/* LOGO 區域維持置中 */
.sidebar-header {
    padding: var(--spacing-6);
    border-bottom: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo {
    display: flex;
    justify-content: center;
    width: 100%;
}

.sidebar-logo {
    width: 100%;
    max-width: 120px; 
    height: auto;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: block;
}

.sidebar-logo-icon {
    display: none;
}

.sidebar-nav { 
    flex: 1; 
    padding: 12px 0 24px 0; 
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.sidebar-nav::-webkit-scrollbar {
    display: none;
}

.nav-list { 
    list-style: none; 
    padding: 0 var(--spacing-4); 
}

.nav-item { 
    margin-bottom: var(--spacing-1); 
}

/* 區域標籤樣式 (覆蓋 HTML inline 樣式) */
.nav-header {
    font-size: 11px !important;
    letter-spacing: 0.05em !important;
    color: rgba(148, 163, 184, 0.7) !important;
    margin-top: 16px !important;
    margin-bottom: 6px !important;
    padding: 0 12px 0 24px !important;
    background: none !important;
    border: none !important;
}

/* --- Phase B 展開收合機制 --- */
.nav-collapsible {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    cursor: pointer !important;
}

.nav-collapsible svg {
    width: 14px;
    height: 14px;
    opacity: 0.6;
    transition: transform 0.15s ease;
}

.nav-collapsible.collapsed svg {
    transform: rotate(-90deg);
}

.nav-item[data-group] {
    transition: opacity 0.15s ease;
}

.nav-item.group-hidden {
    display: none !important;
}

/* --- 導航連結樣式 --- */
.nav-link {
    display: flex; 
    align-items: center; 
    gap: 12px;
    padding: 0 12px 0 24px; 
    border-radius: 8px;
    text-decoration: none; 
    color: var(--text-secondary);
    transition: all 0.2s ease; 
    position: relative; 
    font-weight: 500;
    height: 36px;
    justify-content: flex-start; 
    border-left: 2px solid transparent;
}

.nav-link:hover { 
    background: var(--glass-bg); 
    color: var(--text-primary); 
    transform: none; 
}

.nav-text {
    font-size: 14px;
    font-weight: 500;
}

.nav-item.active .nav-link { 
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(99, 102, 241, 0.18)); 
    color: var(--text-primary); 
    box-shadow: none; 
    font-weight: 600; 
    border-left: 2px solid rgba(124, 58, 237, 0.6);
}

svg.nav-icon { 
    min-width: 18px; 
    width: 18px; 
    height: 18px; 
    transition: all 0.2s ease;
    color: var(--text-secondary); 
    opacity: 0.7;
}

.nav-item.active .nav-link svg.nav-icon {
    color: var(--text-primary); 
    opacity: 1;
}

/* 側邊欄釘選與收合狀態樣式 */
.sidebar-footer {
    padding: var(--spacing-4);
    margin-top: auto;
    border-top: 1px solid var(--border-color);
}

#sidebar-pin-toggle {
    width: 100%;
    background: transparent;
    border: none;
    height: 56px;
}

#sidebar-pin-toggle .nav-icon svg {
    width: 24px;
    height: 24px;
    color: var(--text-secondary);
    transition: color 0.2s ease;
    opacity: 1;
}

#sidebar-pin-toggle:hover {
    background: var(--glass-bg);
    color: var(--text-primary);
}
#sidebar-pin-toggle:hover .nav-icon svg {
    color: var(--text-primary);
}

/* ==================== 收合狀態下的核心樣式 ==================== */
.app-layout.sidebar-collapsed .sidebar {
    width: var(--sidebar-collapsed-width);
}

.app-layout.sidebar-collapsed .sidebar-header {
    padding-left: 0;
    padding-right: 0;
    justify-content: center;
}

.app-layout.sidebar-collapsed .sidebar-logo {
    max-width: 40px; 
}

.app-layout.sidebar-collapsed .sidebar-logo-full {
    display: none;
}

.app-layout.sidebar-collapsed .sidebar-logo-icon {
    display: block;
}

.app-layout.sidebar-collapsed #sidebar-pin-toggle {
    justify-content: center;
}

.app-layout.sidebar-collapsed .sidebar .nav-text {
    display: none;
}

/* 確保全側邊欄收合時隱藏 chevron 標示 */
.app-layout.sidebar-collapsed .nav-collapsible svg {
    display: none;
}

/* 確保全側邊欄收合時完全隱藏群組標題 (Icon Rail 模式) */
.app-layout.sidebar-collapsed .nav-header {
    display: none !important;
}

/* 強制在 Icon Rail 模式下顯示所有項目，忽略群組收合狀態 */
.app-layout.sidebar-collapsed .nav-item.group-hidden {
    display: block !important;
}

/* 收合時的連結樣式修正 */
.app-layout.sidebar-collapsed .nav-link {
    padding: 0; /* 重置 padding */
    justify-content: center; /* 強制置中 */
}

.app-layout.sidebar-collapsed .nav-item.active .nav-link {
    background: transparent;
    box-shadow: none;
    border-left-color: transparent;
}

.app-layout.sidebar-collapsed .nav-link:hover {
    background: transparent; 
    transform: none;
}

/* 圖示樣式修正 */
.app-layout.sidebar-collapsed svg.nav-icon {
    width: 40px;
    height: 40px;
    padding: 10px; 
    border-radius: var(--rounded-lg);
    flex-shrink: 0;
}

.app-layout.sidebar-collapsed .nav-item.active svg.nav-icon {
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(99, 102, 241, 0.18));
    color: var(--text-primary);
    padding: 10px; 
    opacity: 1;
}

.app-layout.sidebar-collapsed .nav-link:hover svg.nav-icon {
    background: var(--glass-bg);
}

/* --- Icon Rail Tooltips --- */
.app-layout.sidebar-collapsed #sidebar-pin-toggle {
    position: relative;
}

.app-layout.sidebar-collapsed .nav-link:hover .nav-text,
.app-layout.sidebar-collapsed #sidebar-pin-toggle:hover .nav-text {
    display: block;
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 12px;
    background: var(--card-bg);
    color: var(--text-primary);
    padding: 6px 12px;
    border-radius: var(--rounded-md);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);
    font-size: 13px;
    white-space: nowrap;
    z-index: 2000;
    pointer-events: none;
}

/* 主題切換按鈕 */
.theme-toggle {
    display: none !important;
    
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-lg);
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(20px);
}

.theme-toggle:hover {
    transform: scale(1.05);
    background: var(--glass-bg);
}

.theme-toggle svg {
    width: 20px;
    height: 20px;
    color: var(--text-primary);
    transition: all 0.3s ease;
}

.theme-toggle .sun-icon { display: none; }
.theme-toggle .moon-icon { display: block; }
[data-theme="light"] .theme-toggle .sun-icon { display: block; }
[data-theme="light"] .theme-toggle .moon-icon { display: none; }

/* 手機版隱藏釘選按鈕 */
@media (max-width: 768px) {
    .sidebar-footer {
        display: none;
    }
}

/* ==================== Admin 專屬隔離區樣式 (Confidential Zone) ==================== */

/* 1. 結構隔離：減少間距並移除分隔線 */
.nav-item.admin-restricted {
    margin-top: var(--spacing-1);
    padding-top: 0;
}

/* 2. 平時狀態：微微的淡紅色系背景 + 深紅文字 + 鎖頭對齊 */
.nav-item.admin-restricted .nav-link {
    background-color: rgba(239, 68, 68, 0.08); /* 極淡紅 */
    color: #991b1b; /* 深紅/鐵鏽紅 */
}

.nav-item.admin-restricted .nav-link .nav-icon {
    color: #991b1b;
}

/* 3. 懸停狀態：稍微加深背景 */
.nav-item.admin-restricted .nav-link:hover {
    background-color: rgba(239, 68, 68, 0.15);
    color: #7f1d1d; /* 更深的紅 */
    transform: none; /* 移除位移維持 Phase A 規範 */
}

/* 4. 選中狀態：與一般 active state 風格一致，但保留警示色系 */
.nav-item.admin-restricted.active .nav-link {
    background: rgba(239, 68, 68, 0.12);
    color: #7f1d1d;
    box-shadow: none;
}

.nav-item.admin-restricted.active .nav-link .nav-icon {
    color: #7f1d1d;
    opacity: 1;
}

/* 5. 收合狀態下的微調 (確保分隔線樣式正確) */
.app-layout.sidebar-collapsed .nav-item.admin-restricted {
    margin-top: var(--spacing-1);
    padding-top: 0;
}

.app-layout.sidebar-collapsed .nav-item.admin-restricted.active svg.nav-icon {
    background: rgba(239, 68, 68, 0.12);
    color: #7f1d1d;
    opacity: 1;
}
</file>

<file path="public/styles/modules/responsive.css">
/* ==================== modules/responsive.css ==================== */
/* 響應式與手機版導覽樣式 + 新增優化 - 第7個模組 */

/* 大螢幕調整 */
@media (max-width: 1200px) {
    .grid-col-3, .grid-col-4, .grid-col-5, .grid-col-6, .grid-col-7, .grid-col-8 { 
        grid-column: span 6; 
    }
    .stats-grid { 
        /* 平板：改為 2 欄 */
        grid-template-columns: repeat(2, 1fr); 
    }
}

@media (max-width: 768px) {
    .main-content { 
        margin-left: 0; 
    }
    .sidebar { 
        transform: translateX(-100%); 
        box-shadow: var(--shadow-xl); 
    }
    .sidebar.is-open { 
        transform: translateX(0); 
    }
    .mobile-nav-toggle { 
        display: block; 
    }
    .header-content .page-subtitle { 
        display: none; 
    }
    .header-content > div { 
        flex: 1; 
    }
    .grid-col-3, .grid-col-4, .grid-col-5, .grid-col-6, .grid-col-7, .grid-col-8, .grid-col-12 { 
        grid-column: span 12; 
    }
    .stats-grid { 
        /* 手機直向：改為 2 欄 (3x2 變成 3x2, 看起來也OK，或者改為 1 欄) */
        /* 這裡建議手機版改為 1 欄，避免卡片太窄 */
        grid-template-columns: 1fr; 
    }
    .main-content { 
        padding: var(--spacing-4); 
    }
    .page-header { 
        flex-direction: row; 
        align-items: center; 
    } 
    .header-content { 
        justify-content: flex-start; 
        width: auto; 
    } 

    .page-header .header-actions .action-btn {
        padding: 0;
        width: 40px;
        height: 40px;
    }
    .page-header .header-actions .action-btn .btn-text {
        display: none;
    }
    
    .data-table thead { 
        display: none; 
    }
    .data-table tr { 
        display: block; 
        margin-bottom: var(--spacing-4); 
        border: 1px solid var(--border-color); 
        border-radius: var(--rounded-lg); 
        padding: var(--spacing-4); 
        background: var(--glass-bg); 
        box-shadow: var(--shadow-sm);
    }
    .data-table td { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        text-align: right; 
        padding: var(--spacing-3) 0; 
        border-bottom: 1px solid var(--border-color); 
        font-size: var(--font-size-sm); 
    }
    .data-table tr td:last-child { 
        border-bottom: none; 
    }
    .data-table td::before { 
        content: attr(data-label); 
        font-weight: 600; 
        color: var(--text-secondary); 
        text-align: left; 
        padding-right: var(--spacing-4); 
    }
    .data-table td .action-buttons-container { 
        justify-content: flex-end;
        flex-shrink: 0;
    }

    .detail-page-tabs {
        overflow-x: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .detail-page-tabs::-webkit-scrollbar {
        display: none;
    }
    .step-name {
        font-size: var(--font-size-xs);
    }
    .interaction-layout {
        grid-template-columns: 1fr;
    }

    .stage-stepper-container {
        flex-wrap: wrap; 
        justify-content: flex-start;
        overflow-x: visible;
        padding-bottom: 0;
        gap: 10px 0;
    }
    .stage-step {
        flex-basis: 25%;
        min-width: 80px;
    }
    .stepper-progress-bar {
        display: none;
    }

    .interaction-timeline {
        padding-left: 50px;
    }
    .interaction-timeline::before {
        left: 18px;
        width: 2px;
        transform: none;
    }
    .timeline-icon {
        left: 11px;
        transform: none;
    }
    .timeline-content,
    .timeline-item-right .timeline-content,
    .timeline-item-left .timeline-content {
        width: auto;
        float: none;
        margin-left: 0;
        margin-right: 0;
    }
    .timeline-item-right .timeline-content::before,
    .timeline-item-left .timeline-content::before {
        left: -8px; 
        right: auto;
        border-left: none;
        border-right: 8px solid var(--border-color); 
    }
    .timeline-item-right .timeline-content::after,
    .timeline-item-left .timeline-content::after {
        left: -7px;
        right: auto;
        border-left: none;
        border-right: 7px solid var(--secondary-bg);
    }
}

@media (max-width: 576px) {
    .stats-grid { 
        grid-template-columns: 1fr; 
    }
    .header-actions {
        flex-grow: 1;
        justify-content: flex-end;
    }
}

.stage-stepper-container {
    display: flex;
    align-items: flex-start;
    padding: var(--spacing-4) 0;
    position: relative;
    overflow-x: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.stage-stepper-container::-webkit-scrollbar {
    display: none;
}
.stepper-progress-bar {
    position: absolute;
    top: 18px;
    left: 0;
    height: 4px;
    background-color: var(--border-color);
    width: 100%;
    z-index: 1;
}
.stepper-progress-bar-fill {
    height: 100%;
    background-color: var(--accent-green);
    width: 0%;
    transition: width 0.5s ease-in-out;
}
.stage-step {
    flex: 1 1 0;
    min-width: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    z-index: 2;
    padding: 0 var(--spacing-2);
}
.step-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid var(--border-color);
    background-color: var(--secondary-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    font-weight: bold;
    color: var(--text-muted);
    flex-shrink: 0;
}
.step-name {
    margin-top: var(--spacing-3);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-muted);
    transition: all 0.3s ease;
    line-height: 1.3;
}
.stage-step.completed .step-circle {
    background-color: var(--accent-green);
    border-color: var(--accent-green);
    color: white;
}
.stage-step.completed .step-name {
    color: var(--text-secondary);
}
.stage-step.current .step-circle {
    background-color: var(--accent-blue);
    border-color: var(--accent-blue);
    color: white;
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
}
.stage-step.current .step-name {
    color: var(--accent-blue);
    font-weight: 700;
}

.interaction-timeline {
    position: relative;
    max-width: 100%;
    max-height: 500px;
    overflow-y: auto;
    padding-right: var(--spacing-3);
}
.interaction-timeline::before {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 10px;
    bottom: 10px;
    width: 10px;
    background-color: var(--border-color);
    border-radius: 2px;
    z-index: 1;
}
.timeline-item {
    position: relative;
    margin-bottom: var(--spacing-5);
}
.timeline-item::after {
    content: "";
    display: table;
    clear: both;
}
.timeline-item:last-child {
    margin-bottom: 0;
}
.timeline-icon {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 13px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: var(--text-muted);
    border: none;
    transition: all 0.2s ease;
    box-shadow: 0 0 0 4px var(--primary-bg);
    z-index: 2;
}
.timeline-content {
    position: relative;
    background-color: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--rounded-lg);
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
    width: calc(50% - 40px);
}
.timeline-content::before {
    content: "";
    position: absolute;
    top: 12px;
    left: -8px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 8px solid var(--border-color);
    transition: border-right-color 0.2s ease;
}
.timeline-content::after {
    content: "";
    position: absolute;
    top: 13px;
    left: -7px;
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-right: 7px solid var(--secondary-bg);
    transition: border-right-color 0.2s ease;
}

.timeline-item-right .timeline-content {
    float: right;
    margin-left: 40px;
}

.timeline-item-left .timeline-content {
    float: left;
    margin-right: 40px;
}
.timeline-item-left .timeline-content::before {
    left: auto;
    right: -8px;
    border-right: none;
    border-left: 8px solid var(--border-color);
    transition: border-left-color 0.2s ease;
}
.timeline-item-left .timeline-content::after {
    left: auto;
    right: -7px;
    border-right: none;
    border-left: 7px solid var(--secondary-bg);
    transition: border-left-color 0.2s ease;
}

.timeline-item:hover .timeline-icon {
    transform: translateX(-50%) scale(1.1);
}
.timeline-item-right:hover .timeline-content {
    border-color: var(--accent-blue);
}
.timeline-item-right:hover .timeline-content::before {
    border-right-color: var(--accent-blue);
}
.timeline-item-right:hover .timeline-content::after {
    border-right-color: var(--secondary-bg);
}
.timeline-item-left:hover .timeline-content {
    border-color: var(--accent-blue);
}
.timeline-item-left:hover .timeline-content::before {
    border-left-color: var(--accent-blue);
}
.timeline-item-left:hover .timeline-content::after {
    border-left-color: var(--secondary-bg);
}

.timeline-item .interaction-card {
    border: none;
    box-shadow: none;
}
.timeline-item .interaction-card-header { 
    padding: var(--spacing-3) var(--spacing-4);
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
}
.timeline-item .interaction-card-header svg {
    width: 18px;
    height: 18px;
    color: var(--text-muted);
    flex-shrink: 0;
}
.timeline-item .interaction-card-header .interaction-title {
    flex-grow: 1;
}

.timeline-item .interaction-card-body { 
    padding: 0 var(--spacing-4) var(--spacing-3); 
}
.timeline-item .interaction-card-footer { 
    padding: 0 var(--spacing-4) var(--spacing-3); 
}
.timeline-item .interaction-title { 
    font-size: var(--font-size-sm); 
}
.timeline-item .interaction-summary, .timeline-item .interaction-next-action { 
    font-size: var(--font-size-sm); 
}

.detail-page-tabs {
    border-bottom: none;
    margin-bottom: var(--spacing-6);
    display: inline-flex;
    background-color: var(--primary-bg);
    border-radius: var(--rounded-full);
    padding: var(--spacing-1);
    border: 1px solid var(--border-color);
    position: relative;
}
.tab-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-5);
    border-radius: var(--rounded-full);
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.3s ease;
    z-index: 2;
    position: relative;
    border: none;
    background-color: transparent;
}
.tab-link:hover {
    color: var(--text-primary);
}
.tab-link.active {
    color: var(--text-primary);
}
.detail-page-tabs .tab-slider {
    position: absolute;
    top: var(--spacing-1);
    bottom: var(--spacing-1);
    border-radius: var(--rounded-full);
    background-color: var(--secondary-bg);
    box-shadow: var(--shadow-sm);
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
}
.tab-badge {
    background-color: var(--accent-purple);
    color: white;
    font-size: var(--font-size-xs);
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--rounded-full);
    margin-left: var(--spacing-1);
}
.tab-content {
    display: none;
}
.tab-content.active {
    display: block;
    animation: fadeIn 0.5s ease;
}
</file>

<file path="public/styles/modules/variables.css">
/*
 * File Path: public/styles/modules/variables.css
 * Version: 1.0.1
 * Date: 2026-04-28
 * Changelog: 
 * - (v1.0.1) Centralized sidebar width variables.
 */
:root {
    /* 色彩 - 暗色主題 (優化後) */
    --primary-bg: #0f172a; /* Slate 900 - 更深的背景 */
    --secondary-bg: #1e293b; /* Slate 800 - 次級背景 */
    --card-bg: #1e293b; /* Slate 800 - 卡片背景 */
    --glass-bg: rgba(30, 41, 59, 0.7); /* 半透明 Slate 800 */
    --text-primary: #f8fafc; /* Slate 50 - 主要文字 */
    --text-secondary: #cbd5e1; /* Slate 300 - 次要文字 */
    --text-muted: #94a3b8; /* Slate 400 - 弱化文字 (對比度 > 4.5:1) */
    --text-dark: #0f172a; /* 用於淺色背景上的深色文字 */
    --accent-blue: #60a5fa; /* 亮藍 */
    --accent-green: #4ade80; /* 亮綠 */
    --accent-orange: #fb923c; /* 亮橘 */
    --accent-purple: #a78bfa; /* 亮紫 */
    --accent-red: #f87171; /* 亮紅 */
    --border-color: #334155; /* Slate 700 - 邊框，與卡片背景有區別 */
    --gradient-bg: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);

    /* Sidebar Dimensions */
    --sidebar-width: 200px;
    --sidebar-collapsed-width: 80px;

    /* 字體大小 (保持不變) */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 2rem;

    /* 間距 (保持不變) */
    --spacing-1: 4px;
    --spacing-2: 8px;
    --spacing-3: 12px;
    --spacing-4: 16px;
    --spacing-5: 20px;
    --spacing-6: 24px;
    --spacing-8: 32px;
    --spacing-10: 40px;

    /* 圓角 (保持不變) */
    --rounded-sm: 4px;
    --rounded-md: 8px;
    --rounded-lg: 12px;
    --rounded-xl: 16px;
    --rounded-2xl: 24px;
    --rounded-full: 9999px;

    /* 陰影 (略微調整) */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.2);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.2);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.2);

    /* Locked State Colors (Dark) */
    --bg-locked: #1e293b; /* Slate 800 */
    --text-locked: #94a3b8; /* Slate 400 */
    --border-locked: #334155; /* Slate 700 */
}

[data-theme="light"] {
    /* 色彩 - 亮色主題 (優化後) */
    --primary-bg: #f1f5f9; /* Slate 100 - 略深的淺灰背景，突顯白色卡片 */
    --secondary-bg: #ffffff; /* 白色 */
    --card-bg: #ffffff; /* 白色 */
    --glass-bg: rgba(255, 255, 255, 0.8); /* 半透明白 */
    --text-primary: #0f172a; /* Slate 900 - 更深的文字 */
    --text-secondary: #475569; /* Slate 600 */
    --text-muted: #64748b; /* Slate 500 */
    --text-dark: #ffffff; /* 用於深色背景上的淺色文字 */
    --accent-blue: #2563eb; /* Blue 600 - 加深一點 */
    --accent-green: #16a34a; /* Green 600 */
    --accent-orange: #d97706; /* Amber 600 */
    --accent-purple: #7c3aed; /* Violet 600 */
    --accent-red: #dc2626; /* Red 600 */
    --border-color: #cbd5e1; /* Slate 300 - 更清晰的邊框 */
    --gradient-bg: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);

    /* 陰影 (亮色模式陰影較淺) */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.06);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.06);

    /* Locked State Colors (Light) */
    --bg-locked: #f1f5f9; /* Slate 100 */
    --text-locked: #64748b; /* Slate 500 */
    --border-locked: #cbd5e1; /* Slate 300 */
}
</file>

</files>
