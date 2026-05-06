/**
 * public/scripts/announcements.js
 * @version 1.1.0
 * @date 2026-03-12
 * @changelog
 * - [Patch] Added dashboardManager.markStale() on successful mutations (create/update, delete).
 */
// views/scripts/announcements.js (Event Delegation Refactor)

async function loadAnnouncementsPage() {
    const container = document.getElementById('page-announcements');
    if (!container) return;

    container.innerHTML = `
        <div class="dashboard-widget">
            <div class="widget-header">
                <h2 class="widget-title">佈告欄管理</h2>
                <button class="action-btn primary" data-action="open-modal">＋ 新增公告</button>
            </div>
            <div id="announcements-list-content" class="widget-content">
                <div class="loading show"><div class="spinner"></div><p>載入公告列表中...</p></div>
            </div>
        </div>
    `;

    // 綁定事件委派
    container.removeEventListener('click', handleAnnouncementClick);
    container.addEventListener('click', handleAnnouncementClick);

    try {
        const result = await authedFetch('/api/announcements');
        if (!result.success) throw new Error(result.error);
        renderAnnouncementsList(result.data || []);
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            document.getElementById('announcements-list-content').innerHTML = `<div class="alert alert-error">載入公告列表失敗: ${error.message}</div>`;
        }
    }
}

function handleAnnouncementClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const payload = btn.dataset;

    switch (action) {
        case 'open-modal':
            const item = payload.item ? JSON.parse(payload.item) : null;
            showAnnouncementModal(item);
            break;
        case 'delete':
            confirmDeleteAnnouncement(payload.id, payload.title);
            break;
    }
}

function renderAnnouncementsList(announcements) {
    const container = document.getElementById('announcements-list-content');
    if (announcements.length === 0) {
        container.innerHTML = '<div class="alert alert-info" style="text-align:center;">目前沒有任何公告</div>';
        return;
    }

    let tableHTML = `
        <table class="data-table"><thead><tr><th>標題</th><th>建立者</th><th>最後更新</th><th>狀態</th><th>操作</th></tr></thead><tbody>
    `;

    announcements.forEach(item => {
        const isPinnedIcon = item.isPinned ? '📌' : '';
        // 安全序列化 item
        const itemJson = JSON.stringify(item).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        tableHTML += `
            <tr>
                <td data-label="標題"><strong>${isPinnedIcon} ${item.title}</strong></td>
                <td data-label="建立者">${item.creator}</td>
                <td data-label="最後更新">${formatDateTime(item.lastUpdateTime)}</td>
                <td data-label="狀態"><span class="card-tag ${item.status === '已發布' ? 'type' : 'assignee'}">${item.status}</span></td>
                <td data-label="操作">
                    <div class="action-buttons-container">
                        <button class="action-btn small warn" data-action="open-modal" data-item='${itemJson}'>✏️ 編輯</button>
                        <button class="action-btn small danger" data-action="delete" data-id="${item.id}" data-title="${item.title.replace(/"/g, '&quot;')}">🗑️ 刪除</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function showAnnouncementModal(item = null) {
    const isEditMode = item !== null;
    document.getElementById('announcement-form').reset();
    
    const systemConfig = window.CRM_APP?.systemConfig || {};
    const configItems = systemConfig['佈告欄設定'] || [];
    const rowConfig = configItems.find(i => i.value === '輸入框行數');
    const rowsCount = rowConfig ? (parseInt(rowConfig.note) || 8) : 8;

    const contentTextarea = document.getElementById('announcement-content');
    if (contentTextarea) {
        contentTextarea.rows = rowsCount;
        contentTextarea.style.height = 'auto'; 
    }

    document.getElementById('announcement-modal-title').textContent = isEditMode ? '編輯公告' : '新增公告';
    document.getElementById('announcement-id').value = isEditMode ? item.id : '';
    document.getElementById('announcement-title').value = isEditMode ? item.title : '';
    document.getElementById('announcement-content').value = isEditMode ? item.content : '';
    document.getElementById('announcement-status').value = isEditMode ? item.status : '已發布';
    document.getElementById('announcement-is-pinned').checked = isEditMode ? item.isPinned : false;
    
    showModal('announcement-modal');
}

async function handleAnnouncementFormSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('announcement-id').value;
    const isEditMode = !!id;

    const data = {
        title: document.getElementById('announcement-title').value,
        content: document.getElementById('announcement-content').value,
        status: document.getElementById('announcement-status').value,
        isPinned: document.getElementById('announcement-is-pinned').checked
    };

    showLoading(isEditMode ? '正在更新...' : '正在新增...');
    try {
        const url = isEditMode ? `/api/announcements/${id}` : '/api/announcements';
        const method = isEditMode ? 'PUT' : 'POST';
        const result = await authedFetch(url, { method, body: JSON.stringify(data) });
        if (!result.success) throw new Error(result.error);
        
        if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
            window.dashboardManager.markStale();
        }

        closeModal('announcement-modal');
        // authedFetch 會自動觸發資料重載，這裡不需要手動呼叫
    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`操作失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function confirmDeleteAnnouncement(id, title) {
    showConfirmDialog(`您確定要刪除公告 "${title}" 嗎？此操作無法復原。`, async () => {
        showLoading('正在刪除...');
        try {
            const result = await authedFetch(`/api/announcements/${id}`, { method: 'DELETE' });
            if (!result.success) throw new Error(result.error);

            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }

        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`刪除失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 綁定表單提交 (Modal 內的表單通常是靜態存在的，或者每次 showModal 前會重置，直接綁 document 委派最安全)
    document.addEventListener('submit', (event) => {
        if (event.target.id === 'announcement-form') {
            handleAnnouncementFormSubmit(event);
        }
    });
});

if (window.CRM_APP) {
    window.CRM_APP.pageModules.announcements = loadAnnouncementsPage;
}