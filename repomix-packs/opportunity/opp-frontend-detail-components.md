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
- Only files matching these patterns are included: public/scripts/opportunities/details/*.js, public/styles/modules/layout.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
public/scripts/opportunities/details/opportunity-associated-contacts.js
public/scripts/opportunities/details/opportunity-details-components.js
public/scripts/opportunities/details/opportunity-event-reports.js
public/scripts/opportunities/details/opportunity-info-view.js
public/scripts/opportunities/details/opportunity-interactions.js
public/scripts/opportunities/details/opportunity-stepper.js
public/styles/modules/layout.css
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="public/scripts/opportunities/details/opportunity-associated-contacts.js">
// views/scripts/opportunity-details/associated-contacts.js
/**
 * ============================================================================
 * File: public/scripts/opportunities/details/opportunity-associated-contacts.js
 * Version: v8.0.3 (Phase 8 UI Annotation)
 * Date: 2026-02-10
 * Author: Gemini (Assisted)
 *
 * Change Log:
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
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('名片歸檔成功！', 'success');
                    closeModal('link-business-card-modal'); // 確保關閉的是歸檔 modal
                    // await loadOpportunityDetailPage(_opportunityInfo.opportunityId);
                    // 【*** 移除結束 ***】
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
                // 使用純 contactId 進行關聯，不依賴 rowIndex
                const result = await authedFetch(`/api/opportunities/${opportunityId}/contacts`, {
                    method: 'POST',
                    body: JSON.stringify({ contactId: contact.contactId })
                });

                if (result.success) {
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('聯絡人關聯成功！', 'success');
                    closeModal('link-contact-modal');
                    // await loadOpportunityDetailPage(opportunityId);
                    // 【*** 移除結束 ***】
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
            container.innerHTML = '<div class="alert alert-info">此機會尚無關聯聯絡人。</div>';
            return;
        }

        let tableHTML = `<table class="data-table"><thead><tr><th>姓名</th><th>公司</th><th>職位</th><th>聯絡方式</th><th>角色/來源</th><th>操作</th></tr></thead><tbody>`;
        _linkedContacts.forEach(contact => {
            const isMainContact = (contact.name === _opportunityInfo.mainContact);
            const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;");
            
            let actionButtons = `<button class="action-btn small warn" onclick='OpportunityContacts.showEditModal(${contactJsonString})'>✏️ 編輯</button>`;
            
            const isManual = !contact.sourceId || contact.sourceId === 'MANUAL';
            if (isManual) {
                actionButtons += `<button class="action-btn small info" onclick="OpportunityContacts.showLinkBusinessCardModal('${contact.contactId}')" title="將掃描的名片資料歸檔至此聯絡人">🔗 名片歸檔</button>`;
            } else if (contact.driveLink) {
                // 【修改】將 a href 連結改為 onclick 按鈕
                const safeDriveLink = contact.driveLink.replace(/'/g, "\\'");
                actionButtons += `<button class="action-btn small info" title="預覽名片" onclick="showBusinessCardPreview('${safeDriveLink}')">💳 名片</button>`;
                // 【修改結束】
            }

            if (!isMainContact) {
                const newMainContactName = contact.name.replace(/'/g, "\\'");
                // [Phase 8] Update: Removed rowIndex from parameters, only use opportunityId
                actionButtons += `<button class="action-btn small primary" style="background: var(--accent-green);" onclick="OpportunityContacts.setAsMain('${_opportunityInfo.opportunityId}', '${newMainContactName}')">👑 設為主要</button>`;
                
                // 【修改】將「刪除關聯」按鈕改為只有垃圾桶圖示
                actionButtons += `<button class="action-btn small danger" onclick="OpportunityContacts.unlink('${_opportunityInfo.opportunityId}', '${contact.contactId}', '${contact.name}')" title="刪除關聯">🗑️</button>`;
            }

            const roleAndSource = isMainContact 
                ? '<span class="card-tag assignee">主要聯絡人</span>' 
                : '一般聯絡人';
            
            const sourceText = isManual 
                ? '<span style="font-size: 0.75rem; color: var(--text-muted); display: block;">(手動建立)</span>' 
                : '<span style="font-size: 0.75rem; color: var(--text-muted); display: block;">(來自名片)</span>';

            tableHTML += `
                <tr>
                    <td data-label="姓名"><strong>${contact.name}</strong></td>
                    <td data-label="公司">${contact.companyName || '-'}</td>
                    <td data-label="職位">${contact.position || '-'}</td>
                    <td data-label="聯絡方式">${contact.mobile || contact.phone || '-'}</td>
                    <td data-label="角色/來源">${roleAndSource}${sourceText}</td>
                    <td data-label="操作">
                        <div class="action-buttons-container">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    }

    // --- 公開方法 ---

    // 【新增】顯示連結聯絡人的 Modal (Phase 8 Repair)
    function showLinkContactModal(opportunityId) {
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
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('主要聯絡人已更新', 'success');
                    // await loadOpportunityDetailPage(opportunityId);
                    // 【*** 移除結束 ***】
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
                    // 【*** 移除衝突 ***】
                    // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                    // showNotification('聯絡人關聯已刪除', 'success');
                    // await loadOpportunityDetailPage(opportunityId);
                    // 【*** 移除結束 ***】
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
        _opportunityInfo = opportunityInfo;
        _linkedContacts = linkedContacts;
        _render();
        
        // 綁定「+ 關聯聯絡人」按鈕的點擊事件
        const addBtn = document.getElementById('add-associated-contact-btn');
        if (addBtn) {
            addBtn.onclick = () => showLinkContactModal(_opportunityInfo.opportunityId);
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
        _handleLinkExistingContact // 新增公開，供 onclick 使用
    };
})();

//Verification: setAsMain uses opportunityId only.
//No rowIndex usage remains in this file.
</file>

<file path="public/scripts/opportunities/details/opportunity-details-components.js">
// ============================================================================
// File: public/scripts/opportunities/details/opportunity-details-components.js
// ============================================================================
// public/scripts/opportunity-details/opportunity-details-components.js
// 職責：整合機會詳細頁面組件，處理編輯邏輯與資料存取
// * @version 1.1.2 (Phase 8.6A Perf Patch)
// * @date 2026-03-11
// (依賴 OpportunityInfoView 進行顯示模式渲染)

function _injectStylesForOppInfoCard() {
    const styleId = 'opportunity-info-card-container-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* 容器基礎樣式 */
        .opportunity-info-card {
            background-color: var(--secondary-bg);
            padding: var(--spacing-6);
            border-radius: var(--rounded-xl);
            border: 1px solid var(--border-color);
            margin-bottom: var(--spacing-6);
            transition: all 0.3s ease;
        }
        /* 編輯模式專用樣式 (保留原本邏輯) */
        .info-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .editing .info-card-header {
            padding-bottom: var(--spacing-4);
            margin-bottom: var(--spacing-4);
            border-bottom: 1px solid var(--border-color);
        }
        .edit-form-columns { display: flex; gap: var(--spacing-8); align-items: flex-start; }
        .form-col { flex: 1; display: flex; flex-direction: column; gap: var(--spacing-5); min-width: 0; }
        @media (max-width: 900px) { .edit-form-columns { flex-direction: column; gap: var(--spacing-6); } }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 500; }
        .form-input, .form-select, .form-textarea {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: var(--rounded-md);
            background: var(--primary-bg);
            color: var(--text-primary);
            font-size: var(--font-size-base);
        }
        .form-input:read-only, .form-select:disabled, .form-input:disabled { 
            background-color: var(--secondary-bg); 
            cursor: not-allowed; 
            opacity: 0.7; 
            color: var(--text-muted); 
            border-color: var(--border-color);
        }
        .pills-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .info-option-pill {
            padding: 6px 14px; border-radius: var(--rounded-full); font-size: 0.85rem; border: 1px solid var(--border-color);
            cursor: pointer; background: var(--primary-bg); color: var(--text-muted); transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 6px; user-select: none;
        }
        .info-option-pill:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
        .info-option-pill.selected {
            background: color-mix(in srgb, var(--accent-blue) 15%, transparent); color: var(--accent-blue);
            border-color: var(--accent-blue); font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .pill-quantity { display: inline-block; padding: 0px 6px; font-size: 0.75rem; font-weight: 700; background-color: var(--accent-blue); color: white; border-radius: var(--rounded-md); }
        .spec-category-group { margin-bottom: 8px; }
        .spec-category-title { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }
        .spec-pills-wrapper { display: flex; flex-wrap: wrap; gap: 8px; }
        .manual-override-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; margin-top: 4px; }
        .notes-section { margin-top: var(--spacing-6); padding-top: var(--spacing-4); border-top: 1px solid var(--border-color); }
    `;
    document.head.appendChild(style);
}

const OpportunityInfoCard = (() => {
    let _currentOpp = null;
    let _isCascadingInitialized = false; // [Phase 8.6A] Lazy Load Tracker

    async function _getCompanyList() {
        if (window.CRM_APP && window.CRM_APP.companyList && window.CRM_APP.companyList.length > 0) return window.CRM_APP.companyList;
        try {
            const response = await authedFetch('/api/companies');
            if (response.success) {
                if (window.CRM_APP) window.CRM_APP.companyList = response.data;
                return response.data;
            }
        } catch (e) { console.error('獲取公司列表失敗', e); }
        return [];
    }

    function render(opp) {
        _currentOpp = opp;
        _isCascadingInitialized = false; // Reset on re-render

        _injectStylesForOppInfoCard();
        const container = document.getElementById('opportunity-info-card-container');
        if (!container) return;

        // 【修改點】直接呼叫 OpportunityInfoView 來產生顯示模式 HTML
        const displayModeHtml = OpportunityInfoView 
            ? OpportunityInfoView.render(opp) 
            : '<div class="alert alert-error">View Module Missing</div>';

        container.innerHTML = `
            <div id="opportunity-info-display-mode">
                ${displayModeHtml}
            </div>
            <div id="opportunity-info-edit-mode" style="display: none;">
                </div>
        `;

        // 預先生成編輯表單，以便切換時使用
        _generateEditFormHTML(opp).then(html => {
            const editContainer = document.getElementById('opportunity-info-edit-mode');
            if (editContainer) {
                editContainer.innerHTML = html;
                // [Phase 8.6A PERF] Removed eager _initCascadingLogic(opp) to prevent duplicate companyList fetch.
            }
        });
    }

    // [Phase 8.6A PERF] Lazy Initialization Entry Point
    async function ensureCascadingLogic(opp) {
        if (_isCascadingInitialized) return;
        await _initCascadingLogic(opp);
        _isCascadingInitialized = true;
    }

    // ================== 以下為編輯模式邏輯 ==================

    function _renderPillsGroup(configKey, currentValue, fieldId) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const options = systemConfig[configKey] || [];
        
        let pillsHtml = '';
        options.forEach(opt => {
            const isSelected = opt.value === currentValue;
            pillsHtml += `
                <span class="info-option-pill single-select ${isSelected ? 'selected' : ''}" 
                      data-value="${opt.value}" 
                      data-field-target="${fieldId}"
                      onclick="OpportunityInfoCardEvents.handleSingleSelectClick(this)">
                    ${opt.note || opt.value}
                </span>
            `;
        });
        
        return `
            <div class="pills-container single-select-container">
                ${pillsHtml}
                <input type="hidden" id="edit-${fieldId}" value="${currentValue || ''}">
            </div>
        `;
    }

    function _renderCustomPillsGroup(options, currentValue, fieldId, clickHandler) {
        let pillsHtml = '';
        options.forEach(opt => {
            const isSelected = opt === currentValue;
            pillsHtml += `
                <span class="info-option-pill single-select ${isSelected ? 'selected' : ''}" 
                      data-value="${opt}" 
                      data-field-target="${fieldId}"
                      onclick="${clickHandler}(this)">
                    ${opt}
                </span>
            `;
        });
        
        return `
            <div class="pills-container single-select-container">
                ${pillsHtml}
                <input type="hidden" id="edit-${fieldId}" value="${currentValue || ''}">
            </div>
        `;
    }

    function _renderSpecsGroup(opp) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const specsConfig = systemConfig['可能下單規格'] || [];
        
        let specQuantities = new Map();
        try {
            const parsed = JSON.parse(opp.potentialSpecification);
            if (parsed && typeof parsed === 'object') specQuantities = new Map(Object.entries(parsed));
        } catch (e) {}

        const groups = new Map();
        specsConfig.forEach(spec => {
            const cat = spec.category || '其他';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(spec);
        });

        let html = '<div id="spec-pills-container" class="form-group">';
        groups.forEach((items, category) => {
            let pillsHtml = '';
            items.forEach(spec => {
                const quantity = specQuantities.get(spec.value) || 0;
                const isSelected = specQuantities.has(spec.value);
                let qtyHtml = '';
                if (isSelected && spec.value3 === 'allow_quantity' && quantity > 0) {
                    qtyHtml = `<span class="pill-quantity" data-spec-id="${spec.value}">(x${quantity})</span>`;
                }
                pillsHtml += `
                    <span class="info-option-pill ${isSelected ? 'selected' : ''}" 
                          data-spec-id="${spec.value}" 
                          title="${spec.note}">
                        ${spec.note || spec.value}
                        ${qtyHtml}
                    </span>
                `;
            });
            html += `
                <div class="spec-category-group">
                    <div class="spec-category-title">▼ ${category}</div>
                    <div class="spec-pills-wrapper">${pillsHtml}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    async function _generateEditFormHTML(opp) {
        const salesModel = opp.salesModel || '直接販售';
        const isManualValue = opp.opportunityValueType === 'manual';
        
        const rawValue = opp.opportunityValue;
        const formattedValue = String(rawValue !== null && rawValue !== undefined ? rawValue : '0').replace(/,/g, '');
        
        const salesModelOptions = ['直接販售', '經由SI販售', '經由MTB販售'];
        
        const createdDate = opp.createdTime ? opp.createdTime.split('T')[0] : '';
        const expectedDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '';

        const initSalesChannel = opp.salesChannel || opp.channelDetails || '';

        return `
            <div class="info-card-header">
                <h2 class="widget-title" style="margin: 0;">編輯核心資訊</h2>
                <div style="display: flex; gap: 8px;">
                    <button class="action-btn small secondary" onclick="OpportunityInfoCardEvents.toggleEditMode(false)">取消</button>
                    <button class="action-btn small primary" onclick="OpportunityInfoCardEvents.save()">💾 儲存</button>
                </div>
            </div>

            <div class="edit-form-columns">
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">機會名稱</label>
                        <input type="text" id="edit-opportunity-name" class="form-input" value="${opp.opportunityName || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">銷售模式</label>
                        ${_renderCustomPillsGroup(salesModelOptions, salesModel, 'sales-model', 'OpportunityInfoCardEvents.handleSalesModelPillClick')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">終端客戶 (客戶公司)</label>
                        <select id="edit-customer-company" class="form-select" onchange="OpportunityInfoCardEvents.handleCustomerChange(this.value)">
                            <option value="">載入中...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">終端窗口 (聯絡人)</label>
                        <select id="edit-main-contact" class="form-select">
                            <option value="">載入中...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">主要通路/下單方 (公司選擇)</label>
                        <select id="edit-channel-details" class="form-select" onchange="OpportunityInfoCardEvents.handleChannelChange(this.value)">
                            <option value="">載入中...</option>
                        </select>
                        <input type="hidden" id="edit-sales-channel" value="${initSalesChannel}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">通路窗口 (聯絡人)</label>
                        <select id="edit-channel-contact" class="form-select">
                            <option value="">-- 請先選擇通路公司 --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會價值</label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input type="text" id="edit-opportunity-value" class="form-input" 
                                   value="${formattedValue}" ${isManualValue ? '' : 'disabled'} style="flex:1;">
                        </div>
                        <label class="manual-override-label">
                            <input type="checkbox" id="value-manual-override-checkbox" 
                                   onchange="OpportunityInfoCardEvents.handleManualOverride(this)"
                                   ${isManualValue ? 'checked' : ''}>
                            手動覆蓋自動計算
                        </label>
                    </div>

                    <div class="form-group">
                        <label class="form-label">負責業務</label>
                        ${_renderPillsGroup('團隊成員', opp.assignee, 'assignee')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會種類</label>
                        ${_renderPillsGroup('機會種類', opp.opportunityType, 'opportunity-type')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">設備規模</label>
                        ${_renderPillsGroup('設備規模', opp.deviceScale, 'device-scale')}
                    </div>
                </div>

                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">下單機率</label>
                        ${_renderPillsGroup('下單機率', opp.orderProbability, 'order-probability')}
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">建立機會日期</label>
                        <input type="date" id="edit-created-time" class="form-input" 
                               value="${createdDate}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">預計結案日</label>
                        <input type="date" id="edit-expected-close-date" class="form-input" 
                               value="${expectedDate}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">目前階段</label>
                        ${_renderPillsGroup('機會階段', opp.currentStage, 'current-stage')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">機會來源</label>
                        ${_renderPillsGroup('機會來源', opp.opportunitySource, 'opportunity-source')}
                    </div>

                    <div class="form-group">
                        <label class="form-label">可能下單規格 (複選)</label>
                        ${_renderSpecsGroup(opp)}
                    </div>
                </div>
            </div>

            <div class="notes-section">
                <div class="form-group">
                    <label class="form-label">備註</label>
                    <textarea id="edit-notes" class="form-textarea" rows="3">${opp.notes || ''}</textarea>
                </div>
            </div>
        `;
    }

    async function _initCascadingLogic(opp) {
        const companies = await _getCompanyList();
        
        // 1. 初始化「終端客戶」下拉選單
        const customerSelect = document.getElementById('edit-customer-company');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">-- 請選擇 --</option>';
            companies.forEach(c => {
                const option = document.createElement('option');
                option.value = c.companyName;
                option.text = c.companyName;
                if (c.companyName === opp.customerCompany) option.selected = true;
                customerSelect.add(option);
            });
        }

        // 3. 連動邏輯 (銷售模式 -> 通路列表)
        await handleSalesModelChange(opp.salesModel || '直接販售', false);
    }

    async function handleSalesModelChange(modelValue, resetValue = true) {
        const channelSelect = document.getElementById('edit-channel-details');
        const channelContactSelect = document.getElementById('edit-channel-contact');
        const customerSelect = document.getElementById('edit-customer-company');
        
        if (!channelSelect || !customerSelect) return;

        const currentCustomer = customerSelect.value;
        const savedChannelDetails = _currentOpp ? (_currentOpp.channelDetails || '') : '';
        const companies = await _getCompanyList();
        
        channelSelect.innerHTML = '';
        
        if (modelValue === '直接販售') {
            const option = document.createElement('option');
            option.value = currentCustomer;
            option.text = currentCustomer ? `${currentCustomer} (直販)` : '-- 同終端客戶 --';
            option.selected = true;
            channelSelect.add(option);
            
            channelSelect.disabled = true; 

            if (channelContactSelect) {
                channelContactSelect.innerHTML = '<option value="">-- 不適用 --</option>';
                channelContactSelect.disabled = true;
            }

        } else {
            channelSelect.disabled = false;

            const typeKeyword = modelValue.includes('SI') ? 'SI' : (modelValue.includes('MTB') ? 'MTB' : '');
            let filteredCompanies = companies.filter(c => {
                const type = (c.companyType || c.type || '').toUpperCase();
                return type.includes(typeKeyword);
            });
            if (filteredCompanies.length === 0 && companies.length > 0) filteredCompanies = companies;

            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.text = "-- 請選擇合作夥伴 --";
            channelSelect.add(defaultOption);

            filteredCompanies.forEach(c => {
                const option = document.createElement('option');
                option.value = c.companyName;
                option.text = c.companyName;
                
                if (!resetValue && c.companyName === savedChannelDetails) {
                    option.selected = true;
                }
                channelSelect.add(option);
            });
            
            if (!resetValue && savedChannelDetails && !filteredCompanies.some(c => c.companyName === savedChannelDetails)) {
                 const option = document.createElement('option');
                 option.value = savedChannelDetails;
                 option.text = savedChannelDetails + ' (非清單)';
                 option.selected = true;
                 channelSelect.add(option);
            }
            
            if (channelContactSelect && resetValue) {
                channelContactSelect.innerHTML = '<option value="">-- 請先選擇通路公司 --</option>';
                channelContactSelect.disabled = true; 
            }
        }
    }

    return { render, handleSalesModelChange, ensureCascadingLogic };
})();

