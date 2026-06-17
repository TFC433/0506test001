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

if (typeof window.__devProjectsExpandedNoteId === 'undefined') {
    window.__devProjectsExpandedNoteId = null;
}

if (typeof window.__devProjectsAllNotesExpanded === 'undefined') {
    window.__devProjectsAllNotesExpanded = false;
}

if (typeof window.__devProjectsCreateOpen === 'undefined') {
    window.__devProjectsCreateOpen = false;
}

if (typeof window.__devProjectsViewMode === 'undefined') {
    window.__devProjectsViewMode = 'case';
}

if (typeof window.__devProjectsCaseGroupMode === 'undefined') {
    window.__devProjectsCaseGroupMode = 'none';
}

if (typeof window.__devProjectsMemberDetailMode === 'undefined') {
    window.__devProjectsMemberDetailMode = 'expanded';
}

const DEV_PROJECT_COMPLETED_STATUS = '\u5df2\u5b8c\u6210';
const DEV_PROJECT_ARCHIVED_STATUS = '\u5c01\u5b58';
const DEV_PROJECT_ARCHIVED_GROUP_LABEL = '\u5c01\u5b58\u6848\u4ef6';
const DEV_PROJECT_ARCHIVE_HELPER_NOTE = '\u5c01\u5b58\u5f8c\uff0c\u6848\u4ef6\u6703\u79fb\u81f3\u5e95\u90e8\u300c\u5c01\u5b58\u6848\u4ef6\u300d\u7fa4\u7d44\uff1b\u518d\u6b21\u53d6\u6d88\u52fe\u9078\u53ef\u56de\u5230\u4e3b\u5217\u8868\u3002';
const DEV_PROJECT_COMPLETED_LOCK_NOTE = '\u9032\u5ea6\u9054 100% \u6642\uff0c\u7cfb\u7d71\u6703\u81ea\u52d5\u5c07\u958b\u767c\u72c0\u614b\u9396\u5b9a\u70ba\u300c\u5df2\u5b8c\u6210\u300d\u3002\u82e5\u9700\u6062\u5fa9\u9032\u884c\u4e2d\uff0c\u8acb\u5148\u5c07\u9032\u5ea6\u8abf\u6574\u70ba 99% \u4ee5\u4e0b\u3002';
const DEV_PROJECT_CREATE_OWNER_PLACEHOLDER = '\u8acb\u9078\u64c7';
const DEV_PROJECT_DISPLAY_MODE_LABEL = '\u986f\u793a\u65b9\u5f0f';
const DEV_PROJECT_GROUP_LABEL = '\u5206\u7d44';
const DEV_PROJECT_GROUP_NONE_LABEL = '\u4e0d\u5206\u7d44';
const DEV_PROJECT_GROUP_CATEGORY_LABEL = '\u6848\u4ef6\u5206\u985e';
const DEV_PROJECT_GROUP_STATUS_LABEL = '\u6848\u4ef6\u72c0\u614b';
const DEV_PROJECT_UNGROUPED_LABEL = '\u672a\u5206\u985e';
const DEV_PROJECT_DETAIL_LABEL = '\u660e\u7d30';
const DEV_PROJECT_DETAIL_EXPAND_LABEL = '\u5c55\u958b\u660e\u7d30';
const DEV_PROJECT_DETAIL_COLLAPSE_LABEL = '\u6536\u5408\u660e\u7d30';
const DEV_PROJECT_NOTES_EXPAND_LABEL = '\u5c55\u958b\u5099\u8a3b';
const DEV_PROJECT_NOTES_COLLAPSE_LABEL = '\u6536\u5408\u5099\u8a3b';
const DEV_PROJECT_CREATE_LABEL = '\u65b0\u589e';
const DEV_PROJECT_MAINTENANCE_LABEL = '\u7dad\u8b77';
const DEV_PROJECT_MAINTENANCE_DONE_LABEL = '\u7d50\u675f\u7dad\u8b77';
const DEV_PROJECT_EDIT_HELP_LABEL = '\u5982\u8981\u7de8\u8f2f\uff0c\u8acb\u9032\u5165\u7dad\u8b77\u6a21\u5f0f\uff0c\u4e26\u9ede\u64ca\u540d\u7a31\u9032\u884c\u7de8\u8f2f';
const DEV_PROJECT_EDITING_HELP_LABEL = DEV_PROJECT_EDIT_HELP_LABEL;

function hasDevProjectNotes(item) {
    return Boolean(item && String(item.notes || '').trim());
}

function hasAnyDevProjectNotes() {
    return (window.__internalOpsDevProjectsData || []).some(hasDevProjectNotes);
}

