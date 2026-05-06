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
- Only files matching these patterns are included: public/dashboard.html, public/scripts/dashboard/dashboard.js, public/scripts/dashboard/dashboard_ui.js, public/scripts/dashboard/dashboard_widgets.js, public/scripts/dashboard/dashboard_kanban.js, public/scripts/dashboard/dashboard_weekly.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/dashboard.html
public/scripts/dashboard/dashboard_kanban.js
public/scripts/dashboard/dashboard_ui.js
public/scripts/dashboard/dashboard_weekly.js
public/scripts/dashboard/dashboard_widgets.js
public/scripts/dashboard/dashboard.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/dashboard.html">
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FATDX CRM系統 - 客戶關係管理</title>

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="any">

    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/user-profile.css">

    <script src="assets/vendor/highcharts/highmaps.js"></script>
    <script src="assets/vendor/highcharts/data.js"></script>
    <script src="assets/vendor/highcharts/tw-all.js"></script>
    <script src="assets/vendor/highcharts/exporting.js"></script>
    <script src="assets/vendor/highcharts/export-data.js"></script>
    <script src="assets/vendor/highcharts/accessibility.js"></script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" defer></script>
</head>
<body>
    <script>
        // 檢查登入狀態，若未登入則導向登入頁
        if (!localStorage.getItem('crm-token') && !localStorage.getItem('crmToken')) {
            window.location.href = '/login.html';
        }
    </script>

    <div class="app-layout">
        <aside class="sidebar">
            <div class="sidebar-header">
                <a href="#" class="logo" data-page="dashboard" title="回到儀表板">
                    <img src="images/logo-full.svg" alt="FATDX CRM" class="sidebar-logo sidebar-logo-full">
                    <img src="images/logo-icon.svg" alt="FATDX CRM" class="sidebar-logo sidebar-logo-icon">
                </a>
            </div>

            <nav class="sidebar-nav">
                <ul class="nav-list">
                    <li class="nav-header nav-collapsible" data-group="main">主要功能 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></li>
                    <li class="nav-item active" data-group="main"><a href="#" class="nav-link" data-page="dashboard"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span class="nav-text">儀表板</span></a></li>
                    <li class="nav-item" data-group="main"><a href="#" class="nav-link" data-page="contacts"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="nav-text">潛在客戶</span></a></li>
                    <li class="nav-item" data-group="main"><a href="#" class="nav-link" data-page="opportunities"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg><span class="nav-text">機會案件</span></a></li>
                    <li class="nav-item" data-group="main"><a href="#" class="nav-link" data-page="companies"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg><span class="nav-text">公司管理</span></a></li>
                    <li class="nav-item" data-group="main"><a href="#" class="nav-link" data-page="weekly-business"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span class="nav-text">週間業務</span></a></li>

                    <li class="nav-header nav-collapsible" data-group="analytics">分析與紀錄 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></li>
                    <li class="nav-item" data-group="analytics"><a href="#" class="nav-link" data-page="events"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg><span class="nav-text">事件紀錄</span></a></li>
                    <li class="nav-item" data-group="analytics"><a href="#" class="nav-link" data-page="interactions"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span class="nav-text">互動總覽</span></a></li>
                    <li class="nav-item" data-group="analytics">
                      <a href="#" class="nav-link" data-page="sales-analysis">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="20" x2="18" y2="10"></line>
                          <line x1="12" y1="20" x2="12" y2="4"></line>
                          <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        <span class="nav-text">受注分析</span>
                      </a>
                    </li>

                    <li class="nav-header nav-collapsible" data-group="internal">內部工具 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></li>
                    <li class="nav-item" data-group="internal"><a href="#" class="nav-link" data-page="announcements"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path></svg><span class="nav-text">佈告欄</span></a></li>
                    <li class="nav-item" data-group="internal">
                      <a href="#" class="nav-link" data-page="internal-ops">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        <span class="nav-text">進度追蹤 beta</span>
                      </a>
                    </li>
                </ul>
            </nav>

            <div class="sidebar-footer">
                <button class="nav-link" id="sidebar-pin-toggle" title="切換側邊欄釘選狀態">
                    <div class="nav-icon"></div>
                    <span class="nav-text">收合側邊欄</span>
                </button>
            </div>
        </aside>

        <div class="mobile-nav-backdrop"></div>

        <main class="main-content">
            <header class="page-header">
                <div class="header-content">
                    <button class="mobile-nav-toggle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div>
                        <h1 class="page-title" id="page-title">儀表板</h1>
                        <p class="page-subtitle" id="page-subtitle">以機會為核心的客戶關係管理平台</p>
                    </div>
                </div>
                
                <div class="header-actions">
                    <div class="header-action-group header-action-group-system">
                        <a href="#" class="action-btn icon-btn header-ghost-btn" data-page="dashboard" title="返回儀表板">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        </a>
                        <button class="action-btn secondary header-ghost-btn" onclick="dashboardManager.forceRefresh()" title="強制重新整理">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        </button>
                        <button id="dev-layout-toggle-btn" class="action-btn secondary header-ghost-btn" style="display: none;" onclick="dashboardManager.toggleLayoutGrid()" title="Toggle Layout Grid">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        </button>
                    </div>

                    <div class="header-action-group header-action-group-primary">
                        <button class="action-btn primary small" onclick="showNewOpportunityModal()" title="新增機會">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            <span class="btn-text">新增機會</span>
                        </button>
                        <button class="action-btn secondary small" onclick="showEventLogForCreation()" title="新增事件">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            <span class="btn-text">新增事件</span>
                        </button>
                        <button class="action-btn secondary btn-gradient-highlight" style="display: none;" onclick="showNewMeetingModal()" title="建立會議">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span class="btn-text">建立會議</span>
                        </button>
                    </div>

                    <div class="header-action-group header-action-group-user">
                        <div class="user-dropdown-container" id="user-dropdown-container">
                            <div class="user-info" id="user-display" onclick="window.toggleUserDropdown(event)" title="使用者選單">
                                <span class="user-avatar" id="user-avatar" aria-hidden="true"></span>
                                
                                <span class="user-identity-text">
                                    <span class="user-identity-name" id="user-display-name"></span>
                                    <span class="user-identity-account" id="user-display-account"></span>
                                </span>

                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
                            </div>

                            <div class="user-dropdown-menu" id="user-dropdown-menu" aria-hidden="true">
                                <button type="button" class="user-dropdown-item" onclick="UserProfile.open(); window.closeUserDropdown();">
                                    個人資料
                                </button>
                                <button type="button" class="user-dropdown-item theme-toggle">
                                    切換明暗模式
                                </button>
                                <button type="button" class="user-dropdown-item danger" onclick="logout()">
                                    登出
                                </button>
                            </div>
                        </div>

                        <button class="action-btn danger" onclick="logout()" title="登出">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            <span class="btn-text">登出</span>
                        </button>
                    </div>
                </div>
            </header>

            <div id="page-content-container">
                <div id="page-dashboard" class="page-view">
                    <div class="dashboard-grid-flexible">
                        <div class="grid-col-6 stats-grid">
                            <div class="stat-card blue" data-page="contacts">
                                <div class="stat-header">
                                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                                    <div class="stat-label">潛在客戶(名片)</div>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="contacts-count">-</div>
                                    <div class="stat-trend" id="contacts-trend"></div>
                                </div>
                            </div>

                            <div class="stat-card green" data-page="opportunities">
                                <div class="stat-header">
                                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
                                    <div class="stat-label">機會案件</div>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="opportunities-count">-</div>
                                    <div class="stat-trend" id="opportunities-trend"></div>
                                </div>
                            </div>

                            <div class="stat-card orange" data-page="events">
                                <div class="stat-header">
                                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
                                    <div class="stat-label">事件紀錄</div>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="event-logs-count">-</div>
                                    <div class="stat-trend" id="event-logs-trend"></div>
                                </div>
                            </div>

                            <div class="stat-card purple" data-page="sales-analysis" style="border-left: none;">
                                <div class="stat-header">
                                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
                                    <div class="stat-label">成交案件數</div>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="won-count">-</div>
                                    <div class="stat-trend" id="won-trend"></div>
                                </div>
                            </div>

                            <div class="stat-card cyan" data-page="companies" style="border-left: none;">
                                <div class="stat-header">
                                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></div>
                                    <div class="stat-label">拜訪MTU</div>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="mtu-count">-</div>
                                    <div class="stat-trend" id="mtu-trend"></div>
                                </div>
                            </div>

                             <div class="stat-card teal" data-page="companies" style="border-left: none;">
                                <div class="stat-header">
                                    <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
                                    <div class="stat-label">拜訪SI</div>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number" id="si-count">-</div>
                                    <div class="stat-trend" id="si-trend"></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid-col-6 dashboard-widget" id="kpi-trend-widget">
                            <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <h2 class="widget-title">業務趨勢分析</h2>
                                <div style="display: flex; gap: 8px;">
                                    <select id="trend-view-select" class="form-select-sm" onchange="DashboardWidgets.renderTrendWidget(null, null, this.value)">
                                        <option value="monthly">每月新增</option>
                                        <option value="cumulative">累積總量</option>
                                    </select>
                                    <select id="trend-mode-select" class="form-select-sm" onchange="DashboardWidgets.renderTrendWidget(null, this.value, null)">
                                        <option value="ytd">YTD</option>
                                        <option value="all">全資料</option>
                                    </select>
                                </div>
                            </div>
                            <div class="widget-content" style="height: calc(100% - 40px); padding-bottom: 0;">
                                <div id="trend-chart-container"></div>
                            </div>
                        </div>

                        <div class="grid-col-6 dashboard-widget" id="weekly-business-widget">
                            <div class="widget-header">
                                <h2 class="widget-title" id="weekly-business-title">本週業務重點</h2>
                            </div>
                            <div class="widget-content">
                                <div class="loading show"><div class="spinner"></div><p>載入中...</p></div>
                            </div>
                        </div>

                        <div class="grid-col-3 dashboard-widget" id="activity-feed-widget">
                            <div class="widget-header">
                                <h2 class="widget-title">最新動態</h2>
                            </div>
                            <div class="widget-content">
                                <div class="loading show"><div class="spinner"></div><p>載入中...</p></div>
                            </div>
                        </div>

                        <div class="grid-col-3 dashboard-widget" id="map-widget">
                             <div class="widget-header">
                                 <h2 id="map-title" class="widget-title">全台機會分布</h2>
                                 <div class="map-filter">
                                     <select id="map-opportunity-filter" class="form-select-sm" onchange="window.mapManager.update(this.value)">
                                     </select>
                                 </div>
                             </div>
                             <div class="map-container">
                                 <div id="taiwan-map-container">
                                     <div class="loading show"><div class="spinner"></div><p>載入地圖資料中...</p></div>
                                 </div>
                             </div>
                         </div>

                        <div class="grid-col-12 dashboard-widget" id="kanban-widget">
                            <div class="widget-header">
                                <h2 class="widget-title">機會階段看板</h2>
                                <div class="kanban-controls-container"></div>
                            </div>
                            <div class="kanban-board-wrapper">
                                <div class="kanban-board" id="kanban-board-container" style="display: none;">
                                    <div class="loading show"><div class="spinner"></div><p>載入看板資料中...</p></div>
                                </div>
                            </div>
                            <div id="chip-wall-board-container" style="display: none;">
                                <div class="loading show"><div class="spinner"></div><p>載入晶片牆資料中...</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="page-contacts" class="page-view" style="display: none;"></div>
                <div id="page-opportunities" class="page-view" style="display: none;"></div>
                <div id="page-sales-analysis" class="page-view" style="display: none;">
                    <div class="loading show"><div class="spinner"></div></div>
                </div>
                <div id="page-companies" class="page-view" style="display: none;"></div>
                <div id="page-interactions" class="page-view" style="display: none;"></div>
                <div id="page-weekly-business" class="page-view" style="display: none;"></div>
                <div id="page-events" class="page-view" style="display: none;">
                    <div id="event-log-dashboard-container" class="dashboard-grid-flexible" style="margin-bottom: 24px;"></div>
                    <div id="event-log-list-container"></div>
                </div>
                
                <div id="page-company-details" class="page-view" style="display: none;"></div>
                <div id="page-opportunity-details" class="page-view" style="display: none;"></div>

                <div id="page-announcements" class="page-view" style="display: none;"></div>

                <div id="page-products" class="page-view" style="display: none;"></div>
                
                <div id="page-internal-ops" class="page-view" style="display: none;"></div>
            </div>
        </main>
    </div>

    <div id="user-profile-modal" class="profile-modal">
        <div class="profile-card">
            <button type="button" class="close-profile-btn" onclick="UserProfile.close()" title="關閉">
                &times;
            </button>

            <div class="profile-views" id="profile-views">
                
                <div class="view-section" id="view-profile">
                    <div class="profile-header">
                        <div class="avatar-large" id="profile-avatar">U</div>
                        
                        <h2 id="profile-name-large" style="margin:0 0 10px 0;">User</h2>
                        
                        <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                            <span id="profile-role-tag" style="padding: 5px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; background: #e0e0e0; color: #333;">
                                角色載入中...
                            </span>
                        </div>
                    </div>

                    <button class="btn-block btn-primary-action" onclick="UserProfile.switchView('password')">
                        🔐 修改密碼
                    </button>
                    <button class="btn-block btn-logout" onclick="logout()">
                        登出系統
                    </button>
                </div>

                <div class="view-section" id="view-password">
                    <button class="back-btn" onclick="UserProfile.switchView('profile')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        返回個人檔案
                    </button>

                    <h3 style="margin-top:0; margin-bottom:20px;">設定新密碼</h3>
                    
                    <form id="change-password-form">
                        <div class="input-group">
                            <label>目前密碼</label>
                            <input type="password" id="cp-old" class="form-control" placeholder="請輸入舊密碼">
                            <div class="feedback-text" id="fb-old"></div>
                        </div>

                        <div class="input-group">
                            <label>新密碼</label>
                            <input type="password" id="cp-new" class="form-control" placeholder="至少 6 碼">
                            <div class="strength-meter" id="strength-meter">
                                <div class="strength-segment"></div>
                                <div class="strength-segment"></div>
                                <div class="strength-segment"></div>
                            </div>
                            <div class="feedback-text" id="fb-new"></div>
                        </div>

                        <div class="input-group">
                            <label>確認新密碼</label>
                            <input type="password" id="cp-confirm" class="form-control" placeholder="再次輸入">
                            <div class="feedback-text" id="fb-confirm"></div>
                        </div>

                        <button type="submit" id="btn-save-password" class="btn-block btn-primary-action" disabled>
                            確認修改
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div id="modal-container"></div>
    <div id="panel-backdrop" class="panel-backdrop"></div>
    <div id="slide-out-panel-container"></div>
    <div id="notification-area"></div>

    <script src="scripts/import-bundle.js" charset="UTF-8"></script>