// OpportunityAssociatedOpps 保持不變
const OpportunityAssociatedOpps = (() => {
    async function _handleRemoveParentLink(opportunityId, rowIndex) {
        showConfirmDialog('您確定要移除此母機會關聯嗎？', async () => {
            showLoading('正在移除關聯...');
            try {
                const result = await authedFetch(`/api/opportunities/${opportunityInfo.opportunityId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ parentOpportunityId: '', modifier: getCurrentUser() })
                });
                if (!result.success) throw new Error(result.error || '移除失敗');
            } catch (error) {
                if (error.message !== 'Unauthorized') showNotification(`移除關聯失敗: ${error.message}`, 'error');
            } finally { hideLoading(); }
        });
    }

    function render(details) {
        const container = document.getElementById('associated-opportunities-list');
        const addButton = document.getElementById('add-associated-opportunity-btn');
        if (!container || !addButton) return;
        const { opportunityInfo, parentOpportunity, childOpportunities } = details;
        let html = '';
        addButton.style.display = 'flex'; 
        addButton.onclick = () => showLinkOpportunityModal(opportunityInfo.opportunityId, opportunityInfo.rowIndex);
        if (parentOpportunity) {
            html += `<div class="summary-item" style="margin-bottom: 1rem;"><span class="summary-label">母機會</span><div style="display: flex; align-items: center; gap: 10px;"><span class="summary-value" style="font-size: 1rem;"><a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${parentOpportunity.opportunityId}' })">${parentOpportunity.opportunityName}</a></span><button class="action-btn small danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="OpportunityAssociatedOpps._handleRemoveParentLink('${opportunityInfo.opportunityId}', ${opportunityInfo.rowIndex})" title="移除母機會關聯">移除</button></div></div>`;
            addButton.textContent = '✏️ 變更母機會';
        } else { addButton.textContent = '+ 設定母機會'; }
        if (childOpportunities && childOpportunities.length > 0) {
            html += `<div class="summary-item"><span class="summary-label">子機會 (${childOpportunities.length})</span></div><ul style="list-style: none; padding-left: 1rem; margin-top: 0.5rem;">`;
            childOpportunities.forEach(child => { html += `<li style="margin-bottom: 0.5rem;"><a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${child.opportunityId}' })">${child.opportunityName}</a></li>`; });
            html += `</ul>`;
        }
        if (!parentOpportunity && (!childOpportunities || childOpportunities.length === 0)) html = '<div class="alert alert-info">尚無關聯機會。</div>';
        container.innerHTML = html;
    }
    return { render, _handleRemoveParentLink };
})();
</file>

<file path="public/scripts/opportunities/details/opportunity-event-reports.js">
// File: public/scripts/opportunities/details/opportunity-event-reports.js
// views/scripts/opportunity-details/event-reports.js
// 職責：專門管理「事件報告」頁籤的 UI 與功能，包含總覽模式與列表模式
// (V6 - 最終修復版：補回公開方法並整合全域樣式)

const OpportunityEvents = (() => {
    // 模組私有變數
    let _eventLogs = [];
    let _context = {}; // 儲存機會或公司的上下文資訊
    let _cachedContacts = []; // 儲存初始化時傳入的聯絡人資料，用於職稱補完

    /**
     * 【核心修正】：動態注入樣式。
     * 將原先位於 event-log-list.html 的 CSS 移至此處，
     * 解決「總覽模式」首次開啟時樣式走板的問題。
     */
    function _injectStyles() {
        const styleId = 'event-reports-unified-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- 總覽模式外層容器 --- */
            #event-logs-overview-view, [id^="event-logs-overview-view-"] {
                display: flex;
                flex-direction: column;
                gap: 20px;
                width: 100%;
            }

            /* --- 報告卡片核心結構 --- */
            .report-view { 
                background-color: var(--primary-bg);
                border-radius: var(--rounded-xl);
                overflow: hidden;
            }

            .report-header {
                --header-color: var(--accent-purple); 
                background: color-mix(in srgb, var(--header-color) 15%, var(--primary-bg));
                border: 1px solid color-mix(in srgb, var(--header-color) 30%, var(--border-color));
                padding: 20px 25px;
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .report-title {
                font-size: 1.6rem; font-weight: 700; color: var(--text-primary);
                line-height: 1.3; margin-bottom: 15px; display: flex; align-items: center; gap: 12px;
            }

            .header-meta-info {
                display: flex; justify-content: space-between; font-size: 0.95rem;
                color: var(--text-secondary); padding-top: 12px;
                border-top: 1px solid color-mix(in srgb, var(--header-color) 20%, var(--border-color));
            }

            /* --- 內容區塊排版 --- */
            .report-container { display: flex; flex-direction: column; gap: 20px; }
            /* 保持您要求的左側 10% 內縮排版 */
            [id^="event-logs-overview-view-"] .report-container { padding-left: 10% !important; }

            .report-section {
                background: var(--card-bg); border: 1px solid var(--border-color);
                border-radius: 12px; padding: 24px; box-shadow: var(--shadow-sm);
            }

            .section-title {
                font-size: 1.2rem; font-weight: 700; color: var(--text-primary);
                margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);
                display: flex; align-items: center; gap: 8px;
            }

            /* --- 資訊欄位 Grid 佈局 --- */
            .info-item {
                display: grid; grid-template-columns: 140px 1fr; gap: 16px; padding: 12px 0; align-items: start; 
            }

            .info-label {
                font-weight: 600; color: var(--text-muted); font-size: 0.95rem;
                padding-top: 10px; text-align: right;
            }

            .info-value-box {
                background-color: var(--primary-bg); border: 1px solid var(--border-color);
                padding: 10px 12px; border-radius: 8px; min-height: 42px;
                color: var(--text-primary); font-size: 1rem; line-height: 1.6;
                white-space: pre-wrap; word-break: break-word;
            }

            /* --- 人員膠囊樣式 --- */
            .participants-wrapper { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
            .participant-pill {
                display: inline-flex; align-items: center; padding: 4px 12px;
                border-radius: 20px; font-size: 0.9rem; font-weight: 500;
                background-color: var(--secondary-bg); border: 1px solid var(--border-color);
            }
            .participant-pill.our-side {
                background-color: color-mix(in srgb, var(--accent-blue) 10%, var(--secondary-bg));
                color: var(--accent-blue);
            }
            .participant-pill.client-side {
                background-color: color-mix(in srgb, var(--accent-green) 10%, var(--secondary-bg));
                color: var(--accent-green);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 渲染初始視圖（列表模式）
     */
    function _render() {
        const container = _context.opportunityId 
            ? document.getElementById('tab-content-events') 
            : document.getElementById('tab-content-company-events');

        if (!container) return;

        const headerHtml = `
            <div class="widget-header">
                <h2 class="widget-title">相關事件報告</h2>
                <div style="display: flex; gap: 10px;">
                    ${(_eventLogs && _eventLogs.length > 0) ? `
                    <button id="toggle-overview-btn-${_context.id}" class="action-btn small secondary" 
                            onclick="OpportunityEvents.toggleOverview(true, '${_context.id}')">
                        總覽模式
                    </button>` : ''}
                    <button class="action-btn small primary" onclick="OpportunityEvents.showAddEventModal()">
                        📝 新增事件
                    </button>
                </div>
            </div>
        `;
        
        let listHtml = '';
        if (!_eventLogs || _eventLogs.length === 0) {
            listHtml = '<div class="alert alert-info">此處尚無相關的事件報告</div>';
        } else {
            listHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>建立時間</th>
                            <th>事件名稱</th>
                            <th>建立者</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>`;
            _eventLogs.forEach(log => {
                listHtml += `
                    <tr>
                        <td data-label="建立時間">${formatDateTime(log.createdTime)}</td>
                        <td data-label="事件名稱">${log.eventName || '(未命名)'}</td>
                        <td data-label="建立者">${log.creator || 'N/A'}</td>
                        <td data-label="操作">
                            <button class="action-btn small info" onclick="showEventLogReport('${log.eventId}')">
                                📄 查看報告
                            </button>
                        </td>
                    </tr>
                `;
            });
            listHtml += '</tbody></table>';
        }

        container.innerHTML = `
            <div class="dashboard-widget">
                ${headerHtml}
                <div class="widget-content">
                    <div id="event-logs-list-view-${_context.id}">${listHtml}</div>
                    <div id="event-logs-overview-view-${_context.id}" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    // --- 公開方法 (API) ---

    /**
     * 開啟新增事件 Modal
     */
    function showAddEventModal() {
        if (_context.opportunityId) {
            // [Refactor] Direct call to modal manager to pass full context (including customerCompany)
            // Bypassing events.js helper to respect module boundaries and ensure proper defaults
            if (typeof showEventLogFormModal === 'function') {
                showEventLogFormModal({ 
                    opportunityId: _context.opportunityId, 
                    opportunityName: _context.opportunityName || '',
                    customerCompany: _context.customerCompany || '' 
                });
            } else {
                console.error("showEventLogFormModal is not defined");
            }
        } else if (_context.companyId) {
            if (typeof showEventLogFormModal === 'function') {
                showEventLogFormModal({ companyId: _context.companyId, companyName: _context.companyName });
            }
        }
    }

    /**
     * 切換列表模式與總覽模式
     */
    async function toggleOverview(showOverview, contextId) {
        const listView = document.getElementById(`event-logs-list-view-${contextId}`);
        const overviewView = document.getElementById(`event-logs-overview-view-${contextId}`);
        const toggleBtn = document.getElementById(`toggle-overview-btn-${contextId}`);

        if (!listView || !overviewView) return;

        if (showOverview) {
            listView.style.display = 'none';
            overviewView.style.display = 'flex';
            overviewView.innerHTML = '<div class="loading show"><div class="spinner"></div><p>載入報告總覽中...</p></div>';
            
            toggleBtn.textContent = '返回列表';
            toggleBtn.setAttribute('onclick', `OpportunityEvents.toggleOverview(false, '${contextId}')`);

            // 使用 setTimeout 確保 DOM 狀態穩定並應用新注入的樣式
            setTimeout(() => {
                if (typeof renderEventLogReportHTML === 'function') {
                    if (_eventLogs && _eventLogs.length > 0) {
                        const allReportsHtml = _eventLogs.map(log => {
                            const logData = { ...log };
                            // 補上上下文名稱
                            if (_context.opportunityId) {
                                logData.opportunityName = logData.opportunityName || _context.opportunityName;
                            }
                            // 傳入已有的聯絡人資料，確保總覽中的職稱能正確顯示
                            return renderEventLogReportHTML(logData, _cachedContacts);
                        }).join('');
                        
                        overviewView.innerHTML = allReportsHtml;
                    } else {
                        overviewView.innerHTML = '<div class="alert alert-info">此處尚無相關的事件報告</div>';
                    }
                } else {
                    overviewView.innerHTML = '<div class="alert alert-error">報告渲染引擎載入失敗，請重新整理頁面。</div>';
                }
            }, 50);

        } else {
            listView.style.display = 'block';
            overviewView.style.display = 'none';
            toggleBtn.textContent = '總覽模式';
            toggleBtn.setAttribute('onclick', `OpportunityEvents.toggleOverview(true, '${contextId}')`);
        }
    }

    /**
     * 模組初始化
     * @param {Array} eventLogs - 事件日誌陣列
     * @param {Object} context - 上下文 (包含 opportunityId 或 companyId)
     */
    function init(eventLogs, context) {
        _eventLogs = eventLogs || [];
        _context = { 
            ...context, 
            id: context.opportunityId || context.companyId 
        };
        // 重要：儲存從詳細頁傳入的聯絡人資訊 (包含各員之職稱)
        _cachedContacts = context.linkedContacts || []; 

        _injectStyles();
        _render();
    }

    // 回傳公開介面
    return {
        init: init,
        toggleOverview: toggleOverview,
        showAddEventModal: showAddEventModal // 修復點：公開此函式以供 onclick 使用
    };
})();

// [Fix] Explicitly expose to window so inline onclick handlers (e.g., in _render) can access it
window.OpportunityEvents = OpportunityEvents;
</file>

<file path="public/scripts/opportunities/details/opportunity-info-view.js">
// public/scripts/opportunities/details/opportunity-info-view.js
// -------------------------------------------------------------------------
// 檔案職責：專門負責「機會核心資訊」的純顯示模式 (Read-Only UI)
// UI 風格：Final Polish + Bento Grid Optimization
// 修改紀錄：[2026-03-02] Phase 8 Patch: 
// 1. Safe JSON parsing for specifications to prevent console warnings
// 2. Support both Object and String formats for potentialSpecification
// -------------------------------------------------------------------------

const OpportunityInfoView = (() => {

    function _injectStyles() {
        const styleId = 'opportunity-info-view-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- 基礎容器 --- */
            .opp-view-container {
                display: flex;
                flex-direction: column;
                gap: 16px; /* 統一主要間距 */
                width: 100%;
                box-sizing: border-box;
                position: relative;
            }

            /* --- 全域區塊標題 --- */
            .main-section-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-muted);
                margin-bottom: -8px;
                margin-left: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            /* 中間插入的標題間距 */
            .mid-section-title {
                margin-top: 4px;
                margin-bottom: -8px;
            }

            /* --- 通用卡片基底 (應用 Bento 圓角與互動) --- */
            .layer-card {
                background-color: var(--primary-bg, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 2px 4px rgba(0,0,0,0.04); /* 柔和初始陰影 */
                padding: 20px;
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            
            /* ★ Bento Style: 懸停浮起效果 */
            .layer-card:hover {
                transform: translateY(-3px); 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
            }
            
            /* 針對沒有 Padding 的 split card 移除 hover 效果，避免衝突 */
            .card-split-royal-blue:hover {
                transform: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            }

            /* 統一標題樣式 (預設灰色) */
            .unified-label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1.2;
            }

            /* 內部卡片標題 (預設灰色) */
            .inner-card-title {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* ==========================================================================
               Row 1: 頂部資訊列
               ========================================================================== */
            .header-separate-row {
                display: flex;
                gap: 16px; /* 統一間距 */
                align-items: stretch;
                width: 100%;
            }
            .header-card-name {
                flex: 70; 
                justify-content: center;
                align-items: flex-start;
                gap: 6px;
                padding: 20px 24px;
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                transition: all 0.3s;
            }
            .header-card-name:hover {
                transform: translateY(-3px); /* 跟隨 Bento 效果 */
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .name-title {
                font-size: 1.8rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.2;
                margin: 0;
            }
            .header-card-mini {
                flex: 10;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 12px 4px;
                gap: 4px;
                min-width: 0;
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                transition: all 0.3s;
            }
            .header-card-mini:hover {
                transform: translateY(-3px); /* 跟隨 Bento 效果 */
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            .header-card-action-btn {
                flex: 10;
                align-items: center;
                justify-content: center;
                padding: 0;
                /* 保持橘色風格，但圓角加大 */
                background: linear-gradient(135deg, #f97316, #ea580c);
                border: 1px solid #c2410c;
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);
                display: flex;
                flex-direction: column;
                gap: 6px;
                cursor: pointer;
                transition: transform 0.1s, box-shadow 0.2s;
                text-align: center;
                color: white;
                font-weight: 700;
                text-decoration: none;
            }
            .header-card-action-btn:hover {
                transform: translateY(-4px); /* 加大浮動距離，更像按鈕 */
                box-shadow: 0 8px 15px rgba(249, 115, 22, 0.4);
                background: linear-gradient(135deg, #fb923c, #f97316);
            }
            .header-card-action-btn:active { transform: translateY(0); }
            .edit-btn-content {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 0.85rem;
                letter-spacing: 1px;
            }
            .edit-icon-svg { width: 14px; height: 14px; stroke-width: 3; }
            .mini-header-value {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.3;
                word-break: break-word; 
            }

            /* ==========================================================================
               Row 2: 關鍵指標
               ========================================================================== */
            .stats-grid-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px; /* 統一間距 */
                width: 100%;
            }
            .big-stat-card {
                background-color: var(--primary-bg);
                border: 1px solid var(--border-color);
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
                padding: 24px 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                justify-content: flex-start;
                align-items: flex-start;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            /* ★ Bento Style: 懸停浮起效果 */
            .big-stat-card:hover {
                transform: translateY(-3px); 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
            }

            /* 特殊樣式：翡翠綠金幣卡 (Saturated Emerald) */
            .card-style-green {
                background-color: #059669; /* Emerald 600 */
                border: 1px solid #047857; /* Emerald 700 */
                color: white; /* 全白文字 */
            }
            .card-style-green .unified-label {
                color: rgba(255, 255, 255, 0.9); 
                border-bottom-color: rgba(255, 255, 255, 0.3);
            }
            .card-style-green .stat-value {
                color: #ffffff;
            }
            
            .stat-value {
                font-size: 1.4rem;
                font-weight: 700;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            .stat-value.val-money { 
                font-size: 2rem; 
                font-family: 'Roboto Mono', monospace; 
                letter-spacing: -1px; 
            }

            /* ==========================================================================
               Row 3: 三欄並列
               ========================================================================== */
            .triple-col-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 16px; /* 統一間距 */
                align-items: stretch;
                width: 100%;
            }
            .triple-col-row .layer-card { height: 100%; }

            /* ★ 商流卡片：寶藍色分層設計 (Royal Blue Split Card) */
            .card-split-royal-blue {
                padding: 0 !important; 
                border: 1px solid #1d4ed8; /* Blue 700 Border */
                overflow: hidden;
                background-color: white;
                border-radius: 16px; /* ★ Bento Style: 加大圓角 */
            }
            
            /* 上半部：寶藍色標頭 */
            .split-card-header {
                background-color: #1d4ed8; /* Blue 700 (Royal Blue) */
                color: white;
                padding: 16px;
                text-align: center;
                border-bottom: 1px solid #1e40af;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                flex: 0 0 auto;
                min-height: 50px;
            }
            .split-header-text {
                font-size: 1.2rem;
                font-weight: 700;
                letter-spacing: 0.5px;
            }

            /* 下半部：白底內容 (Body) */
            .split-card-body {
                background-color: white;
                padding: 16px 20px;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 12px;
            }

            .split-target-name {
                font-size: 1.3rem; 
                font-weight: 700;
                color: var(--text-primary);
                text-align: center;
                line-height: 1.2;
            }
            
            .split-contact-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 0.95rem;
                color: var(--text-primary);
                flex-wrap: wrap;
                width: 100%;
                padding-top: 8px;
                border-top: 1px dashed var(--border-color);
            }
            
            .contact-prefix {
                color: var(--text-muted);
                font-weight: 500;
            }

            /* 職稱 Badge (淡藍膠囊) */
            .job-title-badge {
                display: inline-block;
                background-color: #eff6ff; 
                color: #1e40af; 
                font-size: 0.75rem;
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 600;
                border: 1px solid #dbeafe;
                margin-left: 4px;
            }

            /* Col 2: 規格 (Blue Active Style) */
            .specs-tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-content: flex-start;
            }
            .spec-tag {
                display: inline-flex;
                align-items: center;
                color: var(--accent-blue, #2563eb);
                border: 1px solid var(--accent-blue, #2563eb);
                background-color: color-mix(in srgb, var(--accent-blue, #2563eb) 10%, transparent);
                padding: 4px 10px;
                border-radius: 6px; 
                font-size: 0.9rem;
                font-weight: 700;
                line-height: 1.4;
            }
            .spec-qty-text {
                margin-left: 4px;
                opacity: 0.9;
                font-family: monospace; 
                font-weight: 700;
            }

            /* Col 3: 關鍵日期 */
            .dates-content {
                display: flex;
                flex-direction: column;
                gap: 12px;
                height: 100%;
                justify-content: flex-start; 
            }
            .date-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 8px;
                border-bottom: 1px dashed var(--border-color);
            }
            .date-row:last-child { border-bottom: none; padding-bottom: 0; }
            .date-key { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
            .date-val { font-size: 0.95rem; color: var(--text-primary); font-weight: 600; font-family: monospace; }

            /* Row 4: 備註 */
            .notes-text-clean {
                font-size: 1rem;
                color: var(--text-primary);
                line-height: 1.6;
                white-space: pre-wrap;
                padding: 0;
            }

            /* RWD */
            @media (max-width: 900px) {
                .header-separate-row { flex-direction: column; gap: 16px; } /* 統一間距 */
                .header-card-name, .header-card-mini, .header-card-action-btn { flex: auto; width: 100%; padding: 16px; align-items: flex-start; justify-content: flex-start; text-align: left; }
                .header-card-action-btn { align-items: center; justify-content: center; background: var(--accent-orange); } 
                .stats-grid-row { grid-template-columns: repeat(2, 1fr); gap: 16px; } /* 統一間距 */
                .triple-col-row { grid-template-columns: 1fr; gap: 16px; } /* 統一間距 */
            }
        `;
        document.head.appendChild(style);
    }

    // 輔助：查找規格設定
    function _getSpecConfig(specName) {
        if (!window.CRM_APP || !window.CRM_APP.systemConfig) return null;
        const config = window.CRM_APP.systemConfig;
        for (const key in config) {
            if (Array.isArray(config[key])) {
                const found = config[key].find(item => item.value === specName);
                if (found) return found;
            }
        }
        return null;
    }

    function render(opp) {
        _injectStyles();

        // Phase 8 Compatibility Helper: read first available key (new DTO vs legacy UI)
        const getFirst = (obj, keys, fallback = '') => {
            const source = obj || {};
            for (const k of keys || []) {
                const v = source[k];
                if (v === null || v === undefined) continue;
                if (typeof v === 'string') {
                    const t = v.trim();
                    if (t !== '') return t;
                    continue;
                }
                return v;
            }
            return fallback;
        };

        // 1. 商流邏輯
        const salesModel = getFirst(opp, ['salesModel'], '直接販售') || '直接販售';
        const isDirect = salesModel === '直接販售';
        
        const customerCompany = getFirst(opp, ['customerCompany'], '');
        const channelDetails = getFirst(opp, ['channelDetails'], '');
        const salesChannel = getFirst(opp, ['salesChannel'], '');

        const targetName = isDirect
            ? (customerCompany || '未指定客戶')
            : (channelDetails || salesChannel || '未指定通路');

        const mainContact = getFirst(opp, ['mainContact'], '');
        const channelContact = getFirst(opp, ['channelContact'], '');
        const targetContactName = isDirect ? mainContact : channelContact;

        // 【修改】直接從 opp 物件中獲取職稱，無需前端複雜查找
        const targetTitle = getFirst(opp, ['mainContactJobTitle'], '');
        const titleHtml = targetTitle ? `<span class="job-title-badge">${targetTitle}</span>` : '';

        // 2. 規格 Tags 生成
        let specsContent = '<span style="color:var(--text-muted); font-style:italic; padding:4px;">(尚未指定規格)</span>';
        
        let parsed = {};
        const rawSpec = opp.potentialSpecification;

        // [Forensics Fix] Robust Type Check & Parse for Specs
        // Rule: Object -> use; String -> parse; Error/Empty -> {}
        if (rawSpec) {
            if (typeof rawSpec === 'object') {
                parsed = rawSpec;
            } else if (typeof rawSpec === 'string') {
                const trimmed = rawSpec.trim();
                if (trimmed) {
                    try {
                        parsed = JSON.parse(trimmed);
                    } catch (e) {
                        // Silent failure for invalid JSON to prevent console spam
                    }
                }
            }
        }

        if (parsed && typeof parsed === 'object') {
            const entries = Object.entries(parsed);
            if (entries.length > 0) {
                specsContent = entries.map(([name, qty]) => {
                    const configItem = _getSpecConfig(name);
                    const isCountable = configItem && configItem.value3 === 'allow_quantity';
                    
                    let displayHtml = name;
                    if (isCountable && qty && qty > 0) {
                        displayHtml += `<span class="spec-qty-text">(${qty})</span>`;
                    }
                    
                    return `<div class="spec-tag">${displayHtml}</div>`;
                }).join('');
            }
        }

        // 3. 數值與日期
        // [Phase 7 SQL Type Safety Fix] Ensure value is string before replace, use Number()
        const rawValue = opp.opportunityValue;
        const cleanVal = (rawValue !== null && rawValue !== undefined) ? String(rawValue).replace(/,/g, '') : '0';
        const numVal = Number(cleanVal);
        const valueStr = isNaN(numVal) ? '0' : numVal.toLocaleString();
        
        const createdDate = opp.createdTime ? opp.createdTime.split('T')[0] : '-';
        const closeDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '-';
        
        const notesContent = opp.notes || '<span style="color:var(--text-muted);">(無備註內容)</span>';

        // [PATCH] Support multiple field names for Probability (SQL vs Sheet)
        const displayProbability = getFirst(opp, ['orderProbability', 'winProbability', 'win_probability'], '-') || '-';

        // Compatibility mappings (new DTO vs legacy UI)
        const displayAssignee = getFirst(opp, ['assignee', 'owner'], '-') || '-';
        const displaySource = getFirst(opp, ['opportunitySource', 'source'], '-') || '-';

        return `
            <div class="opp-view-container">

                <div class="main-section-title">機會核心資訊</div>

                <div class="header-separate-row">
                    <div class="header-card-name">
                        <span class="unified-label">機會名稱</span>
                        <h1 class="name-title">${opp.opportunityName || '未命名機會'}</h1>
                    </div>
                    
                    <div class="header-card-mini">
                        <span class="unified-label">負責業務</span>
                        <span class="mini-header-value">${displayAssignee}</span>
                    </div>

                    <div class="header-card-mini">
                        <span class="unified-label">機會來源</span>
                        <span class="mini-header-value">${displaySource}</span>
                    </div>

                    <div class="header-card-action-btn" onclick="OpportunityInfoCardEvents.toggleEditMode(true)" title="編輯機會資訊">
                        <div class="edit-btn-content">
                            <span>編輯</span>
                            <svg class="edit-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="stats-grid-row">
                    <div class="big-stat-card">
                        <span class="unified-label">終端客戶</span>
                        <span class="stat-value" title="${customerCompany}">${customerCompany || '-'}</span>
                    </div>
                    <div class="big-stat-card">
                        <span class="unified-label">機會種類</span>
                        <span class="stat-value">${opp.opportunityType || '-'}</span>
                    </div>
                    <div class="big-stat-card card-style-green">
                        <span class="unified-label">機會價值</span>
                        <span class="stat-value val-money">$${valueStr}</span>
                    </div>
                    <div class="big-stat-card">
                        <span class="unified-label">下單機率</span>
                        <span class="stat-value" style="color: var(--text-primary);">${displayProbability}</span>
                    </div>
                </div>

                <div class="main-section-title mid-section-title">販售商流</div>

                <div class="triple-col-row">
                    
                    <div class="layer-card card-split-royal-blue">
                        <div class="split-card-header">
                            <span class="split-header-text">${salesModel}</span>
                        </div>
                        
                        <div class="split-card-body">
                            <div class="split-target-name">${targetName}</div>
                            
                            ${targetContactName ? `
                                <div class="split-contact-row">
                                    <span class="contact-prefix">窗口：</span>
                                    <span>${targetContactName}</span>
                                    ${titleHtml}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="layer-card">
                        <div class="inner-card-title">可能下單規格</div>
                        <div class="specs-tags-container">
                            ${specsContent}
                        </div>
                    </div>

                    <div class="layer-card">
                        <div class="inner-card-title">關鍵日期</div>
                        <div class="dates-content">
                            <div class="date-row">
                                <span class="date-key">建立日期</span>
                                <span class="date-val">${createdDate}</span>
                            </div>
                            <div class="date-row">
                                <span class="date-key">預計結案</span>
                                <span class="date-val">${closeDate}</span>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="layer-card">
                    <div class="inner-card-title">備註</div>
                    <div class="notes-text-clean">${notesContent}</div>
                </div>

            </div>
        `;
    }

    return { render };
})();
</file>

<file path="public/scripts/opportunities/details/opportunity-interactions.js">
/*
 * Project: TFC CRM
 * File: public/scripts/opportunities/details/opportunity-interactions.js
 * Version: v8.0.22 (Phase 8.10.18 - Timeline Stabilization & CSS Polish)
 * Date: 2026-04-14
 * Changelog: 
 * - Phase 8 Interaction UI: operation-key rowIndex -> interactionId for edit/delete
 * - Phase 8.10.2 Fix: Relaxed strict result.success check to prevent unreachable markStale on 204/raw responses
 * - Phase 8.10.3 Fix: Appended 'Z' to naive UTC ISO strings during showForEditing to prevent 8-hour offset loss.
 * - Phase 8.10.4 Patch: Restore legacy clickable event report links inside contentSummary.
 * - Phase 8.10.5 Fix: Restored mandatory timeline-card structure (crm-timeline-item) and left/right layout.
 * - Phase 8.10.6 Fix: Aligned left/right with eventType (not index), fixed Event Report placement.
 * - Phase 8.10.7 Patch: Fixed timeline geometry (absolute marker on center line), dynamic config-driven left/right logic, and adjusted card information hierarchy.
 * - Phase 8.10.8 Fix: Migrated left/right layout to strictly use '時間軸佈局' config source, solidified geometry and information hierarchy.
 * - Phase 8.10.9 Polish: Converted timeline to fixed-height scrollable workspace, styled right form as a contained panel, refined typography, and removed expand/collapse.
 * - Phase 8.10.10 Patch: Micro fix to ensure timeline vertical line always spans the full dynamic height of rendered items.
 * - Phase 8.10.11 Patch: Micro fix to wrap all timeline items in .interaction-timeline to ensure vertical line anchoring.
 * - Phase 8.10.12 Patch: Micro fix to restore correct render targets (#discussion-timeline, #activity-log-timeline).
 * - Phase 8.10.13 Patch: Reverted wrapper injection and moved ::before line logic directly to #discussion-timeline and #activity-log-timeline to fix double line issue.
 * - Phase 8.10.15 Patch: Critical structural visual fix. Forced height: auto !important on timeline containers to override external height locks.
 * - Phase 8.10.16 Patch: Final structural ownership fix. Introduced .crm-timeline-content wrapper to guarantee vertical line accurately follows true rendered item height without viewport clamping.
 * - Phase 8.10.17 Patch: Precision fix to remove stale SPA CSS injections and guarantee only one consistent timeline center line exists.
 * - Phase 8.10.18 Polish: Stabilized box-sizing, content overflow wrapping, and added strict SPA bleed protection for timeline line ownership.
 */
// public/scripts/opportunities/details/opportunity-interactions.js
// 職責：專門管理「互動與新增」頁籤的所有 UI 與功能

const OpportunityInteractions = (() => {
    // 模組私有變數
    let _interactions = [];
    let _context = {}; // { opportunityId, companyId }
    let _container = null;

    // ✅ [Fix] 系統自動產生類型：必須與鎖定證據一致
    // Evidence: const isLockedRecord = ['系統事件', '事件報告'].includes(item.eventType);
    const SYSTEM_GENERATED_TYPES = ['系統事件', '事件報告'];

    // 子頁籤點擊事件
    function _handleTabClick(event) {
        if (!event.target.classList.contains('sub-tab-link')) return;

        const tab = event.target;
        const tabName = tab.dataset.tab;

        _container.querySelectorAll('.sub-tab-link').forEach(t => t.classList.remove('active'));
        _container.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const contentPane = _container.querySelector(`#${tabName}-pane`);
        if (contentPane) contentPane.classList.add('active');
    }

    /**
     * 【鑑識修補】HTML 轉義 (XSS 防護)
     */
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 【鑑識修補】動態取得 Left/Right 排版屬性
     * Source: window.CRM_APP.systemConfig['時間軸佈局']
     * Rule: 設定項目 (value) === eventType -> Extract 備註 (note)
     */
    function getTimelineSide(eventType) {
        if (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['時間軸佈局']) {
            const layoutConfigs = window.CRM_APP.systemConfig['時間軸佈局'];
            
            // Exact match: 設定項目 (config.value) === eventType
            const config = layoutConfigs.find(c => c.value === eventType);
            if (config && config.note) {
                const side = config.note.trim().toLowerCase();
                if (side === 'left' || side === 'right') {
                    return side;
                }
            }
        }
        
        // Strict fallback only if config missing or invalid
        return 'right';
    }

    /**
     * 【鑑識修補】渲染單一互動項目
     * 遵守 timeline-card UI doctrine (crm-timeline-item, crm-timeline-card, left/right layout)
     * 並維持 Strategy A：rowIndex 非有效數字則不渲染刪除按鈕
     */
    function renderSingleInteractionItem(interaction) {
        if (!interaction) return '';

        const rawTime = interaction.interactionTime || interaction.createdTime || '';
        const timeStr = (typeof formatDateTime === 'function')
            ? formatDateTime(rawTime)
            : rawTime;

        const typeStr = escapeHtml(interaction.eventTitle || interaction.eventType || '未分類');
        const recorder = escapeHtml(interaction.recorder || '系統');

        const rawSummary = interaction.contentSummary || '(無內容)';
        let summaryHtml = escapeHtml(rawSummary).replace(/\n/g, '<br>');

        // [Phase 8 Patch] Restore legacy clickable event report links inside contentSummary
        const linkRegex = /\[(.*?)\]\(event_log_id=([a-zA-Z0-9_-]+)\)/g;
        summaryHtml = summaryHtml.replace(linkRegex, (fullMatch, text, eventId) => {
            const safeEventId = eventId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<a href="#" class="text-link" onclick="event.preventDefault(); showEventLogReport('${safeEventId}')">${text}</a>`;
        });

        const rowId = interaction.interactionId;
        const rowIndex = interaction.rowIndex;

        // 鎖定邏輯（必須與 showForEditing 證據一致）
        const isLocked = ['系統事件', '事件報告'].includes(interaction.eventType);

        let buttonsHtml = '';
        if (rowId) {
            buttonsHtml += `
                <button type="button" class="action-btn small secondary" onclick="OpportunityInteractions.showForEditing('${rowId}')">
                    ${isLocked ? '檢視' : '編輯'}
                </button>
            `;

            // Strategy A: 僅當非鎖定且 rowIndex 可被安全轉為數字才渲染刪除
            const rowIndexNum = Number(rowIndex);
            if (!isLocked && Number.isFinite(rowIndexNum)) {
                buttonsHtml += `
                    &nbsp;
                    <button type="button" class="action-btn small secondary" onclick="OpportunityInteractions.confirmDelete('${rowId}', ${rowIndexNum})">
                        刪除
                    </button>
                `;
            }
        }

        // Configuration driven layout from '時間軸佈局'
        const alignClass = getTimelineSide(interaction.eventType);

        // Corrected Information Hierarchy
        return `
            <div class="crm-timeline-item ${alignClass}">
                <div class="crm-timeline-marker"></div>
                <div class="crm-timeline-card">
                    <div class="card-header">
                        <strong>${typeStr}</strong>
                        <span class="feed-time">${escapeHtml(timeStr)}</span>
                    </div>
                    <div class="card-body">
                        ${summaryHtml}
                    </div>
                    <div class="card-footer">
                        <div class="footer-meta">紀錄: ${recorder}</div>
                        <div class="footer-actions">
                            ${buttonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染一個時間軸列表
     * @param {string} containerSelector - e.g. '#discussion-timeline'
     * @param {Array<object>} interactions
     */
    function _renderTimelineList(containerSelector, interactions) {
        const historyList = _container.querySelector(containerSelector);
        if (!historyList) {
            console.error(`[Interactions] 找不到時間軸容器: ${containerSelector}`);
            return;
        }

        const allInteractions = Array.isArray(interactions) ? interactions : [];
        if (allInteractions.length === 0) {
            historyList.innerHTML = `
                <div class="alert alert-info">
                    ${containerSelector.includes('discussion') ? '尚無動態' : '尚無系統活動'}
                </div>
            `;
            return;
        }

        // [Polish] Removed limit and expand/collapse. Render entire list in scrollable workspace.
        let listHtml = allInteractions.map(renderSingleInteractionItem).join('');

        // Structural visual fix: Bind the center line dynamically to the true rendered content
        historyList.innerHTML = `
            <div class="crm-timeline-content">
                ${listHtml}
            </div>
        `;
    }

    /**
     * 更新時間軸視圖：分離討論 vs 系統活動
     */
    function _updateTimelineView() {
        if (!_container) return;

        const discussionInteractions = [];
        const activityLogInteractions = [];

        _interactions.forEach(interaction => {
            // [Fix] Placement Rule: Only pure '系統事件' remains in activity-log. 
            // '事件報告' (Event Reports) are explicitly treated as discussions.
            if (interaction.eventType === '系統事件') {
                activityLogInteractions.push(interaction);
            } else {
                discussionInteractions.push(interaction);
            }
        });

        // 可選：確保排序（若後端已排序可刪）
        // discussionInteractions.sort((a, b) => new Date(b.interactionTime || b.createdTime || 0) - new Date(a.interactionTime || a.createdTime || 0));
        // activityLogInteractions.sort((a, b) => new Date(b.interactionTime || b.createdTime || 0) - new Date(a.interactionTime || a.createdTime || 0));

        _renderTimelineList('#discussion-timeline', discussionInteractions);
        _renderTimelineList('#activity-log-timeline', activityLogInteractions);
    }

    /**
     * 表單提交：新增/編輯
     */
    async function _handleSubmit(event) {
        event.preventDefault();
        if (!_container) return;

        const form = _container.querySelector('#new-interaction-form');
        
        // #interaction-edit-rowIndex carries interactionId since Phase 8; legacy name kept for minimal diff.
        const interactionId = form.querySelector('#interaction-edit-rowIndex').value;
        const isEditMode = !!interactionId;

        showLoading(isEditMode ? '正在更新互動紀錄...' : '正在新增互動紀錄...');
        try {
            const interactionTimeInput = form.querySelector('#interaction-time').value;
            const interactionTimeISO = interactionTimeInput
                ? new Date(interactionTimeInput).toISOString()
                : new Date().toISOString();

            const interactionData = {
                interactionTime: interactionTimeISO,
                eventType: form.querySelector('#interaction-event-type').value,
                contentSummary: form.querySelector('#interaction-summary').value,
                nextAction: form.querySelector('#interaction-next-action').value,
                modifier: getCurrentUser()
            };

            if (_context.opportunityId) interactionData.opportunityId = _context.opportunityId;
            if (_context.companyId) interactionData.companyId = _context.companyId;

            const url = isEditMode ? `/api/interactions/${interactionId}` : '/api/interactions';
            const method = isEditMode ? 'PUT' : 'POST';

            if (!isEditMode) interactionData.recorder = getCurrentUser();

            const result = await authedFetch(url, { method, body: JSON.stringify(interactionData) });

            // [Phase 8.10.2 Fix] Production rule: treat explicit success:false as failure.
            // Bypasses false-positive throws on 204 No Content (null) or raw object returns.
            if (result && result.success === false) {
                throw new Error(result.details || '操作失敗');
            }
            
            // [Phase 8.10 Dashboard Refresh Fix] Interaction alters followUp list and recentActivity feed
            if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                window.dashboardManager.markStale();
            }
            
            // 成功後 authedFetch 可能刷新/通知（維持既有行為）
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`操作失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // 動態注入樣式（保留既有行為並補齊精確的時間軸幾何與 CSS）
    function _injectStyles() {
        const styleId = 'interactions-dynamic-styles';
        
        // [Fix] Remove existing style block to prevent SPA duplicate/stale CSS issues
        const existing = document.getElementById(styleId);
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* --- Fixed Height Workspace (Scrollable Panes) --- */
            #discussion-pane, #activity-pane {
                height: 500px;
                overflow-y: auto;
                padding-right: 12px;
                scrollbar-width: thin;
                scrollbar-color: var(--border-color, #cbd5e1) transparent;
            }
            #discussion-pane::-webkit-scrollbar, #activity-pane::-webkit-scrollbar {
                width: 6px;
            }
            #discussion-pane::-webkit-scrollbar-thumb, #activity-pane::-webkit-scrollbar-thumb {
                background-color: var(--border-color, #cbd5e1);
                border-radius: 4px;
            }

            /* --- Timeline Exact Geometry Implementation --- */
            .crm-timeline-content {
                position: relative;
                padding: 20px 0;
                width: 100%;
                box-sizing: border-box;
            }

            /* --- STRICT SPA BLEED PROTECTION: Double Line Prevention --- */
            #discussion-timeline::before,
            #activity-log-timeline::before,
            .interaction-timeline::before {
                content: none !important;
                display: none !important;
                width: 0 !important;
                background: transparent !important;
            }
            .crm-timeline-content,
            .interaction-timeline,
            #discussion-timeline,
            #activity-log-timeline {
                border-left: none !important;
                border-right: none !important;
                background-image: none !important;
            }
            
            /* The Anchor: Vertical Center Line (SINGLE OWNER) */
            .crm-timeline-content::before {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                left: 50%;
                width: 2px;
                background: var(--border-color, #e2e8f0);
                transform: translateX(-50%);
                z-index: 1;
            }

            /* The Item Layout Shell */
            .crm-timeline-item {
                position: relative;
                width: 100%;
                margin-bottom: 24px;
                display: flex;
                box-sizing: border-box;
            }
            .crm-timeline-item.left {
                justify-content: flex-start;
            }
            .crm-timeline-item.right {
                justify-content: flex-end;
            }

            /* The Anchor Point: Exactly centered Marker */
            .crm-timeline-marker {
                box-sizing: border-box;
                position: absolute;
                left: 50%;
                top: 20px;
                transform: translateX(-50%);
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--primary-color, #4f46e5);
                border: 3px solid var(--bg-color, #ffffff);
                box-shadow: 0 0 0 2px var(--border-color, #cbd5e1);
                z-index: 2;
            }

            /* The Card: Geometrically spaced from center */
            .crm-timeline-card {
                box-sizing: border-box;
                position: relative;
                width: calc(50% - 32px); /* Leaves exactly 32px gap from center line */
                background: var(--card-bg, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 10px;
                padding: 16px 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                z-index: 2;
            }

            /* The Connectors: Visual attachment arrows pointing to the marker */
            .crm-timeline-card::before {
                content: '';
                position: absolute;
                top: 21px;
                width: 0;
                height: 0;
                border-style: solid;
            }
            .crm-timeline-card::after {
                content: '';
                position: absolute;
                top: 22px;
                width: 0;
                height: 0;
                border-style: solid;
            }

            /* Left Card Arrow */
            .crm-timeline-item.left .crm-timeline-card::before {
                right: -9px;
                border-width: 7px 0 7px 9px;
                border-color: transparent transparent transparent var(--border-color, #e2e8f0);
            }
            .crm-timeline-item.left .crm-timeline-card::after {
                right: -7px;
                border-width: 6px 0 6px 8px;
                border-color: transparent transparent transparent var(--card-bg, #ffffff);
            }

            /* Right Card Arrow */
            .crm-timeline-item.right .crm-timeline-card::before {
                left: -9px;
                border-width: 7px 9px 7px 0;
                border-color: transparent var(--border-color, #e2e8f0) transparent transparent;
            }
            .crm-timeline-item.right .crm-timeline-card::after {
                left: -7px;
                border-width: 6px 8px 6px 0;
                border-color: transparent var(--card-bg, #ffffff) transparent transparent;
            }

            /* --- Readability & Typography (Timeline) --- */
            .crm-timeline-card .card-header {
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-color, #1e293b);
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .crm-timeline-card .feed-time {
                font-size: 0.75rem;
                color: var(--text-muted, #94a3b8);
                font-weight: 400;
            }
            .crm-timeline-card .card-body {
                font-size: 0.9rem;
                line-height: 1.6;
                color: var(--text-secondary, #475569);
                margin-bottom: 12px;
                word-break: break-word;
                overflow-wrap: anywhere; /* Safety: strict overflow containment */
            }
            .crm-timeline-card .card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px dashed var(--border-color, #e2e8f0);
                padding-top: 10px;
                font-size: 0.8rem;
            }
            .crm-timeline-card .footer-meta {
                color: var(--text-muted, #64748b);
            }
            .crm-timeline-card .footer-actions {
                display: flex;
                gap: 8px;
            }

            /* --- Right Panel Structure & Typography --- */
            .interaction-form-section {
                background-color: var(--secondary-bg, #f8fafc);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 24px;
                height: fit-content;
            }
            
            .interaction-form-section h3 {
                font-size: 1.1rem;
                margin-bottom: 1.2rem !important;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color, #e2e8f0);
                padding-bottom: 12px;
            }

            .interaction-form-section .form-label {
                font-size: 0.85rem;
                color: var(--text-secondary);
                margin-bottom: 6px;
            }

            .interaction-form-section .form-input,
            .interaction-form-section .form-select,
            .interaction-form-section .form-textarea {
                font-size: 0.9rem;
                padding: 8px 10px;
                box-sizing: border-box;
            }

            .interaction-form-section .form-group {
                margin-bottom: 16px;
            }

            .interaction-form-section .submit-btn {
                margin-top: 8px;
                width: 100%;
            }

            /* Mobile Responsive Fallback */
            @media (max-width: 768px) {
                .crm-timeline-content::before {
                    left: 20px;
                }
                .crm-timeline-item.left, .crm-timeline-item.right {
                    justify-content: flex-end;
                }
                .crm-timeline-card {
                    width: calc(100% - 52px); /* Accommodate offset line */
                }
                .crm-timeline-marker {
                    left: 20px !important;
                }
                .crm-timeline-item.left .crm-timeline-card::before,
                .crm-timeline-item.right .crm-timeline-card::before {
                    left: -9px;
                    right: auto;
                    border-width: 7px 9px 7px 0;
                    border-color: transparent var(--border-color, #e2e8f0) transparent transparent;
                }
                .crm-timeline-item.left .crm-timeline-card::after,
                .crm-timeline-item.right .crm-timeline-card::after {
                    left: -7px;
                    right: auto;
                    border-width: 6px 8px 6px 0;
                    border-color: transparent var(--card-bg, #ffffff) transparent transparent;
                }
                #discussion-pane, #activity-pane {
                    height: auto;
                    max-height: 500px;
                }
                .interaction-form-section {
                    margin-top: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 公開：顯示表單供編輯
     */
    function showForEditing(interactionId) {
        if (!_container) return;

        const item = _interactions.find(i => i.interactionId === interactionId);
        if (!item) {
            showNotification('找不到該筆互動紀錄資料', 'error');
            return;
        }

        const form = _container.querySelector('#new-interaction-form');
        if (!form) return;

        // #interaction-edit-rowIndex carries interactionId since Phase 8; legacy name kept for minimal diff.
        form.querySelector('#interaction-edit-rowIndex').value = item.interactionId;

        // [Strict Digital Forensics Patch] Ensure UTC parsing for naive DB strings before offset calculation
        let rawInteractionTime = item.interactionTime || item.createdTime;
        if (typeof rawInteractionTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(rawInteractionTime)) {
            rawInteractionTime += 'Z';
        }
        const interactionTime = new Date(rawInteractionTime || new Date().toISOString());
        
        interactionTime.setMinutes(interactionTime.getMinutes() - interactionTime.getTimezoneOffset());
        form.querySelector('#interaction-time').value = interactionTime.toISOString().slice(0, 16);

        form.querySelector('#interaction-event-type').value = item.eventType;
        form.querySelector('#interaction-summary').value = item.contentSummary;
        form.querySelector('#interaction-next-action').value = item.nextAction;

        const eventTypeSelect = form.querySelector('#interaction-event-type');
        const summaryTextarea = form.querySelector('#interaction-summary');
        const nextActionInput = form.querySelector('#interaction-next-action');
        const submitBtn = form.querySelector('#interaction-submit-btn');

        // Evidence: 鎖定判斷固定兩類
        const isLockedRecord = ['系統事件', '事件報告'].includes(item.eventType);

        if (isLockedRecord) {
            eventTypeSelect.disabled = true;
            summaryTextarea.readOnly = true;
            nextActionInput.readOnly = true;
            submitBtn.textContent = '💾 僅儲存時間變更';
        } else {
            eventTypeSelect.disabled = false;
            summaryTextarea.readOnly = false;
            nextActionInput.readOnly = false;
            submitBtn.textContent = '💾 儲存變更';
        }

        form.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 公開：刪除確認
     */
    function confirmDelete(interactionId, rowIndex) {
        if (!_container) return;

        const item = _interactions.find(i => i.interactionId === interactionId);
        const summary = item ? (item.contentSummary || '此紀錄').substring(0, 30) + '...' : '此筆紀錄';

        const message = `您確定要永久刪除這筆互動紀錄嗎？\n\n"${summary}"\n\n此操作無法復原。`;

        showConfirmDialog(message, async () => {
            showLoading('正在刪除紀錄...');
            try {
                await authedFetch(`/api/interactions/${interactionId}`, { method: 'DELETE' });
                
                // [Phase 8.10 Dashboard Refresh Fix] 
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    console.error('刪除互動紀錄失敗:', error);
                }
            } finally {
                hideLoading();
            }
        });
    }

    /**
     * 公開：初始化
     */
    function init(containerElement, context, interactions) {
        _container = containerElement;
        _context = context || {};
        _interactions = Array.isArray(interactions) ? interactions : [];

        if (!_container) {
            console.error('[Interactions] 初始化失敗：未提供有效的容器元素。');
            return;
        }

        const form = _container.querySelector('#new-interaction-form');
        if (!form) {
            console.error('[Interactions] 初始化失敗：在指定的容器中找不到 #new-interaction-form。');
            return;
        }

        // 填入下拉選單（保留既有邏輯，僅避免把系統類型放進去）
        const eventTypeSelect = form.querySelector('#interaction-event-type');
        if (eventTypeSelect && window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['互動類型']) {
            const interactionTypes = window.CRM_APP.systemConfig['互動類型'];
            eventTypeSelect.innerHTML = '<option value="">請選擇類型...</option>';

            interactionTypes.forEach(type => {
                const note = type.note || type.value;
                // 不提供系統自動類型（避免前端手動建立系統事件）
                if (!SYSTEM_GENERATED_TYPES.includes(note) && !SYSTEM_GENERATED_TYPES.includes(type.value)) {
                    eventTypeSelect.innerHTML += `<option value="${type.value}">${note}</option>`;
                }
            });

            if (eventTypeSelect.options.length === 2) eventTypeSelect.selectedIndex = 1;
        }

        // 重置表單
        form.reset();
        form.querySelector('#interaction-edit-rowIndex').value = '';
        form.querySelector('#interaction-submit-btn').textContent = '💾 新增紀錄';

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        form.querySelector('#interaction-time').value = now.toISOString().slice(0, 16);

        form.removeEventListener('submit', _handleSubmit);
        form.addEventListener('submit', _handleSubmit);

        const tabContainer = _container.querySelector('.sub-tabs');
        if (tabContainer) {
            tabContainer.removeEventListener('click', _handleTabClick);
            tabContainer.addEventListener('click', _handleTabClick);
        }

        _injectStyles();
        _updateTimelineView();
    }

    return {
        init,
        showForEditing,
        confirmDelete
    };
})();
</file>

<file path="public/scripts/opportunities/details/opportunity-stepper.js">
// public/scripts/opportunities/details/opportunity-stepper.js
// 職責：專門管理「機會進程」區塊的所有 UI 渲染與互動邏輯
// * @version 2.2.1 (Phase 8.10 Stale Refresh Fix)
// * @date 2026-03-12
// (V2.2 - 修正：_saveChanges 使用正確的 opportunityId 取代 rowIndex)

const OpportunityStepper = (() => {
    // 模組內的私有變數
    let _opportunityInfo = null;

    // 處理圓圈點擊（三態循環）
    function _handleCircleClick(step) {
        const iconEl = step.querySelector('.step-circle');
        const allSteps = Array.from(step.parentElement.children);
        const index = allSteps.indexOf(step);
        
        switch (step.dataset.status) {
            case 'pending':
                step.dataset.status = 'completed';
                step.classList.add('completed');
                step.classList.remove('skipped');
                iconEl.innerHTML = '✓';
                break;
            case 'completed':
                step.dataset.status = 'skipped';
                step.classList.remove('completed');
                step.classList.add('skipped');
                iconEl.innerHTML = '✕';
                break;
            case 'skipped':
                step.dataset.status = 'pending';
                step.classList.remove('skipped');
                iconEl.innerHTML = index + 1;
                break;
        }
    }

    // 處理階段名稱點擊（設定為目前）
    function _handleNameClick(step) {
        document.querySelectorAll('.stage-stepper-container .stage-step').forEach(s => s.classList.remove('current'));
        step.classList.add('current');
    }

    // 儲存變更
    async function _saveChanges() {
        const stepperContainer = document.querySelector('.stage-stepper-container');
        if (!stepperContainer) return;

        // [FIX] 優先序：Global Data -> Global ID -> Local Prop
        const targetId = (window.currentOpportunityData && window.currentOpportunityData.opportunityId) 
                      || window.currentDetailOpportunityId 
                      || (_opportunityInfo && _opportunityInfo.opportunityId);

        // [FIX] Guard Clause: 絕對防止打出 undefined
        if (!targetId) {
            console.error('[OpportunityStepper] Critical: No opportunityId found for save.');
            showNotification('無法儲存：找不到機會 ID (System Error)', 'error');
            return;
        }

        const historyItems = [];
        stepperContainer.querySelectorAll('.stage-step').forEach(step => {
            const status = step.dataset.status;
            const stageId = step.dataset.stageId;
            if (status === 'completed') {
                historyItems.push(`C:${stageId}`);
            } else if (status === 'skipped') {
                historyItems.push(`X:${stageId}`);
            }
        });

        const currentStep = stepperContainer.querySelector('.stage-step.current');
        const newCurrentStage = currentStep ? currentStep.dataset.stageId : _opportunityInfo.currentStage;
        
        // --- 確保儲存時，目前階段一定在歷程中 ---
        const historySet = new Set(historyItems.filter(item => item.startsWith('C:')));
        historyItems.filter(item => item.startsWith('X:')).forEach(item => historySet.add(item));
        
        historySet.add(`C:${newCurrentStage}`);
        historySet.delete(`X:${newCurrentStage}`);
        
        const newStageHistory = Array.from(historySet).join(',');

        showLoading('正在儲存階段歷程...');
        try {
            // [FIX] 使用鑑識出的 targetId，不再使用 rowIndex
            const result = await authedFetch(`/api/opportunities/${targetId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    currentStage: newCurrentStage,
                    stageHistory: newStageHistory,
                    modifier: getCurrentUser()
                })
            });

            if (result.success) {
                // [Phase 8.10 Dashboard Refresh Fix] Kanban Data heavily relies on Stage
                if (window.dashboardManager && typeof window.dashboardManager.markStale === 'function') {
                    window.dashboardManager.markStale();
                }
                // authedFetch 會處理整頁刷新和通知
            } else {
                throw new Error(result.error || '儲存失敗');
            }

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                showNotification(`儲存失敗: ${error.message}`, 'error');
            }
        } finally {
            hideLoading();
        }
    }
    
    // 渲染檢視模式
    function _renderViewMode() {
        // 安全檢查，避免 DOM 未就緒
        const wrapper = document.getElementById('opportunity-stage-stepper-container');
        if (!wrapper) return;

        const container = document.getElementById('opportunity-stage-stepper');
        const header = wrapper.querySelector('.widget-header');
        const allStages = (window.CRM_APP && window.CRM_APP.systemConfig && window.CRM_APP.systemConfig['機會階段']) || [];

        header.innerHTML = `
            <h2 class="widget-title">機會進程</h2>
            <button class="action-btn small secondary" id="edit-stepper-btn">✏️ 編輯歷程</button>
        `;
        
        header.querySelector('#edit-stepper-btn').addEventListener('click', () => _renderEditMode());

        const stageStatusMap = new Map();
        if (_opportunityInfo && _opportunityInfo.stageHistory) {
            const historyList = Array.isArray(_opportunityInfo.stageHistory) 
                ? _opportunityInfo.stageHistory 
                : String(_opportunityInfo.stageHistory).split(',');

            historyList.forEach(item => {
                if (!item) return;
                if(item.includes(':')) {
                    const [status, stageId] = item.split(':');
                    stageStatusMap.set(stageId, status);
                } else {
                    stageStatusMap.set(item, 'C'); 
                }
            });
        }

        const currentStageVal = _opportunityInfo ? _opportunityInfo.currentStage : '';

        let stepsHtml = allStages.map((stage, index) => {
            let statusClass = 'pending';
            let icon = index + 1;
            
            const status = stageStatusMap.get(stage.value);
            const isCurrent = (stage.value === currentStageVal);

            if (status === 'C' || isCurrent) {
                statusClass = 'completed';
                icon = '✓';
            } else if (status === 'X') {
                statusClass = 'skipped';
                icon = '✕';
            }
            
            if (isCurrent) {
                statusClass += ' current';
            }

            return `
                <div class="stage-step ${statusClass.trim()}" data-stage-id="${stage.value}" title="${stage.note || stage.value}">
                    <div class="step-circle">${icon}</div>
                    <div class="step-name">${stage.note || stage.value}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="stage-stepper-container">${stepsHtml}</div>`;
    }

    // 渲染編輯模式
    function _renderEditMode() {
        const container = document.getElementById('opportunity-stage-stepper');
        const header = document.querySelector('#opportunity-stage-stepper-container .widget-header');
        const stepperContainer = container.querySelector('.stage-stepper-container');

        if (!stepperContainer) return;
        
        let hintContainer = document.getElementById('stepper-edit-hint');
        if (!hintContainer) {
            hintContainer = document.createElement('div');
            hintContainer.id = 'stepper-edit-hint';
            hintContainer.className = 'stepper-edit-hint';
            hintContainer.innerHTML = `ℹ️ <strong>操作提示</strong>：點擊 [圓圈] 可在 ( ✓ / ✕ / 無 ) 三種狀態間切換，點擊 [階段名稱] 可設定為目前階段。`;
            container.before(hintContainer);
        }
        hintContainer.style.display = 'block';

        header.innerHTML = `
            <h2 class="widget-title">機會進程 (編輯模式)</h2>
            <div>
                <button class="action-btn small" style="background: #6c757d;" id="cancel-stepper-btn">取消</button>
                <button class="action-btn small primary" id="save-stepper-btn">💾 儲存</button>
            </div>
        `;
        header.querySelector('#cancel-stepper-btn').addEventListener('click', () => {
            hintContainer.style.display = 'none';
            _renderViewMode();
        });
        header.querySelector('#save-stepper-btn').addEventListener('click', _saveChanges);

        stepperContainer.classList.add('edit-mode');
        
        stepperContainer.removeEventListener('click', _handleStepperClick);
        stepperContainer.addEventListener('click', _handleStepperClick);

        stepperContainer.querySelectorAll('.stage-step').forEach(step => {
            let status = 'pending';
            if (step.classList.contains('current') || step.classList.contains('completed')) {
                status = 'completed';
            }
            if (step.classList.contains('skipped')) {
                status = 'skipped';
            }
            step.dataset.status = status;
        });
    }

    function _handleStepperClick(e) {
        const circle = e.target.closest('.step-circle');
        const name = e.target.closest('.step-name');
        
        if (circle) {
            const step = circle.closest('.stage-step');
            if (step) _handleCircleClick(step);
        } else if (name) {
            const step = name.closest('.stage-step');
            if (step) _handleNameClick(step);
        }
    }

    function _injectStyles() {
        const styleId = 'stepper-dynamic-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .stepper-edit-hint {
                background-color: color-mix(in srgb, var(--accent-blue) 15%, var(--primary-bg));
                border: 1px solid var(--accent-blue); color: var(--text-secondary);
                padding: var(--spacing-3) var(--spacing-4); border-radius: var(--rounded-lg);
                margin-bottom: var(--spacing-5); font-size: var(--font-size-sm);
            }
            .stage-step.skipped .step-circle {
                background-color: var(--accent-red); border-color: var(--accent-red); color: white;
            }
            .stage-stepper-container.edit-mode .step-circle {
                cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .stage-stepper-container.edit-mode .step-circle:hover {
                transform: scale(1.15);
            }
            .stage-stepper-container.edit-mode .step-name {
                cursor: pointer; padding: 2px 5px; border-radius: var(--rounded-sm);
                transition: background-color 0.2s ease;
            }
            .stage-stepper-container.edit-mode .step-name:hover {
                background-color: var(--glass-bg);
            }
            .stage-step.current .step-circle {
                box-shadow: 0 0 0 4px var(--accent-blue);
            }
        `;
        document.head.appendChild(style);
    }
    
    function init(opportunityInfo) {
        _opportunityInfo = opportunityInfo || {};
        const container = document.getElementById('opportunity-stage-stepper-container');
        if (!container) return;
        
        _injectStyles();
        _renderViewMode();
    }

    return {
        init: init
    };
})();
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

</files>
