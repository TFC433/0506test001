// public/scripts/internal-ops/internal-ops-dev-projects.js
/**
 * @version 1.0.17
 * @date 2026-05-07
 * @changelog
 * - [1.0.17] UI Patch: Tokenized Dev Projects inline table controls, progress tracks, and muted text for Internal Ops operational contrast.
 * - [1.0.16] UI Layout Tuning Patch: column width tuning (fixed devStage/status), limit collaborators display (<=2 +N), font-size reduction for text heavy cols, strictly no layout logic changes.
 * - [1.0.15] UI Polish Patch: implemented conditional operation column. column appears in operation mode only. toggle moved to top control. strictly no data changes, sorting logic preserved.
 * - [1.0.14] UI Polish Patch: merge assignee and collaborators into a single "人員" column with a schedule-like label/value layout. Implemented conditional collaborators row so it hides when empty. strictly no data changes.
 * - [1.0.13] UI polish patch: Renamed header to "案件名稱", add sort affordance (↕), enforce nowrap + ellipsis for case name and opportunity cells. strictly no logic changes.
 * - [1.0.12] Feature Patch: Implemented clickable header sorting from scratch for Dev Projects. Uses System Config 'order' field for accurate sorting. Removed Notes column to optimize layout. No backend changes.
 * - [1.0.11] Removed safe debug console logs from getConfigColor function.
 * - [1.0.10] UI Revert Patch: Reverted Dev Projects list display to the simpler baseline reference style.
 * - [1.0.9] UI Polish Patch: Moved record count to the right, fixed schedule column truncation.
 * - [1.0.8] UI Stabilization Patch: Applied table-layout fixed, defined key column widths, enforced ellipsis.
 * - [1.0.7] UI Stabilization Patch: Isolated CSS scope, enforced nowrap table layout.
 * - [1.0.6] Typography Polish: Stabilized list readability by scaling down schedule dates.
 * - [1.0.5] Debug Patch: Injected safe tracing logs into getConfigColor.
 * - [1.0.4] Polish Patch: Improved Dev Projects list readability.
 * - [1.0.3] Logic Patch: Replaced naive theoretical progress calculation with a working-days-based calculation.
 * - [1.0.2] Phase A: Added hyperlinked Opportunity routing.
 * - [1.0.1] UI Patch: Renamed labels, merged schedule columns, refined strict fixed-width progress rendering, replaced row actions with header toggle.
 * - [1.0.0] Extracted from internal-ops.js Phase 4.8
 * @description 負責「開發案件追蹤」區塊的資料渲染與局部互動邏輯
 */

// frontend sort state
if (typeof window.__devProjectsSortState === 'undefined') {
    window.__devProjectsSortState = {
        field: null,
        direction: 'asc'
    };
}

if (typeof window.__devProjectsExpandedEditId === 'undefined') {
    window.__devProjectsExpandedEditId = null;
}

if (typeof window.__devProjectsCreateOpen === 'undefined') {
    window.__devProjectsCreateOpen = false;
}

function rerenderDevProjectsInline() {
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
    return container;
}

async function ensureDevProjectOpportunitiesLoaded(container) {
    if ((window.__internalOpsOpportunities || []).length) return;
    try {
        const oppRes = await (typeof authedFetch === 'function' ? authedFetch('/api/opportunities') : fetch('/api/opportunities').then(r => r.json()));
        window.__internalOpsOpportunities = Array.isArray(oppRes) ? oppRes : (oppRes && oppRes.data ? oppRes.data : []);
        if (container && window.__internalOpsDevProjectsData) {
            container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
        }
    } catch (err) {
        console.error('[DevProjects] Opportunity list load failed:', err);
        window.__internalOpsOpportunities = [];
    }
}

window.openDevProjectCreateInline = async function() {
    window.__devProjectsCreateOpen = true;
    window.__devProjectsExpandedEditId = null;
    const container = rerenderDevProjectsInline();
    await ensureDevProjectOpportunitiesLoaded(container);
};

window.cancelCreateDevProjectInline = function() {
    window.__devProjectsCreateOpen = false;
    rerenderDevProjectsInline();
};

window.filterCreateDevProjectOpportunities = function() {
    const searchInput = document.getElementById('create-projectSearch');
    const select = document.getElementById('create-projectName');
    if (!searchInput || !select) return;

    const keyword = (searchInput.value || '').toLowerCase();
    const opportunities = window.__internalOpsOpportunities || [];
    const filtered = keyword
        ? opportunities.filter(o => {
            const name = (o.opportunityName || '').toLowerCase();
            const company = (o.customerCompany || '').toLowerCase();
            return name.includes(keyword) || company.includes(keyword);
        })
        : opportunities;
    const currentValue = select.value;

    select.innerHTML = window.renderExpandedOpportunityOptions(filtered);
    if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
};

window.syncCreateDevProgress = function(source) {
    const slider = document.getElementById('create-progress-slider');
    const input = document.getElementById('create-progress');
    if (!slider || !input) return;

    const rawValue = source === 'slider' ? slider.value : input.value;
    const parsed = parseInt(rawValue, 10);
    const value = isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 100);
    slider.value = value;
    input.value = value;
};

function getDevParentId(item) {
    return item?.dependencies || item?.parentDevId || '';
}

function getDevProjectById(devId) {
    return (window.__internalOpsDevProjectsData || []).find(item => item.devId === devId);
}

function devProjectHasChildren(devId) {
    return (window.__internalOpsDevProjectsData || []).some(item => getDevParentId(item) === devId);
}

function validateDevParentSelection(devId, selectedParentId) {
    if (!selectedParentId) return true;
    if (devId && selectedParentId === devId) {
        alert('案件不可選自己作為主案件');
        return false;
    }

    const selectedParent = getDevProjectById(selectedParentId);
    if (selectedParent && getDevParentId(selectedParent)) {
        alert('子案件不可作為其他案件的主案件');
        return false;
    }

    if (devId && devProjectHasChildren(devId)) {
        alert('已有子案件的案件不可改為子案件');
        return false;
    }

    return true;
}