</body>
</html>
</file>

<file path="public/scripts/dashboard/dashboard_kanban.js">
// public/scripts/dashboard/dashboard_kanban.js
// (Stability Overhaul: Duplicate Init Fix + Delegation)

const DashboardKanban = {
    viewMode: localStorage.getItem('dashboardKanbanViewMode') || 'kanban',
    chipWallInstance: null,
    isInitialized: false, // Flag to prevent duplicate initialization
    
    // Internal data
    data: {
        opportunities: [],
        rawKanbanData: {},
        availableYears: [] 
    },

    /**
     * Initialization (Idempotent)
     */
    init(refreshCallback) {
        if (this.isInitialized) return; // Prevent multiple runs

        this.refreshCallback = refreshCallback; 
        
        document.getElementById('kanban-view-toggle')?.addEventListener('click', () => this.toggleView());

        document.getElementById('chip-wall-view-mode-toggle')?.addEventListener('click', () => {
            if (this.chipWallInstance) {
                this.chipWallInstance.viewMode = this.chipWallInstance.viewMode === 'grid' ? 'flex' : 'grid';
                localStorage.setItem('chipWallViewMode', this.chipWallInstance.viewMode);
                this.chipWallInstance.render();
                document.getElementById('chip-wall-view-mode-toggle').textContent = this.chipWallInstance.viewMode === 'grid' ? '切換流體模式' : '切換網格模式';
            }
        });

        document.getElementById('chip-wall-toggle-all')?.addEventListener('click', (e) => {
            if (this.chipWallInstance) {
                const btn = e.currentTarget;
                const isExpanding = btn.textContent.includes('展開');
                this.chipWallInstance.container.querySelectorAll('.chip-container').forEach(c => c.classList.toggle('is-expanded', isExpanding));
                this.chipWallInstance.container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = isExpanding ? '收合' : '展開更多...'; });
                btn.textContent = isExpanding ? '全部收合' : '全部展開';
            }
        });

        // We do NOT bind board events here anymore. 
        // We bind them in render() to ensure they are always attached to the current container.
        
        this.isInitialized = true;
    },

    update(processedOpportunities, rawKanbanData, availableYears) {
        this.data.opportunities = processedOpportunities;
        this.data.rawKanbanData = rawKanbanData;
        this.data.availableYears = availableYears;

        this.renderControls();
        this.render();
    },

    renderControls() {
        const container = document.querySelector('#kanban-widget .kanban-controls-container');
        if (!container) return;

        this._ensureStyles();

        if (document.getElementById('kanban-year-filter')) {
            return;
        }

        const systemConfig = window.CRM_APP?.systemConfig || {};
        
        const yearFilterHTML = `
            <div>
                <label for="kanban-year-filter">年度</label>
                <select id="kanban-year-filter" class="form-select-sm">
                    <option value="all">全部年度</option>
                    ${this.data.availableYears.map(y => `<option value="${y}">${y}年</option>`).join('')}
                </select>
            </div>
        `;

        const filtersHTML = `
            <div class="kanban-filter">
                ${yearFilterHTML}
                <div>
                    <label for="kanban-type-filter">種類</label>
                    <select id="kanban-type-filter" class="form-select-sm">
                        <option value="all">所有種類</option>
                        ${(systemConfig['機會種類'] || []).map(opt => `<option value="${opt.value}">${opt.note || opt.value}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="kanban-source-filter">來源</label>
                    <select id="kanban-source-filter" class="form-select-sm">
                        <option value="all">所有來源</option>
                         ${(systemConfig['機會來源'] || []).map(opt => `<option value="${opt.value}">${opt.note || opt.value}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="kanban-time-filter">活動時間</label>
                    <select id="kanban-time-filter" class="form-select-sm">
                        <option value="all">不限</option>
                        <option value="7">近 7 天</option>
                        <option value="30">近 30 天</option>
                        <option value="90">近 90 天</option>
                    </select>
                </div>
            </div>
        `;

        const actionsHTML = `
            <div class="kanban-actions-group">
                <div class="chip-wall-extra-controls">
                    <button class="action-btn small secondary" id="chip-wall-view-mode-toggle">切換模式</button>
                    <button class="action-btn small secondary" id="chip-wall-toggle-all">全部展開</button>
                </div>
                <div class="kanban-main-toggle">
                    <button class="action-btn small secondary" id="kanban-view-toggle" title="切換檢視模式">切換晶片牆</button>
                </div>
            </div>
        `;

        container.innerHTML = filtersHTML + actionsHTML;

        ['kanban-year-filter', 'kanban-type-filter', 'kanban-source-filter', 'kanban-time-filter'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.render());
        });

        document.getElementById('kanban-view-toggle')?.addEventListener('click', () => this.toggleView());
        
        const chipToggle = document.getElementById('chip-wall-view-mode-toggle');
        if (chipToggle) {
             chipToggle.addEventListener('click', () => {
                if (this.chipWallInstance) {
                    this.chipWallInstance.viewMode = this.chipWallInstance.viewMode === 'grid' ? 'flex' : 'grid';
                    localStorage.setItem('chipWallViewMode', this.chipWallInstance.viewMode);
                    this.chipWallInstance.render();
                    chipToggle.textContent = this.chipWallInstance.viewMode === 'grid' ? '切換流體模式' : '切換網格模式';
                }
            });
        }
        
        const expandAllBtn = document.getElementById('chip-wall-toggle-all');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', (e) => {
                if (this.chipWallInstance) {
                    const btn = e.currentTarget;
                    const isExpanding = btn.textContent.includes('展開');
                    this.chipWallInstance.container.querySelectorAll('.chip-container').forEach(c => c.classList.toggle('is-expanded', isExpanding));
                    this.chipWallInstance.container.querySelectorAll('.chip-expand-btn').forEach(b => { b.textContent = isExpanding ? '收合' : '展開更多...'; });
                    btn.textContent = isExpanding ? '全部收合' : '全部展開';
                }
            });
        }
    },

    toggleView() {
        this.viewMode = this.viewMode === 'kanban' ? 'chip-wall' : 'kanban';
        localStorage.setItem('dashboardKanbanViewMode', this.viewMode);
        this.render();
    },

    render() {
        const year = document.getElementById('kanban-year-filter')?.value || 'all';
        const type = document.getElementById('kanban-type-filter')?.value || 'all';
        const source = document.getElementById('kanban-source-filter')?.value || 'all';
        const time = document.getElementById('kanban-time-filter')?.value || 'all';

        let filteredOpportunities = this.data.opportunities;

        if (year !== 'all') filteredOpportunities = filteredOpportunities.filter(opp => String(opp.creationYear) === year);
        if (type !== 'all') filteredOpportunities = filteredOpportunities.filter(opp => opp.opportunityType === type);
        if (source !== 'all') filteredOpportunities = filteredOpportunities.filter(opp => opp.opportunitySource === source);
        if (time !== 'all') {
            const days = parseInt(time);
            const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
            filteredOpportunities = filteredOpportunities.filter(opp => opp.effectiveLastActivity && opp.effectiveLastActivity >= cutoff);
        }

        const kanbanWidget = document.getElementById('kanban-widget');
        const kanbanContainer = document.getElementById('kanban-board-container');
        const chipWallContainer = document.getElementById('chip-wall-board-container');
        const toggleBtn = document.getElementById('kanban-view-toggle');

        if (this.viewMode === 'chip-wall') {
            kanbanWidget.classList.add('chip-wall-active');
            kanbanContainer.style.display = 'none';
            chipWallContainer.style.display = 'block';
            if (toggleBtn) toggleBtn.textContent = '切換看板';

            if (typeof ChipWall !== 'undefined') {
                this.chipWallInstance = new ChipWall('#chip-wall-board-container', {
                    stages: CRM_APP.systemConfig['機會階段'] || [],
                    items: filteredOpportunities, 
                    colorConfigKey: '機會種類',
                    isDraggable: true,
                    isCollapsible: true,
                    useDynamicSize: true,
                    showControls: false, 
                    onItemUpdate: () => { if(this.refreshCallback) this.refreshCallback(true); } 
                });
                this.chipWallInstance.render();
            } else {
                chipWallContainer.innerHTML = `<div class="alert alert-error">晶片牆元件載入失敗</div>`;
            }

        } else {
            kanbanWidget.classList.remove('chip-wall-active');
            kanbanContainer.style.display = 'block';
            chipWallContainer.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = '切換晶片牆';

            const filteredKanbanData = {};
            (CRM_APP.systemConfig['機會階段'] || []).forEach(stageInfo => {
                filteredKanbanData[stageInfo.value] = { name: stageInfo.note, opportunities: [], count: 0 };
            });
            
            filteredOpportunities.forEach(opp => {
                if (filteredKanbanData[opp.currentStage]) {
                    filteredKanbanData[opp.currentStage].opportunities.push(opp);
                }
            });
            
            Object.keys(filteredKanbanData).forEach(stageId => {
                filteredKanbanData[stageId].opportunities.sort((a, b) => b.effectiveLastActivity - a.effectiveLastActivity);
                filteredKanbanData[stageId].count = filteredKanbanData[stageId].opportunities.length;
            });
            
            this.renderKanbanColumns(filteredKanbanData);
        }
    },

    renderKanbanColumns(stagesData) {
        const kanbanBoard = document.getElementById('kanban-board-container');
        const systemConfig = window.CRM_APP?.systemConfig || {};
        if (!kanbanBoard || !stagesData || !systemConfig['機會階段']) {
            if(kanbanBoard) kanbanBoard.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            return;
        };

        // Ensure we bind events to the container every time we render columns,
        // because we are about to overwrite its innerHTML (or maybe the container itself if logic changed).
        // To be safe against "Zombie Elements" if the container IS recreated, we bind here.
        this._bindBoardEvents(kanbanBoard);

        let html = '<div class="kanban-board">';
        systemConfig['機會階段'].forEach(stageInfo => {
            const stage = stagesData[stageInfo.value] || { name: stageInfo.note, opportunities: [], count: 0 };
            html += `<div class="kanban-column" data-stage-id="${stageInfo.value}">
                        <div class="kanban-header">
                            <div class="kanban-title">${stage.name}</div>
                            <div class="kanban-count">${stage.count}</div>
                        </div>
                        <div class="opportunities-list">`;

            (stage.opportunities || []).slice(0, 5).forEach(opp => {
                const oppTypeConfig = (systemConfig['機會種類'] || []).find(t => t.value === opp.opportunityType);
                const cardColor = oppTypeConfig?.color || 'var(--border-color)';
                html += `<div id="opp-card-${opp.opportunityId}" 
                              class="kanban-card" 
                              draggable="true" 
                              data-opportunity-id="${opp.opportunityId}"
                              style="--card-brand-color: ${cardColor};">
                            <div class="card-title">${opp.opportunityName}</div>
                            <div class="card-company">🏢 ${opp.customerCompany}</div>
                            <div class="card-tags">
                                <span class="card-tag assignee">👤 ${opp.assignee}</span>
                                ${opp.opportunityType ? `<span class="card-tag type">📖 ${oppTypeConfig?.note || opp.opportunityType}</span>` : ''}
                            </div>
                            ${opp.opportunityValue ? `<div class="card-value">💰 ${opp.opportunityValue}</div>` : ''}
                        </div>`;
            });

            if (stage.opportunities && stage.opportunities.length > 5) {
                html += `<button class="expand-btn" data-stage-id="${stageInfo.value}">展開 (+${stage.opportunities.length - 5})</button>`;
            }
            html += `</div></div>`;
        });
        html += '</div>';
        kanbanBoard.innerHTML = html;
    },

    _bindBoardEvents(boardContainer) {
        // Remove old listeners to avoid duplicates (important since we call this in render)
        boardContainer.removeEventListener('click', this._handleBoardClick);
        boardContainer.addEventListener('click', this._handleBoardClick.bind(this));
        
        boardContainer.removeEventListener('dragstart', this._handleDragStart);
        boardContainer.addEventListener('dragstart', this._handleDragStart.bind(this));
    },

    _handleBoardClick(e) {
        // 1. Card Click
        const card = e.target.closest('.kanban-card');
        if (card) {
            const oppId = card.dataset.opportunityId;
            if (oppId) CRM_APP.navigateTo('opportunity-details', { opportunityId: oppId });
            return;
        }

        // 2. Expand Button Click
        const btn = e.target.closest('.expand-btn');
        if (btn) {
            const stageId = btn.dataset.stageId;
            if (stageId) this.expandStage(stageId);
        }
    },

    _handleDragStart(e) {
        const card = e.target.closest('.kanban-card');
        if (card && typeof kanbanBoardManager !== 'undefined') {
             if (kanbanBoardManager.drag) kanbanBoardManager.drag(e);
        }
    },

    expandStage(stageId) {
        const stageData = this.data.rawKanbanData[stageId]; 
        if (!stageData) return;
        
        const year = document.getElementById('kanban-year-filter')?.value || 'all';
        const type = document.getElementById('kanban-type-filter')?.value || 'all';
        const source = document.getElementById('kanban-source-filter')?.value || 'all';
        const time = document.getElementById('kanban-time-filter')?.value || 'all';

        const opportunitiesToShow = this.data.opportunities.filter(opp => {
            if (opp.currentStage !== stageId) return false;
            if (year !== 'all' && String(opp.creationYear) !== year) return false;
            if (type !== 'all' && opp.opportunityType !== type) return false;
            if (source !== 'all' && opp.opportunitySource !== source) return false;
            if (time !== 'all') {
                const days = parseInt(time);
                const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
                if (!opp.effectiveLastActivity || opp.effectiveLastActivity < cutoff) return false;
            }
            return true;
        });

        const modalTitle = document.getElementById('kanban-expand-title');
        const modalContent = document.getElementById('kanban-expand-content');
        
        if (modalTitle && modalContent) {
            modalTitle.textContent = `階段: ${stageData.name} (${opportunitiesToShow.length} 筆)`;
            modalContent.innerHTML = (typeof renderOpportunitiesTable === 'function') 
                ? renderOpportunitiesTable(opportunitiesToShow) 
                : '<div class="alert alert-error">無法渲染，找不到表格生成函式</div>';
            showModal('kanban-expand-modal');
        }
    },

    _ensureStyles() {
        const styleId = 'dashboard-kanban-styles-final';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                #kanban-widget .widget-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; }
                #kanban-widget .widget-title { white-space: nowrap; flex-shrink: 0; }
                .kanban-controls-container { display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-5); flex-grow: 1; flex-wrap: wrap; }
                .kanban-filter, .kanban-actions-group { display: flex; align-items: center; gap: var(--spacing-3); }
                .chip-wall-extra-controls { display: none; gap: var(--spacing-3); }
                #kanban-widget.chip-wall-active .chip-wall-extra-controls { display: flex; }
                .kanban-filter label { font-size: 0.8rem; color: var(--text-muted); }
            `;
            document.head.appendChild(style);
        }
    }
};

window.DashboardKanban = DashboardKanban;
</file>

<file path="public/scripts/dashboard/dashboard_ui.js">
// public/scripts/dashboard/dashboard_ui.js

const DashboardUI = {
    showLoading(widgetId, message = '載入中...') {
        const widget = document.getElementById(widgetId);
        if (!widget) return;
        
        let loadingEl = widget.querySelector('.loading');
        if (!loadingEl) {
            const content = widget.querySelector('.widget-content') || widget;
            if (!content.querySelector('.loading')) {
                loadingEl = document.createElement('div');
                loadingEl.className = 'loading';
                loadingEl.innerHTML = `<div class="spinner"></div><p>${message}</p>`;
                content.appendChild(loadingEl);
            } else {
                loadingEl = content.querySelector('.loading');
            }
        }
        
        if (loadingEl) {
            const msgP = loadingEl.querySelector('p');
            if (msgP) msgP.textContent = message;
            loadingEl.classList.add('show');
        }
    },

    hideLoading(widgetId) {
        const widget = document.getElementById(widgetId);
        if (!widget) return;
        const loadingEl = widget.querySelector('.loading');
        if (loadingEl) loadingEl.classList.remove('show');
    },

    showGlobalLoading(message = '正在同步儀表板資料...') {
        if (typeof showLoading === 'function') showLoading(message);
    },

    hideGlobalLoading() {
        if (typeof hideLoading === 'function') hideLoading();
    },

    showError(widgetId, errorMessage) {
        const widget = document.getElementById(widgetId);
        if (!widget) return;
        const content = widget.querySelector('.widget-content') || widget;
        content.innerHTML = `<div class="alert alert-error">${errorMessage}</div>`;
    }
};

window.DashboardUI = DashboardUI;


// ★★★ UserProfile 管理器 (讀取 LayoutManager 的單一真理) ★★★
const UserProfile = {
    modalId: 'user-profile-modal',
    
    init() {
        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                const card = modal.querySelector('.profile-card');
                card.classList.remove('modal-shake');
                void card.offsetWidth; 
                card.classList.add('modal-shake');
            }
        });

        this.bindEvents();
    },

    open() {
        const modal = document.getElementById(this.modalId);
        
        // 1. 讀取使用者資訊
        const storedName = localStorage.getItem('crmCurrentUserName') || '使用者';
        const storedRole = localStorage.getItem('crmUserRole') || 'sales'; 
        
        const nameEl = document.getElementById('profile-name-large');
        const avatarEl = document.getElementById('profile-avatar');
        const roleTagEl = document.getElementById('profile-role-tag');
        
        // 2. 更新基本資訊
        if (nameEl) nameEl.textContent = storedName;
        if (avatarEl) avatarEl.textContent = (storedName[0] || 'U').toUpperCase();
        
        // ★★★ 3. 角色 (從全域定義讀取) ★★★
        
        // 確保定義是最新的 (如果 Config 剛載入)
        if (window.CRM_APP.refreshRoleDisplay) {
             window.CRM_APP.refreshRoleDisplay(); 
        }

        // 取得定義表 (由 layout-manager.js 產生)
        const defs = window.CRM_APP.ROLE_DEFINITIONS || {};
        
        // 查找當前角色的設定
        const roleConfig = defs[storedRole] || defs['sales'] || { 
            title: storedRole, 
            color: '#f3f4f6',
            textColor: '#374151'
        };

        // 更新 Tag 文字與樣式
        if (roleTagEl) {
            roleTagEl.textContent = roleConfig.title; // 顯示: 管理員 / 業務
            roleTagEl.style.backgroundColor = roleConfig.color; 
            roleTagEl.style.color = roleConfig.textColor;
        }

        // 權限標籤已在 HTML 中移除，程式碼亦不需要再處理它
        
        // 重置狀態
        this.switchView('profile');
        this.resetForm();
        
        modal.classList.add('show');
    },

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.classList.remove('show');
    },

    switchView(viewName) {
        const views = document.getElementById('profile-views');
        if (viewName === 'password') {
            views.style.transform = 'translateX(-50%)';
        } else {
            views.style.transform = 'translateX(0)';
        }
    },

    resetForm() {
        const form = document.getElementById('change-password-form');
        if (form) form.reset();
        
        ['cp-old', 'cp-new', 'cp-confirm'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('is-valid', 'is-invalid');
            const fb = document.getElementById(id.replace('cp', 'fb'));
            if (fb) {
                fb.textContent = '';
                fb.className = 'feedback-text';
            }
        });
        
        const meter = document.getElementById('strength-meter');
        if (meter) meter.className = 'strength-meter';
        
        const btn = document.getElementById('btn-save-password');
        if (btn) btn.disabled = true;
    },

    bindEvents() {
        const oldInput = document.getElementById('cp-old');
        const newInput = document.getElementById('cp-new');
        const confirmInput = document.getElementById('cp-confirm');
        const form = document.getElementById('change-password-form');

        if (!form) return;

        oldInput.addEventListener('blur', async () => {
            const val = oldInput.value;
            if (!val) return;
            const isValid = await this.verifyOldPassword(val);
            this.setValidationState(oldInput, isValid, isValid ? '' : '舊密碼錯誤');
            this.checkFormValidity();
        });
        
        oldInput.addEventListener('input', () => {
             oldInput.classList.remove('is-invalid');
             document.getElementById('fb-old').textContent = '';
             this.checkFormValidity();
        });

        newInput.addEventListener('input', () => {
            const val = newInput.value;
            const strength = this.checkStrength(val);
            this.updateStrengthMeter(strength);
            const isValid = strength >= 1;
            this.setValidationState(newInput, isValid, isValid ? '' : '密碼長度至少 6 碼');
            if (confirmInput.value) confirmInput.dispatchEvent(new Event('input'));
            this.checkFormValidity();
        });

        confirmInput.addEventListener('input', () => {
            const val = confirmInput.value;
            const origin = newInput.value;
            if (!val) {
                confirmInput.classList.remove('is-valid', 'is-invalid');
                return;
            }
            const isMatch = val === origin;
            this.setValidationState(confirmInput, isMatch, isMatch ? '' : '密碼不一致');
            this.checkFormValidity();
        });

        form.addEventListener('submit', (e) => this.handleSubmit(e));
    },

    setValidationState(el, isValid, msg = '') {
        const feedback = document.getElementById(el.id.replace('cp', 'fb'));
        if (isValid) {
            el.classList.remove('is-invalid');
            el.classList.add('is-valid');
            feedback.textContent = msg || '';
            feedback.className = 'feedback-text text-success';
        } else {
            el.classList.remove('is-valid');
            el.classList.add('is-invalid');
            feedback.textContent = msg;
            feedback.className = 'feedback-text text-danger';
        }
    },

    checkStrength(pwd) {
        if (pwd.length < 6) return 0;
        let score = 1;
        if (pwd.length >= 8) score++;
        if (/[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
        return Math.min(score, 3);
    },

    updateStrengthMeter(level) {
        const meter = document.getElementById('strength-meter');
        meter.className = 'strength-meter';
        if (level === 1) meter.classList.add('strength-weak');
        if (level === 2) meter.classList.add('strength-medium');
        if (level === 3) meter.classList.add('strength-strong');
    },

    checkFormValidity() {
        const oldValid = document.getElementById('cp-old').classList.contains('is-valid');
        const newValid = document.getElementById('cp-new').classList.contains('is-valid');
        const confirmValid = document.getElementById('cp-confirm').classList.contains('is-valid');
        document.getElementById('btn-save-password').disabled = !(oldValid && newValid && confirmValid);
    },

    async verifyOldPassword(password) {
        try {
            const token = localStorage.getItem('crm-token');
            const res = await fetch('/api/auth/verify-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            return data.success && data.valid;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-save-password');
        const oldPassword = document.getElementById('cp-old').value;
        const newPassword = document.getElementById('cp-new').value;

        btn.disabled = true;
        btn.textContent = '更新中...';

        try {
            const token = localStorage.getItem('crm-token');
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const result = await res.json();

            if (result.success) {
                alert('✅ 修改成功！請使用新密碼重新登入');
                logout(); 
            } else {
                alert('❌ 修改失敗: ' + (result.message || '未知錯誤'));
                btn.disabled = false;
                btn.textContent = '確認修改';
            }
        } catch (error) {
            alert('網路錯誤');
            btn.disabled = false;
            btn.textContent = '確認修改';
        }
    }
};

window.UserProfile = UserProfile;

document.addEventListener('DOMContentLoaded', () => {
    UserProfile.init();
});
</file>

<file path="public/scripts/dashboard/dashboard_weekly.js">
// public/scripts/dashboard/dashboard_weekly.js

const DashboardWeekly = {
    /**
     * 渲染週間業務區塊 (含雙日曆)
     * @param {Array} entries - 本週業務項目列表
     * @param {Object} weekInfo - 當週詳細資訊 (標題、日期結構、假日)
     */
    render(entries, weekInfo) {
        const widget = document.getElementById('weekly-business-widget');
        if (!widget) return;
        
        const container = widget.querySelector('.widget-content');
        const header = widget.querySelector('.widget-header');
        const titleEl = header.querySelector('.widget-title');
        const systemConfig = window.CRM_APP?.systemConfig || {};

        // 設定標題
        if (weekInfo && weekInfo.title) {
            titleEl.innerHTML = `本週業務重點 <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${weekInfo.title}</span>`;
        }

        // 新增/更新「查看週報」按鈕
        let button = header.querySelector('.action-btn');
        if (!button) {
            button = document.createElement('button');
            button.className = 'action-btn small secondary';
            header.appendChild(button);
        }
        button.textContent = '查看週報';
        button.onclick = () => { 
            if (weekInfo?.weekId) { 
                sessionStorage.setItem('navigateToWeekId', weekInfo.weekId); 
                CRM_APP.navigateTo('weekly-business'); 
            }
        };
        button.disabled = !weekInfo?.weekId;

        const themes = systemConfig['週間業務主題'] || [{value: 'IoT', note: 'IoT'}, {value: 'DT', note: 'DT'}];
        const todayString = new Date().toISOString().split('T')[0];

        // 建立表格 HTML
        let gridHtml = `
            <div class="weekly-grid-container">
                <div class="weekly-grid-header">
                    <div class="day-label-placeholder"></div>
                    ${themes.map(t => `<div class="topic-header ${t.value.toLowerCase()}">${t.note}</div>`).join('')}
                </div>
                <div class="weekly-grid-body">`;

        (weekInfo.days || []).forEach(dayInfo => {
            const dayIndex = dayInfo.dayIndex;
            if (dayIndex < 1 || dayIndex > 5) return;
            const holidayClass = dayInfo.holidayName ? 'is-holiday' : '';

            const isToday = dayInfo.date === todayString;
            const todayClass = isToday ? 'is-today' : '';
            const todayIndicator = isToday ? '<span class="today-indicator">今天</span>' : '';

            gridHtml += `<div class="weekly-day-row ${holidayClass}">
                            <div class="day-label ${todayClass}">
                                ${['週一','週二','週三','週四','週五'][dayIndex-1]}<br>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">(${dayInfo.displayDate})</span>
                                ${holidayClass ? `<span class="holiday-name">${dayInfo.holidayName}</span>` : ''}
                                ${todayIndicator}
                            </div>
                            
                            ${themes.map(t => {
                                // --- 雙日曆分流顯示邏輯 (DX左/AT右) ---
                                let calendarEventsHtml = '';
                                
                                // 左欄 (IoT)：顯示 DX 日曆 (dxCalendarEvents)
                                if (t.value === 'IoT' && dayInfo.dxCalendarEvents && dayInfo.dxCalendarEvents.length > 0) {
                                    calendarEventsHtml = `<div class="calendar-events-list" style="margin-bottom:6px;">`;
                                    dayInfo.dxCalendarEvents.forEach(evt => {
                                       calendarEventsHtml += `<div class="calendar-text-item" style="font-size:0.75rem; padding:1px 4px; margin-bottom:2px; color: #94a3b8; font-weight: 700;">📅 ${evt.summary}</div>`;
                                    });
                                    calendarEventsHtml += `<div class="calendar-separator" style="margin:4px 0;"></div></div>`;
                                }

                                // 右欄 (DT)：顯示 AT 日曆 (atCalendarEvents)
                                if (t.value === 'DT' && dayInfo.atCalendarEvents && dayInfo.atCalendarEvents.length > 0) {
                                    calendarEventsHtml = `<div class="calendar-events-list" style="margin-bottom:6px;">`;
                                    dayInfo.atCalendarEvents.forEach(evt => {
                                       calendarEventsHtml += `<div class="calendar-text-item" style="font-size:0.75rem; padding:1px 4px; margin-bottom:2px; color: #94a3b8; font-weight: 700;">📅 ${evt.summary}</div>`;
                                    });
                                    calendarEventsHtml += `<div class="calendar-separator" style="margin:4px 0;"></div></div>`;
                                }
                                // --- 結束 ---

                                return `<div class="topic-cell ${holidayClass} ${todayClass}" id="wb-dash-${dayIndex}-${t.value.toLowerCase()}">
                                    ${calendarEventsHtml}
                                </div>`;
                            }).join('')}
                         </div>`;
        });
        gridHtml += '</div></div>';
        
        container.innerHTML = gridHtml;

        // 填入業務紀錄 (entries)
        (entries || []).forEach(entry => {
            try {
                if (entry && entry['日期'] && /^\d{4}-\d{2}-\d{2}$/.test(entry['日期'])) {
                    const [y, m, d] = entry['日期'].split('-').map(Number);
                    const entryDateUTC = new Date(Date.UTC(y, m - 1, d));
                    if (!isNaN(entryDateUTC.getTime())) {
                        const dayOfWeek = entryDateUTC.getUTCDay();
                        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                            const category = (entry['category'] || themes[0].value).toLowerCase();
                            const cell = document.getElementById(`wb-dash-${dayOfWeek}-${category}`);
                            if (cell) cell.innerHTML += `<div class="wb-item"><div class="wb-topic">${entry['主題']}</div><div class="wb-participants">👤 ${entry['參與人員'] || 'N/A'}</div></div>`;
                        }
                    }
                }
            } catch (e) {
                 console.warn('渲染儀表板業務紀錄時出錯:', entry, e);
            }
        });
    }
};

window.DashboardWeekly = DashboardWeekly;
</file>

<file path="public/scripts/dashboard/dashboard_widgets.js">
/**
 * public/scripts/dashboard/dashboard_widgets.js
 * @version 1.4.6
 * @date 2026-04-29
 * @changelog
 * - Dashboard Phase T3-Revenue Visual Final Polish
 * - Restore legend to top-center position
 * - Move "成交金額" legend item to the end (legendIndex: 99)
 * - Hide revenue column by default (visible: false)
 * - Demote revenue column to background (opacity, padding, zIndex)
 * - Elevate line series priority and adjust styling (lineWidth, fillOpacity)
 * - Add formatted revenue tooltip (thousands separator)
 * - Reorder series for correct visual layering
 */

const DashboardWidgets = {
    /**
     * 渲染儀表板上方的統計數字卡片
     * @param {Object} stats - 統計資料物件
     */
    renderStats(stats = {}) {
        const updateText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // 1. 基礎數據更新
        updateText('contacts-count', stats.contactsCount || 0);
        this._updateTrend('contacts-trend', stats.contactsCountMonth);

        updateText('opportunities-count', stats.opportunitiesCount || 0);
        this._updateTrend('opportunities-trend', stats.opportunitiesCountMonth);
        
        updateText('event-logs-count', stats.eventLogsCount || 0);
        this._updateTrend('event-logs-trend', stats.eventLogsCountMonth);

        updateText('won-count', stats.wonCount || 0);
        this._updateTrend('won-trend', stats.wonCountMonth);

        // 2. MTU 統計與浮動資訊卡片 (Tooltip)
        updateText('mtu-count', stats.mtuCount || 0);
        this._updateTrend('mtu-trend', stats.mtuCountMonth);
        
        // 若有 MTU 詳細資料，則渲染浮動視窗
        if (stats.mtuDetails) {
            this._setupLazyTooltip('mtu', 'mtu-count', stats.mtuDetails);
        }

        updateText('si-count', stats.siCount || 0);
        this._updateTrend('si-trend', stats.siCountMonth);
        
        if (stats.siDetails) {
            this._setupLazyTooltip('si', 'si-count', stats.siDetails);
        }
        
        // 確保樣式存在
        this._ensureStyles();
    },

    _updateTrend(id, value) {
        const el = document.getElementById(id);
        if (!el) return;

        const num = Number(value);
        if (Number.isNaN(num) || value === null || value === undefined) {
            el.textContent = '';
            el.className = 'stat-trend';
            return;
        }

        if (num > 0) {
            el.textContent = `▲ 本月 +${num}`;
            el.className = 'stat-trend trend-positive';
        } else if (num < 0) {
            el.textContent = `▼ 本月 ${num}`;
            el.className = 'stat-trend trend-negative';
        } else {
            el.textContent = `本月 0`;
            el.className = 'stat-trend trend-neutral';
        }
    },

    _companyActivityDetailsCache: { mtu: null, si: null },

    _setupLazyTooltip(type, elementId, details) {
        const countEl = document.getElementById(elementId);
        if (!countEl) return;

        // 找到卡片容器 (.stat-card)
        const card = countEl.closest('.stat-card');
        if (!card) return;

        // 清除舊的 Tooltip
        const oldTooltip = card.querySelector('.custom-tooltip');
        if (oldTooltip) oldTooltip.remove();

        const title = type === 'mtu' ? 'MTU 拜訪概況' : 'SI 拜訪概況';
        const totalTarget = details.totalMtu !== undefined ? details.totalMtu : details.totalSi;

        // 建立 Tooltip HTML
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-header">${title}</div>
            <div class="tooltip-row">
                <span>總目標家數:</span> <strong>${totalTarget}</strong>
            </div>
            <div class="tooltip-row">
                <span>已互動:</span> <span class="text-success">${details.activeCount}</span>
            </div>
            <div class="tooltip-row">
                <span>未互動:</span> <span class="text-danger">${details.inactiveCount}</span>
            </div>
            <div class="tooltip-divider"></div>
            <div class="tooltip-subtitle">${details.inactiveCount > 0 ? '未互動名單 (載入中...)' : '<span class="text-success">🎉 全部皆已互動！</span>'}</div>
            <ul class="tooltip-list" id="lazy-list-${type}"></ul>
        `;

        // 將卡片設為 relative 以便定位
        card.style.position = 'relative';
        card.style.cursor = 'pointer'; 
        card.appendChild(tooltip);

        if (details.inactiveCount > 0) {
            let hasHovered = false;
            card.addEventListener('mouseenter', async () => {
                if (hasHovered) return;
                hasHovered = true;
                
                const listEl = tooltip.querySelector(`#lazy-list-${type}`);
                const subtitleEl = tooltip.querySelector('.tooltip-subtitle');
                
                if (this._companyActivityDetailsCache[type]) {
                    this._renderTooltipList(listEl, subtitleEl, this._companyActivityDetailsCache[type]);
                    return;
                }
                
                try {
                    const res = await authedFetch(`/api/dashboard/company-activity-details?type=${type}`);
                    if (res.success && res.data) {
                        this._companyActivityDetailsCache[type] = res.data;
                        this._renderTooltipList(listEl, subtitleEl, res.data);
                    } else {
                        throw new Error('Fetch failed');
                    }
                } catch (e) {
                    subtitleEl.textContent = '未互動名單 (載入失敗)';
                    listEl.innerHTML = '<li class="text-danger">名單載入失敗</li>';
                    hasHovered = false; // Allow retry on next hover
                }
            });
        }
    },

    _renderTooltipList(listEl, subtitleEl, data) {
        const maxDisplay = 5;
        const inactiveListHtml = data.inactiveNames.slice(0, maxDisplay)
            .map(name => `<li>❌ ${name}</li>`).join('');
        const remainingCount = data.inactiveNames.length - maxDisplay;
        const moreHtml = remainingCount > 0 ? `<li class="more">...還有 ${remainingCount} 家</li>` : '';
        
        subtitleEl.textContent = `未互動名單 (前 ${maxDisplay} 筆):`;
        listEl.innerHTML = inactiveListHtml + moreHtml;
    },

    _currentTrendData: null,

    /**
     * 渲染 KPI 趨勢分析 Widget
     */
    renderTrendWidget(data, mode, viewType) {
        // 確保在傳入 null 觸發更新時能安全重用舊有資料
        if (data !== null && data !== undefined) {
            this._currentTrendData = data;
        }
        if (!this._currentTrendData) return;

        const trendData = this._currentTrendData;
        
        // 模式解析：傳入 mode -> select value -> 預設 'ytd' / 'monthly'
        const currentMode = mode || document.getElementById('trend-mode-select')?.value || 'ytd';
        const currentView = viewType || document.getElementById('trend-view-select')?.value || 'monthly';
        
        let categories = [];
        let oppData = [];
        let eventData = [];
        let wonData = [];
        let revenueData = [];

        let oppAcc = 0;
        let eventAcc = 0;
        let wonAcc = 0;
        let revenueAcc = 0;

        if (currentMode === 'ytd') {
            // YTD 模式：固定 1 到 12 月
            const year = trendData.currentYear;
            const currentMonth = trendData.currentMonth;

            for (let i = 1; i <= 12; i++) {
                const monthStr = String(i).padStart(2, '0');
                const key = `${year}-${monthStr}`;
                categories.push(`${i}月`);
                
                const oppVal = trendData.opportunities[key] || 0;
                const eventVal = trendData.events[key] || 0;
                const wonVal = (trendData.won && trendData.won[key]) || 0;
                const revenueVal = (trendData.revenue && trendData.revenue[key]) || 0;

                // 未來的月份維持 null (無論是每月新增或累積總量)，確保線條不會掉到 0 或延伸至未來
                if (i > currentMonth) {
                    oppData.push(null);
                    eventData.push(null);
                    wonData.push(null);
                    revenueData.push(null);
                } else if (currentView === 'cumulative') {
                    oppAcc += oppVal;
                    eventAcc += eventVal;
                    wonAcc += wonVal;
                    revenueAcc += revenueVal;
                    oppData.push(oppAcc);
                    eventData.push(eventAcc);
                    wonData.push(wonAcc);
                    revenueData.push(revenueAcc);
                } else {
                    oppData.push(oppVal);
                    eventData.push(eventVal);
                    wonData.push(wonVal);
                    revenueData.push(revenueVal);
                }
            }
        } else {
            // 全資料模式：從最早資料的月份延伸至當前月份
            let allKeys = new Set([
                ...Object.keys(trendData.opportunities), 
                ...Object.keys(trendData.events),
                ...Object.keys(trendData.won || {}),
                ...Object.keys(trendData.revenue || {})
            ]);
            
            // 修復排序：依據數值比較年份與月份，確保時間軸先後正確
            let sortedKeys = Array.from(allKeys).sort((a, b) => {
                const [yearA, monthA] = a.split('-').map(Number);
                const [yearB, monthB] = b.split('-').map(Number);
                return yearA !== yearB ? yearA - yearB : monthA - monthB;
            });
            
            if (sortedKeys.length === 0) {
                const currentMonthStr = String(trendData.currentMonth).padStart(2, '0');
                sortedKeys.push(`${trendData.currentYear}-${currentMonthStr}`);
            }
            
            const [startYear, startMonth] = sortedKeys[0].split('-').map(Number);
            const endYear = trendData.currentYear;
            const endMonth = trendData.currentMonth;
            
            let currY = startYear;
            let currM = startMonth;
            
            while (currY < endYear || (currY === endYear && currM <= endMonth)) {
                const key = `${currY}-${String(currM).padStart(2, '0')}`;
                categories.push(key);
                
                const oppVal = trendData.opportunities[key] || 0;
                const eventVal = trendData.events[key] || 0;
                const wonVal = (trendData.won && trendData.won[key]) || 0;
                const revenueVal = (trendData.revenue && trendData.revenue[key]) || 0;

                if (currentView === 'cumulative') {
                    oppAcc += oppVal;
                    eventAcc += eventVal;
                    wonAcc += wonVal;
                    revenueAcc += revenueVal;
                    oppData.push(oppAcc);
                    eventData.push(eventAcc);
                    wonData.push(wonAcc);
                    revenueData.push(revenueAcc);
                } else {
                    oppData.push(oppVal);
                    eventData.push(eventVal);
                    wonData.push(wonVal);
                    revenueData.push(revenueVal);
                }

                currM++;
                if (currM > 12) { currM = 1; currY++; }
            }
        }

        if (typeof Highcharts === 'undefined') return;

        const viewLabel = currentView === 'cumulative' ? '（累積）' : '（月增）';

        Highcharts.chart('trend-chart-container', {
            chart: { type: 'areaspline', backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
            title: { text: null },
            xAxis: { categories: categories, crosshair: true },
            yAxis: [
                { title: { text: null }, min: 0, labels: { enabled: false } },
                { title: { text: null }, min: 0, labels: { enabled: false }, opposite: true }
            ],
            tooltip: { shared: true },
            plotOptions: {
                areaspline: { 
                    fillOpacity: 0.2, 
                    marker: { enabled: false, symbol: 'circle', radius: 3, states: { hover: { enabled: true } } } 
                }
            },
            series: [
                { 
                    name: `成交金額${viewLabel}`, 
                    type: 'column', 
                    data: revenueData, 
                    color: '#3b82f6', 
                    yAxis: 1,
                    zIndex: 0,
                    opacity: 0.35,
                    pointPadding: 0.2,
                    groupPadding: 0.3,
                    borderWidth: 0,
                    visible: false,
                    legendIndex: 99,
                    tooltip: {
                        pointFormatter: function () {
                            return '<span style="color:' + this.series.color + '">●</span> ' +
                                   this.series.name + ': <b>' +
                                   (this.y ? this.y.toLocaleString() : '0') +
                                   '</b><br/>';
                        }
                    }
                },
                { name: `機會案件${viewLabel}`, data: oppData, color: '#10b981', yAxis: 0, zIndex: 3 },
                { name: `事件紀錄${viewLabel}`, data: eventData, color: '#f59e0b', yAxis: 0, zIndex: 3, fillOpacity: 0.1 },
                { name: `成交案件${viewLabel}`, data: wonData, color: '#8b5cf6', yAxis: 0, zIndex: 3, lineWidth: 3 }
            ],
            credits: { enabled: false },
            legend: { align: 'center', verticalAlign: 'top', borderWidth: 0 }
        });
        
        // 注入樣式
        this._ensureStyles();
    },

    /**
     * 渲染最新動態列表
     * @param {Array} feedData - 動態資料列表
     * @returns {string} HTML 字串 (僅回傳字串，由 Controller 注入 DOM)
     */
    renderActivityFeed(feedData) {
        if (!feedData || feedData.length === 0) return '<div class="alert alert-info">尚無最新動態</div>';
        
        const iconMap = { '系統事件': '⚙️', '會議討論': '📅', '事件報告': '📝', '電話聯繫': '📞', '郵件溝通': '📧', 'new_contact': '👤' };
        let html = '<ul class="activity-feed-list">';
        
        feedData.forEach(item => {
            html += `<li class="activity-feed-item">`;
            if (item.type === 'interaction') {
                const i = item.data;
                let contextLink = i.contextName || '系統活動';
                // 產生連結
                if (i.opportunityId) {
                    contextLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${i.opportunityId}' })">${i.contextName}</a>`;
                } else if (i.companyId && i.contextName !== '系統活動' && i.contextName !== '未知公司' && i.contextName !== '未指定') {
                    const encodedCompanyName = encodeURIComponent(i.contextName);
                    contextLink = `<a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('company-details', { companyName: '${encodedCompanyName}' })">${i.contextName}</a>`;
                }
                
                // 處理連結內容的 markdown 格式
                let summaryHTML = i.contentSummary || '';
                const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9]+)\)/g;
                summaryHTML = summaryHTML.replace(linkRegex, (fullMatch, text, eventId) => {
                    const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
                });

                html += `<div class="feed-icon">${iconMap[i.eventType] || '🔔'}</div>
                         <div class="feed-content">
                            <div class="feed-text"><strong>${i.recorder}</strong> 在 <strong>${contextLink}</strong> ${i.eventTitle ? `建立了${i.eventTitle}` : `新增了一筆${i.eventType}`}</div>
                            <div class="feed-summary">${summaryHTML}</div>
                            <div class="feed-time">${formatDateTime(i.interactionTime)}</div>
                         </div>`;
            } else if (item.type === 'new_contact') {
                const c = item.data;
                const creator = c.userNickname ? `<strong>${c.userNickname}</strong> 新增了潛在客戶:` : `<strong>新增潛在客戶:</strong>`;
                html += `<div class="feed-icon">${iconMap['new_contact']}</div>
                         <div class="feed-content">
                            <div class="feed-text">${creator} ${c.name || '(無姓名)'}</div>
                            <div class="feed-summary">🏢 ${c.company || '(無公司資訊)'}</div>
                            <div class="feed-time">${formatDateTime(c.createdTime)}</div>
                         </div>`;
            }
            html += `</li>`;
        });
        html += '</ul>';
        return html;
    },

    _ensureStyles() {
        if (!document.getElementById('dashboard-widget-styles')) {
            const style = document.createElement('style');
            style.id = 'dashboard-widget-styles';
            style.innerHTML = `
                /* 浮動資訊卡片 Tooltip 樣式 */
                .custom-tooltip {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    padding: 12px;
                    border-radius: 8px;
                    width: 220px;
                    z-index: 1000;
                    margin-top: 10px;
                    font-size: 0.85rem;
                    text-align: left;
                    color: var(--text-primary);
                }
                
                /* 三角形箭頭 */
                .custom-tooltip::before {
                    content: '';
                    position: absolute;
                    top: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 0 6px 6px 6px;
                    border-style: solid;
                    border-color: transparent transparent var(--border-color) transparent;
                }

                .stat-card:hover .custom-tooltip {
                    display: block;
                    animation: tooltipFadeIn 0.2s ease-out;
                }

                @keyframes tooltipFadeIn {
                    from { opacity: 0; transform: translate(-50%, 5px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }

                .tooltip-header {
                    font-weight: 700;
                    margin-bottom: 8px;
                    text-align: center;
                    color: var(--primary-color);
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 4px;
                }

                .tooltip-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }

                .tooltip-divider {
                    height: 1px;
                    background: var(--border-color);
                    margin: 8px 0;
                }

                .tooltip-subtitle {
                    font-weight: 600;
                    margin-bottom: 4px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .tooltip-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    max-height: 150px;
                    overflow-y: auto;
                }

                .tooltip-list li {
                    padding: 2px 0;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .tooltip-list li.more {
                    color: var(--text-muted);
                    font-style: italic;
                    text-align: center;
                    margin-top: 4px;
                }

                .text-success { color: #10b981; font-weight: 600; }
                .text-danger { color: #ef4444; font-weight: 600; }
            `;
            document.head.appendChild(style);
        }
    }
};

