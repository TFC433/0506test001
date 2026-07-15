// views/scripts/components/potential-contacts-manager.js
/**
 * ============================================================================
 * File: public/scripts/contacts/contact-potential-manager.js
 * Version: v8.0.8 (Opportunity Detail Linked Contact Enrichment)
 * Date: 2026-05-15
 * Author: Gemini (Assisted)
 *
 * Change Log:
 * - 2026-05-15: Removed duplicate local contact-link success toasts and unified department/title role display.
 * - 2026-05-12: Opportunity Detail linked contact enrichment: use global RAW business-card pool for linked-contact driveLink enrichment and unify contact typography.
 * - 2026-05-12: Opportunity Detail contact refinement: normalize clickable contact name weight and allow archived RAW business cards to enrich linked contacts without displaying archived rows as candidates.
 * - 2026-05-12: Opportunity Detail contact UI polish: normalize potential-contact name-link typography and box linked-contact management actions consistently.
 * - 2026-05-12: Opportunity Detail contact interaction polish: move business-card preview to contact names, enrich linked contacts with RAW drive links, and add confirmation before potential-contact linking.
 * - 2026-05-08: Opportunity potential contact hide-after-association filtering skips already matched contacts in opportunity context.
 * - 2026-05-08: Right rail density reduction.
 * - 2026-05-08: Potential contacts chip-only opportunity rendering.
 * - 2026-05-08: Secondary rail operational noise reduction.
 * - 2026-05-08: Right context rail compact entity UI.
 * - 2026-05-08: Potential contacts compact opportunity-context rendering.
 * - [Phase 8] Added World Model & Semantic Identity annotations.
 * - Comments only, no behavior change.
 *
 * WORLD MODEL (UI LAYER):
 * 1. Bridge / Status Manager:
 * - Connects RAW Contacts (Sheet/Potential Pool) with CORE Contacts (SQL/Official).
 * 2. Data Ownership:
 * - Does NOT own RAW data (Source: contacts.js / Sheet).
 * - Does NOT own CORE data (Source: contact-service.js / SQL).
 * 3. Responsibility:
 * - Visual Reconciliation: Compares RAW vs CORE to determine status (e.g., "已建檔", "已關聯").
 * - Action Trigger: Initiates file/link actions, but logic resides in API/Service.
 * ============================================================================
 */

/**
 * SEMANTIC IDENTITY (IMPORTANT):
 *
 * This module is SEMANTICALLY:
 * 👉 STATUS RECONCILIATION & ACTION BRIDGE
 *
 * Purpose:
 * - To visually distinguish which RAW contacts have already been promoted to CORE.
 * - To provide context-aware actions (File vs Link) based on that status.
 *
 * Non-Responsibilities:
 * - NOT a CRUD Manager for CORE contacts.
 * - NOT a CRUD Manager for RAW contacts.
 * - Does NOT perform the actual database writes (delegates to API).
 *
 * Rationale:
 * - Essential for the "Potential Pool" view to know what has already been processed.
 * - Maintains UI continuity during the transition from Sheet-based to SQL-based CRM.
 */

// 職責：共用的潛在聯絡人管理模組，處理顯示、建檔與關聯邏輯

