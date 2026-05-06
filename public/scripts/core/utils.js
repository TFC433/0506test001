// public/scripts/core/utils.js
// @version 1.0.1
// @date 2026-04-28
// @changelog 
// - Added User Dropdown D2 logic (toggle User Dropdown, close on outside click, safely close on Escape).

// ==================== 全域變數與設定 ====================
let searchDebounceTimer;

// ==================== 通用資料處理函式 ====================

// Debounce utility for search inputs
function handleSearch(searchFunction, delay = 400) {
    clearTimeout(searchDebounceTimer); // Clear existing timer
    searchDebounceTimer = setTimeout(() => {
        if (typeof searchFunction === 'function') {
            searchFunction(); // Execute the search
        }
    }, delay); // Wait for specified delay
}

// ==================== 通用工具函式 ====================

// Formats date string (accepts ISO string, Date object, or timestamp number)
function formatDateTime(dateInput) {
    if (!dateInput) return '-'; // Return dash if input is null, undefined, or empty string

    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        // [Strict Digital Forensics Patch] UTC Naive String Normalization
        // Supabase/PostgreSQL 'timestamp' returns naive ISO strings without 'Z'.
        // JS new Date() parses naive 'T' strings as Local Time. Append 'Z' to force UTC.
        let safeInput = dateInput;
        if (typeof safeInput === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(safeInput)) {
            safeInput += 'Z';
        }
        // Try parsing string or number
        date = new Date(safeInput);
    }

    // Check if the resulting date is valid
    if (isNaN(date.getTime())) {
        console.warn(`[Util] Invalid date input for formatDateTime:`, dateInput);
        // Return the original input or a placeholder if it's invalid
        return typeof dateInput === 'string' ? dateInput.split('T')[0] : '無效日期'; // Show at least the date part if possible
    }

    // Use Intl.DateTimeFormat for locale-aware formatting
    try {
        return new Intl.DateTimeFormat('zh-TW', { // Taiwan locale
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false // 24-hour format
        }).format(date).replace(/\//g, '-'); // Replace slashes with dashes
    } catch (error) {
        console.error("[Util] Error formatting date:", error);
        // Fallback formatting
        return date.toISOString().slice(0, 16).replace('T', ' ');
    }
}

// Close modal on escape key press
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // Find the topmost visible modal
        const modals = Array.from(document.querySelectorAll('.modal[style*="display: block"]'));
        if (modals.length > 0) {
            // Sort by z-index descending to find the top one
            modals.sort((a, b) => (parseInt(b.style.zIndex || 0)) - (parseInt(a.style.zIndex || 0)));
            const topModal = modals[0];
            console.log(`[UI] Escape key pressed, closing modal: #${topModal.id}`);
            closeModal(topModal.id); // closeModal is now in ui.js, but loaded globally
        }
        // Also close panel if open
        const panel = document.getElementById('active-panel');
        if (panel && panel.classList.contains('is-open')) {
            console.log(`[UI] Escape key pressed, closing panel.`);
            closePanel(); // closePanel is now in ui.js, but loaded globally
        }
        
        // [D2 Patch] Safely close User Dropdown menu
        if (typeof window.closeUserDropdown === 'function') {
            window.closeUserDropdown();
        }
    }
});

// Detect county from address string
function detectCountyFromAddress(address) {
    if (!address || typeof address !== 'string') return null;
    // Use a more robust list including common variations if needed
    const counties = ['臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市', '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', /* Add '台' variations if common in data */ '台北市', '台中市', '台南市', '台東縣'];
    // Find the first matching county name (case-insensitive check might be better)
    for (let county of counties) {
        if (address.includes(county)) {
            // Return the standard '臺' version
            return county.replace('台', '臺');
        }
    }
    return null; // No match found
}

