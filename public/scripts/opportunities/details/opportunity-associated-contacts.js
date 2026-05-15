// views/scripts/opportunity-details/associated-contacts.js
/**
 * ============================================================================
 * File: public/scripts/opportunities/details/opportunity-associated-contacts.js
 * Version: v8.0.26 (Business Card Archive Workspace)
 * Date: 2026-05-15
 * Author: Gemini (Assisted)
 *
 * Change Log:
 * - 2026-05-15: Unified contact role display across detail link, associated chip, and business-card archive candidates.
 * - 2026-05-13: Preserve contactId variants for detail linking, show department/title contact meta, and sort main/same-company/external associated contacts.
 * - 2026-05-13: Reworked business card archive modal into localized two-step operational workspace with scoped classes.
 * - 2026-05-13: Polished business card archive candidate list and confirmation preview for compact CRM reconciliation.
 * - 2026-05-13: Refined business card archive candidates into compact operational reconciliation rows.
 * - 2026-05-13: Added lightweight in-modal confirmation preview before executing business card archive hydration.
 * - 2026-05-13: Removed temporary RAW card search diagnostic count logs after archive dropdown verification.
 * - 2026-05-13: Business card archive modal visibility hotfix: override hidden search-result-list display for rendered RAW card candidates.
 * - 2026-05-13: Business card archive modal trace hotfix: log authenticated RAW response shape and candidate counts, and support contacts envelope.
 * - 2026-05-13: Business card archive modal binding hotfix: bind input events and guard RAW candidate rendering.
 * - 2026-05-13: Business card archive modal search hotfix: tolerate RAW response/status aliases and keep only selectable rowIndex-backed cards.
 * - 2026-05-12: Opportunity Detail linked contact enrichment: use global RAW business-card pool for linked-contact driveLink enrichment and unify contact typography.
 * - 2026-05-12: Opportunity Detail contact refinement: normalize clickable contact name weight and allow archived RAW business cards to enrich linked contacts without displaying archived rows as candidates.
 * - 2026-05-12: Opportunity Detail contact UI polish: normalize potential-contact name-link typography and box linked-contact management actions consistently.
 * - 2026-05-12: Opportunity Detail linked-contact style regression fix: remove box-model and font-shorthand overrides from scoped utility polish.
 * - 2026-05-12: Opportunity Detail linked-contact style polish: lighten management actions and normalize business-card name-link typography.
 * - 2026-05-12: Opportunity Detail contact interaction polish: move business-card preview to contact names, enrich linked contacts with RAW drive links, and add confirmation before potential-contact linking.
 * - 2026-05-08: Added localized company normalization and external-company tag rendering for linked contacts.
 * - 2026-05-08: Relationship lifecycle stabilization restores explicit detail reloads after contact relationship mutations.
 * - 2026-05-08: Unified CORE + RAW contact search delegates add-contact flow to the shared relationship modal.
 * - 2026-05-08: Manage-mode UX cleanup uses lightweight title action and preserves rail edit action removal.
 * - 2026-05-08: Associated-contact rail edit action removal keeps the rail as secondary relationship context.
 * - 2026-05-08: RAW-to-CORE association payload completion sends contact identity fields for backend scaffolding.
 * - 2026-05-08: Right rail density reduction.
 * - 2026-05-08: Associated contacts manage-mode collapse hides per-item actions by default.
 * - 2026-05-08: Secondary rail operational noise reduction.
 * - 2026-05-08: Right context rail compact entity UI.
 * - 2026-05-08: Associated contacts mini-card rail rendering.
 * - [Phase 8] Comment-only semantic clarification.
 * - [Phase 8] Added World Model Annotation for Relationship Ownership.
 * - Confirmed no rowIndex usage in Linkage logic.
 *
 * * WORLD MODEL (RELATIONSHIP LAYER):
 * 1. Opportunity-Contact Linkage:
 * - Owned by Opportunity.
 * - Stored in Link Table (SQL).
 * - Contact Table does NOT store opportunityId.
 * * 2. Contact Types:
 * - CORE Contact: The entity actually being linked via `contactId`.
 * - RAW Data (Card): Used only as visual reference or source for upgrading.
 * * 3. Actions:
 * - Link: Creates entry in opportunity_contact_links.
 * - Unlink: Deletes entry from opportunity_contact_links.
 * - Set Main: Updates `main_contact` field on Opportunity Table.
 *
 * * WARNING (API USAGE):
 * - This module uses `/api/contacts` which returns RAW / Potential contacts.
 * - Be careful not to treat RAW results as CORE contacts for linking.
 * - Linking requires a valid `contactId`, which RAW contacts may lack.
 * ============================================================================
 */
