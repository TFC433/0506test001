/**
 * public/scripts/services/ui.js
 * * 職責：管理所有全域 UI 元素，如彈窗、通知、面板、載入畫面和共用元件渲染器
 * * @version 6.3.1 (Phase 8.3 Toast Extensibility Patch)
 * * @date 2026-03-17
 * @description
 * 1. [UX Polish] Relocated toast notifications from bottom-right to top-right.
 * 2. [UX Polish] Applied SaaS-style background colors to toast types (Success=White, Error/Info=Light Red, Warning=Light Orange).
 * 3. [Bugfix] Auto-creation of `#toast-container` remains to prevent silent failures.
 * 4. Retained legacy adapters (`renderPagination`, `showBusinessCardPreview`, `showConfirmDialog`).
 * 5. [Patch] Extended `showToast` to support optional HTML rendering and persistent display modes.
 */

let zIndexCounter = 3000;
window.confirmActionCallback = null;
let currentPreviewDriveLink = null;

// ==========================================
// Toast Notification System (Modern UI)
// ==========================================

function injectToastStyles() {
    if (document.getElementById('crm-toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'crm-toast-styles';
    style.textContent = `
        #toast-container {
            position: fixed;
            top: 28px;
            right: 28px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        }
        .toast {
            background: var(--card-bg, #ffffff);
            color: var(--text-primary, #334155);
            padding: 14px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border-color, #e2e8f0);
            border-left: 4px solid #cbd5e1;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.5;
            pointer-events: auto;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.21, 1.02, 0.73, 1), opacity 0.4s ease;
            max-width: 380px;
            min-width: 250px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        /* Type Accents & Backgrounds */
        .toast-success { border-left-color: #10b981; background: #ffffff; }
        .toast-error { border-left-color: #ef4444; background: #fef2f2; }
        .toast-info { border-left-color: #ef4444; background: #fef2f2; } /* visually mirrors error for block/warning UX */
        .toast-warning { border-left-color: #f59e0b; background: #fffbeb; }

        /* Dark Mode Support Overrides */
        [data-theme="dark"] .toast {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        [data-theme="dark"] .toast-success { background: #1e293b; color: #f8fafc; border-color: #334155; }
        [data-theme="dark"] .toast-error, [data-theme="dark"] .toast-info { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
        [data-theme="dark"] .toast-warning { background: #451a03; color: #fde68a; border-color: #78350f; }
        
        /* Inline SVG Icons for Polish */
        .toast::before {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            margin-top: 1px;
        }
        .toast-success::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'%3E%3C/path%3E%3Cpolyline points='22 4 12 14.01 9 11.01'%3E%3C/polyline%3E%3C/svg%3E");
        }
        .toast-error::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='15' y1='9' x2='9' y2='15'%3E%3C/line%3E%3Cline x1='9' y1='9' x2='15' y2='15'%3E%3C/line%3E%3C/svg%3E");
        }
        .toast-info::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='16' x2='12' y2='12'%3E%3C/line%3E%3Cline x1='12' y1='8' x2='12.01' y2='8'%3E%3C/line%3E%3C/svg%3E");
        }
        .toast-warning::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'%3E%3C/path%3E%3Cline x1='12' y1='9' x2='12' y2='13'%3E%3C/line%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E");
        }
    `;
    document.head.appendChild(style);
}

function showToast(message, type = 'info', duration = 3000, options = {}) {
    // 1. Ensure our modern CSS is injected
    injectToastStyles();

    let toastContainer = document.getElementById('toast-container');
    
    // 2. Auto-create the toast container if it does not exist in the layout
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // 3. Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // 4. Content wrapper to ensure text aligns properly next to the injected ::before icon
    const textWrapper = document.createElement('div');
    textWrapper.style.flex = '1';
    
    if (options.allowHtml) {
        textWrapper.innerHTML = message;
    } else {
        textWrapper.textContent = message;
    }
    
    toast.appendChild(textWrapper);

    toastContainer.appendChild(toast);

    // 5. Trigger reflow for slide-in animation
    void toast.offsetWidth;
    toast.classList.add('show');

    // 6. Auto-dismiss (only when not persistent and duration is positive)
    if (!options.persistent && duration > 0) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400); // Matches the new 0.4s CSS transition
        }, duration);
    }
}

// ==========================================
// Shared Modals & UI Loaders
// ==========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        zIndexCounter++; 
        modal.style.zIndex = zIndexCounter; 
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; 
    } else {
        console.error(`[UI] Error: Modal with ID "${modalId}" not found.`);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        const anyModalOpen = document.querySelector('.modal[style*="display: block"]');
        if (!anyModalOpen) {
            document.body.style.overflow = ''; 
        }
    }
}

