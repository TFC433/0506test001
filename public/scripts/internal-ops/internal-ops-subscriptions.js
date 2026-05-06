// public/scripts/internal-ops/internal-ops-subscriptions.js
/**
 * @version 1.0.0 (Extracted from internal-ops.js Phase 4.8)
 * @date 2026-04-22
 * @description 負責「訂閱制管理」區塊的資料渲染邏輯
 */

window.renderSubscriptions = function(data) {
    const rows = data.map(item => `
        <tr>
            <td><strong>${item.customerName || '-'}</strong></td>
            <td>${item.companyName || '-'}</td>
            <td>${item.productName || '-'}</td>
            <td>${item.planName || '-'}</td>
            <td>${item.assigneeName || '-'}</td>
            <td>${item.subStatus || '-'}</td>
            <td>${item.renewalDate || '-'}</td>
            <td>${item.nextActionDate || '-'}</td>
            <td>${item.msgStatus || '-'}</td>
            <td>${item.emailStatus || '-'}</td>
            <td>
                <div class="internal-ops-actions">
                    <button class="internal-ops-btn" onclick="alert('TODO: 編輯訂閱 ${item.subId}')">編輯</button>
                    <button class="internal-ops-btn" onclick="alert('TODO: 刪除訂閱 ${item.subId}')" style="color: #d32f2f;">刪除</button>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <table class="internal-ops-table">
            <thead>
                <tr>
                    <th>客戶名稱</th>
                    <th>公司名稱</th>
                    <th>商品名稱</th>
                    <th>方案名稱</th>
                    <th>負責人</th>
                    <th>訂閱狀態</th>
                    <th>續約日期</th>
                    <th>下次行動</th>
                    <th>訊息狀態</th>
                    <th>Email狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};