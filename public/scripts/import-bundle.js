// public/scripts/import-bundle.js
/**
 * @version 1.0.1
 * @date 2026-04-22
 * @changelog
 * - [1.0.1] Bug Fix: Added newly split internal-ops render modules to the load chain to resolve "Render function missing" runtime errors.
 */
// 職責：僅作為腳本引用的集中管理處，不含任何業務邏輯

const scripts = [
    "scripts/core/theme-toggle.js",
    // "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js", // 已移至 HTML head 避免阻塞
    "scripts/core/utils.js",
    "scripts/services/api.js",
    "scripts/services/ui.js",
    "scripts/services/charting.js",
    "scripts/core/constants.js",
    "scripts/core/layout-manager.js",
    "scripts/core/sync-service.js",
    "scripts/core/router.js",
    "scripts/core/main.js",
    "scripts/components/chip-wall.js",
    "scripts/meetings.js",
    "scripts/interactions.js",
    "scripts/announcements.js",
    "scripts/map-manager.js",
    "scripts/kanban-board.js",
    "scripts/contacts/contact-potential-manager.js",
    "scripts/contacts/contacts.js",
    "scripts/opportunities/opportunities.js",
    "scripts/sales/sales-analysis-helper.js",
    "scripts/sales/sales-analysis-components.js",
    "scripts/sales/sales-analysis.js",
    "scripts/opportunities/details/opportunity-stepper.js",
    "scripts/opportunities/details/opportunity-interactions.js",
    "scripts/opportunities/details/opportunity-associated-contacts.js",
    "scripts/opportunities/details/opportunity-event-reports.js",
    "scripts/opportunities/details/opportunity-info-view.js",
    "scripts/opportunities/details/opportunity-details-components.js",
    "scripts/opportunities/opportunity-details-events.js",
    "scripts/opportunities/opportunity-details.js",
    "scripts/opportunities/opportunity-modals.js",
    "scripts/events/event-charts.js",
    "scripts/events/event-list.js",
    "scripts/events/event-report-manager.js",
    "scripts/events/event-wizard.js",
    "scripts/events/event-modal-manager.js",
    "scripts/events/event-editor-standalone.js",
    "scripts/events/events.js",
    "scripts/weekly/weekly-business.js",
    "scripts/companies/company-list.js",
    "scripts/companies/company-details-ui.js",
    "scripts/companies/company-details-events.js",
    "scripts/companies/companies.js",
    "scripts/dashboard/dashboard_ui.js",
    "scripts/dashboard/dashboard_widgets.js",
    "scripts/dashboard/dashboard_weekly.js",
    "scripts/dashboard/dashboard_kanban.js",
    "scripts/dashboard/dashboard.js",
    
    // ★★★ 【新增】商品模組腳本 ★★★
    "scripts/products/products.js",
    "scripts/products/product-detail-modal.js",

    // ★★★ 【新增】內部運營模組腳本 ★★★
    "scripts/internal-ops/internal-ops-dev-projects.js",
    "scripts/internal-ops/internal-ops-team-workload.js",
    "scripts/internal-ops/internal-ops-subscriptions.js",
    "scripts/internal-ops/internal-ops.js"

];

// 依照順序同步寫入標籤，這與直接寫在 HTML 效果完全一樣
scripts.forEach(src => {
    document.write(`<script src="${src}" charset="UTF-8"></script>`);
});