window.saveCreateDevProjectInline = async function() {
    const getValue = (id) => document.getElementById(id)?.value || '';
    const progressRaw = parseInt(getValue('create-progress'), 10);
    const progressValue = isNaN(progressRaw) ? 0 : Math.min(Math.max(progressRaw, 0), 100);
    const oppSelect = document.getElementById('create-projectName');
    const selectedOption = oppSelect ? oppSelect.options[oppSelect.selectedIndex] : null;
    const selectedOpportunityId = oppSelect ? oppSelect.value : '';
    const selectedOpportunityName = selectedOption && selectedOption.value !== ''
        ? (selectedOption.getAttribute('data-name') || selectedOption.text)
        : '';
    const collabsJoined = Array.from(document.querySelectorAll('input[data-create-collab]:checked'))
        .map(input => input.value)
        .join('｜');
    const selectedParentId = getValue('create-dependencies');

    if (!validateDevParentSelection(null, selectedParentId)) return;

    const payload = {
        productCode: getValue('create-productCode'),
        productName: getValue('create-productName'),
        projectName: selectedOpportunityName,
        assigneeCode: selectedOpportunityId,
        featureName: getValue('create-featureName'),
        assigneeName: getValue('create-assigneeName'),
        collaborators: collabsJoined,
        devStage: getValue('create-devStage'),
        status: getValue('create-status'),
        progress: `${progressValue}%`,
        startDate: getValue('create-startDate'),
        estCompletionDate: getValue('create-estCompletionDate'),
        dependencies: selectedParentId,
        caseRelationType: getValue('create-caseRelationType')
    };

    try {
        const url = '/api/internal-ops/dev-projects';
        let res;
        if (typeof authedFetch === 'function') {
            res = await authedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json());
        }

        if (!res || res.success === false) {
            throw new Error(res?.error || 'create failed');
        }

        window.__devProjectsCreateOpen = false;
        if (typeof window.fetchAndRenderSection === 'function') {
            window.fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderDevProjects, 'internal-ops-dev-projects-content');
        } else {
            const container = document.getElementById('internal-ops-dev-projects-content');
            if (container) {
                const refreshed = await (typeof authedFetch === 'function'
                    ? authedFetch('/api/internal-ops/dev-projects')
                    : fetch('/api/internal-ops/dev-projects').then(r => r.json()));
                const dataArray = Array.isArray(refreshed) ? refreshed : (refreshed && refreshed.success ? refreshed.data : null);
                if (dataArray) container.innerHTML = window.renderDevProjects(dataArray);
            }
        }
    } catch (err) {
        console.error('[DevProjects] Inline create failed:', err);
        alert('新增失敗: ' + err.message);
    }
};

window.toggleExpandedDevProject = async function(devId) {
    window.__devProjectsExpandedEditId = window.__devProjectsExpandedEditId === devId ? null : devId;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }

    if (window.__devProjectsExpandedEditId && !(window.__internalOpsOpportunities || []).length) {
        try {
            const oppRes = await (typeof authedFetch === 'function' ? authedFetch('/api/opportunities') : fetch('/api/opportunities').then(r => r.json()));
            window.__internalOpsOpportunities = Array.isArray(oppRes) ? oppRes : (oppRes && oppRes.data ? oppRes.data : []);
            if (container && window.__internalOpsDevProjectsData) {
                container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
            }
        } catch (err) {
            console.error('[DevProjects] Opportunity list load failed:', err);
            window.__internalOpsOpportunities = [];
        }
    }
};

window.cancelExpandedDevProject = function() {
    window.__devProjectsExpandedEditId = null;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.filterExpandedDevProjectOpportunities = function(devId) {
    const searchInput = document.getElementById(`exp-projectSearch-${devId}`);
    const select = document.getElementById(`exp-projectName-${devId}`);
    if (!searchInput || !select) return;

    const keyword = (searchInput.value || '').toLowerCase();
    const opportunities = window.__internalOpsOpportunities || [];
    const filtered = keyword
        ? opportunities.filter(o => {
            const name = (o.opportunityName || '').toLowerCase();
            const company = (o.customerCompany || '').toLowerCase();
            return name.includes(keyword) || company.includes(keyword);
        })
        : opportunities;
    const currentValue = select.value;

    select.innerHTML = window.renderExpandedOpportunityOptions(filtered);
    if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
};

window.syncExpandedDevProgress = function(devId, source) {
    const slider = document.getElementById(`exp-progress-slider-${devId}`);
    const input = document.getElementById(`exp-progress-${devId}`);
    if (!slider || !input) return;

    const rawValue = source === 'slider' ? slider.value : input.value;
    const parsed = parseInt(rawValue, 10);
    const value = isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 100);
    slider.value = value;
    input.value = value;
};

window.saveExpandedDevProject = async function(devId) {
    const getValue = (id) => document.getElementById(`${id}-${devId}`)?.value || '';
    const progressRaw = parseInt(getValue('exp-progress'), 10);
    const progressValue = isNaN(progressRaw) ? 0 : Math.min(Math.max(progressRaw, 0), 100);
    const oppSelect = document.getElementById(`exp-projectName-${devId}`);
    const selectedOption = oppSelect ? oppSelect.options[oppSelect.selectedIndex] : null;
    const selectedOpportunityId = oppSelect ? oppSelect.value : '';
    const selectedOpportunityName = selectedOption && selectedOption.value !== ''
        ? (selectedOption.getAttribute('data-name') || selectedOption.text)
        : '';
    const collabsJoined = Array.from(document.querySelectorAll(`input[data-exp-collab="${devId}"]:checked`))
        .map(input => input.value)
        .join('｜');
    const parentSelect = document.getElementById(`exp-dependencies-${devId}`);
    const selectedParentId = parentSelect && parentSelect.disabled
        ? (getDevParentId(getDevProjectById(devId)) || '')
        : getValue('exp-dependencies');

    if (!validateDevParentSelection(devId, selectedParentId)) return;

    const payload = {
        productCode: getValue('exp-productCode'),
        productName: getValue('exp-productName'),
        projectName: selectedOpportunityName,
        assigneeCode: selectedOpportunityId,
        featureName: getValue('exp-featureName'),
        assigneeName: getValue('exp-assigneeName'),
        collaborators: collabsJoined,
        devStage: getValue('exp-devStage'),
        status: getValue('exp-status'),
        progress: `${progressValue}%`,
        startDate: getValue('exp-startDate'),
        estCompletionDate: getValue('exp-estCompletionDate'),
        dependencies: selectedParentId,
        caseRelationType: getValue('exp-caseRelationType')
    };

    try {
        const url = `/api/internal-ops/dev-projects/${devId}`;
        let res;
        if (typeof authedFetch === 'function') {
            res = await authedFetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json());
        }

        if (!res || res.success === false) {
            throw new Error(res?.error || 'save failed');
        }

        window.__devProjectsExpandedEditId = null;
        if (typeof window.fetchAndRenderSection === 'function') {
            window.fetchAndRenderSection('/api/internal-ops/dev-projects', window.renderDevProjects, 'internal-ops-dev-projects-content');
        } else {
            const container = document.getElementById('internal-ops-dev-projects-content');
            if (container) {
                const refreshed = await (typeof authedFetch === 'function'
                    ? authedFetch('/api/internal-ops/dev-projects')
                    : fetch('/api/internal-ops/dev-projects').then(r => r.json()));
                const dataArray = Array.isArray(refreshed) ? refreshed : (refreshed && refreshed.success ? refreshed.data : null);
                if (dataArray) container.innerHTML = window.renderDevProjects(dataArray);
            }
        }
    } catch (err) {
        console.error('[DevProjects] Expanded save failed:', err);
        alert('儲存失敗: ' + err.message);
    }
};