window.DashboardWidgets = DashboardWidgets;
</file>

<file path="public/scripts/dashboard/dashboard.js">
// File: public/scripts/dashboard/dashboard.js
// ============================================================================
// File: public/scripts/dashboard/dashboard.js
// ============================================================================
/**
 * public/scripts/dashboard/dashboard.js
 * @version 3.4.4
 * @date 2026-04-29
 * @changelog
 * - [PHASE T2.1] Dashboard Phase T2.1 Trend Widget final semantics alignment.
 * - [PHASE T2] Official release of Dashboard Trend Widget with Cumulative view.
 * - [PHASE T1/T1.1] Replaced announcement widget with KPI Trend Widget.
 * - removed unfinished dashboard analytical range UI from production
 * - preserved backend range capability for future use
 * - stabilized dashboard for archive/release
 * - [PHASE D-2] analytical dashboard range filter UI added (Rolled back)
 * - [PHASE D-2] UI wired to backend safe-range API (Rolled back)
 * - [PHASE D-2] operational widgets intentionally left unaffected
 * - RAW contacts dashboard stats made non-blocking
 * - dashboard initial render no longer waits for Google Sheet contact stats
 * - Phase 8.10 - Mutation-Driven Stale Refresh Strategy
 * @description Dashboard UI Controller. 
 * * [Performance Fix] Removed redundant client-side fetch of /api/interactions/all. 
 * * effectiveLastActivity is now strictly sourced from backend SQL aggregation with strict null/NaN guarding.
 * * [Performance Fix] Added SPA loaded flag setter to prevent redundant re-fetches on route navigation.
 * * [Architecture Fix] Added markStale() to support mutation-driven dashboard invalidation without breaking fast SPA navigation.
 */