// Auto-populate county dropdown based on address data
function populateCountyFromAddress(dataObject, countySelectId) {
    const countySelect = document.getElementById(countySelectId);
    if (!countySelect) {
        console.warn(`[Util] County select element #${countySelectId} not found.`);
        return;
    }
    // Reset selection first
    countySelect.selectedIndex = 0;

    if (!dataObject || !dataObject.address) return; // Exit if no address data

    const detectedCounty = detectCountyFromAddress(dataObject.address);
    if (detectedCounty) {
        let found = false;
        // Iterate through options to find and select the match
        for (let option of countySelect.options) {
            if (option.value === detectedCounty) {
                option.selected = true;
                found = true;
                console.log(`[Util] Auto-selected county: ${detectedCounty} for #${countySelectId}`);
                if (typeof showNotification === 'function') {
                    showNotification(`已自動辨識縣市：${detectedCounty}`, 'info', 1500); // Shorter duration
                }
                break;
            }
        }
        if (!found) {
            console.warn(`[Util] Detected county "${detectedCounty}" not found in select options for #${countySelectId}.`);
        }
    } else {
        console.log(`[Util] Could not detect county from address for #${countySelectId}.`);
    }
}

// *** 函數從 opportunity-modals.js 移入 ***
/**
 * 填充下拉選單 (來自 opportunity-modals.js)
 * @param {string} selectId - 下拉選單的 ID
 * @param {Array<object>} options - 選項陣列 [{value: '...', note: '...'}]
 * @param {string} [selectedValue] - (可選) 預設選中的值
 */
function populateSelect(selectId, options, selectedValue) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">請選擇...</option>';
    (options || []).forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.note || option.value;
        if (option.value === selectedValue) optionElement.selected = true;
        select.appendChild(optionElement);
    });
}

// *** 函數從 opportunity-modals.js 移入 ***
/**
 * 填充縣市下拉選單 (來自 opportunity-modals.js)
 * @param {string} selectId - 下拉選單的 ID
 */
function populateCountyDropdown(selectId) {
    const counties = ["臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣"];
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">請選擇縣市...</option>';
    counties.forEach(county => {
        select.innerHTML += `<option value="${county}">${county}</option>`;
    });
}

// Add CSS for pagination buttons if not already present
const paginationStyleId = 'pagination-styles';
if (!document.getElementById(paginationStyleId)) {
    const style = document.createElement('style');
    style.id = paginationStyleId;
    style.innerHTML = `
        .pagination { display: flex; align-items: center; justify-content: center; gap: var(--spacing-2); margin-top: var(--spacing-4); }
        .pagination-btn {
            padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border-color);
            background: var(--glass-bg); color: var(--text-secondary); border-radius: var(--rounded-md);
            cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: all 0.2s ease;
        }
        .pagination-btn:hover:not(:disabled) { background: var(--accent-blue); color: white; border-color: var(--accent-blue); }
        .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination-info { color: var(--text-muted); font-size: var(--font-size-sm); margin: 0 var(--spacing-2); }
    `;
    document.head.appendChild(style);
}

// Add CSS for notification animations if not already present
const notificationAnimationStyleId = 'notification-animation-styles';
if (!document.getElementById(notificationAnimationStyleId)) {
    const style = document.createElement('style');
    style.id = notificationAnimationStyleId;
    style.innerHTML = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .notification { animation: slideInRight 0.3s ease forwards; }
    `;
    document.head.appendChild(style);
}


// ==================== Header User Dropdown (D2 Patch) ====================

// Toggle dropdown visibility and block event bubbling to avoid instant closure
window.toggleUserDropdown = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const container = document.getElementById('user-dropdown-container');
    if (container) {
        container.classList.toggle('open');
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) {
            menu.setAttribute('aria-hidden', !container.classList.contains('open'));
        }
    }
};

// Close dropdown if it is currently open
window.closeUserDropdown = function() {
    const container = document.getElementById('user-dropdown-container');
    if (container && container.classList.contains('open')) {
        container.classList.remove('open');
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) {
            menu.setAttribute('aria-hidden', 'true');
        }
    }
};

// Global click-outside listener
document.addEventListener('click', function(event) {
    if (!event.target.closest('.user-dropdown-container')) {
        if (typeof window.closeUserDropdown === 'function') {
            window.closeUserDropdown();
        }
    }
});