function showLoading(message = '載入中...') {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    if (overlay && text) {
        text.textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function confirmAction(message, callback) {
    const modal = document.getElementById('confirm-modal');
    const msgElement = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('btn-confirm-yes');

    if (modal && msgElement && confirmBtn) {
        msgElement.textContent = message;

        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.addEventListener('click', () => {
            closeModal('confirm-modal');
            if (callback) callback();
        });

        showModal('confirm-modal');
    } else {
        if (confirm(message)) {
            if (callback) callback();
        }
    }
}

// ==========================================
// Status Chips & Renderers
// ==========================================

function renderStatusChip(status) {
    if (!status) return '';

    const statusColors = {
        'New': 'bg-blue-100 text-blue-800',
        'Contacted': 'bg-yellow-100 text-yellow-800',
        'Qualified': 'bg-green-100 text-green-800',
        'Lost': 'bg-red-100 text-red-800',
        'Won': 'bg-purple-100 text-purple-800',
        'Pending': 'bg-gray-100 text-gray-800'
    };

    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${colorClass}">${status}</span>`;
}

function renderPriorityChip(priority) {
    if (!priority) return '';

    const priorityColors = {
        'High': 'text-red-600 font-bold',
        'Medium': 'text-yellow-600 font-medium',
        'Low': 'text-green-600'
    };

    const classStr = priorityColors[priority] || 'text-gray-500';
    return `<span class="${classStr}">${priority}</span>`;
}

async function showBusinessCardPreview(driveLink) {
    currentPreviewDriveLink = driveLink;

    const contentArea = document.getElementById('business-card-preview-content');
    const modalId = 'business-card-preview-modal';

    if (!contentArea) {
        showToast('無法開啟預覽：UI 元件缺失', 'error');
        return;
    }

    contentArea.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem;">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">正在讀取高清影像...</p>
        </div>
    `;

    showModal(modalId);

    const proxyUrl = `/api/drive/thumbnail?link=${encodeURIComponent(driveLink)}`;
    const img = new Image();

    img.onload = () => {
        if (currentPreviewDriveLink !== driveLink) return;

        contentArea.innerHTML = ''; 

        const linkWrapper = document.createElement('a');
        linkWrapper.href = driveLink;   
        linkWrapper.target = '_blank';  
        linkWrapper.title = '點擊開啟原始檔案 (Google Drive)';
        linkWrapper.style.display = 'block';
        linkWrapper.style.textAlign = 'center';
        linkWrapper.style.cursor = 'zoom-in'; 

        img.style.maxWidth = '100%';
        img.style.maxHeight = '70vh'; 
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        img.style.borderRadius = '4px';
        img.style.border = '1px solid #eee';

        linkWrapper.appendChild(img);
        contentArea.appendChild(linkWrapper);

        const hint = document.createElement('div');
        hint.innerHTML = '<small style="color: #888; margin-top: 8px; display: block;"><i class="fas fa-external-link-alt"></i> 點擊圖片可開啟原檔</small>';
        hint.style.textAlign = 'center';
        contentArea.appendChild(hint);
    };

    img.onerror = () => {
        if (currentPreviewDriveLink !== driveLink) return;
        console.warn('[UI] 名片預覽載入失敗');

        contentArea.innerHTML = `
            <div class="alert alert-warning" style="text-align: center; margin: 1rem;">
                <p><strong>預覽載入失敗</strong></p>
                <p class="text-muted small">無法直接顯示此圖片。</p>
                <a href="${driveLink}" target="_blank" class="btn btn-primary btn-sm mt-2">
                    <i class="fas fa-external-link-alt"></i> 開啟 Google Drive 原檔
                </a>
            </div>
        `;
    };

    img.src = proxyUrl;
}

function closeBusinessCardPreview() {
    currentPreviewDriveLink = null;

    const contentArea = document.getElementById('business-card-preview-content');

    const iframe = document.getElementById('business-card-iframe');
    if (iframe) {
        iframe.src = 'about:blank';
        iframe.remove();
    }

    if (contentArea) {
        contentArea.innerHTML = '';
    }

    closeModal('business-card-preview-modal');
}

function renderPagination(containerId, pagination, callbackName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!pagination || !pagination.totalItems || pagination.totalItems <= 0) {
        container.innerHTML = '';
        return;
    }

    const current = Number(pagination.current) || 1;
    const total = Number(pagination.total) || 1;
    const hasNext = !!pagination.hasNext;
    const hasPrev = !!pagination.hasPrev;

    container.innerHTML = `
        <div class="pagination-wrap" style="display:flex; gap:12px; align-items:center; justify-content:center;">
            <button type="button" class="pagination-btn" id="${containerId}-prev" ${hasPrev ? '' : 'disabled'}>
                <i class="fas fa-chevron-left"></i> 上一頁
            </button>
            <span class="pagination-info">第 ${current} 頁 / 共 ${total} 頁</span>
            <button type="button" class="pagination-btn" id="${containerId}-next" ${hasNext ? '' : 'disabled'}>
                下一頁 <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    const prevBtn = document.getElementById(`${containerId}-prev`);
    const nextBtn = document.getElementById(`${containerId}-next`);

    const invoke = (page) => {
        const fn = window[callbackName];
        if (typeof fn !== 'function') {
            console.warn(`[UI] renderPagination: callback "${callbackName}" not found on window.`);
            return;
        }
        fn(page);
    };

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!hasPrev) return;
            invoke(Math.max(1, current - 1));
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (!hasNext) return;
            invoke(Math.min(total, current + 1));
        });
    }
}

// Native Exports
window.showModal = showModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.confirmAction = confirmAction;
window.renderStatusChip = renderStatusChip;
window.renderPriorityChip = renderPriorityChip;
window.showBusinessCardPreview = showBusinessCardPreview;
window.closeBusinessCardPreview = closeBusinessCardPreview;

// Adapter Layer
window.renderPagination = renderPagination;

// Legacy Aliases
window.showNotification = showToast;         
window.showConfirmDialog = confirmAction;