function ensureDevProjectHeaderControls() {
    setTimeout(() => {
        const container = document.getElementById('internal-ops-dev-projects-content');
        const widget = container && container.closest('.internal-ops-widget');
        const header = widget && widget.querySelector('.internal-ops-header');
        if (!header) return;

        const isMemberView = window.__devProjectsViewMode === 'member';

        let actionGroup = header.querySelector('#dev-project-header-action-group');
        if (!actionGroup) {
            actionGroup = document.createElement('span');
            actionGroup.id = 'dev-project-header-action-group';
            actionGroup.className = 'dev-project-header-action-group';
            (header.querySelector('#dev-project-header-controls') || header).appendChild(actionGroup);
        }

        let actionSeparator = actionGroup.querySelector('#dev-project-action-separator');
        if (!actionSeparator) {
            actionSeparator = document.createElement('span');
            actionSeparator.id = 'dev-project-action-separator';
            actionSeparator.className = 'dev-project-toolbar-separator';
            actionSeparator.textContent = '|';
        }
        actionGroup.appendChild(actionSeparator);

        let maintenanceHint = actionGroup.querySelector('#dev-project-maintenance-hint');
        if (!maintenanceHint) {
            maintenanceHint = document.createElement('span');
            maintenanceHint.id = 'dev-project-maintenance-hint';
            maintenanceHint.className = 'dev-project-toolbar-help';
        }
        maintenanceHint.textContent = DEV_PROJECT_EDITING_HELP_LABEL;
        maintenanceHint.style.display = '';
        actionGroup.appendChild(maintenanceHint);

        let noteToggleButton = actionGroup.querySelector('#dev-project-notes-toggle');
        if (!noteToggleButton) {
            noteToggleButton = document.createElement('button');
            noteToggleButton.type = 'button';
            noteToggleButton.id = 'dev-project-notes-toggle';
            noteToggleButton.className = 'dev-project-header-btn';
            noteToggleButton.onclick = () => window.toggleAllDevProjectNotes();
        }
        const hasNotes = hasAnyDevProjectNotes();
        noteToggleButton.textContent = window.__devProjectsAllNotesExpanded ? DEV_PROJECT_NOTES_COLLAPSE_LABEL : DEV_PROJECT_NOTES_EXPAND_LABEL;
        noteToggleButton.disabled = isMemberView || Boolean(window.__isDevActionMode) || !hasNotes;
        noteToggleButton.classList.toggle('is-active', Boolean(window.__devProjectsAllNotesExpanded && hasNotes));
        actionGroup.appendChild(noteToggleButton);

        let createButton = actionGroup.querySelector('#dev-project-create-inline');
        if (!createButton) {
            createButton = document.createElement('button');
            createButton.type = 'button';
            createButton.id = 'dev-project-create-inline';
            createButton.className = 'dev-project-header-btn';
            createButton.onclick = () => window.openDevProjectCreateInline();
        }
        createButton.textContent = DEV_PROJECT_CREATE_LABEL;
        createButton.disabled = isMemberView;
        actionGroup.appendChild(createButton);

        let maintenanceButton = actionGroup.querySelector('#dev-project-maintenance-toggle');
        if (!maintenanceButton) {
            maintenanceButton = document.createElement('button');
            maintenanceButton.type = 'button';
            maintenanceButton.id = 'dev-project-maintenance-toggle';
            maintenanceButton.className = 'dev-project-header-btn';
            maintenanceButton.onclick = () => window.toggleDevTableActions();
        }
        maintenanceButton.textContent = window.__isDevActionMode ? DEV_PROJECT_MAINTENANCE_DONE_LABEL : DEV_PROJECT_MAINTENANCE_LABEL;
        maintenanceButton.disabled = false;
        maintenanceButton.classList.toggle('is-danger', Boolean(window.__isDevActionMode));
        maintenanceButton.classList.toggle('is-active', Boolean(window.__isDevActionMode));
        actionGroup.appendChild(maintenanceButton);
    }, 0);
}

function getDevClampedProgress(rawValue) {
    const parsed = parseInt(rawValue, 10);
    return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 100);
}

function syncDevProgressCompletionLock(progressValue, statusId, noteId) {
    const statusSelect = document.getElementById(statusId);
    const note = document.getElementById(noteId);
    const isCompleted = progressValue >= 100;

    if (statusSelect) {
        if (isCompleted) {
            if (!Array.from(statusSelect.options).some(option => option.value === DEV_PROJECT_COMPLETED_STATUS)) {
                statusSelect.add(new Option(DEV_PROJECT_COMPLETED_STATUS, DEV_PROJECT_COMPLETED_STATUS));
            }
            statusSelect.value = DEV_PROJECT_COMPLETED_STATUS;
        }
        statusSelect.disabled = isCompleted;
    }
    if (note) note.style.display = isCompleted ? 'block' : 'none';
}

function syncExpandedDevArchiveState(devId, progressValue) {
    const archiveWrap = document.getElementById(`exp-archive-wrap-${devId}`);
    const archiveInput = document.getElementById(`exp-archive-${devId}`);
    if (!archiveWrap || !archiveInput) return;

    const wasArchived = archiveInput.getAttribute('data-original-archived') === 'true';
    const shouldShow = progressValue >= 100 || wasArchived;
    archiveWrap.style.display = shouldShow ? 'flex' : 'none';
    if (!shouldShow) {
        archiveInput.checked = false;
    }
}

function isExpandedDevArchiveEnabled(devId) {
    return document.getElementById(`exp-archive-${devId}`)?.checked === true;
}

function isExpandedDevArchiveAvailable(devId) {
    const archiveWrap = document.getElementById(`exp-archive-wrap-${devId}`);
    return !!archiveWrap && archiveWrap.style.display !== 'none';
}

window.setDevProjectsCaseGroupMode = function(mode) {
    if (!['none', 'category', 'status'].includes(mode)) return;
    window.__devProjectsCaseGroupMode = mode;
    rerenderDevProjectsInline();
};

window.setDevProjectsMemberDetailMode = function(mode) {
    if (!['collapsed', 'expanded'].includes(mode)) return;
    window.__devProjectsMemberDetailMode = mode;
    rerenderDevProjectsInline();
};


function updateDevProjectsViewTabs() {
    const activeMode = window.__devProjectsViewMode === 'member' ? 'member' : 'case';
    document.querySelectorAll('[data-dev-project-view-tab]').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-dev-project-view-tab') === activeMode);
    });
    const groupHost = document.getElementById('dev-project-case-group-controls-host');
    if (groupHost) {
        groupHost.innerHTML = activeMode === 'case' ? renderDevProjectsCaseGroupControls() : renderDevProjectsMemberDetailControls();
    }
}

function renderDevProjectsCaseGroupControls() {
    return `
        <span class="dev-case-group-controls">
            <span class="dev-case-group-label">| ${DEV_PROJECT_GROUP_LABEL}</span>
            <button type="button" onclick="window.setDevProjectsCaseGroupMode('none')" class="dev-project-header-btn ${window.__devProjectsCaseGroupMode === 'none' ? 'is-active' : ''}">${DEV_PROJECT_GROUP_NONE_LABEL}</button>
            <button type="button" onclick="window.setDevProjectsCaseGroupMode('category')" class="dev-project-header-btn ${window.__devProjectsCaseGroupMode === 'category' ? 'is-active' : ''}">${DEV_PROJECT_GROUP_CATEGORY_LABEL}</button>
            <button type="button" onclick="window.setDevProjectsCaseGroupMode('status')" class="dev-project-header-btn ${window.__devProjectsCaseGroupMode === 'status' ? 'is-active' : ''}">${DEV_PROJECT_GROUP_STATUS_LABEL}</button>
        </span>
    `;
}

function renderDevProjectsMemberDetailControls() {
    const activeMode = window.__devProjectsMemberDetailMode === 'expanded' ? 'expanded' : 'collapsed';
    const nextMode = activeMode === 'expanded' ? 'collapsed' : 'expanded';
    const toggleLabel = activeMode === 'expanded' ? DEV_PROJECT_DETAIL_COLLAPSE_LABEL : DEV_PROJECT_DETAIL_EXPAND_LABEL;
    return `
        <span class="dev-case-group-controls">
            <span class="dev-case-group-label">| ${DEV_PROJECT_DETAIL_LABEL}</span>
            <button type="button" onclick="window.setDevProjectsMemberDetailMode('${nextMode}')" class="dev-project-header-btn is-active">${toggleLabel}</button>
        </span>
    `;
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
    window.__devProjectsExpandedNoteId = null;
    window.__devProjectsAllNotesExpanded = false;
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
    expandDevOpportunitySelect(select, !!keyword);
};