const PotentialContactsManager = (() => {
    function getRawContactIdentifier(record) {
        if (!record) return null;
        if (record.cardId) return String(record.cardId);

        const rowIndex = Number(record.rowIndex);
        return Number.isInteger(rowIndex) && rowIndex > 0 ? String(rowIndex) : null;
    }

    function getContactRoleText(contact) {
        const department = String(contact?.department || '').trim();
        const title = String(contact?.jobTitle || contact?.position || '').trim();
        const parts = [];
        if (department) parts.push(department);
        if (title && title !== department) parts.push(title);
        return parts.join('｜');
    }

    function _ensureScopedStyles() {
        if (document.getElementById('opp-potential-contacts-styles')) return;

        const style = document.createElement('style');
        style.id = 'opp-potential-contacts-styles';
        style.textContent = `
            #opp-potential-contacts-container .opp-rail-contact-name-link {
                color: inherit;
                font-weight: 400;
                text-decoration: none;
                cursor: pointer;
            }

            #opp-potential-contacts-container .opp-rail-contact-name-link:hover,
            #opp-potential-contacts-container .opp-rail-contact-name-link:active,
            #opp-potential-contacts-container .opp-rail-contact-name-link:visited {
                color: inherit;
                text-decoration: none;
            }

            #opp-potential-contacts-container .opp-rail-contact-name-link:hover {
                opacity: 0.88;
            }

            #opp-potential-contacts-container .opp-rail-chip-main {
                font-size: var(--font-size-sm);
                font-weight: 400;
            }

            #opp-potential-contacts-container .opp-rail-chip-meta {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                font-weight: 400;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 渲染潛在聯絡人列表的核心函式
     * @param {object} options - 設定物件
     * @param {string} options.containerSelector - 渲染目標容器的 CSS 選擇器
     * @param {Array<object>} options.potentialContacts - 潛在聯絡人資料陣列 (RAW Data Source)
     * @param {Array<object>} options.comparisonList - 用於比對狀態的聯絡人陣列 (CORE Data Source: 已建檔或已關聯)
     * @param {string} options.comparisonKey - 用於比對的鍵名 (例如 'name')
     * @param {string} options.context - 當前情境 ('company' 或 'opportunity')
     * @param {string} [options.opportunityId] - (可選) 在 'opportunity' 情境下需要提供
     */
    function render(options) {
        _ensureScopedStyles();
        const {
            containerSelector,
            potentialContacts,
            comparisonList = [],
            comparisonKey = 'name',
            context,
            opportunityId
        } = options;
        const normalizeComparisonValue = value => String(value || '').trim();

        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error(`[PotentialContactsManager] 找不到容器: ${containerSelector}`);
            return;
        }

        if (!potentialContacts || potentialContacts.length === 0) {
            container.innerHTML = context === 'opportunity'
                ? '<div class="opp-rail-empty">尚無同公司潛在聯絡人</div>'
                : '<div class="alert alert-info" style="text-align:center;">在潛在客戶池中沒有找到該公司的聯絡人</div>';
            return;
        }

        // [WORLD MODEL] Comparison Logic: Preparing the CORE list for efficient lookup
        // Comparison only; no write authority here.
        const comparisonSet = new Set(
            comparisonList
                .map(item => normalizeComparisonValue(item && item[comparisonKey]))
                .filter(Boolean)
        );

        if (context === 'opportunity') {
            const visiblePotentialContacts = potentialContacts.filter(contact => {
                const value = normalizeComparisonValue(contact && contact[comparisonKey]);
                return !value || !comparisonSet.has(value);
            });
            if (visiblePotentialContacts.length === 0) {
                container.innerHTML = '<div class="opp-rail-empty">尚無同公司潛在聯絡人</div>';
                return;
            }

            let railHTML = '<div class="opp-rail-chip-wall">';
            const safeOpportunityId = String(opportunityId || '').replace(/"/g, '&quot;');
            visiblePotentialContacts.forEach(contact => {
                const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;");
                const roleText = getContactRoleText(contact);
                const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';
                const contactNameHTML = contact.driveLink
                    ? `<a href="#" class="opp-rail-contact-name-link" onclick="event.preventDefault(); showBusinessCardPreview('${safeDriveLink}')">${contact.name || '-'}</a>`
                    : (contact.name || '-');
                const actionButton = `<button class="action-btn small primary" title="關聯至此機會" onclick='PotentialContactsManager.confirmAndLinkContact(${contactJsonString}, "${safeOpportunityId}")'>+</button>`;

                railHTML += `
                    <div class="opp-rail-chip">
                        <span class="opp-rail-chip-main">${contactNameHTML}${roleText ? `<span class="opp-rail-chip-meta">｜${roleText}</span>` : ''}</span>
                        <div class="opp-rail-actions">
                            ${actionButton}
                        </div>
                    </div>`;
            });
            railHTML += '</div>';
            container.innerHTML = railHTML;
            return;
        }

        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>姓名</th>
                        <th>公司</th>
                        <th>職位</th>
                        <th>聯絡方式</th>
                        <th>狀態</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>`;
        
        potentialContacts.forEach(contact => {
            const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;");
            const roleText = getContactRoleText(contact);
            
            // [STATUS INFERENCE] Determines if RAW contact exists in CORE based on comparisonKey.
            const comparisonValue = normalizeComparisonValue(contact && contact[comparisonKey]);
            const isAlreadyHandled = comparisonValue ? comparisonSet.has(comparisonValue) : false;
            
            let statusBadge = '';
            let actionButton = '';

            if (isAlreadyHandled) {
                // [VISUAL STATUS] Render "Already Processed" state (No actions allowed)
                const statusText = context === 'company' ? '已建檔' : '已關聯';
                statusBadge = `<span class="contact-card-status upgraded">${statusText}</span>`;
                actionButton = ''; // 已處理，不顯示按鈕
            } else {
                // [VISUAL STATUS] Render "Pending" state (Actions allowed)
                statusBadge = `<span class="contact-card-status pending">待處理</span>`;
                if (context === 'company') {
                    // [ACTION TRIGGER] File: Promote RAW to CORE (New Contact)
                    actionButton = `<button class="action-btn small primary" onclick='PotentialContactsManager.handleFileContact(${contactJsonString})'>📋 建檔</button>`;
                } else if (context === 'opportunity') {
                    // [ACTION TRIGGER] Link: Associate RAW to Opportunity (Link + Potential Promotion)
                    actionButton = `<button class="action-btn small primary" onclick='PotentialContactsManager.handleLinkContact(${contactJsonString}, "${opportunityId}")'>🔗 關聯</button>`;
                }
            }

            // 【修改】將 a href 連結改為 onclick 按鈕
            const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';
            const driveLinkBtn = contact.driveLink
                ? `<button class="action-btn small info" title="預覽名片" onclick="showBusinessCardPreview('${safeDriveLink}')">💳 名片</button>`
                : '';
            // 【修改結束】

            tableHTML += `
                <tr>
                    <td data-label="姓名"><strong>${contact.name || '-'}</strong></td>
                    <td data-label="公司">${contact.company || '-'}</td>
                    <td data-label="職位">${roleText || '-'}</td>
                    <td data-label="聯絡方式">${contact.mobile ? `<div>📱 ${contact.mobile}</div>` : ''}${contact.phone ? `<div>📞 ${contact.phone}</div>` : ''}</td>
                    <td data-label="狀態">${statusBadge}</td>
                    <td data-label="操作">
                        <div class="action-buttons-container">
                            ${actionButton}
                            ${driveLinkBtn}
                        </div>
                    </td>
                </tr>`;
        });

        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    }

    /**
     * 處理「建檔」按鈕點擊事件
     * [ACTION TRIGGER] Initiates "Raw -> Core" promotion via API.
     * @param {object} contactData - 潛在聯絡人的資料 (RAW)
     */
    async function handleFileContact(contactData) {
        const rawIdentifier = getRawContactIdentifier(contactData);
        if (!rawIdentifier) {
            showNotification('缺少 RAW 識別碼，無法建檔', 'error');
            return;
        }
        const confirmMsg = `您確定要將潛在聯絡人「${contactData.name}」建立正式檔案嗎？`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在建立聯絡人檔案...');
            try {
                // [API HANDOFF] POST to backend to perform the actual SQL write.
                const result = await authedFetch(`/api/contacts/${encodeURIComponent(rawIdentifier)}/file`, {
                    method: 'POST'
                });
                
                if (result.success) {
                    showNotification('聯絡人建檔成功！', 'success');
                    // 重新載入當前頁面以刷新狀態
                    const companyName = document.querySelector('#page-title').textContent;
                    if (companyName) {
                       await CRM_APP.navigateTo('company-details', { companyName: encodeURIComponent(companyName) });
                    }
                } else {
                    throw new Error(result.error || '建檔失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`建檔失敗: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
    }

    /**
     * 處理「關聯」按鈕點擊事件
     * [ACTION TRIGGER] Initiates "Raw -> Opportunity" linkage via API.
     * @param {object} contactData - 潛在聯絡人的資料 (RAW)
     * @param {string} opportunityId - 要關聯到的機會 ID
     */
    async function handleLinkContact(contactData, opportunityId) {
        const rawIdentifier = getRawContactIdentifier(contactData);
        showLoading('正在關聯聯絡人...');

        const payload = {
            name: contactData.name,
            position: contactData.position,
            mobile: contactData.mobile,
            phone: contactData.phone,
            email: contactData.email,
            rowIndex: rawIdentifier, // RAW identity passed for processing
            company: contactData.company,
        };

        try {
            // [API HANDOFF] POST to backend. Backend handles Logic (Upgrade? Link?).
            const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!result.success) throw new Error(result.error || '後端處理失敗');
            
            await loadOpportunityDetailPage(opportunityId); // 重新載入機會詳細頁面
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 返回公開的 API
    async function confirmAndLinkContact(contactData, opportunityId) {
        const contactName = contactData.name || '-';
        const confirmMsg = contactData.contactId
            ? `將把「${contactName}」加入此機會的關聯聯絡人。`
            : `此名片將建立正式聯絡人，並將「${contactName}」關聯至此機會。`;
        const confirmModal = document.getElementById('confirm-modal');

        if (confirmModal) {
            const titleElement = confirmModal.querySelector('.modal-title, h2, h3');
            const confirmButton = confirmModal.querySelector('#btn-confirm-yes');
            const cancelButton = confirmModal.querySelector('#btn-confirm-no, .btn-secondary, .btn-cancel');

            if (titleElement) titleElement.textContent = '確認建立聯絡人關聯？';
            if (confirmButton) confirmButton.textContent = '確認連結';
            if (cancelButton) cancelButton.textContent = '取消';
        }

        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在關聯聯絡人...');

            const payload = {
                name: contactData.name,
                position: contactData.position,
                mobile: contactData.mobile,
                phone: contactData.phone,
                email: contactData.email,
                rowIndex: getRawContactIdentifier(contactData),
                company: contactData.company,
            };

            if (contactData.contactId) {
                payload.contactId = contactData.contactId;
            }

            try {
                const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (!result.success) throw new Error(result.error || '關聯建立失敗');

                await loadOpportunityDetailPage(opportunityId);
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
    }

    return {
        render,
        handleFileContact,
        handleLinkContact,
        confirmAndLinkContact
    };
})();

// 將模組掛載到全域 window 物件，以便 HTML 中的 onclick 可以呼叫
window.PotentialContactsManager = PotentialContactsManager;