const dashboardManager = {
    // 狀態變數
    kanbanRawData: {},
    processedOpportunities: [], 
    availableYears: [], 

    /**
     * 標記儀表板資料為過期 (Stale)
     * 當發生會影響統計的資料變更 (如新增/編輯/刪除事件) 時呼叫此函式，
     * 使得下次進入儀表板時能觸發重新整理，而不破壞 SPA 快速切換的機制。
     */
    markStale() {
        if (window.CRM_APP && window.CRM_APP.pageConfig && window.CRM_APP.pageConfig['dashboard']) {
            window.CRM_APP.pageConfig['dashboard'].loaded = false;
            console.log('⚠️ [Dashboard] 已標記為過期 (Stale)，下次進入將重新載入');
        }
    },

    /**
     * 初始化與刷新儀表板資料
     * @param {boolean} force - 是否強制從後端刷新 (忽略快取)
     */
    async refresh(force = false) {
        console.log(`🔄 [Dashboard] 執行儀表板刷新... (強制: ${force})`);
        
        // 呼叫 UI 管家顯示全域 Loading
        if (window.DashboardUI) DashboardUI.showGlobalLoading('正在同步儀表板資料...');

        // Note: Backend range filtering is supported via ?range=, ?start=, ?end=
        // but UI controls have been removed for stabilization.
        const dashboardApiUrl = force ? `/api/dashboard?t=${Date.now()}` : '/api/dashboard';

        try {
            // 1. 併發請求資料 (已移除贅餘的 interactions/all 請求)
            const [dashboardResult] = await Promise.all([
                authedFetch(dashboardApiUrl)
            ]);

            if (!dashboardResult.success) throw new Error(dashboardResult.details || '獲取儀表板資料失敗');

            const data = dashboardResult.data;
            this.kanbanRawData = data.kanbanData || {};
            
            // 2. 資料處理：計算年份 (effectiveLastActivity 已由後端提供)
            const allOpportunities = Object.values(this.kanbanRawData).flatMap(stage => stage.opportunities);
            const yearSet = new Set();
            
            this.processedOpportunities = allOpportunities.map(item => {
                // 安全防呆：嚴格檢查是否為 null, undefined 或 NaN，避免誤判有效數值
                if (typeof item.effectiveLastActivity !== 'number' || Number.isNaN(item.effectiveLastActivity)) {
                    item.effectiveLastActivity = new Date(item.lastUpdateTime || item.createdTime).getTime();
                }
                
                const year = item.createdTime ? new Date(item.createdTime).getFullYear() : null;
                item.creationYear = year;
                if(year) yearSet.add(year);
                
                return item;
            });
            this.availableYears = Array.from(yearSet).sort((a, b) => b - a); 

            // 3. 呼叫子模組進行渲染
            
            // A. 基礎 Widgets
            if (window.DashboardWidgets) {
                DashboardWidgets.renderStats(data.stats);
                
                // 渲染業務趨勢分析圖表
                if (data.trendData) {
                    DashboardWidgets.renderTrendWidget(data.trendData, 'ytd', 'monthly');
                }
                
                const activityWidget = document.querySelector('#activity-feed-widget .widget-content');
                if (activityWidget) {
                    activityWidget.innerHTML = DashboardWidgets.renderActivityFeed(data.recentActivity || []);
                }
            }

            // B. 週間業務 (Weekly)
            if (window.DashboardWeekly) {
                DashboardWeekly.render(data.weeklyBusiness || [], data.thisWeekInfo);
            }

            // C. 看板 (Kanban)
            if (window.DashboardKanban) {
                // Fix Initialization Race Condition
                DashboardKanban.init((forceRefresh) => this.refresh(forceRefresh));
                
                // 更新資料並渲染
                DashboardKanban.update(
                    this.processedOpportunities, 
                    this.kanbanRawData, 
                    this.availableYears
                );
            }

            // D. 地圖 (Map)
            if (window.mapManager) {
                await window.mapManager.update();
            }

            // 標記為已載入，遵循 SPA 快取機制避免路由切換時重複請求，並清除 Stale 狀態
            if (window.CRM_APP && window.CRM_APP.pageConfig && window.CRM_APP.pageConfig['dashboard']) {
                window.CRM_APP.pageConfig['dashboard'].loaded = true;
            }

            // [PHASE C-2.4] Non-blocking fetch for slow RAW contacts stats (不受範圍過濾影響)
            authedFetch('/api/dashboard/contacts-stats').then(res => {
                if (res.success && res.data) {
                    const elCount = document.getElementById('contacts-count');
                    if (elCount) elCount.textContent = res.data.total;
                    if (window.DashboardWidgets && typeof window.DashboardWidgets._updateTrend === 'function') {
                        window.DashboardWidgets._updateTrend('contacts-trend', res.data.month);
                    }
                }
            }).catch(err => console.error('[Dashboard] 載入潛在客戶統計失敗:', err));

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                console.error("[Dashboard] 刷新儀表板時發生錯誤:", error);
                showNotification("儀表板刷新失敗", "error");
            }
        } finally {
            if (window.DashboardUI) DashboardUI.hideGlobalLoading();
            console.log('✅ [Dashboard] 儀表板刷新完成');
        }
    },
    
    /**
     * 強制重新整理 (清除快取並重載)
     */
    forceRefresh: async function() {
        if (window.DashboardUI) DashboardUI.showGlobalLoading('正在強制同步所有資料...');
        let currentPageName = 'dashboard'; 
        let currentPageParams = {};

        try {
            const currentHash = window.location.hash.substring(1);
            if (currentHash && window.CRM_APP.pageConfig[currentHash.split('?')[0]]) {
                const [pageName, paramsString] = currentHash.split('?');
                currentPageName = pageName;
                if (paramsString) {
                    try {
                        currentPageParams = Object.fromEntries(new URLSearchParams(paramsString));
                        Object.keys(currentPageParams).forEach(key => {
                            currentPageParams[key] = decodeURIComponent(currentPageParams[key]);
                        });
                    } catch (e) {
                        console.warn(`[Dashboard] 解析 forceRefresh 的 URL 參數失敗: ${paramsString}`, e);
                        currentPageParams = {};
                    }
                }
            }
            
            await authedFetch('/api/cache/invalidate', { method: 'POST' });
            showNotification('後端快取已清除，正在重新載入...', 'info');

            Object.keys(window.CRM_APP.pageConfig).forEach(key => {
                 if (!key.includes('-details')) { 
                     window.CRM_APP.pageConfig[key].loaded = false;
                 }
            });

            await this.refresh(true);

            showNotification('所有資料已強制同步！正在重新整理目前頁面...', 'success');

            await new Promise(resolve => setTimeout(resolve, 150));
            await window.CRM_APP.navigateTo(currentPageName, currentPageParams, false);

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                console.error("[Dashboard] 強制刷新失敗:", error);
                showNotification("強制刷新失敗，請稍後再試。", "error");
            }
            if (window.DashboardUI) DashboardUI.hideGlobalLoading();
        } finally {
            if (window.DashboardUI) DashboardUI.hideGlobalLoading();
        }
    },

    /**
     * 觸發本地開發用的佈局網格輔助線
     */
    toggleLayoutGrid() {
        const grid = document.querySelector('.dashboard-grid-flexible');
        if (grid) {
            grid.classList.toggle('debug-grid');
        }
    }
};

window.dashboardManager = dashboardManager;

if (typeof CRM_APP === 'undefined') {
    window.CRM_APP = { systemConfig: {} };
}

// ============================================================================
// Environment-Specific Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const devToggleBtn = document.getElementById('dev-layout-toggle-btn');
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (devToggleBtn && isLocalDev) {
        devToggleBtn.style.display = '';
    }
});
</file>

</files>