window.syncCreateDevProgress = function(source) {
    const slider = document.getElementById('create-progress-slider');
    const input = document.getElementById('create-progress');
    if (!slider || !input) return;

    const rawValue = source === 'slider' ? slider.value : input.value;
    const value = getDevClampedProgress(rawValue);
    slider.value = value;
    input.value = value;
    syncDevProgressCompletionLock(value, 'create-status', 'create-status-note');
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
        status: progressValue >= 100 ? DEV_PROJECT_COMPLETED_STATUS : getValue('create-status'),
        progress: `${progressValue}%`,
        startDate: getValue('create-startDate'),
        estCompletionDate: getValue('create-estCompletionDate'),
        dependencies: selectedParentId,
        caseRelationType: getValue('create-caseRelationType'),
        notes: getValue('create-notes')
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
    window.__devProjectsExpandedNoteId = null;
    window.__devProjectsAllNotesExpanded = false;
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

window.toggleDevProjectNote = function(devId) {
    if (window.__isDevActionMode) {
        window.toggleExpandedDevProject(devId);
        return;
    }

    const item = getDevProjectById(devId);
    if (!hasDevProjectNotes(item)) return;

    window.__devProjectsExpandedNoteId = window.__devProjectsExpandedNoteId === devId ? null : devId;
    window.__devProjectsExpandedEditId = null;
    window.__devProjectsAllNotesExpanded = false;
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
    expandDevOpportunitySelect(select, !!keyword);
};

function expandDevOpportunitySelect(select, shouldExpand) {
    if (!select) return;
    const optionCount = Array.from(select.options).filter(option => option.value).length;
    select.size = shouldExpand && optionCount ? Math.min(optionCount + 1, 6) : 0;
}

window.syncExpandedDevProgress = function(devId, source) {
    const slider = document.getElementById(`exp-progress-slider-${devId}`);
    const input = document.getElementById(`exp-progress-${devId}`);
    if (!slider || !input) return;

    const rawValue = source === 'slider' ? slider.value : input.value;
    const value = getDevClampedProgress(rawValue);
    slider.value = value;
    input.value = value;
    syncDevProgressCompletionLock(value, `exp-status-${devId}`, `exp-status-note-${devId}`);
    syncExpandedDevArchiveState(devId, value);
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
        status: isExpandedDevArchiveEnabled(devId) ? DEV_PROJECT_ARCHIVED_STATUS : ((progressValue >= 100 || isExpandedDevArchiveAvailable(devId)) ? DEV_PROJECT_COMPLETED_STATUS : getValue('exp-status')),
        progress: `${progressValue}%`,
        startDate: getValue('exp-startDate'),
        estCompletionDate: getValue('exp-estCompletionDate'),
        dependencies: selectedParentId,
        caseRelationType: getValue('exp-caseRelationType'),
        notes: getValue('exp-notes')
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
    window.__devProjectsExpandedEditId = null;
    window.__devProjectsExpandedNoteId = null;
    window.__devProjectsAllNotesExpanded = false;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.toggleDevProjectsViewMode = function(mode) {
    if (!['case', 'member'].includes(mode)) return;
    window.__devProjectsViewMode = mode;
    window.__devProjectsExpandedEditId = null;
    window.__devProjectsExpandedNoteId = null;
    window.__devProjectsAllNotesExpanded = false;
    if (mode === 'member') {
        window.__isDevActionMode = false;
        window.__devProjectsCreateOpen = false;
    }
    updateDevProjectsViewTabs();
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
};

window.toggleAllDevProjectNotes = function() {
    if (window.__isDevActionMode) return;
    if (!hasAnyDevProjectNotes()) return;
    window.__devProjectsCreateOpen = false;
    window.__devProjectsExpandedEditId = null;
    window.__devProjectsExpandedNoteId = null;
    window.__devProjectsAllNotesExpanded = !window.__devProjectsAllNotesExpanded;
    const container = document.getElementById('internal-ops-dev-projects-content');
    if (container && window.__internalOpsDevProjectsData) {
        container.innerHTML = window.renderDevProjects(window.__internalOpsDevProjectsData);
    }
    ensureDevProjectHeaderControls();
};

window.renderDevProjects = function(data) {
    window.__internalOpsDevProjectsData = data; 
    ensureDevProjectHeaderControls();
    updateDevProjectsViewTabs();

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

    function renderCreateMemberOptions() {
        return `<option value="" selected>${DEV_PROJECT_CREATE_OWNER_PLACEHOLDER}</option>${renderConfigOptions('團隊成員', '')}`;
    }

    function renderExpandedInput(devId, field, value, type = 'text') {
        return `<input id="exp-${field}-${devId}" class="dev-expanded-input" type="${type}" value="${escapeHtml(value || '')}">`;
    }

    function renderExpandedTextarea(devId, field, value) {
        return `<textarea id="exp-${field}-${devId}" class="dev-expanded-input dev-expanded-textarea">${escapeHtml(value || '')}</textarea>`;
    }

    function renderCreateInput(field, value = '', type = 'text') {
        return `<input id="create-${field}" class="dev-expanded-input" type="${type}" value="${escapeHtml(value || '')}">`;
    }

    function renderCreateTextarea(field, value = '') {
        return `<textarea id="create-${field}" class="dev-expanded-input dev-expanded-textarea">${escapeHtml(value || '')}</textarea>`;
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
            <span id="exp-status-note-${devId}" class="dev-progress-lock-note" style="display:${safeValue >= 100 ? 'block' : 'none'};">${DEV_PROJECT_COMPLETED_LOCK_NOTE}</span>
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
            <select id="exp-projectName-${devId}" class="dev-expanded-input" onchange="this.size=0" onblur="this.size=0">
                ${optionParts.join('')}
            </select>
        `;
    }

    function renderCreateOpportunitySelect() {
        const opportunities = window.__internalOpsOpportunities || [];
        return `
            <input id="create-projectSearch" class="dev-expanded-input" type="text" placeholder="搜尋機會名稱或客戶..." oninput="window.filterCreateDevProjectOpportunities()">
            <select id="create-projectName" class="dev-expanded-input" onchange="this.size=0" onblur="this.size=0">
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
        const caseStatusValue = progressValue >= 100 ? DEV_PROJECT_COMPLETED_STATUS : (item.status || item.caseStatus || '');
        const isProgressCompleted = progressValue >= 100;
        const isArchived = (item.status || item.caseStatus || '') === DEV_PROJECT_ARCHIVED_STATUS;
        const showArchiveToggle = isProgressCompleted || isArchived;
        const parentDevIdValue = item.dependencies || item.parentDevId || '';
        const caseRelationTypeValue = item.caseRelationType || '';
        const notesValue = item.notes || '';
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
                                        <div id="exp-archive-wrap-${devId}" class="dev-expanded-archive-wrap" style="display:${showArchiveToggle ? 'flex' : 'none'};">
                                            <label class="dev-archive-check">
                                                <input id="exp-archive-${devId}" type="checkbox" ${isArchived ? 'checked' : ''} data-original-archived="${isArchived ? 'true' : 'false'}">
                                                <span>${DEV_PROJECT_ARCHIVED_GROUP_LABEL}</span>
                                            </label>
                                            <span class="dev-expanded-helper">${DEV_PROJECT_ARCHIVE_HELPER_NOTE}</span>
                                        </div>
                                    </label>
                                    <label class="dev-expanded-field">
                                        <span>案件狀態</span>
                                        <select id="exp-status-${devId}" class="dev-expanded-input" ${isProgressCompleted ? 'disabled' : ''}>${renderConfigOptions('開發狀態', caseStatusValue)}</select>
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
                            <div class="dev-expanded-section dev-expanded-section-notes">
                                <div class="dev-expanded-section-title">備註</div>
                                <label class="dev-expanded-field dev-expanded-notes-field">
                                    <span>備註</span>
                                    ${renderExpandedTextarea(devId, 'notes', notesValue)}
                                </label>
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
                                        <select id="create-assigneeName" class="dev-expanded-input">${renderCreateMemberOptions()}</select>
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
                                        <span id="create-status-note" class="dev-progress-lock-note" style="display:none;">${DEV_PROJECT_COMPLETED_LOCK_NOTE}</span>
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
                            <div class="dev-expanded-section dev-expanded-section-notes">
                                <div class="dev-expanded-section-title">備註</div>
                                <label class="dev-expanded-field dev-expanded-notes-field">
                                    <span>備註</span>
                                    ${renderCreateTextarea('notes')}
                                </label>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    function renderNoteViewerRow(item) {
        const notesText = (item.notes || '').trim();
        if (!notesText) return '';
        const bodyHtml = `<div class="dev-note-viewer-body">${escapeHtml(notesText).replace(/\n/g, '<br>')}</div>`;

        return `
            <tr class="dev-project-note-viewer-row">
                <td colspan="${visibleColumnCount}">
                    <div class="dev-project-note-viewer">
                        <div class="dev-note-viewer-label">備註</div>
                        ${bodyHtml}
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
    const activeItems = data.filter(item => !isDevProjectArchived(item));
    const archivedItems = data.filter(isDevProjectArchived);
    function normalizeSameSectionHierarchyRows(groupedSectionRows, sectionItems) {
        const sectionItemIds = new Set(sectionItems.map(item => item.devId).filter(Boolean));
        return groupedSectionRows.map((item, index) => {
            const parentId = getParentDevId(item);
            const hasSameSectionParent = parentId && sectionItemIds.has(parentId);
            return {
                ...item,
                __displayIndex: index + 1,
                __isChild: hasSameSectionParent ? item.__isChild : false,
                __isOrphan: hasSameSectionParent ? item.__isOrphan : false
            };
        });
    }

    function getCaseGroupValue(item, mode) {
        if (mode === 'category') return item.productCode || item.caseCategory || DEV_PROJECT_UNGROUPED_LABEL;
        if (mode === 'status') return item.status || item.caseStatus || DEV_PROJECT_UNGROUPED_LABEL;
        return DEV_PROJECT_UNGROUPED_LABEL;
    }

    function getCaseGroupSortType(mode) {
        if (mode === 'category') return '\u9032\u5ea6\u6848\u4ef6\u5206\u985e';
        if (mode === 'status') return '\u958b\u767c\u72c0\u614b';
        return '';
    }

    function buildCaseGroupedDisplayRows(items, mode) {
        if (mode === 'none') {
            return normalizeSameSectionHierarchyRows(buildGroupedDevProjectRows(items), items);
        }

        const grouped = new Map();
        items.forEach(item => {
            const groupValue = getCaseGroupValue(item, mode);
            if (!grouped.has(groupValue)) grouped.set(groupValue, []);
            grouped.get(groupValue).push(item);
        });

        const sortType = getCaseGroupSortType(mode);
        const groups = Array.from(grouped.entries()).sort(([a], [b]) => {
            const aOrder = sortType ? getSortOrder(sortType, a) : 9999;
            const bOrder = sortType ? getSortOrder(sortType, b) : 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.localeCompare(b, 'zh-Hant');
        });

        return groups.flatMap(([label, groupItems]) => [
            { __caseGroupSeparator: true, __caseGroupLabel: label },
            ...normalizeSameSectionHierarchyRows(buildGroupedDevProjectRows(groupItems), groupItems)
        ]);
    }

    const activeCaseRows = buildCaseGroupedDisplayRows(activeItems, window.__devProjectsCaseGroupMode || 'none');
    const archivedCaseRows = normalizeSameSectionHierarchyRows(buildGroupedDevProjectRows(archivedItems), archivedItems);

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

    function isDevProjectArchived(item) {
        return (item.status || item.caseStatus || '') === DEV_PROJECT_ARCHIVED_STATUS;
    }

    function renderArchivedSeparatorRow(colspan) {
        return `
            <tr class="dev-archived-separator-row">
                <td colspan="${colspan}"><span>${DEV_PROJECT_ARCHIVED_GROUP_LABEL}</span></td>
            </tr>
        `;
    }

    function renderCaseGroupSeparatorRow(colspan, label) {
        return `
            <tr class="dev-case-group-separator-row">
                <td colspan="${colspan}"><span>${escapeHtml(label)}</span></td>
            </tr>
        `;
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

    function parseCollaborators(text = '') {
        return String(text || '')
            .split(/[｜|、,，]/)
            .map(name => name.trim())
            .filter(Boolean);
    }

    function getConfigNumber(configKeys, valueCandidates, fallback) {
        for (const key of configKeys) {
            const list = Array.isArray(sysConfig[key]) ? sysConfig[key] : [];
            for (const item of list) {
                if (valueCandidates.length && !valueCandidates.includes(item.value) && !valueCandidates.includes(item.note)) continue;
                const numeric = parseFloat(item.note || item.value);
                if (!isNaN(numeric)) return numeric;
            }
        }
        return fallback;
    }

    function getLoadConfigList(configKeys) {
        for (const key of configKeys) {
            if (Array.isArray(sysConfig[key]) && sysConfig[key].length > 0) return sysConfig[key];
        }
        return [];
    }

    function getDevTaskSortValue(item) {
        const dueTime = new Date(item.estCompletionDate || '').getTime();
        if (Number.isFinite(dueTime)) return { hasDue: true, value: dueTime };
        return { hasDue: false, value: -getUpdatedTimeValue(item) };
    }

    function compareDevMemberTasks(a, b) {
        const aSort = getDevTaskSortValue(a);
        const bSort = getDevTaskSortValue(b);
        if (aSort.hasDue !== bSort.hasDue) return aSort.hasDue ? -1 : 1;
        return aSort.value - bSort.value;
    }

    function isDevTaskBehind(item) {
        const theoretical = calculateTheoreticalProgress(item.startDate, item.estCompletionDate);
        if (theoretical === null) return false;
        const actual = parseInt(String(item.progress || '').replace('%', ''), 10) || 0;
        return actual - theoretical <= -10;
    }

    function getDevProgressCueHtml(item) {
        const theoretical = calculateTheoreticalProgress(item.startDate, item.estCompletionDate);
        if (theoretical === null) return '';
        const actual = parseInt(String(item.progress || '').replace('%', ''), 10) || 0;
        const diff = actual - theoretical;
        if (diff <= -10) return '<span class="dev-member-progress-cue is-behind">落後</span>';
        if (diff >= 10) return '<span class="dev-member-progress-cue is-ahead">超前</span>';
        return '';
    }

    function getDevMemberWorkloadConfig() {
        const maxLoad = getConfigNumber(['負荷設定', '工作負荷設定'], ['最大負荷件數', '最大負荷案件數', '最大負荷數', 'maxLoad'], 6);
        const mainWeight = getConfigNumber(['負荷計分', '負荷權重', '工作負荷權重'], ['主負責佔分', '主負責權重', '主負責', 'main'], 1);
        const collabWeight = getConfigNumber(['負荷計分', '負荷權重', '工作負荷權重'], ['協作佔分', '協作權重', '協作', 'collab'], 0.5);
        const statusWeights = {};
        getLoadConfigList(['狀態負荷權重', '案件狀態負荷權重']).forEach(item => {
            const numeric = parseFloat(item.note);
            if (item.value && !isNaN(numeric)) statusWeights[item.value] = numeric;
        });
        const parsedLevels = getLoadConfigList(['負荷量表', '負荷等級', '工作負荷等級'])
            .map(item => ({
                label: item.value || item.note || '',
                threshold: parseFloat(item.note),
                color: item.style || '#616161'
            }))
            .filter(item => !isNaN(item.threshold))
            .sort((a, b) => a.threshold - b.threshold);
        const loadLevels = parsedLevels.length
            ? parsedLevels
            : [
                { label: '負荷低', threshold: 50, color: '#616161' },
                { label: '負荷中', threshold: 83, color: '#616161' },
                { label: '負荷高', threshold: 100, color: '#616161' }
            ];

        return { maxLoad, mainWeight, collabWeight, statusWeights, loadLevels };
    }

    function renderDevMemberWorkloadNote(activeMode) {
        if (activeMode !== 'member') return '';
        const config = getDevMemberWorkloadConfig();
        const formatWeight = (value) => Number.isFinite(value) ? String(Number(value.toFixed(4))) : String(value);
        const positiveWeights = [];
        const zeroWeights = [];

        Object.entries(config.statusWeights || {}).forEach(([status, weight]) => {
            if (weight > 0) {
                positiveWeights.push(`${escapeHtml(status)} ${formatWeight(weight)}`);
            } else if (weight === 0) {
                zeroWeights.push(escapeHtml(status));
            }
        });

        const segments = [
            `最大負荷件數 ${formatWeight(config.maxLoad)}`,
            `角色權重：主負責 ${formatWeight(config.mainWeight)}、協作 ${formatWeight(config.collabWeight)}`
        ];
        if (positiveWeights.length) segments.push(`狀態權重：${positiveWeights.join('、')}`);
        if (zeroWeights.length) segments.push(`不計負荷：${zeroWeights.join('、')}`);

        return `<div class="dev-member-workload-note">人員負荷權重說明：${segments.join('｜')}</div>`;
    }

    function getDevMemberOrder() {
        const list = Array.isArray(sysConfig['團隊成員']) ? sysConfig['團隊成員'] : [];
        const order = new Map();
        list.forEach((item, index) => {
            const name = item.value || item.note || '';
            if (name) order.set(name, item.order ?? index);
        });
        return order;
    }

    function buildDevMemberGroups(items) {
        const groups = new Map();
        const ensureGroup = (member) => {
            const name = member || '未指定';
            if (!groups.has(name)) groups.set(name, { member: name, mainTasks: [], collabTasks: [], loadScore: 0, behindCount: 0 });
            return groups.get(name);
        };

        items.forEach(item => {
            const owner = (item.assigneeName || item.ownerName || '未指定').trim();
            ensureGroup(owner).mainTasks.push(item);
            parseCollaborators(item.collaborators).forEach(member => {
                if (!member || member === owner) return;
                ensureGroup(member).collabTasks.push(item);
            });
        });

        const config = getDevMemberWorkloadConfig();
        const memberOrder = getDevMemberOrder();
        const rows = Array.from(groups.values()).map(group => {
            group.mainTasks.sort(compareDevMemberTasks);
            group.collabTasks.sort(compareDevMemberTasks);
            group.behindCount = [...group.mainTasks, ...group.collabTasks].filter(isDevTaskBehind).length;
            group.loadScore = group.mainTasks.reduce((sum, item) => sum + (config.mainWeight * (config.statusWeights[item.status || item.caseStatus] ?? 1)), 0)
                + group.collabTasks.reduce((sum, item) => sum + (config.collabWeight * (config.statusWeights[item.status || item.caseStatus] ?? 1)), 0);
            group.percentageRaw = config.maxLoad > 0 ? (group.loadScore / config.maxLoad) * 100 : 0;
            const loadLevel = config.loadLevels.find(level => group.percentageRaw <= level.threshold) || config.loadLevels[config.loadLevels.length - 1];
            group.loadLevel = loadLevel || { label: '負荷', color: '#616161' };
            group.memberOrder = memberOrder.has(group.member) ? memberOrder.get(group.member) : 9999;
            return group;
        });

        rows.sort((a, b) => {
            if (b.percentageRaw !== a.percentageRaw) return b.percentageRaw - a.percentageRaw;
            if (b.mainTasks.length !== a.mainTasks.length) return b.mainTasks.length - a.mainTasks.length;
            if (b.collabTasks.length !== a.collabTasks.length) return b.collabTasks.length - a.collabTasks.length;
            if (a.memberOrder !== b.memberOrder) return a.memberOrder - b.memberOrder;
            return a.member.localeCompare(b.member, 'zh-Hant');
        });
        return rows;
    }

    function renderMemberRoleBadge(role) {
        const label = role === 'main' ? '主負責' : '協作';
        const colorSet = window.buildColorSet('#616161');
        return `<span style="display:inline-block; padding:2px 7px; border-radius:5px; font-size:0.75rem; font-weight:600; background:${colorSet.bgLight}; color:${colorSet.text}; border:1px solid ${colorSet.border}; white-space:nowrap;">${label}</span>`;
    }

    function renderMemberModeRow(item, role, displayIndex = '') {
        const progressText = item.progress || '0%';
        const progressCueHtml = getDevProgressCueHtml(item);
        const scheduleText = [item.startDate, item.estCompletionDate].filter(Boolean).join(' → ') || '-';
        const rowClass = role === 'collab' ? ' dev-member-row-collab' : '';
        const canEditMainTask = role === 'main' && Boolean(window.__isDevActionMode);
        const isExpanded = role === 'main' && window.__devProjectsExpandedEditId === item.devId;
        const editableClass = canEditMainTask ? ' is-editable' : '';
        const editableAction = canEditMainTask ? ` onclick="window.toggleExpandedDevProject('${item.devId}')"` : '';
        const rowOpportunityId = item.assigneeCode || item.opportunityId || '';
        const rowOpportunityName = item.projectName || item.opportunityName || '';
        let opportunityHtml = '<span class="internal-ops-muted-badge">-</span>';
        if (rowOpportunityId && rowOpportunityName) {
            opportunityHtml = `<a href="#" title="${escapeHtml(rowOpportunityName)}" class="dev-opportunity-subtle" onclick="event.preventDefault(); window.CRM_APP.navigateTo('opportunity-details', {opportunityId: '${escapeHtml(rowOpportunityId)}'})">${escapeHtml(rowOpportunityName)}</a>`;
        } else if (rowOpportunityName) {
            opportunityHtml = `<span title="${escapeHtml(rowOpportunityName)}" class="dev-opportunity-subtle">${escapeHtml(rowOpportunityName)}</span>`;
        }

        const displayRow = `
            <tr class="dev-member-row${rowClass}">
                <td>${displayIndex ? `${displayIndex}.` : ''}</td>
                <td class="dev-case-name-table-cell" title="${escapeHtml(item.productName || item.caseName || '-')}">
                    <div class="dev-case-name-cell dev-member-case-name${editableClass}"${editableAction}>
                        <span class="dev-child-marker">↳</span>
                        ${renderMemberRoleBadge(role)}
                        <span class="dev-case-name-primary">${escapeHtml(item.productName || item.caseName || '-')}</span>
                    </div>
                </td>
                <td class="dev-category-cell">${renderCategoryBadge(item)}</td>
                <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">${opportunityHtml}</td>
                <td style="font-size: 0.85rem;">${escapeHtml(item.featureName || item.relatedFeature || '-')}</td>
                <td>${getStageBadge(item.devStage || item.caseStage || '-')}</td>
                <td>${getStatusBadge(item.status || item.caseStatus || '-')}</td>
                <td><span class="dev-member-schedule">${escapeHtml(scheduleText)}</span></td>
                <td><span class="dev-member-progress">${escapeHtml(progressText)}</span>${progressCueHtml}</td>
            </tr>
        `;
        if (isExpanded) return displayRow + renderExpandedEditorRow(item);
        return displayRow;
    }

    function renderMemberView(items) {
        const memberGroups = buildDevMemberGroups(items);
        const isDetailExpanded = window.__devProjectsMemberDetailMode === 'expanded';
        if (!memberGroups.length) {
            return '<div class="dev-member-empty">目前沒有可顯示的成員案件</div>';
        }

        return `
            <div class="dev-member-view">
                ${memberGroups.map(group => {
                    const percentText = group.percentageRaw.toFixed(0);
                    const colorSet = window.buildColorSet(group.loadLevel.color || '#616161') || window.buildColorSet('#616161');
                    const activeMainTasks = group.mainTasks.filter(item => !isDevProjectArchived(item));
                    const archivedMainTasks = group.mainTasks.filter(isDevProjectArchived);
                    const activeCollabTasks = group.collabTasks.filter(item => !isDevProjectArchived(item));
                    const archivedCollabTasks = group.collabTasks.filter(isDevProjectArchived);
                    const archivedRows = [
                        ...archivedMainTasks.map((item, index) => renderMemberModeRow(item, 'main', activeMainTasks.length + activeCollabTasks.length + index + 1)),
                        ...archivedCollabTasks.map((item, index) => renderMemberModeRow(item, 'collab', activeMainTasks.length + activeCollabTasks.length + archivedMainTasks.length + index + 1))
                    ].join('');
                    const memberRows = [
                        ...activeMainTasks.map((item, index) => renderMemberModeRow(item, 'main', index + 1)),
                        ...activeCollabTasks.map((item, index) => renderMemberModeRow(item, 'collab', activeMainTasks.length + index + 1)),
                        archivedRows ? renderArchivedSeparatorRow(9) + archivedRows : ''
                    ].join('') || `<tr class="dev-member-empty-row"><td colspan="9">暫無成員案件</td></tr>`;
                    return `
                        <section class="dev-member-section">
                            <div class="dev-member-header">
                                <div class="dev-member-title-line">
                                    <span class="dev-member-name">${escapeHtml(group.member)}</span>
                                    <span style="display:inline-block; padding:2px 7px; border-radius:5px; font-size:0.75rem; font-weight:600; background:${colorSet.bgLight}; color:${colorSet.text}; border:1px solid ${colorSet.border}; white-space:nowrap;">負荷 ${percentText}%</span>
                                    <span class="dev-member-summary">主負責 ${group.mainTasks.length}</span>
                                    <span class="dev-member-summary">協作 ${group.collabTasks.length}</span>
                                    <span class="dev-member-summary">落後 ${group.behindCount}</span>
                                </div>
                            </div>
                            ${isDetailExpanded ? `
                            <table class="internal-ops-table dev-member-table">
                                <colgroup>
                                    <col style="width: 1%;">
                                    <col style="width: 23%;">
                                    <col style="width: 8%;">
                                    <col style="width: 13%;">
                                    <col style="width: 10%;">
                                    <col style="width: 10%;">
                                    <col style="width: 10%;">
                                    <col style="width: 14%;">
                                    <col style="width: 11%;">
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>案件名稱</th>
                                        <th>案件分類</th>
                                        <th>關聯機會</th>
                                        <th>關聯功能</th>
                                        <th>案件階段</th>
                                        <th>案件狀態</th>
                                        <th>開發時程</th>
                                        <th>進度</th>
                                    </tr>
                                </thead>
                                <tbody>${memberRows}</tbody>
                            </table>
                            ` : ''}
                        </section>
                    `;
                }).join('')}
            </div>
        `;
    }

    const createRow = window.__devProjectsCreateOpen ? renderCreateEditorRow() : '';
    const caseRows = archivedCaseRows.length
        ? [...activeCaseRows, { __archivedSeparator: true }, ...archivedCaseRows]
        : activeCaseRows;
    const rows = caseRows.map((item) => {
        if (item.__caseGroupSeparator) return renderCaseGroupSeparatorRow(visibleColumnCount, item.__caseGroupLabel);
        if (item.__archivedSeparator) return renderArchivedSeparatorRow(visibleColumnCount);
        const isExpanded = window.__devProjectsExpandedEditId === item.devId;
        const hasNote = hasDevProjectNotes(item);
        const isNoteExpanded = hasNote && !window.__isDevActionMode && (
            window.__devProjectsAllNotesExpanded ||
            window.__devProjectsExpandedNoteId === item.devId
        );
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
        const rowIndexValue = item.__displayIndex || (item.__isChild ? '' : item.__groupIndex);
        const rowIndexText = rowIndexValue ? `${rowIndexValue}.` : '';
        const childMarker = item.__isChild ? '<span class="dev-child-marker">↳</span>' : '';
        const childClass = item.__isChild ? ' dev-project-child-row' : '';
        const displayRow = `
        <tr class="${childClass}">
            <td>${rowIndexText}</td>
            <td class="dev-case-name-table-cell" title="${caseNameText}">
                <div class="dev-case-name-cell ${item.__isChild ? 'is-child' : ''} ${window.__isDevActionMode ? 'is-editable' : (hasNote ? 'is-viewable' : '')}" onclick="${window.__isDevActionMode ? `window.toggleExpandedDevProject('${item.devId}')` : `window.toggleDevProjectNote('${item.devId}')`}">
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
        if (isExpanded) return displayRow + renderExpandedEditorRow(item);
        if (isNoteExpanded) return displayRow + renderNoteViewerRow(item);
        return displayRow;
    }).join('');

    const getSortIcon = (field) => {
        if (window.__devProjectsSortState.field !== field) return ' ↕';
        return window.__devProjectsSortState.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const activeViewMode = window.__devProjectsViewMode === 'member' ? 'member' : 'case';
    const createTableHtml = createRow
        ? `<table class="internal-ops-table dev-create-table"><tbody>${createRow}</tbody></table>`
        : '';
    const caseTableHtml = `
        <table class="internal-ops-table">
            <colgroup>
                <col style="width: 1%;">
                <col style="width: 20%;">
                <col style="width: 7%;">
                <col style="width: 10%;">
                <col style="width: 8%;">
                <col style="width: 11%;">
                <col style="width: 9%;">
                <col style="width: 9%;">
                <col style="width: 12%;">
                <col style="width: 13%;">
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
    const viewHtml = activeViewMode === 'member'
        ? `${createTableHtml}${renderMemberView(groupedRows)}`
        : caseTableHtml;

    return `
        <style>
            .internal-ops-widget:has(#internal-ops-dev-projects-content) > .internal-ops-header .action-btn {
                display: none;
            }
            .dev-project-expanded-editor-row td {
                background: var(--card-bg);
                padding: 8px 12px 12px;
            }
            .dev-project-note-viewer-row td {
                background: var(--card-bg);
                padding: 4px 12px 10px;
            }
            .dev-project-note-viewer {
                border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
                border-radius: 4px;
                background: color-mix(in srgb, var(--primary-bg) 62%, transparent);
                padding: 7px 9px;
            }
            .dev-note-viewer-label {
                color: var(--text-muted);
                font-size: 0.7rem;
                font-weight: 600;
                line-height: 1;
                margin-bottom: 5px;
            }
            .dev-note-viewer-body {
                color: var(--text-secondary);
                font-size: 0.8rem;
                line-height: 1.45;
                white-space: normal;
                word-break: break-word;
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
            .dev-expanded-section-notes {
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
            .dev-expanded-textarea {
                min-height: 70px;
                resize: vertical;
                line-height: 1.4;
            }
            .dev-expanded-notes-field {
                width: 100%;
            }
            .dev-expanded-helper {
                color: var(--text-muted);
                font-size: 0.68rem;
                line-height: 1.25;
            }
            .dev-progress-lock-note {
                color: var(--text-muted);
                font-size: 0.68rem;
                line-height: 1.35;
                margin-top: 2px;
            }
            .dev-expanded-number {
                width: 72px;
                min-width: 72px;
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
            .dev-expanded-archive-wrap {
                flex-direction: column;
                align-items: flex-start;
                gap: 7px;
                margin-top: 5px;
            }
            .dev-archive-check {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 600;
                line-height: 1.2;
                cursor: pointer;
            }
            .dev-archive-check input {
                width: 14px;
                height: 14px;
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
                background: rgba(30, 58, 138, 0.045);
            }
            .dev-archived-separator-row td {
                background: var(--glass-bg);
                color: var(--text-muted);
                font-size: 0.76rem;
                font-weight: 600;
                padding: 6px 12px;
            }
            .dev-archived-separator-row span {
                display: inline-block;
                border-left: 2px solid var(--border-color);
                padding-left: 8px;
            }
            .dev-case-group-separator-row td {
                background: rgba(88, 28, 135, 0.065);
                color: var(--text-muted);
                font-size: 0.76rem;
                font-weight: 700;
                padding: 6px 12px;
                border-top: 1px solid var(--border-color);
                border-bottom: 1px solid var(--border-color);
            }
            .dev-case-group-separator-row span {
                display: inline-block;
                padding-left: 0;
            }
            .dev-case-name-cell {
                display: flex;
                align-items: center;
                gap: 5px;
                min-width: 0;
            }
            .dev-case-name-cell.is-editable,
            .dev-case-name-cell.is-viewable {
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
            .dev-case-name-cell.is-editable:hover .dev-case-name-primary,
            .dev-case-name-cell.is-viewable:hover .dev-case-name-primary {
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
            .dev-member-workload-note {
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 500;
                line-height: 1.35;
                padding: 8px 12px 0;
                white-space: nowrap;
            }
            .dev-project-control-bar {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                padding: 8px 12px 0;
            }
            .dev-project-count {
                color: var(--text-secondary);
                font-size: 0.9rem;
                font-weight: 500;
                white-space: nowrap;
            }
            .dev-project-toolbar-help {
                color: var(--text-secondary);
                font-size: 0.76rem;
                font-weight: 500;
                margin-right: 0;
                line-height: 1.25;
                white-space: nowrap;
            }
            .dev-project-toolbar-separator {
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 500;
                line-height: 1.25;
                white-space: nowrap;
            }
            .internal-ops-widget:has(#internal-ops-dev-projects-content) > .internal-ops-header {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                flex-wrap: nowrap;
                overflow-x: auto;
                white-space: nowrap;
            }
            .internal-ops-widget:has(#internal-ops-dev-projects-content) > .internal-ops-header .widget-title {
                display: inline-flex !important;
                align-items: center;
                gap: 8px !important;
                flex-wrap: nowrap !important;
                white-space: nowrap;
                flex: 0 0 auto;
            }
            .dev-project-header-controls {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                flex-wrap: nowrap;
                white-space: nowrap;
                margin-left: auto;
                min-width: max-content;
            }
            .dev-project-header-action-group {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                flex-wrap: nowrap;
                white-space: nowrap;
                margin-left: 0;
            }
            .internal-ops-header .dev-project-header-btn,
            .dev-project-view-tab,
            .dev-case-group-btn {
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--card-bg);
                color: var(--text-secondary);
                padding: 3px 8px;
                min-height: 24px;
                height: auto;
                font-size: 0.76rem;
                font-weight: 600;
                line-height: 1.25;
                box-shadow: none;
                transform: none;
                margin: 0;
                cursor: pointer;
                white-space: nowrap;
            }
            .internal-ops-header .dev-project-header-btn:hover,
            .dev-project-view-tab:hover,
            .dev-case-group-btn:hover {
                color: var(--text-primary);
                border-color: color-mix(in srgb, var(--border-color) 70%, var(--text-secondary));
                background: color-mix(in srgb, var(--primary-bg) 68%, transparent);
            }
            .internal-ops-header .dev-project-header-btn.is-active,
            .dev-project-view-tab.is-active,
            .dev-case-group-btn.is-active {
                color: var(--accent-blue, #2563eb);
                border-color: color-mix(in srgb, var(--accent-blue, #2563eb) 28%, var(--border-color));
                background: color-mix(in srgb, var(--accent-blue, #2563eb) 7%, var(--card-bg));
                font-weight: 600;
            }
            .internal-ops-header .dev-project-header-btn.is-danger {
                color: var(--danger-color, #b42318);
                border-color: color-mix(in srgb, var(--danger-color, #b42318) 24%, var(--border-color));
                background: color-mix(in srgb, var(--danger-color, #b42318) 5%, var(--card-bg));
            }
            .internal-ops-header .dev-project-header-btn.is-danger.is-active {
                color: var(--danger-color, #b42318);
                border-color: color-mix(in srgb, var(--danger-color, #b42318) 34%, var(--border-color));
                background: color-mix(in srgb, var(--danger-color, #b42318) 8%, var(--card-bg));
            }
            .internal-ops-header .dev-project-header-btn:disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }
            .dev-case-group-controls {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                flex-wrap: nowrap;
                white-space: nowrap;
                margin-left: 0;
                padding-left: 0;
                border-left: 0;
            }
            .dev-case-group-label {
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 500;
                white-space: nowrap;
            }
            .dev-header-control-label {
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 500;
                white-space: nowrap;
            }
            .dev-header-sort-label {
                color: var(--text-secondary);
                font-size: 0.78rem;
                font-weight: 500;
                white-space: nowrap;
            }
            .dev-project-view-tabs {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                flex-wrap: nowrap;
                white-space: nowrap;
            }
            .dev-member-view {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 0 12px 12px;
            }
            .dev-member-section {
                width: 100%;
                border-top: 1px solid var(--border-color);
                background: transparent;
                padding: 0;
                min-width: 0;
            }
            .dev-member-header {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 10px;
                padding: 8px 0;
                border-bottom: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
                background: transparent;
            }
            .dev-member-title-line {
                display: flex;
                align-items: center;
                gap: 7px;
                flex-wrap: wrap;
                min-width: 0;
            }
            .dev-member-name {
                color: var(--text-primary);
                font-size: 0.92rem;
                font-weight: 700;
                line-height: 1.2;
            }
            .dev-member-summary {
                color: var(--text-muted);
                font-size: 0.74rem;
                line-height: 1.2;
                white-space: nowrap;
            }
            .dev-member-table {
                min-width: 1040px;
                table-layout: fixed;
            }
            .dev-member-table th {
                white-space: nowrap;
            }
            .dev-member-row-collab td {
                color: var(--text-primary);
                background: rgba(67, 56, 202, 0.045);
            }
            .dev-member-row-collab .dev-case-name-primary {
                color: var(--text-primary);
                font-weight: 500;
            }
            .dev-member-case-name {
                display: flex;
                align-items: center;
                gap: 5px;
                min-width: 0;
            }
            .dev-member-progress {
                color: var(--text-secondary);
                font-weight: 600;
                white-space: nowrap;
            }
            .dev-member-progress-cue {
                display: inline-block;
                margin-left: 5px;
                font-size: 0.72rem;
                font-weight: 600;
                white-space: nowrap;
            }
            .dev-member-progress-cue.is-behind {
                color: var(--accent-red);
            }
            .dev-member-progress-cue.is-ahead {
                color: var(--accent-green);
            }
            .dev-member-schedule {
                color: var(--text-muted);
                white-space: nowrap;
            }
            .dev-member-empty-row td {
                color: var(--text-muted);
                font-size: 0.78rem;
                padding: 7px 12px;
            }
            .dev-member-muted,
            .dev-member-empty {
                color: var(--text-muted);
                font-size: 0.78rem;
            }
            .dev-member-empty {
                padding: 16px 12px;
                text-align: center;
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
        ${renderDevMemberWorkloadNote(activeViewMode)}
        <div class="dev-project-control-bar">
            <div class="dev-project-count">共 ${data.length} 筆</div>
        </div>
        ${viewHtml}
    `;
};