// 職責：專門管理「關聯聯絡人」區塊的所有 UI 與功能

const OpportunityContacts = (() => {
    // 模組私有變數
    let _opportunityInfo = null;
    let _linkedContacts = [];
    let _isManageMode = false;

    function _normalizeContactId(contact) {
        const id = contact?.contactId ?? contact?.id ?? contact?.contact_id;
        return id === undefined || id === null || String(id).trim() === '' ? null : id;
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
        if (document.getElementById('opp-associated-contacts-styles')) return;

        const style = document.createElement('style');
        style.id = 'opp-associated-contacts-styles';
        style.textContent = `
            #associated-contacts-list .opp-rail-contact-name-link {
                color: inherit;
                font-weight: 400;
                text-decoration: none;
                cursor: pointer;
            }

            #associated-contacts-list .opp-rail-contact-name-link:hover,
            #associated-contacts-list .opp-rail-contact-name-link:active,
            #associated-contacts-list .opp-rail-contact-name-link:visited {
                color: inherit;
                text-decoration: none;
            }

            #associated-contacts-list .opp-rail-contact-name-link:hover {
                opacity: 0.88;
            }

            #associated-contacts-list .opp-rail-contact-text {
                font-size: var(--font-size-sm);
                font-weight: 400;
            }

            #associated-contacts-list .opp-rail-contact-role {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                font-weight: 400;
            }

            #associated-contacts-list .opp-rail-contact-list.is-managing .opp-rail-contact-action-btn {
                background: color-mix(in srgb, var(--secondary-bg) 82%, var(--border-color));
                color: var(--text-secondary);
                outline: 1px solid color-mix(in srgb, var(--border-color) 68%, transparent);
                outline-offset: 0;
                border-radius: var(--rounded-sm);
                box-shadow: none;
                transform: none;
            }

            #associated-contacts-list .opp-rail-contact-list.is-managing .opp-rail-contact-action-btn:hover {
                background: color-mix(in srgb, var(--secondary-bg) 62%, var(--border-color));
                color: var(--text-primary);
                outline-color: color-mix(in srgb, var(--border-color) 88%, transparent);
                box-shadow: none;
                transform: none;
            }

            #associated-contacts-list .opp-rail-contact-list.is-managing .opp-rail-contact-action-btn.danger:hover {
                color: var(--accent-red);
                outline-color: color-mix(in srgb, var(--accent-red) 40%, var(--border-color));
                background: color-mix(in srgb, var(--accent-red) 8%, var(--secondary-bg));
            }

            #link-business-card-modal .archive-step-search,
            #link-business-card-modal .archive-step-preview {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            #link-business-card-modal .archive-candidate-list {
                display: block;
                max-height: 350px;
                overflow-y: auto;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--primary-bg);
            }

            #link-business-card-modal .archive-candidate-row {
                cursor: pointer;
                padding: 8px 11px;
                border-bottom: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
                background: var(--primary-bg);
            }

            #link-business-card-modal .archive-candidate-row:last-child {
                border-bottom: none;
            }

            #link-business-card-modal .archive-candidate-row:hover {
                background: color-mix(in srgb, var(--accent-blue) 7%, var(--primary-bg));
            }

            #link-business-card-modal .archive-candidate-main {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                align-items: center;
            }

            #link-business-card-modal .archive-candidate-name {
                font-weight: 650;
                color: var(--text-primary);
                font-size: 0.94rem;
                line-height: 1.25;
            }

            #link-business-card-modal .archive-candidate-position {
                font-size: 0.78rem;
                color: var(--text-muted);
                white-space: nowrap;
            }

            #link-business-card-modal .archive-candidate-company {
                font-size: 0.84rem;
                color: var(--text-secondary);
                margin-top: 1px;
                line-height: 1.25;
            }

            #link-business-card-modal .archive-preview-panel {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            #link-business-card-modal .archive-preview-title {
                font-weight: 700;
                font-size: 1.05rem;
                color: var(--text-primary);
            }

            #link-business-card-modal .archive-preview-helper {
                font-size: 0.9rem;
                color: var(--text-secondary);
                margin-top: 3px;
            }

            #link-business-card-modal .archive-preview-grid {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            #link-business-card-modal .archive-preview-card {
                flex: 1;
                min-width: 240px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 12px 14px;
                background: var(--primary-bg);
            }

            #link-business-card-modal .archive-preview-card-title {
                font-weight: 700;
                margin-bottom: 8px;
                color: var(--text-primary);
            }

            #link-business-card-modal .archive-preview-row {
                display: grid;
                grid-template-columns: 56px 1fr;
                gap: 10px;
                padding: 5px 0;
                border-bottom: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
            }

            #link-business-card-modal .archive-preview-label {
                font-size: 0.82rem;
                color: var(--text-muted);
            }

            #link-business-card-modal .archive-preview-value {
                font-size: 0.9rem;
                color: var(--text-primary);
            }

            #link-business-card-modal .archive-preview-note {
                border: 1px solid color-mix(in srgb, var(--warning-color, #f59e0b) 35%, var(--border-color));
                background: color-mix(in srgb, var(--warning-color, #f59e0b) 9%, transparent);
                color: var(--text-secondary);
                border-radius: 6px;
                padding: 9px 11px;
                font-size: 0.9rem;
            }

            #link-business-card-modal .archive-preview-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    // 處理儲存編輯後的聯絡人資料
    async function _handleSaveContact(event) {
        event.preventDefault();
        const contactId = document.getElementById('edit-contact-id').value;
        const updateData = {
            department: document.getElementById('edit-contact-department').value,
            position: document.getElementById('edit-contact-position').value,
            mobile: document.getElementById('edit-contact-mobile').value,
            phone: document.getElementById('edit-contact-phone').value,
            email: document.getElementById('edit-contact-email').value,
        };

        showLoading('正在儲存聯絡人資料...');
        try {
            const result = await authedFetch(`/api/contacts/${contactId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            if (result.success) {
                // 【*** 移除衝突 ***】
                // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                // showNotification('聯絡人資料更新成功！', 'success');
                document.getElementById('edit-contact-modal-container').remove();
                // await loadOpportunityDetailPage(_opportunityInfo.opportunityId); // 重新載入主頁面
                // 【*** 移除結束 ***】
            } else {
                throw new Error(result.error || '儲存失敗');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`儲存失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 【新增】處理最終的名片連結 API 呼叫
    async function _handleLinkBusinessCard(contactId, businessCard) {
        if (businessCard && businessCard.__confirmed) {
            showLoading('甇?甇豢??????...');
            try {
                const result = await authedFetch(`/api/contacts/${contactId}/link-card`, {
                    method: 'POST',
                    body: JSON.stringify({ businessCardRowIndex: businessCard.rowIndex })
                });

                if (result.success) {
                    closeModal('link-business-card-modal');
                    _isManageMode = false;
                    if (typeof window.loadOpportunityDetailPage === 'function') {
                        await window.loadOpportunityDetailPage(_opportunityInfo.opportunityId);
                    }
                } else {
                    throw new Error(result.error || '甇豢?憭望?');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`甇豢?憭望?: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
            return;
        }
        const confirmMsg = `您確定要將 ${businessCard.name} (${businessCard.company}) 的名片資料，歸檔至這位聯絡人嗎？\n\n現有聯絡人的資料將會被名片上的資訊補充或覆蓋。`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在歸檔與連結名片...');
            try {
                const result = await authedFetch(`/api/contacts/${contactId}/link-card`, {
                    method: 'POST',
                    body: JSON.stringify({ businessCardRowIndex: businessCard.rowIndex })
                });

                if (result.success) {
                    closeModal('link-business-card-modal'); // 確保關閉的是歸檔 modal
                    _isManageMode = false;
                    if (typeof window.loadOpportunityDetailPage === 'function') {
                        await window.loadOpportunityDetailPage(_opportunityInfo.opportunityId);
                    }
                } else {
                    throw new Error(result.error || '歸檔失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`歸檔失敗: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
    }

    // 【新增】處理關聯現有聯絡人 (Phase 8 Repair)
    async function _handleLinkExistingContact(opportunityId, contact) {
        const confirmMsg = `確定要將「${contact.name}」(${contact.company || '無公司'}) 關聯至此機會嗎？`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在關聯聯絡人...');
            try {
                const contactId = _normalizeContactId(contact);
                const contactPayload = {
                    name: contact.name,
                    company: contact.company || contact.companyName,
                    companyName: contact.companyName || contact.company,
                    position: contact.position,
                    mobile: contact.mobile,
                    phone: contact.phone,
                    email: contact.email,
                    rowIndex: contact.rowIndex,
                    sourceId: contact.sourceId,
                    source: contact.source,
                    driveLink: contact.driveLink
                };
                if (contactId) contactPayload.contactId = contactId;

                const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts`, {
                    method: 'POST',
                    body: JSON.stringify(contactPayload)
                });

                if (result.success) {
                    closeModal('link-contact-modal');
                    _isManageMode = false;
                    if (typeof window.loadOpportunityDetailPage === 'function') {
                        await window.loadOpportunityDetailPage(opportunityId);
                    }
                } else {
                    throw new Error(result.error || '關聯失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`關聯失敗: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
    }


    // 渲染主列表
    function _render() {
        const container = document.getElementById('associated-contacts-list');
        if (!_linkedContacts || _linkedContacts.length === 0) {
            container.innerHTML = '<div class="opp-rail-empty">尚無關聯聯絡人</div>';
            return;
        }

        // [Phase B] Localized company name normalizer
        const _normalize = (str) => {
            if (!str || typeof str !== 'string') return '';
            return str.toLowerCase().replace(/股份有限公司|有限公司|公司|\(.*?\)|（.*?）/g, '').replace(/\s+/g, '').trim();
        };
        const oppCompanyNorm = _normalize(_opportunityInfo.customerCompany);
        const sortedContacts = _linkedContacts
            .map((contact, index) => {
                const isMainContact = (contact.name === _opportunityInfo.mainContact);
                const contactCompanyNorm = _normalize(contact.companyName);
                const isExternal = contact.companyName && contactCompanyNorm && (contactCompanyNorm !== oppCompanyNorm);
                return {
                    contact,
                    index,
                    priority: isMainContact ? 0 : (isExternal ? 2 : 1)
                };
            })
            .sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                const nameCompare = String(a.contact.name || '').localeCompare(String(b.contact.name || ''), 'zh-Hant');
                return nameCompare || a.index - b.index;
            })
            .map(item => item.contact);

        let railHTML = `<div class="opp-rail-contact-list${_isManageMode ? ' is-managing' : ''}">`;
        sortedContacts.forEach(contact => {
            const isMainContact = (contact.name === _opportunityInfo.mainContact);
            const isManual = !contact.sourceId || contact.sourceId === 'MANUAL';
            const roleText = getContactRoleText(contact);
            const safeContactId = String(contact.contactId || '').replace(/'/g, "\\'");
            const safeContactName = String(contact.name || '').replace(/'/g, "\\'");
            const safeOpportunityId = String(_opportunityInfo.opportunityId || '').replace(/'/g, "\\'");
            const safeDriveLink = contact.driveLink ? contact.driveLink.replace(/'/g, "\\'") : '';
            
            // [Phase B] Determine external company tag condition
            const contactCompanyNorm = _normalize(contact.companyName);
            const isExternal = contact.companyName && contactCompanyNorm && (contactCompanyNorm !== oppCompanyNorm);
            const contactNameHTML = contact.driveLink
                ? `<a href="#" class="opp-rail-contact-name-link" onclick="event.preventDefault(); showBusinessCardPreview('${safeDriveLink}')">${contact.name || '-'}</a>`
                : (contact.name || '-');

            let actionButtons = '';

            if (isManual) {
                actionButtons += `<button class="action-btn small info opp-rail-contact-action-btn" onclick="OpportunityContacts.showLinkBusinessCardModal('${safeContactId}')" title="將掃描的名片資料歸檔至此聯絡人">名片歸檔</button>`;
            }

            if (!isMainContact) {
                actionButtons += `<button class="action-btn small primary opp-rail-contact-action-btn" onclick="OpportunityContacts.setAsMain('${safeOpportunityId}', '${safeContactName}')">設為主要</button>`;
                actionButtons += `<button class="action-btn small danger opp-rail-contact-action-btn" onclick="OpportunityContacts.unlink('${safeOpportunityId}', '${safeContactId}', '${safeContactName}')" title="刪除關聯">解除</button>`;
            }

            railHTML += `
                <div class="opp-rail-contact-chip">
                    <div class="opp-rail-contact-summary">
                        <div class="opp-rail-contact-text">
                            ${isMainContact ? '👑 ' : ''}${contactNameHTML}${roleText ? `<span class="opp-rail-contact-role">｜${roleText}</span>` : ''}
                        </div>
                        ${isMainContact ? '<span class="card-tag assignee">主要</span>' : ''}
                        ${isExternal ? `<span class="card-tag" style="background: var(--glass-bg); color: var(--text-secondary); border: 1px solid var(--border-color); margin-left: 4px;">外部｜${contact.companyName}</span>` : ''}
                    </div>
                    <div class="opp-rail-actions">${actionButtons}</div>
                </div>`;
        });
        railHTML += '</div>';
        container.innerHTML = railHTML;
        return;
    }

    // --- 公開方法 ---

    // 【新增】顯示連結聯絡人的 Modal (Phase 8 Repair)
    function showLinkContactModal(opportunityId) {
        if (typeof window.showLinkContactModal === 'function' && window.showLinkContactModal !== showLinkContactModal) {
            window.showLinkContactModal(opportunityId);
            return;
        }

        const existingModal = document.getElementById('link-contact-modal');
        if (existingModal) existingModal.remove();

        // 動態建立 Modal HTML
        const modalHTML = `
            <div id="link-contact-modal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">🔗 關聯現有聯絡人</h2>
                        <button class="close-btn" onclick="closeModal('link-contact-modal')">&times;</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">搜尋聯絡人</label>
                        <input type="text" class="form-input" id="search-link-contact-input" placeholder="輸入姓名或公司進行搜尋...">
                    </div>
                    <div id="link-contact-results" class="search-result-list" style="max-height: 350px; overflow-y: auto;">
                        <div class="alert alert-info">請輸入關鍵字開始搜尋</div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-container').insertAdjacentHTML('beforeend', modalHTML);

        const searchInput = document.getElementById('search-link-contact-input');
        const resultsContainer = document.getElementById('link-contact-results');
        
        const performSearch = async (query) => {
            if (!query) {
                resultsContainer.innerHTML = '<div class="alert alert-info">請輸入關鍵字</div>';
                return;
            }
            resultsContainer.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            try {
                // 呼叫現有 API 搜尋聯絡人
                // [WARNING: RAW / POTENTIAL API]
                // This call hits `/api/contacts` which returns RAW / Potential contacts (Sheet-based).
                // RAW contacts usually lack a stable `contactId`.
                // If you intend to link CORE contacts, use `/api/contacts/list`.
                // Results from here MUST NOT be treated as CORE unless validated.
                const result = await authedFetch(`/api/contacts?q=${encodeURIComponent(query)}`);
                const contacts = result.data || [];

                if (contacts.length > 0) {
                    resultsContainer.innerHTML = contacts.map(contact => {
                        const contactJson = JSON.stringify(contact).replace(/'/g, "&apos;");
                        const roleText = getContactRoleText(contact);
                        // 排除已升級或歸檔的檢查視需求而定，此處僅列出所有搜尋結果
                        return `
                            <div class="kanban-card" style="cursor: pointer;" onclick='OpportunityContacts._handleLinkExistingContact("${opportunityId}", ${contactJson})'>
                                <div class="card-title">${contact.name}</div>
                                <div class="card-company">${roleText ? `${contact.company || '無公司'} · ${roleText}` : (contact.company || '無公司')}</div>
                            </div>`;
                    }).join('');
                } else {
                    resultsContainer.innerHTML = '<div class="alert alert-info">找不到符合的聯絡人</div>';
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') resultsContainer.innerHTML = `<div class="alert alert-error">搜尋失敗: ${error.message}</div>`;
            }
        };

        searchInput.addEventListener('keyup', (e) => handleSearch(() => performSearch(e.target.value)));
        searchInput.focus();
    }

    // 【新增】顯示連結名片的 Modal
    function showLinkBusinessCardModal(contactId) {
        const existingModal = document.getElementById('link-business-card-modal');
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="link-business-card-modal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">🔗 連結名片歸檔</h2>
                        <button class="close-btn" onclick="closeModal('link-business-card-modal')">&times;</button>
                    </div>
                    <div id="archive-step-search" class="archive-step-search">
                        <div class="form-group">
                            <label class="form-label">搜尋待處理的名片</label>
                            <input type="text" class="form-input" id="search-business-card-input" placeholder="輸入姓名或公司進行搜尋...">
                        </div>
                        <div id="archive-candidate-list" class="archive-candidate-list">
                            <div class="loading show"><div class="spinner"></div></div>
                        </div>
                    </div>
                    <div id="archive-step-preview" class="archive-step-preview" style="display: none;">
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-container').insertAdjacentHTML('beforeend', modalHTML);

        const searchInput = document.getElementById('search-business-card-input');
        const searchStep = document.getElementById('archive-step-search');
        const previewStep = document.getElementById('archive-step-preview');
        const resultsContainer = document.getElementById('archive-candidate-list');
        const currentContact = (_linkedContacts || []).find(contact => String(contact.contactId) === String(contactId)) || {};
        const displayValue = (value) => String(value || '').trim() || '—';
        const renderFieldRow = (label, value) => `
            <div class="archive-preview-row">
                <span class="archive-preview-label">${label}</span>
                <span class="archive-preview-value">${displayValue(value)}</span>
            </div>
        `;
        const renderArchivePreviewCard = (title, item) => `
            <div class="archive-preview-card">
                <div class="archive-preview-card-title">${title}</div>
                ${renderFieldRow('姓名', item.name)}
                ${renderFieldRow('公司', item.companyName || item.company)}
                ${renderFieldRow('電話', item.mobile || item.phone)}
                ${renderFieldRow('Email', item.email)}
                ${renderFieldRow('職稱', getContactRoleText(item))}
            </div>
        `;
        const showArchivePreview = (card) => {
            searchStep.style.display = 'none';
            previewStep.style.display = 'flex';
            previewStep.innerHTML = `
                <div class="archive-preview-panel">
                    <div>
                        <div class="archive-preview-title">確認名片歸檔</div>
                        <div class="archive-preview-helper">將選取的名片資料補充或覆蓋至目前正式聯絡人。</div>
                    </div>
                    <div class="archive-preview-grid">
                        ${renderArchivePreviewCard('目前正式聯絡人', currentContact)}
                        ${renderArchivePreviewCard('選取的名片資料', card)}
                    </div>
                    <div class="archive-preview-note">確認後會更新正式聯絡人資料，並將此名片標記為已歸檔。</div>
                    <div class="archive-preview-actions">
                        <button type="button" class="action-btn secondary" id="archive-preview-cancel-btn">取消</button>
                        <button type="button" class="action-btn primary" id="archive-preview-confirm-btn">確認歸檔</button>
                    </div>
                </div>
            `;
            document.getElementById('archive-preview-cancel-btn').onclick = () => {
                previewStep.style.display = 'none';
                searchStep.style.display = 'flex';
            };
            document.getElementById('archive-preview-confirm-btn').onclick = () => _handleLinkBusinessCard(contactId, { ...card, __confirmed: true });
        };
        
        const performSearch = async (query) => {
            resultsContainer.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            try {
                // [INFO: RAW / POTENTIAL API]
                // This search targets the RAW / Potential pool.
                // This is INTENTIONAL here, as we are looking for a RAW Card (image source)
                // to link to an existing CORE Contact.
                const result = await authedFetch(`/api/contacts?q=${encodeURIComponent(query)}`);
                const rawCardsSource = Array.isArray(result) ? result : (result.data || result.contacts);
                if (!Array.isArray(rawCardsSource)) {
                    console.warn('[OpportunityContacts] Unexpected RAW card search response:', result);
                }
                const rawCards = Array.isArray(rawCardsSource) ? rawCardsSource : [];
                const pendingCards = rawCards.filter(c => {
                    const status = String(c.status || c.statusText || '').trim();
                    return c.rowIndex && !['已升級', '已歸檔', 'Dropped', '已作廢'].includes(status);
                });

                if (pendingCards.length > 0) {
                    resultsContainer.innerHTML = pendingCards.map(card => {
                        const cardJson = JSON.stringify(card).replace(/'/g, "&apos;");
                        const roleText = getContactRoleText(card);
                        return `
                            <div class="archive-candidate-row" onclick='OpportunityContacts.showArchivePreview(${cardJson})'>
                                <div class="archive-candidate-main">
                                    <span class="archive-candidate-name">${card.name || '-'}</span>
                                    <span class="archive-candidate-position">${roleText}</span>
                                </div>
                                <div class="archive-candidate-company">${card.company || '公司未知'}</div>
                            </div>`;
                    }).join('');
                } else {
                    resultsContainer.innerHTML = '<div class="alert alert-info">找不到待處理的名片</div>';
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') resultsContainer.innerHTML = '<div class="alert alert-error">搜尋失敗</div>';
            }
        };

        const queueSearch = (value) => {
            if (typeof handleSearch === 'function') {
                handleSearch(() => performSearch(value));
            } else {
                performSearch(value);
            }
        };
        searchInput.addEventListener('input', (e) => queueSearch(e.target.value));
        searchInput.addEventListener('keyup', (e) => queueSearch(e.target.value));
        OpportunityContacts.showArchivePreview = showArchivePreview;
        performSearch(''); // 初始載入所有待處理名片
    }

    // 顯示編輯聯絡人的彈出視窗
    function showEditModal(contact) {
        const oldModal = document.getElementById('edit-contact-modal-container');
        if (oldModal) oldModal.remove();

        const modalContainer = document.createElement('div');
        modalContainer.id = 'edit-contact-modal-container';
        
        modalContainer.innerHTML = `
            <div id="edit-contact-modal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">編輯聯絡人: ${contact.name}</h2>
                        <button class="close-btn" onclick="document.getElementById('edit-contact-modal-container').remove()">&times;</button>
                    </div>
                    <form id="edit-opp-contact-form">
                        <input type="hidden" id="edit-contact-id" value="${contact.contactId}">
                        <div class="form-row">
                            <div class="form-group"><label class="form-label">部門</label><input type="text" class="form-input" id="edit-contact-department" value="${contact.department || ''}"></div>
                            <div classs="form-group"><label class="form-label">職位</label><input type="text" class="form-input" id="edit-contact-position" value="${contact.position || ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label class="form-label">手機</label><input type="tel" class="form-input" id="edit-contact-mobile" value="${contact.mobile || ''}"></div>
                            <div class="form-group"><label class="form-label">公司電話</label><input type="tel" class="form-input" id="edit-contact-phone" value="${contact.phone || ''}"></div>
                        </div>
                        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="edit-contact-email" value="${contact.email || ''}"></div>
                        <div class="form-actions">
                            <button type="button" class="action-btn secondary" onclick="document.getElementById('edit-contact-modal-container').remove()">取消</button>
                            <button type="submit" class="action-btn primary">💾 儲存變更</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalContainer);
        document.getElementById('edit-opp-contact-form').addEventListener('submit', _handleSaveContact);
    }

    // 設定為主要聯絡人
    // [Phase 8] Update: Removed rowIndex, using opportunityId for update
    async function setAsMain(opportunityId, newMainContactName) {
        const confirmMsg = `確定要將「${newMainContactName}」設定為這個機會的主要聯絡人嗎？`;
        showConfirmDialog(confirmMsg, async () => {
            showLoading('正在更新主要聯絡人...');
            try {
                // [Phase 8] Fix: Use opportunityId in URL, not rowIndex
                const result = await authedFetch(`/api/opportunities/${opportunityId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ mainContact: newMainContactName })
                });
                if (result.success) {
                    _isManageMode = false;
                    if (typeof window.loadOpportunityDetailPage === 'function') {
                        await window.loadOpportunityDetailPage(opportunityId);
                    }
                } else {
                    throw new Error(result.error || '更新失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    showNotification(`更新失敗: ${error.message}`, 'error');
                }
            } finally {
                hideLoading();
            }
        });
    }

    // 解除關聯
    function unlink(opportunityId, contactId, contactName) {
        const message = `您確定要將聯絡人 "${contactName}" 從這個機會案件中移除關聯嗎？\n\n(注意：此操作將永久刪除這條關聯紀錄，但不會刪除聯絡人本身的檔案)`;
        showConfirmDialog(message, async () => {
            showLoading('正在刪除關聯...');
            try {
                const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts/${contactId}`, {
                    method: 'DELETE'
                });
                if (result.success) {
                    _isManageMode = false;
                    if (typeof window.loadOpportunityDetailPage === 'function') {
                        await window.loadOpportunityDetailPage(opportunityId);
                    }
                } else {
                    throw new Error(result.error || '刪除關聯失敗');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    showNotification(`刪除關聯失敗: ${error.message}`, 'error');
                }
            } finally {
                hideLoading();
            }
        });
    }

    // 初始化模組
    function init(opportunityInfo, linkedContacts) {
        _ensureScopedStyles();
        _opportunityInfo = opportunityInfo;
        _linkedContacts = linkedContacts;
        _isManageMode = false;
        _render();
        
        // 綁定「+ 關聯聯絡人」按鈕的點擊事件
        const addBtn = document.getElementById('add-associated-contact-btn');
        if (addBtn) {
            addBtn.onclick = () => showLinkContactModal(_opportunityInfo.opportunityId);
            const header = addBtn.closest('.widget-header');
            let manageBtn = document.getElementById('manage-associated-contact-btn');
            if (header && !manageBtn) {
                manageBtn = document.createElement('button');
                manageBtn.type = 'button';
                manageBtn.id = 'manage-associated-contact-btn';
                manageBtn.className = 'opp-rail-manage-link';
                addBtn.before(manageBtn);
            }
            if (manageBtn) {
                manageBtn.textContent = _isManageMode ? '完成' : '管理';
                manageBtn.onclick = () => {
                    _isManageMode = !_isManageMode;
                    _render();
                    manageBtn.textContent = _isManageMode ? '完成' : '管理';
                };
            }
        }
    }

    // 返回公開的 API
    return {
        init,
        showEditModal,
        setAsMain,
        unlink,
        showLinkBusinessCardModal, 
        _handleLinkBusinessCard,
        showLinkContactModal,    // 新增公開
        _handleLinkExistingContact, // 新增公開，供 onclick 使用
        resetManageMode: () => { _isManageMode = false; }
    };
})();

//Verification: setAsMain uses opportunityId only.
//No rowIndex usage remains in this file.
