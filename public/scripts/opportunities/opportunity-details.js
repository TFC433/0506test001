// ============================================================================
// File: public/scripts/opportunities/opportunity-details.js
// ============================================================================
/**
 * Project: TFC CRM
 * File: public/scripts/opportunities/opportunity-details.js
 * Version: 8.1.2 (Phase 8.6A - Perf Patch)
 * Date: 2026-03-11
 * Changelog:
 * - [FIX] Explicitly map SQL 'productDetails' to UI 'potentialSpecification' to fix edit mode data loss.
 * - [FIX] Sync 'salesChannel' and 'channelDetails' to prevent writer conflicts.
 * - [PERF] Removed redundant CRM_APP.updateAllDropdowns() to eliminate duplicate companyList fetches.
 */

window.currentDetailOpportunityId = null;
window.currentOpportunityData = null;

/**
 * Phase 8: normalize DTO (SQL) keys <-> legacy UI keys
 * Ensures BOTH display view and edit form can read values after hard refresh.
 */
function normalizeOppForUi(opp) {
    const o = opp || {};

    const pick = (keys, fallback = '') => {
        for (const k of keys) {
            const v = o[k];
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

    // Canonical DTO keys (from SQL reader) + legacy keys (used by UI/edit form)
    const normalized = { ...o };

    // Identity & Core
    normalized.opportunityId = o.opportunityId; // Ensure ID exists

    // owner <-> assignee
    normalized.owner = pick(['owner', 'assignee'], normalized.owner);
    normalized.assignee = pick(['assignee', 'owner'], normalized.assignee);

    // source <-> opportunitySource
    normalized.source = pick(['source', 'opportunitySource'], normalized.source);
    normalized.opportunitySource = pick(['opportunitySource', 'source'], normalized.opportunitySource);

    // equipmentScale <-> deviceScale
    normalized.equipmentScale = pick(['equipmentScale', 'deviceScale'], normalized.equipmentScale);
    normalized.deviceScale = pick(['deviceScale', 'equipmentScale'], normalized.deviceScale);

    // winProbability <-> orderProbability
    normalized.winProbability = pick(['winProbability', 'orderProbability'], normalized.winProbability);
    normalized.orderProbability = pick(['orderProbability', 'winProbability'], normalized.orderProbability);

    // valueCalcMode <-> opportunityValueType
    normalized.valueCalcMode = pick(['valueCalcMode', 'opportunityValueType'], normalized.valueCalcMode);
    normalized.opportunityValueType = pick(['opportunityValueType', 'valueCalcMode'], normalized.opportunityValueType);

    // driveLink <-> driveFolderLink
    normalized.driveLink = pick(['driveLink', 'driveFolderLink'], normalized.driveLink);
    normalized.driveFolderLink = pick(['driveFolderLink', 'driveLink'], normalized.driveFolderLink);

    // [FORENSICS FIX] productDetails (SQL) <-> potentialSpecification (UI)
    // SQL Reader gives 'productDetails'. UI expects 'potentialSpecification'.
    normalized.productDetails = pick(['productDetails', 'potentialSpecification'], normalized.productDetails);
    normalized.potentialSpecification = pick(['potentialSpecification', 'productDetails'], normalized.potentialSpecification);

    // [FORENSICS FIX] salesChannel (SQL) <-> channelDetails (UI)
    // SQL Writer creates conflict if these differ. We sync them here.
    normalized.salesChannel = pick(['salesChannel', 'channelDetails'], normalized.salesChannel);
    normalized.channelDetails = pick(['channelDetails', 'salesChannel'], normalized.channelDetails);

    // notes (ensure string-ish)
    if (normalized.notes === null || normalized.notes === undefined) normalized.notes = '';

    return normalized;
}

/**
 * 載入並渲染機會詳細頁面的主函式
 * @param {string} opportunityId - 機會ID
 */
async function loadOpportunityDetailPage(opportunityId) {
    window.currentDetailOpportunityId = opportunityId;

    const container = document.getElementById('page-opportunity-details');
    if (!container) return;

    container.innerHTML = `
        <div class="loading show" style="padding-top: 50px;">
            <div class="spinner"></div>
            <p>正在載入機會詳細資料...</p>
        </div>
    `;

    try {
        const opportunityDetailPageTemplate = await fetch('/views/opportunity-detail.html').then(res => res.text());
        const result = await authedFetch(`/api/opportunities/${opportunityId}/details`);
        if (!result.success) throw new Error(result.error);

        const {
            opportunityInfo,
            interactions,
            eventLogs,
            linkedContacts,
            potentialContacts,
            parentOpportunity,
            childOpportunities
        } = result.data;

        // ✅ Phase 8: normalize DTO->UI keys so edit mode can show SQL data after refresh
        const normalizedOpp = normalizeOppForUi(opportunityInfo);

        window.currentOpportunityData = normalizedOpp;

        // 1. 注入主模板
        container.innerHTML = opportunityDetailPageTemplate;
        document.getElementById('page-title').textContent = '機會案件管理 - 機會詳細';
        document.getElementById('page-subtitle').textContent = '機會詳細資料與關聯活動';

        // 2. 注入資訊卡
        const infoCardContainer = document.getElementById('opportunity-info-card-container');
        if (infoCardContainer) {
            if (typeof OpportunityInfoCard !== 'undefined' && typeof OpportunityInfoCard.render === 'function') {
                OpportunityInfoCard.render(normalizedOpp);
            } else if (typeof OpportunityInfoView !== 'undefined' && typeof OpportunityInfoView.render === 'function') {
                infoCardContainer.innerHTML = `
                    <div class="dashboard-widget">
                        <div class="widget-content">
                            ${OpportunityInfoView.render(normalizedOpp)}
                        </div>
                    </div>
                `;
            }
        }

        // 3. 初始化資訊卡事件（用 normalizedOpp，讓 state 也帶雙 key）
        if (typeof OpportunityInfoCardEvents !== 'undefined' && typeof OpportunityInfoCardEvents.init === 'function') {
            OpportunityInfoCardEvents.init(normalizedOpp);
        }

        // 4. 其他模組初始化（順序不變）
        const Stepper = window.OpportunityStepper || (typeof OpportunityStepper !== 'undefined' ? OpportunityStepper : null);
        if (Stepper && typeof Stepper.init === 'function') {
            Stepper.init(normalizedOpp);
        }

        const Events = window.OpportunityEvents || (typeof OpportunityEvents !== 'undefined' ? OpportunityEvents : null);
        if (Events && typeof Events.init === 'function') {
            Events.init(eventLogs || [], {
                opportunityId: normalizedOpp.opportunityId,
                opportunityName: normalizedOpp.opportunityName,
                linkedContacts: linkedContacts || []
            });
        }

        const interactionContainer = document.getElementById('tab-content-interactions');
        if (interactionContainer) {
            const Interactions = window.OpportunityInteractions || (typeof OpportunityInteractions !== 'undefined' ? OpportunityInteractions : null);
            if (Interactions && typeof Interactions.init === 'function') {
                Interactions.init(
                    interactionContainer,
                    { opportunityId: normalizedOpp.opportunityId },
                    interactions || []
                );
            }
        }

        const Contacts = window.OpportunityContacts || (typeof OpportunityContacts !== 'undefined' ? OpportunityContacts : null);
        if (Contacts && typeof Contacts.init === 'function') {
            Contacts.init(normalizedOpp, linkedContacts || []);
        }

        const AssocOpps = window.OpportunityAssociatedOpps || (typeof OpportunityAssociatedOpps !== 'undefined' ? OpportunityAssociatedOpps : null);
        if (AssocOpps && typeof AssocOpps.render === 'function') {
            AssocOpps.render({
                opportunityInfo: normalizedOpp,
                parentOpportunity,
                childOpportunities
            });
        }

        if (window.PotentialContactsManager) {
            PotentialContactsManager.render({
                containerSelector: '#opp-potential-contacts-container',
                potentialContacts: potentialContacts || [],
                comparisonList: linkedContacts || [],
                comparisonKey: 'name',
                context: 'opportunity',
                opportunityId: normalizedOpp.opportunityId
            });
        }

        // [Phase 8.6A PERF] Removed global CRM_APP.updateAllDropdowns() to prevent redundant companyList fetch.
        
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('[OpportunityDetails] 載入失敗:', error);
            container.innerHTML = `
                <div class="alert alert-error">
                    載入機會詳細資料失敗: ${error.message}
                </div>
            `;
        }
    }
}

// 向主應用程式註冊此模組管理的頁面載入函式
window.loadOpportunityDetailPage = loadOpportunityDetailPage;
if (window.CRM_APP) {
    if (!window.CRM_APP.pageModules) window.CRM_APP.pageModules = {};
    window.CRM_APP.pageModules['opportunity-details'] = loadOpportunityDetailPage;
}