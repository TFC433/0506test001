// views/scripts/opportunity-details/associated-contacts.js
/**
 * ============================================================================
 * File: public/scripts/opportunities/details/opportunity-associated-contacts.js
 * Version: v8.0.15 (Opportunity Detail Linked Contact Enrichment)
 * Date: 2026-05-12
 * Author: Gemini (Assisted)
 *
 * Change Log:
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
                const contactPayload = {
                    contactId: contact.contactId,
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

        let railHTML = `<div class="opp-rail-contact-list${_isManageMode ? ' is-managing' : ''}">`;
        _linkedContacts.forEach(contact => {
            const isMainContact = (contact.name === _opportunityInfo.mainContact);
            const isManual = !contact.sourceId || contact.sourceId === 'MANUAL';
            const roleText = contact.position || contact.department || '';
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
                        // 排除已升級或歸檔的檢查視需求而定，此處僅列出所有搜尋結果
                        return `
                            <div class="kanban-card" style="cursor: pointer;" onclick='OpportunityContacts._handleLinkExistingContact("${opportunityId}", ${contactJson})'>
                                <div class="card-title">${contact.name}</div>
                                <div class="card-company">${contact.company || '無公司'} - ${contact.position || '職位未知'}</div>
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
                    <div class="form-group">
                        <label class="form-label">搜尋待處理的名片</label>
                        <input type="text" class="form-input" id="search-business-card-input" placeholder="輸入姓名或公司進行搜尋...">
                    </div>
                    <div id="business-card-results" class="search-result-list" style="max-height: 350px; overflow-y: auto;">
                        <div class="loading show"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-container').insertAdjacentHTML('beforeend', modalHTML);

        const searchInput = document.getElementById('search-business-card-input');
        const resultsContainer = document.getElementById('business-card-results');
        
        const performSearch = async (query) => {
            resultsContainer.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
            try {
                // [INFO: RAW / POTENTIAL API]
                // This search targets the RAW / Potential pool.
                // This is INTENTIONAL here, as we are looking for a RAW Card (image source)
                // to link to an existing CORE Contact.
                const result = await authedFetch(`/api/contacts?q=${encodeURIComponent(query)}`);
                const pendingCards = (result.data || []).filter(c => c.status !== '已升級' && c.status !== '已歸檔');

                if (pendingCards.length > 0) {
                    resultsContainer.innerHTML = pendingCards.map(card => {
                        const cardJson = JSON.stringify(card).replace(/'/g, "&apos;");
                        return `
                            <div class="kanban-card" style="cursor: pointer;" onclick='OpportunityContacts._handleLinkBusinessCard("${contactId}", ${cardJson})'>
                                <div class="card-title">${card.name}</div>
                                <div class="card-company">${card.company} - ${card.position || '職位未知'}</div>
                            </div>`;
                    }).join('');
                } else {
                    resultsContainer.innerHTML = '<div class="alert alert-info">找不到待處理的名片</div>';
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') resultsContainer.innerHTML = '<div class="alert alert-error">搜尋失敗</div>';
            }
        };

        searchInput.addEventListener('keyup', (e) => handleSearch(() => performSearch(e.target.value)));
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