window.handleDevProjectSort = function(field, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (window.__devProjectsSortState.field === field) {
        window.__devProjectsSortState.direction = window.__devProjectsSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        window.__devProjectsSortState.field = field;
        window.__devProjectsSortState.direction = 'asc';
    }

    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.toggleDevTableActions = function() {
    window.__isDevActionMode = !window.__isDevActionMode;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.renderDevProjects = function(data) {
    window.__internalOpsDevProjectsData = data; 

    // config-driven sort order helper
    const sysConfig = window.__systemConfig || {};
    const visibleColumnCount = 10;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function renderConfigOptions(configKey, currentValue = '') {
        const configList = Array.isArray(sysConfig[configKey]) ? sysConfig[configKey] : [];
        const options = [];
        const seen = new Set();

        if (currentValue) {
            options.push({ value: currentValue, label: currentValue });
            seen.add(currentValue);
        }

        configList.forEach(item => {
            const value = item.value || item.note || '';
            const label = item.note || item.value || '';
            if (!value || seen.has(value)) return;
            options.push({ value, label });
            seen.add(value);
        });

        return options.map(option => `<option value="${escapeHtml(option.value)}" ${option.value === currentValue ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
    }

    function renderMemberOptions(currentValue = '') {
        return renderConfigOptions('團隊成員', currentValue);
    }

    function renderExpandedInput(devId, field, value, type = 'text') {
        return `<input id="exp-${field}-${devId}" class="dev-expanded-input" type="${type}" value="${escapeHtml(value || '')}">`;
    }

    function renderCreateInput(field, value = '', type = 'text') {
        return `<input id="create-${field}" class="dev-expanded-input" type="${type}" value="${escapeHtml(value || '')}">`;
    }

    function renderConfigSelect(devId, field, configKey, currentValue = '', emptyLabel = '') {
        return `
            <select id="exp-${field}-${devId}" class="dev-expanded-input">
                <option value="">${escapeHtml(emptyLabel)}</option>
                ${renderConfigOptions(configKey, currentValue)}
            </select>
        `;
    }

    function renderCreateConfigSelect(field, configKey, currentValue = '', emptyLabel = '') {
        return `
            <select id="create-${field}" class="dev-expanded-input">
                <option value="">${escapeHtml(emptyLabel)}</option>
                ${renderConfigOptions(configKey, currentValue)}
            </select>
        `;
    }

    function renderExpandedProgress(devId, value) {
        const numericValue = parseInt(String(value || '').replace('%', ''), 10);
        const safeValue = isNaN(numericValue) ? 0 : Math.min(Math.max(numericValue, 0), 100);
        return `
            <div class="dev-expanded-progress">
                <input id="exp-progress-slider-${devId}" type="range" min="0" max="100" step="1" value="${safeValue}" oninput="window.syncExpandedDevProgress('${devId}', 'slider')">
                <input id="exp-progress-${devId}" class="dev-expanded-input dev-expanded-number" type="number" min="0" max="100" value="${safeValue}" oninput="window.syncExpandedDevProgress('${devId}', 'number')">
                <span>%</span>
            </div>
        `;
    }

    window.renderExpandedOpportunityOptions = function(opportunities) {
        const options = ['<option value="" data-name="">-- 不連結機會 --</option>'];
        if (Array.isArray(opportunities) && opportunities.length > 0) {
            opportunities.forEach(o => {
                const name = o.opportunityName || '未命名機會';
                const company = o.customerCompany ? ` (${o.customerCompany})` : '';
                options.push(`<option value="${escapeHtml(o.opportunityId || '')}" data-name="${escapeHtml(name)}">${escapeHtml(name + company)}</option>`);
            });
        }
        return options.join('');
    };

    function renderOpportunitySelect(devId, item) {
        const opportunities = window.__internalOpsOpportunities || [];
        const currentOpportunityId = item.assigneeCode || item.opportunityId || '';
        const currentOpportunityName = item.projectName || item.opportunityName || '';
        const optionParts = ['<option value="" data-name="">-- 不連結機會 --</option>'];
        opportunities.forEach(o => {
            const name = o.opportunityName || '未命名機會';
            const company = o.customerCompany ? ` (${o.customerCompany})` : '';
            const selected = o.opportunityId === currentOpportunityId ? 'selected' : '';
            optionParts.push(`<option value="${escapeHtml(o.opportunityId || '')}" data-name="${escapeHtml(name)}" ${selected}>${escapeHtml(name + company)}</option>`);
        });
        if (currentOpportunityId && currentOpportunityName && !opportunities.some(o => o.opportunityId === currentOpportunityId)) {
            optionParts.push(`<option value="${escapeHtml(currentOpportunityId)}" data-name="${escapeHtml(currentOpportunityName)}" selected>${escapeHtml(currentOpportunityName)}</option>`);
        }

        return `
            <input id="exp-projectSearch-${devId}" class="dev-expanded-input" type="text" placeholder="搜尋機會名稱或客戶..." oninput="window.filterExpandedDevProjectOpportunities('${devId}')">
            <select id="exp-projectName-${devId}" class="dev-expanded-input">
                ${optionParts.join('')}
            </select>
        `;
    }

    function renderCreateOpportunitySelect() {
        const opportunities = window.__internalOpsOpportunities || [];
        return `
            <input id="create-projectSearch" class="dev-expanded-input" type="text" placeholder="搜尋機會名稱或客戶..." oninput="window.filterCreateDevProjectOpportunities()">
            <select id="create-projectName" class="dev-expanded-input">
                ${window.renderExpandedOpportunityOptions(opportunities)}
            </select>
        `;
    }

    function renderParentDevProjectSelect(devId, currentValue = '') {
        const projects = Array.isArray(window.__internalOpsDevProjectsData) ? window.__internalOpsDevProjectsData : [];
        const hasChildren = devProjectHasChildren(devId);
        const optionParts = ['<option value="">-- 無主案件 --</option>'];
        projects.forEach(project => {
            if (!project.devId || project.devId === devId) return;
            if (getDevParentId(project)) return;
            const caseName = project.productName || project.caseName || '未命名案件';
            const category = project.productCode || project.caseCategory || '';
            const relatedFeature = project.featureName || project.relatedFeature || '';
            const detailParts = [category, relatedFeature].filter(Boolean);
            const label = detailParts.length ? `${caseName}（${detailParts.join(' / ')}）` : caseName;
            const selected = project.devId === currentValue ? 'selected' : '';
            optionParts.push(`<option value="${escapeHtml(project.devId)}" ${selected}>${escapeHtml(label)}</option>`);
        });
        if (currentValue && !projects.some(project => project.devId === currentValue)) {
            optionParts.push(`<option value="${escapeHtml(currentValue)}" selected>已選主案件</option>`);
        }

        return `<select id="exp-dependencies-${devId}" class="dev-expanded-input" ${hasChildren ? 'disabled' : ''}>${optionParts.join('')}</select>`;
    }

    function renderCreateParentDevProjectSelect(currentValue = '') {
        const projects = Array.isArray(window.__internalOpsDevProjectsData) ? window.__internalOpsDevProjectsData : [];
        const optionParts = ['<option value="">-- 無主案件 --</option>'];
        projects.forEach(project => {
            if (!project.devId) return;
            if (getDevParentId(project)) return;
            const caseName = project.productName || project.caseName || '未命名案件';
            const category = project.productCode || project.caseCategory || '';
            const relatedFeature = project.featureName || project.relatedFeature || '';
            const detailParts = [category, relatedFeature].filter(Boolean);
            const label = detailParts.length ? `${caseName}（${detailParts.join(' / ')}）` : caseName;
            const selected = project.devId === currentValue ? 'selected' : '';
            optionParts.push(`<option value="${escapeHtml(project.devId)}" ${selected}>${escapeHtml(label)}</option>`);
        });

        return `<select id="create-dependencies" class="dev-expanded-input">${optionParts.join('')}</select>`;
    }

    function renderCollaboratorOptions(devId, selectedText = '') {
        const members = Array.isArray(sysConfig['團隊成員']) ? sysConfig['團隊成員'] : [];
        const selected = selectedText ? selectedText.split('｜').map(s => s.trim()).filter(Boolean) : [];
        if (members.length === 0) {
            return '<span class="dev-expanded-muted">無可用成員</span>';
        }

        return members.map((member, index) => {
            const value = member.value || member.note || '';
            const label = member.value || member.note || '';
            return `
                <label class="dev-expanded-check">
                    <input id="exp-collab-${devId}-${index}" type="checkbox" value="${escapeHtml(value)}" data-exp-collab="${escapeHtml(devId)}" ${selected.includes(value) ? 'checked' : ''}>
                    ${escapeHtml(label)}
                </label>
            `;
        }).join('');
    }

    function renderCreateCollaboratorOptions() {
        const members = Array.isArray(sysConfig['團隊成員']) ? sysConfig['團隊成員'] : [];
        if (members.length === 0) {
            return '<span class="dev-expanded-muted">無可用成員</span>';
        }

        return members.map((member, index) => {
            const value = member.value || member.note || '';
            const label = member.value || member.note || '';
            return `
                <label class="dev-expanded-check">
                    <input id="create-collab-${index}" type="checkbox" value="${escapeHtml(value)}" data-create-collab>
                    ${escapeHtml(label)}
                </label>
            `;
        }).join('');
    }

    function renderExpandedEditorRow(item) {
        const devId = item.devId;
        const progressValue = parseInt(String(item.progress || '').replace('%', ''), 10) || 0;
        const caseCategoryValue = item.productCode || item.caseCategory || '';
        const caseNameValue = item.productName || item.caseName || '';
        const relatedFeatureValue = item.featureName || item.relatedFeature || '';
        const ownerNameValue = item.assigneeName || item.ownerName || '';
        const caseStageValue = item.devStage || item.caseStage || '';
        const caseStatusValue = item.status || item.caseStatus || '';
        const parentDevIdValue = item.dependencies || item.parentDevId || '';
        const caseRelationTypeValue = item.caseRelationType || '';
        const hasChildCases = devProjectHasChildren(devId);

        return `
            <tr class="dev-project-expanded-editor-row">
                <td colspan="${visibleColumnCount}">
                    <div class="dev-project-expanded-editor">
                        <div class="dev-expanded-header">
                            <div class="dev-expanded-title">編輯開發案件</div>
                            <div class="dev-expanded-header-actions">
                                ${window.__isDevActionMode ? `<button type="button" class="dev-expanded-btn danger" onclick="window.deleteDevProject('${devId}')">刪除</button>` : '<span></span>'}
                                <div class="dev-expanded-actions">
                                    <button type="button" class="dev-expanded-btn primary" onclick="window.saveExpandedDevProject('${devId}')">儲存</button>
                                    <button type="button" class="dev-expanded-btn" onclick="window.cancelExpandedDevProject()">取消</button>
                                </div>
                            </div>
                        </div>
                        <div class="dev-expanded-sections">
                            <div class="dev-expanded-section dev-expanded-section-basic">
                                <div class="dev-expanded-section-title">基本資訊</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>案件分類</span>
                                        ${renderConfigSelect(devId, 'productCode', '進度案件分類', caseCategoryValue)}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>案件名稱</span>
                                        ${renderExpandedInput(devId, 'productName', caseNameValue)}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>關聯功能</span>
                                        ${renderExpandedInput(devId, 'featureName', relatedFeatureValue)}
                                    </label>
                                    <label class="dev-expanded-field dev-expanded-opportunity">
                                        <span>關聯機會</span>
                                        <div class="dev-expanded-stack">${renderOpportunitySelect(devId, item)}</div>
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>主案件ID</span>
                                        ${renderParentDevProjectSelect(devId, parentDevIdValue)}
                                        ${hasChildCases ? '<span class="dev-expanded-helper">已有子案件的案件不可改為子案件</span>' : ''}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>案件關係</span>
                                        ${renderConfigSelect(devId, 'caseRelationType', '進度案件關係', caseRelationTypeValue, '無相關案件')}
                                    </label>
                                </div>
                            </div>
                            <div class="dev-expanded-section dev-expanded-section-people">
                                <div class="dev-expanded-section-title">人員</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>負責人</span>
                                        <select id="exp-assigneeName-${devId}" class="dev-expanded-input">${renderMemberOptions(ownerNameValue)}</select>
                                    </label>
                                    <label class="dev-expanded-field dev-expanded-collab-field">
                                        <span>協作成員</span>
                                        <div class="dev-expanded-checks">${renderCollaboratorOptions(devId, item.collaborators || '')}</div>
                                    </label>
                                </div>
                            </div>
                            <div class="dev-expanded-section dev-expanded-section-status">
                                <div class="dev-expanded-section-title">狀態 / 進度</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>案件階段</span>
                                        <select id="exp-devStage-${devId}" class="dev-expanded-input">${renderConfigOptions('開發階段', caseStageValue)}</select>
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>案件狀態</span>
                                        <select id="exp-status-${devId}" class="dev-expanded-input">${renderConfigOptions('開發狀態', caseStatusValue)}</select>
                                    </label>
                                    <label class="dev-expanded-field dev-expanded-progress-field">
                                        <span>進度</span>
                                        ${renderExpandedProgress(devId, progressValue)}
                                    </label>
                                </div>
                            </div>
                            <div class="dev-expanded-section dev-expanded-section-schedule">
                                <div class="dev-expanded-section-title">時程</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>開始日期</span>
                                        ${renderExpandedInput(devId, 'startDate', item.startDate, 'date')}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>預計完成</span>
                                        ${renderExpandedInput(devId, 'estCompletionDate', item.estCompletionDate, 'date')}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    function renderCreateEditorRow() {
        return `
            <tr class="dev-project-expanded-editor-row">
                <td colspan="${visibleColumnCount}">
                    <div class="dev-project-expanded-editor">
                        <div class="dev-expanded-header">
                            <div class="dev-expanded-title">新增開發案件</div>
                            <div class="dev-expanded-actions">
                                <button type="button" class="dev-expanded-btn primary" onclick="window.saveCreateDevProjectInline()">儲存</button>
                                <button type="button" class="dev-expanded-btn" onclick="window.cancelCreateDevProjectInline()">取消</button>
                            </div>
                        </div>
                        <div class="dev-expanded-sections">
                            <div class="dev-expanded-section dev-expanded-section-basic">
                                <div class="dev-expanded-section-title">基本資訊</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>案件分類</span>
                                        ${renderCreateConfigSelect('productCode', '進度案件分類')}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>案件名稱</span>
                                        ${renderCreateInput('productName')}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>關聯功能</span>
                                        ${renderCreateInput('featureName')}
                                    </label>
                                    <label class="dev-expanded-field dev-expanded-opportunity">
                                        <span>關聯機會</span>
                                        <div class="dev-expanded-stack">${renderCreateOpportunitySelect()}</div>
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>主案件ID</span>
                                        ${renderCreateParentDevProjectSelect()}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>案件關係</span>
                                        ${renderCreateConfigSelect('caseRelationType', '進度案件關係', '', '無相關案件')}
                                    </label>
                                </div>
                            </div>
                            <div class="dev-expanded-section dev-expanded-section-people">
                                <div class="dev-expanded-section-title">人員</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>負責人</span>
                                        <select id="create-assigneeName" class="dev-expanded-input">${renderMemberOptions('')}</select>
                                    </label>
                                    <label class="dev-expanded-field dev-expanded-collab-field">
                                        <span>協作成員</span>
                                        <div class="dev-expanded-checks">${renderCreateCollaboratorOptions()}</div>
                                    </label>
                                </div>
                            </div>
                            <div class="dev-expanded-section dev-expanded-section-status">
                                <div class="dev-expanded-section-title">狀態 / 進度</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>案件階段</span>
                                        <select id="create-devStage" class="dev-expanded-input">${renderConfigOptions('開發階段', '')}</select>
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>案件狀態</span>
                                        <select id="create-status" class="dev-expanded-input">${renderConfigOptions('開發狀態', '')}</select>
                                    </label>
                                    <label class="dev-expanded-field dev-expanded-progress-field">
                                        <span>進度</span>
                                        <div class="dev-expanded-progress">
                                            <input id="create-progress-slider" type="range" min="0" max="100" step="1" value="0" oninput="window.syncCreateDevProgress('slider')">
                                            <input id="create-progress" class="dev-expanded-input dev-expanded-number" type="number" min="0" max="100" value="0" oninput="window.syncCreateDevProgress('number')">
                                            <span>%</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div class="dev-expanded-section dev-expanded-section-schedule">
                                <div class="dev-expanded-section-title">時程</div>
                                <div class="dev-expanded-section-grid">
                                    <label class="dev-expanded-field">
                                        <span>開始日期</span>
                                        ${renderCreateInput('startDate', '', 'date')}
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>預計完成日</span>
                                        ${renderCreateInput('estCompletionDate', '', 'date')}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    function getSortOrder(type, val) {
        if (!val) return 9999;
        const list = sysConfig[type] || [];
        const match = list.find(i => i.value === val || i.note === val);
        // legacy fallback = 9999
        return match?.order ?? 9999;
    }

    function getParentDevId(item) {
        return item.dependencies || item.parentDevId || '';
    }

    function getUpdatedTimeValue(item) {
        const time = new Date(item.updateTime || '').getTime();
        return Number.isFinite(time) ? time : 0;
    }

    function buildGroupedDevProjectRows(items) {
        const byId = new Map();
        const groups = [];
        const pendingChildren = [];

        items.forEach(item => {
            if (item.devId) byId.set(item.devId, item);
        });

        items.forEach(item => {
            const parentId = getParentDevId(item);
            if (!parentId) {
                groups.push({ main: item, children: [], sortTime: getUpdatedTimeValue(item), orphan: false });
                return;
            }
            pendingChildren.push({ item, parentId });
        });

        const groupByMainId = new Map(groups.map(group => [group.main.devId, group]));
        pendingChildren.forEach(({ item, parentId }) => {
            const parent = byId.get(parentId);
            const group = parent ? groupByMainId.get(parent.devId) : null;
            if (!group) {
                groups.push({ main: item, children: [], sortTime: getUpdatedTimeValue(item), orphan: true });
                return;
            }
            group.children.push(item);
            group.sortTime = Math.max(group.sortTime, getUpdatedTimeValue(item));
        });

        groups.forEach(group => {
            group.children.sort((a, b) => getUpdatedTimeValue(b) - getUpdatedTimeValue(a));
        });
        groups.sort((a, b) => b.sortTime - a.sortTime);

        return groups.flatMap((group, index) => {
            const rows = [{ ...group.main, __isChild: false, __isOrphan: group.orphan, __groupIndex: index + 1 }];
            group.children.forEach(child => rows.push({ ...child, __isChild: true, __isOrphan: false, __groupIndex: index + 1 }));
            return rows;
        });
    }

    const groupedRows = buildGroupedDevProjectRows(data);

    // [Logic Preserved] Config mapping and trace logs
    function getConfigColor(type, text, fallbackHex) {
        if (!text || text === '-') {
            return window.buildColorSet(fallbackHex);
        }
        
        const list = window.__systemConfig[type] || [];
        
        list.forEach(i => {
        });

        const item = list.find(i => {
            const match = (i.note === text || i.value === text);
            return match;
        });

        if (item && item.style) {
            return window.buildColorSet(item.style);
        }
        return window.buildColorSet(fallbackHex);
    }

    function getBadgeHtml(text, colorSet) {
        if (!text || text === '-') return '-';
        return `<span style="display:inline-block; padding:2px 7px; border-radius:5px; font-size:0.75rem; font-weight:600; background:${colorSet.bgLight}; color:${colorSet.text}; border: 1px solid ${colorSet.border}; white-space: nowrap;">${text}</span>`;
    }

    function getStatusBadge(status) {
        const colorSet = getConfigColor('開發狀態', status, '#616161');
        return getBadgeHtml(status, colorSet);
    }

    function getStageBadge(stage) {
        const colorSet = getConfigColor('開發階段', stage, '#616161');
        return getBadgeHtml(stage, colorSet);
    }

    // [Logic Preserved] Working days calculation
    function calculateWorkingDays(startDate, endDate) {
        let count = 0;
        let cur = new Date(startDate);
        cur.setHours(0, 0, 0, 0);
        let end = new Date(endDate);
        end.setHours(0, 0, 0, 0);

        while (cur <= end) {
            const day = cur.getDay();
            if (day !== 0 && day !== 6) {
                count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    }

    function calculateTheoreticalProgress(startStr, endStr) {
        if (!startStr || !endStr) return null;

        const start = new Date(startStr);
        const end = new Date(endStr);
        const now = new Date();

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;

        if (now < start) return 0;
        if (now > end) return 100;

        const totalWorkingDays = calculateWorkingDays(start, end);
        if (totalWorkingDays === 0) {
            return (now >= start) ? 100 : 0;
        }

        const elapsedWorkingDays = calculateWorkingDays(start, now);
        const prog = Math.round((elapsedWorkingDays / totalWorkingDays) * 100);
        
        return Math.min(Math.max(prog, 0), 100);
    }

    // [Display Reverted] Progress block simplified, removed wrapper classes, kept 0.8rem typography
    function getCombinedProgressHtml(actualProgressText, startDate, estDate) {
        if (!actualProgressText) actualProgressText = '0%';
        const aVal = parseInt(actualProgressText.replace('%', ''), 10) || 0;
        const clampedAVal = Math.min(Math.max(aVal, 0), 100);
        let aHex;
        if (aVal < 30) aHex = '#616161';
        else if (aVal > 70) aHex = '#2e7d32';
        else aHex = '#1976d2';
        const aColor = window.buildColorSet(aHex);

        let tProg = 0;
        let clampedTVal = 0;
        let cueHtml = '';
        let tProgText = '-';
        
        if (startDate && estDate) {
            const start = new Date(startDate).setHours(0,0,0,0);
            const end = new Date(estDate).setHours(23,59,59,999);
            const now = new Date().setHours(0,0,0,0);

            if (!isNaN(start) && !isNaN(end) && start < end) {
                if (now >= end) tProg = 100;
                else if (now > start) tProg = Math.round(((now - start) / (end - start)) * 100);
                
                clampedTVal = Math.min(Math.max(tProg, 0), 100);
                tProgText = `${tProg}%`;
                
                const diff = aVal - tProg;
                if (diff <= -10) cueHtml = `<span style="color:var(--accent-red); font-size:0.75rem; font-weight: bold; white-space: nowrap;">落後</span>`;
                else if (diff >= 10) cueHtml = `<span style="color:var(--accent-green); font-size:0.75rem; font-weight: bold; white-space: nowrap;">超前</span>`;
            }
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="dev-secondary-meta-label" style="color: var(--text-muted); width: 28px; flex-shrink: 0; text-align: right; white-space: nowrap;">實際</span>
                    <div style="width: 70px; height: 6px; background: var(--glass-bg); border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                        <div style="width: ${clampedAVal}%; height: 100%; background: ${aColor.text};"></div>
                    </div>
                    <span class="dev-secondary-meta-value" style="color:${aColor.text}; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0;">${actualProgressText}</span>
                    <span style="width: 30px; flex-shrink: 0;"></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="dev-secondary-meta-label" style="color: var(--text-muted); width: 28px; flex-shrink: 0; text-align: right; white-space: nowrap;">理論</span>
                    <div style="width: 70px; height: 6px; background: ${tProgText === '-' ? 'transparent' : 'var(--glass-bg)'}; border: ${tProgText === '-' ? 'none' : '1px dashed var(--border-color)'}; border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                        <div style="width: ${clampedTVal}%; height: 100%; background: var(--text-muted);"></div>
                    </div>
                    <span class="dev-secondary-meta-value" style="color: ${tProgText === '-' ? 'var(--text-muted)' : 'var(--text-secondary)'}; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0;">${tProgText}</span>
                    <span style="width: 30px; flex-shrink: 0; text-align: left;">${cueHtml}</span>
                </div>
            </div>
        `;
    }

    function renderCategoryBadge(item) {
        const text = item.productCode || item.caseCategory || '未分類';
        return getBadgeHtml(text, getConfigColor('進度案件分類', text, '#616161'));
    }

    function renderRelationBadge(item) {
        if (item.__isOrphan) return getBadgeHtml('主案件遺失', window.buildColorSet('#c62828'));
        if (!item.__isChild) return '';
        const text = item.caseRelationType || '未指定關係';
        return getBadgeHtml(text, getConfigColor('進度案件關係', text, '#616161'));
    }

    const createRow = window.__devProjectsCreateOpen ? renderCreateEditorRow() : '';
    const rows = groupedRows.map((item, index) => {
        const isExpanded = window.__devProjectsExpandedEditId === item.devId;
        const scheduleHtml = `
            <div style="display: flex; flex-direction: column; gap: 4px; min-width: 110px;">
                <div class="dev-secondary-meta-row" style="display: flex; justify-content: space-between; gap: 8px;">
                    <span style="color: var(--text-muted); white-space: nowrap;">開始</span>
                    <span style="color: var(--text-secondary); white-space: nowrap;">${item.startDate || '-'}</span>
                </div>
                <div class="dev-secondary-meta-row" style="display: flex; justify-content: space-between; gap: 8px;">
                    <span style="color: var(--text-muted); white-space: nowrap;">預計完成</span>
                    <span style="color: var(--text-secondary); white-space: nowrap;">${item.estCompletionDate || '-'}</span>
                </div>
            </div>
        `;

        let oppHtml = '<span class="internal-ops-muted-badge">-</span>';
        const rowOpportunityId = item.assigneeCode || item.opportunityId || '';
        const rowOpportunityName = item.projectName || item.opportunityName || '';
        if (rowOpportunityId && rowOpportunityName) {
            oppHtml = `<a href="#" title="${rowOpportunityName || ''}" class="dev-opportunity-subtle" onclick="event.preventDefault(); window.CRM_APP.navigateTo('opportunity-details', {opportunityId: '${rowOpportunityId}'})">${rowOpportunityName}</a>`;
        } else if (rowOpportunityName) {
            oppHtml = `<span title="${rowOpportunityName || ''}" class="dev-opportunity-subtle">${rowOpportunityName}</span>`;
        }

        let personnelHtml = `<div style="display:flex; flex-direction:column; gap:4px; min-width:120px;">`;
        const assigneeText = item.assigneeName || item.ownerName || '-';
        personnelHtml += `
            <div class="dev-secondary-meta-row" style="display:grid; grid-template-columns:64px 1fr; column-gap:8px;">
                <span style="color:var(--text-muted); white-space:nowrap;">負責人</span>
                <span style="color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${assigneeText}">${assigneeText}</span>
            </div>
        `;

        if (item.collaborators) {
            const names = item.collaborators.split('｜').map(s => s.trim()).filter(Boolean);
            if (names.length > 0) {
                const fullJoinedNames = names.join('、');
                let displayNames = fullJoinedNames;
                if (names.length > 2) {
                    displayNames = names.slice(0, 2).join('、') + ` +${names.length - 2}`;
                }
                personnelHtml += `
                    <div class="dev-secondary-meta-row" style="display:grid; grid-template-columns:64px 1fr; column-gap:8px;">
                        <span style="color:var(--text-muted); white-space:nowrap;">協作成員</span>
                        <span style="color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fullJoinedNames}">${displayNames}</span>
                    </div>
                `;
            }
        }
        personnelHtml += `</div>`;

        const caseNameText = item.productName || item.caseName || '-';
        const rowIndexText = item.__isChild ? '' : item.__groupIndex;
        const childMarker = item.__isChild ? '<span class="dev-child-marker">↳</span>' : '';
        const childClass = item.__isChild ? ' dev-project-child-row' : '';
        const displayRow = `
        <tr class="${childClass}">
            <td>${rowIndexText}</td>
            <td class="dev-case-name-table-cell" title="${caseNameText}">
                <div class="dev-case-name-cell ${item.__isChild ? 'is-child' : ''} ${window.__isDevActionMode ? 'is-editable' : ''}" ${window.__isDevActionMode ? `onclick="window.toggleExpandedDevProject('${item.devId}')"` : ''}>
                    ${childMarker}
                    ${renderRelationBadge(item)}
                    <span class="dev-case-name-primary">${caseNameText}</span>
                </div>
            </td>
            <td class="dev-category-cell">${renderCategoryBadge(item)}</td>
            <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">${oppHtml}</td>
            <td style="font-size: 0.85rem;">${item.featureName || item.relatedFeature || '-'}</td>
            <td>${personnelHtml}</td>
            <td>${getStageBadge(item.devStage || item.caseStage || '-')}</td>
            <td>${getStatusBadge(item.status || item.caseStatus || '-')}</td>
            <td>${scheduleHtml}</td>
            <td>${getCombinedProgressHtml(item.progress, item.startDate, item.estCompletionDate)}</td>
        </tr>
    `;
        return isExpanded ? displayRow + renderExpandedEditorRow(item) : displayRow;
    }).join('');

    const getSortIcon = (field) => {
        if (window.__devProjectsSortState.field !== field) return ' ↕';
        return window.__devProjectsSortState.direction === 'asc' ? ' ↑' : ' ↓';
    };

    return `
        <style>
            .internal-ops-widget:has(#internal-ops-dev-projects-content) > .internal-ops-header .action-btn {
                display: none;
            }
            .dev-project-expanded-editor-row td {
                background: var(--card-bg);
                padding: 8px 12px 12px;
            }
            .dev-project-expanded-editor {
                background: rgba(59, 130, 246, 0.07);
                border: 1px solid var(--border-color);
                border-radius: 5px;
                box-sizing: border-box;
                padding: 8px 10px;
                box-shadow: none;
            }
            .dev-expanded-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                padding-bottom: 7px;
                margin-bottom: 8px;
                border-bottom: 1px solid var(--border-color);
            }
            .dev-expanded-header-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                flex: 1;
            }
            .dev-expanded-title {
                font-size: 0.82rem;
                font-weight: 600;
                color: var(--text-primary);
            }
            .dev-expanded-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .dev-expanded-sections {
                display: grid;
                grid-template-columns: minmax(260px, 1.2fr) minmax(220px, 0.95fr);
                gap: 8px 10px;
            }
            .dev-expanded-section {
                border: 1px solid color-mix(in srgb, var(--border-color) 62%, transparent);
                border-radius: 4px;
                padding: 7px 8px;
                background: color-mix(in srgb, var(--primary-bg) 54%, transparent);
                min-width: 0;
            }
            .dev-expanded-section-basic {
                grid-column: span 2;
            }
            .dev-expanded-section-title {
                color: var(--text-secondary);
                font-size: 0.74rem;
                font-weight: 600;
                line-height: 1;
                margin-bottom: 6px;
            }
            .dev-expanded-section-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(120px, 1fr));
                gap: 6px 8px;
            }
            .dev-expanded-section-basic .dev-expanded-section-grid {
                grid-template-columns: minmax(140px, 0.9fr) minmax(130px, 0.85fr) minmax(220px, 1.25fr);
            }
            .dev-expanded-section-status .dev-expanded-section-grid {
                grid-template-columns: minmax(110px, 0.8fr) minmax(100px, 0.75fr) minmax(180px, 1.1fr);
            }
            .dev-expanded-field {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
                color: var(--text-muted);
                font-size: 0.7rem;
                line-height: 1.25;
            }
            .dev-expanded-field > span {
                display: block;
                color: var(--text-muted);
                font-size: 0.7rem;
                font-weight: 500;
                margin-bottom: 1px;
            }
            .dev-expanded-wide {
                grid-column: span 2;
            }
            .dev-expanded-full {
                grid-column: 1 / -1;
            }
            .dev-expanded-stack {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .dev-expanded-input {
                width: 100%;
                min-width: 0;
                box-sizing: border-box;
                padding: 5px 7px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                background: #fff;
                color: #111827;
                font-size: 0.82rem;
                line-height: 1.2;
            }
            .dev-project-expanded-editor textarea.dev-expanded-input,
            .dev-project-expanded-editor select.dev-expanded-input,
            .dev-project-expanded-editor input.dev-expanded-input {
                background: #fff;
                border-color: #d1d5db;
            }
            .dev-expanded-input:focus {
                outline: none;
                border-color: #9ca3af;
                box-shadow: 0 0 0 1px rgba(156, 163, 175, 0.25);
            }
            .dev-expanded-input:disabled {
                background: #f3f4f6;
                color: var(--text-muted);
                cursor: not-allowed;
            }
            .dev-expanded-helper {
                color: var(--text-muted);
                font-size: 0.68rem;
                line-height: 1.25;
            }
            .dev-expanded-number {
                width: 50px;
                text-align: right;
            }
            .dev-expanded-progress {
                display: flex;
                align-items: center;
                gap: 7px;
            }
            .dev-expanded-progress input[type="range"] {
                flex: 1;
                min-width: 80px;
                height: 24px;
                box-sizing: border-box;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                background: #fff;
                accent-color: var(--accent-blue);
            }
            .dev-expanded-checks {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                max-height: 66px;
                overflow-y: auto;
            }
            .dev-expanded-check {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                padding: 2px 5px;
                border: 1px solid var(--border-color);
                border-radius: 3px;
                background: transparent;
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 400;
                line-height: 1;
            }
            .dev-expanded-muted {
                color: var(--text-muted);
                font-size: 0.8rem;
            }
            .dev-expanded-btn {
                padding: 1px 2px;
                border: 0;
                border-radius: 0;
                background: transparent;
                color: var(--text-muted);
                font-size: 0.73rem;
                line-height: 1;
                cursor: pointer;
            }
            .dev-expanded-btn:hover {
                color: var(--text-primary);
            }
            .dev-expanded-btn.primary {
                color: var(--accent-blue);
                font-weight: 600;
            }
            .dev-expanded-btn.danger {
                color: var(--text-muted);
            }
            .dev-expanded-btn.danger:hover {
                color: var(--accent-red);
            }
            .dev-project-child-row td {
                background: color-mix(in srgb, var(--card-bg) 92%, var(--primary-bg));
            }
            .dev-case-name-cell {
                display: flex;
                align-items: center;
                gap: 5px;
                min-width: 0;
            }
            .dev-case-name-cell.is-editable {
                cursor: pointer;
            }
            .dev-case-name-cell.is-child {
                padding-left: 22px;
            }
            .dev-case-name-table-cell {
                font-size: 0.85rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .dev-case-name-primary {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                min-width: 0;
                font-weight: 600;
                color: var(--text-primary);
                line-height: 1.35;
            }
            .dev-child-marker {
                color: var(--text-muted);
                font-size: 0.8rem;
                line-height: 1;
                flex-shrink: 0;
            }
            .dev-case-name-cell.is-editable:hover .dev-case-name-primary {
                color: var(--text-secondary);
                text-decoration: underline;
                text-decoration-color: color-mix(in srgb, var(--text-muted) 45%, transparent);
                text-underline-offset: 2px;
            }
            .dev-expanded-btn.danger {
                color: var(--accent-red);
            }
            .dev-category-cell {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                vertical-align: middle;
            }
            .dev-opportunity-subtle {
                display: inline-block;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: var(--text-muted);
                text-decoration: none;
                font-size: 0.76rem;
                font-weight: 400;
            }
            .dev-opportunity-subtle:hover {
                color: var(--accent-blue);
            }
            .dev-secondary-meta-row,
            .dev-secondary-meta-label,
            .dev-secondary-meta-value {
                font-size: 0.76rem;
            }
            .dev-maintenance-indicator {
                color: var(--accent-red);
                font-size: 0.76rem;
                font-weight: 600;
                margin-right: 8px;
                white-space: nowrap;
            }
            .dev-maintenance-help {
                color: var(--text-muted);
                font-size: 0.76rem;
                font-weight: 400;
                white-space: nowrap;
            }
            .dev-project-toolbar {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }
            .dev-project-toolbar .internal-ops-btn {
                padding: 3px 8px;
                min-height: 24px;
                border: 1px solid var(--border-color);
                background: transparent;
                color: var(--text-secondary);
                font-size: 0.76rem;
                font-weight: 500;
                line-height: 1;
            }
            .dev-project-toolbar .internal-ops-btn:hover {
                color: var(--text-primary);
                background: color-mix(in srgb, var(--primary-bg) 68%, transparent);
            }
            #internal-ops-dev-projects-content {
                overflow-x: auto;
            }
            #internal-ops-dev-projects-content .internal-ops-table {
                min-width: 1120px;
                table-layout: fixed;
            }
            #internal-ops-dev-projects-content .internal-ops-table th {
                white-space: nowrap;
                width: auto !important;
            }
            @media (max-width: 1100px) {
                .dev-expanded-sections,
                .dev-expanded-section-basic,
                .dev-expanded-section-basic .dev-expanded-section-grid,
                .dev-expanded-section-status .dev-expanded-section-grid {
                    grid-template-columns: repeat(2, minmax(140px, 1fr));
                    grid-column: span 2;
                }
            }
        </style>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 8px 12px 0;">
            <div style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;">共 ${data.length} 筆</div>
            <div class="dev-project-toolbar">
                ${window.__isDevActionMode ? '<span class="dev-maintenance-indicator">維護模式中</span>' : ''}
                ${window.__isDevActionMode ? '<span class="dev-maintenance-help">點選案件名稱進入編輯</span>' : ''}
                <button onclick="window.openDevProjectCreateInline()" class="internal-ops-btn">
                    新增
                </button>
                <button onclick="window.toggleDevTableActions()" class="internal-ops-btn">
                    ${window.__isDevActionMode ? '結束操作' : '操作模式'}
                </button>
            </div>
        </div>
        <table class="internal-ops-table">
            <colgroup>
                <col style="width: 3%;">
                <col style="width: 23%;">
                <col style="width: 7%;">
                <col style="width: 13%;">
                <col style="width: 7%;">
                <col style="width: 10%;">
                <col style="width: 8%;">
                <col style="width: 8%;">
                <col style="width: 10%;">
                <col style="width: 11%;">
            </colgroup>
            <thead>
                <tr>
                    <th>#</th>
                    <th>案件名稱</th>
                    <th>案件分類</th>
                    <th>關聯機會</th>
                    <th>關聯功能</th>
                    <th>人員</th>
                    <th onclick="window.handleDevProjectSort('devStage', event)" style="cursor:pointer; user-select:none;" title="點擊依案件階段排序">案件階段<span style="color:var(--accent-blue);">${getSortIcon('devStage')}</span></th>
                    <th onclick="window.handleDevProjectSort('status', event)" style="cursor:pointer; user-select:none;" title="點擊依案件狀態排序">案件狀態<span style="color:var(--accent-blue);">${getSortIcon('status')}</span></th>
                    <th>開發時程</th>
                    <th>進度</th>
                </tr>
            </thead>
            <tbody>${createRow}${rows}</tbody>
        </table>
    `;
};
