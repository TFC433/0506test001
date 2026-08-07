(function () {
  'use strict';

  const Store = window.AIMStore;
  const root = document.getElementById('aim-root');
  const fieldTypes = [
    ['section_heading', '區段標題'],
    ['information_text', '說明文字'],
    ['short_text', '短文字'],
    ['long_text', '長文字'],
    ['number', '數字'],
    ['yes_no', '是／否'],
    ['single_choice', '單選'],
    ['multiple_choice', '多選'],
    ['dropdown', '下拉選單']
  ];
  const specialDesignerTypes = [
    ['form_thumbnail', '表單縮圖'],
    ['card_link', '名片連結']
  ];
  const choiceFieldTypes = ['single_choice', 'multiple_choice', 'dropdown'];
  const fieldTypeGroups = [
    { label: '版面元件', types: ['section_heading', 'information_text', 'form_thumbnail'] },
    { label: '文字與數值', types: ['short_text', 'long_text', 'number'] },
    { label: '選擇控制', types: ['yes_no', 'single_choice', 'multiple_choice', 'dropdown'] },
    { label: '串聯元件', types: ['card_link'] }
  ];
  const yesNoOptions = ['是', '否'];
  const formalDeferredMessage = 'This module will be connected in a later Activity Intelligence phase.';
  const otherAnswerValue = '其他';

  let state = { activities: [], records: [], selectedActivityId: null };
  let currentUser = null;
  const formBundles = new Map();
  let writeInFlight = false;
  let ui = {
    view: 'overview',
    tab: 'overview',
    selectedActivityId: state.selectedActivityId || (state.activities[0] && state.activities[0].id),
    selectedFieldId: null,
    dialog: null,
    drawer: null,
    toast: '',
    fieldTypePickerOpen: false,
    formDesignMode: 'draft',
    formDesignDraft: null,
    formDesignDraftDirty: false,
    formDesignMessage: '',
    formDesignConfirm: null,
    formPreviewAnswers: {},
    formPreviewCardLinked: false,
    formPreviewCardVariant: 'default',
    quickOtherAnswers: {},
    quickCardLink: { linked: false, variant: 'default' },
    cardPreviewLightboxOpen: false,
    focusQuickFirst: false,
    quickAnswers: {},
    expandedRecords: {
      personal: new Set(),
      all: new Set()
    },
    overview: { q: '', status: 'all', sort: 'name', dir: 'asc' },
    records: {
      scope: 'entry',
      q: '',
      recorder: 'all',
      priority: 'all',
      state: 'normal',
      showVoidRecords: false,
      low: false,
      period: 'all',
      start: '',
      end: '',
      customOpen: false,
      moreOpen: false,
      filterError: ''
    },
    analytics: { recorder: 'all', start: '', end: '', q: '' }
  };

  init();

  async function init() {
    currentUser = resolveFormalCurrentUser();
    if (currentUser.authenticated) {
      try {
        await loadActivitiesFromApi();
      } catch (error) {
        toast(error.message || 'Activity Intelligence load failed.');
      }
    }
    applyRoleLanding();
    render();
  }

  function save() {
    state.selectedActivityId = ui.selectedActivityId;
  }

  function resolveFormalCurrentUser() {
    const token = localStorage.getItem('crm-token') || localStorage.getItem('crmToken') || '';
    const displayName = window.CRM_APP?.currentUser || localStorage.getItem('crmCurrentUserName') || 'CRM User';
    const rawRole = window.CRM_APP?.currentUserRole || localStorage.getItem('crmUserRole') || 'recorder';
    const role = ['super_admin', 'admin', 'recorder'].includes(rawRole) ? rawRole : 'recorder';

    return {
      authenticated: Boolean(token),
      role,
      userId: displayName,
      displayName,
      pictureUrl: '',
      source: 'crm-auth'
    };
  }

  async function loadActivitiesFromApi() {
    const activities = await window.ActivityIntelligenceApi.listActivities();
    state.activities = (activities || []).map(normalizeActivityDto);
    if (!state.activities.some(activity => activity.id === ui.selectedActivityId)) {
      ui.selectedActivityId = state.activities[0] && state.activities[0].id;
    }
    state.selectedActivityId = ui.selectedActivityId || null;
    state.records = [];
  }

  function normalizeActivityDto(activity) {
    return {
      ...activity,
      id: activity.activityId || activity.id,
      name: activity.name || '',
      description: activity.description || '',
      formOpenStart: activity.formOpenStart || '',
      formOpenEnd: activity.formOpenEnd || '',
      exhibitionStart: activity.exhibitionStart || '',
      exhibitionEnd: activity.exhibitionEnd || '',
      formFields: []
    };
  }

  async function loadFormForActivity(activityId) {
    if (!activityId) return null;
    if (formBundles.has(activityId)) return formBundles.get(activityId);
    const form = await window.ActivityIntelligenceApi.getForm(activityId);
    return updateActivityFormBundle(activityId, form);
  }

  function updateActivityFormBundle(activityId, form) {
    const bundle = normalizeFormBundleDto(form);
    formBundles.set(activityId, bundle);
    const activity = state.activities.find(item => item.id === activityId);
    if (activity) {
      activity.formDesignRuntime = bundle;
      activity.formFields = Store.clone((bundle.published && bundle.published.items) || []);
    }
    return bundle;
  }

  function normalizeFormBundleDto(form) {
    return {
      published: normalizeVersionDto(form && form.published),
      draft: normalizeVersionDto(form && form.draft)
    };
  }

  function normalizeVersionDto(version) {
    return {
      versionId: version && version.versionId,
      versionNumber: version && version.versionNumber,
      publishedAt: version && version.publishedAt,
      publishedByUserId: version && version.publishedByUserId,
      publishedByDisplayName: version && version.publishedByDisplayName,
      items: ((version && version.items) || []).map(normalizeDesignerItem)
    };
  }

  function applyRoleLanding() {
    if (!currentUser || !currentUser.authenticated) return;
    if (isRecorder()) {
      const open = openActivities();
      ui.tab = 'records';
      ui.records.scope = 'entry';
      ui.quickAnswers = {};
      if (open.length === 1) {
        ui.selectedActivityId = open[0].id;
        ui.view = 'workspace';
      } else {
        ui.view = open.length > 1 ? 'activityChooser' : 'noOpenActivity';
      }
      return;
    }
    ui.view = 'overview';
    ui.tab = 'overview';
  }

  function isRecorder() {
    return currentUser && currentUser.role === 'recorder';
  }

  function canManageActivities() {
    return currentUser && ['super_admin', 'admin'].includes(currentUser.role);
  }

  function canDesignForm() {
    return currentUser && currentUser.role === 'super_admin';
  }

  function canManageRecords() {
    return canManageActivities();
  }

  function canUseAnalytics() {
    return canManageActivities();
  }

  function canExport() {
    return canManageActivities();
  }

  function openActivities() {
    return state.activities.filter(activity => activityStatus(activity).key === 'open');
  }

  function selectedActivity() {
    const activity = state.activities.find(a => a.id === ui.selectedActivityId) || state.activities[0];
    return activity;
  }

  function activityStatus(activity) {
    return (activity && activity.status) || { key: 'upcoming', label: '尚未開放' };
  }

  function render() {
    if (!currentUser) {
      root.innerHTML = '<div class="aim-loading">正在載入活動情報管理...</div>';
      return;
    }

    if (!currentUser.authenticated) {
      root.innerHTML = shell(renderAuthState());
      bindInputs();
      return;
    }

    let content;
    if (isRecorder()) {
      content = renderRecorderShellContent();
    } else {
      content = ui.view === 'workspace' ? renderWorkspace() : renderOverview();
    }

    root.innerHTML = shell(content);
    bindInputs();
    if (ui.focusQuickFirst) {
      ui.focusQuickFirst = false;
      window.setTimeout(() => {
        const first = document.querySelector('.aim-quick-input:not([disabled])');
        if (first) first.focus();
      }, 0);
    }
  }

  function shell(content) {
    return `
      <div class="aim-shell">
        ${renderSidebar()}
        <div class="aim-app-column">
          <header class="aim-topbar">
            ${renderBreadcrumb()}
            <div class="aim-topbar-actions">
              ${renderPreviewControl()}
              ${renderUserIdentity()}
            </div>
          </header>
          <main class="aim-main">
            ${renderPageHeader()}
            <div class="aim-page-content">${content}</div>
          </main>
        </div>
      </div>
      ${renderDialog()}
      ${renderDrawer()}
      ${renderFormDesignConfirmDialog()}
      ${renderCardPreviewLightbox()}
      ${ui.toast ? `<div class="aim-toast" role="status">${Store.escapeHtml(ui.toast)}</div>` : ''}
    `;
  }

  function productRoleLabel(role) {
    return {
      super_admin: '最高管理者',
      admin: '管理者',
      recorder: '紀錄者'
    }[role] || '尚未取得角色';
  }

  function activeModule() {
    if (ui.view !== 'workspace') return isRecorder() ? 'records' : 'all';
    return isRecorder() ? 'records' : ui.tab;
  }

  function moduleLabel(key) {
    return {
      all: '所有活動',
      overview: '活動概況',
      form: '表單設計',
      records: '表單紀錄',
      analytics: '數據分析',
      settings: '活動設定'
    }[key] || '活動情報管理';
  }

  function moduleDescription(key) {
    return {
      overview: '掌握活動狀態、紀錄進度與近期更新。',
      form: '設定現場紀錄所需的欄位與填寫規則。',
      records: '新增、查詢與管理目前活動的表單紀錄。',
      analytics: '依紀錄內容與人員分布查看活動洞察。',
      settings: '管理活動名稱、日期與活動註解。'
    }[key] || '';
  }

  function renderSidebar() {
    const activity = selectedActivity();
    const active = activeModule();
    const activityNav = ui.view === 'workspace' && activity;
    return `
      <aside class="aim-sidebar" aria-label="主要導覽">
        <div class="aim-product-brand">
          <img class="aim-brand-logo" src="../images/logo-full.svg" alt="FANUC force">
          <strong class="aim-product-title">活動情報管理</strong>
        </div>
        <nav class="aim-sidebar-nav">
          ${canManageActivities() ? `
            <div class="aim-nav-group">
              <span class="aim-nav-label">活動管理</span>
              ${sidebarButton('all', '所有活動', active === 'all')}
            </div>
          ` : ''}
          ${currentUser.authenticated && isRecorder() ? renderRecorderSidebarGroup(activityNav ? activity : null) : ''}
          ${activityNav && canManageActivities() ? `
            <div class="aim-nav-group aim-activity-nav-group">
              <span class="aim-nav-label">目前活動</span>
              <div class="aim-sidebar-context" title="${Store.escapeHtml(activity.name)}">
                <strong>${Store.escapeHtml(activity.name)}</strong>
                ${renderSidebarExhibitionPeriod(activity)}
              </div>
              ${sidebarTab('overview', '活動概況', active === 'overview')}
              ${canDesignForm() ? sidebarTab('form', '表單設計', active === 'form') : ''}
              ${sidebarTab('records', '表單紀錄', active === 'records')}
              ${canUseAnalytics() ? sidebarTab('analytics', '數據分析', active === 'analytics') : ''}

            </div>
          ` : ''}
        </nav>
        <div class="aim-sidebar-foot">
          <span>${currentUser.authenticated ? productRoleLabel(currentUser.role) : '未登入'}</span>
          <small>Activity Intelligence</small>
        </div>
      </aside>
    `;
  }

  function sidebarButton(action, label, active) {
    return `<button class="aim-nav-item" type="button" data-action="${action}" aria-current="${active ? 'page' : 'false'}"><span>${Store.escapeHtml(label)}</span></button>`;
  }

  function sidebarTab(tabName, label, active) {
    return `<button class="aim-nav-item" type="button" data-action="tab" data-tab="${tabName}" aria-current="${active ? 'page' : 'false'}"><span>${Store.escapeHtml(label)}</span></button>`;
  }

  function renderRecorderSidebarGroup(activity) {
    return `
      <div class="aim-nav-group aim-activity-nav-group">
        <span class="aim-nav-label">${activity ? '目前活動' : '活動管理'}</span>
        ${activity ? `<div class="aim-sidebar-context" title="${Store.escapeHtml(activity.name)}"><strong>${Store.escapeHtml(activity.name)}</strong>${renderSidebarExhibitionPeriod(activity)}</div>` : ''}
        <div class="aim-nav-item aim-nav-item-static" aria-current="page"><span>表單紀錄</span></div>
      </div>
    `;
  }

  function renderSidebarExhibitionPeriod(activity) {
    if (!activity || !activity.exhibitionStart || !activity.exhibitionEnd) return '';
    return `<span class="aim-sidebar-period"><span>展覽期間：</span><span>${Store.formatDate(activity.exhibitionStart)} ～</span><span>${Store.formatDate(activity.exhibitionEnd)}</span></span>`;
  }

  function renderBreadcrumb() {
    const activity = selectedActivity();
    const items = [];
    if (!currentUser.authenticated) items.push('活動情報管理');
    else if (isRecorder()) {
      if (ui.view === 'workspace' && activity) items.push(activity.name);
      items.push('表單紀錄');
    } else {
      items.push('所有活動');
      if (ui.view === 'workspace' && activity) {
        items.push(activity.name);
        items.push(moduleLabel(activeModule()));
      }
    }
    return `<nav class="aim-breadcrumb" aria-label="麵包屑">${items.map((item, index) => `<span${index === items.length - 1 ? ' aria-current="page"' : ''}>${Store.escapeHtml(item)}</span>`).join('<b aria-hidden="true">/</b>')}</nav>`;
  }

  function safePictureUrl(value) {
    if (!value) return '';
    try {
      const parsed = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (error) {
      return '';
    }
  }

  function userInitials() {
    const name = String(currentUser.displayName || currentUser.userId || 'TFC').trim();
    return Array.from(name).slice(0, 2).join('').toUpperCase();
  }

  function renderUserIdentity() {
    const picture = safePictureUrl(currentUser.pictureUrl);
    const name = currentUser.displayName || currentUser.userId || '未登入使用者';
    return `
      <div class="aim-user" aria-label="目前使用者">
        <span class="aim-avatar" aria-hidden="true">
          <span>${Store.escapeHtml(userInitials())}</span>
          ${picture ? `<img src="${Store.escapeHtml(picture)}" alt="">` : ''}
        </span>
        <span class="aim-user-copy">
          <strong title="${Store.escapeHtml(name)}">${Store.escapeHtml(name)}</strong>
          <small>${Store.escapeHtml(currentUser.authenticated ? productRoleLabel(currentUser.role) : '尚未取得角色')}</small>
        </span>
      </div>
    `;
  }

  function renderPageHeader() {
    const activity = selectedActivity();
    if (!currentUser.authenticated) {
      return `<header class="aim-page-header"><div><h1>活動情報管理</h1><p>請先取得有效的使用者角色。</p></div></header>`;
    }
    if (ui.view === 'overview') {
      return `
        <header class="aim-page-header">
          <div><h1>所有活動</h1><p>管理活動、開放期間、表單紀錄與分析。</p></div>
          <button class="aim-button aim-button-primary" type="button" data-action="new-activity">建立活動</button>
        </header>
      `;
    }
    if (ui.view === 'activityChooser') {
      return `<header class="aim-page-header"><div><h1>選擇開放中的活動</h1><p>目前有多個活動開放填寫，請選擇要紀錄的活動。</p></div></header>`;
    }
    if (ui.view === 'noOpenActivity') {
      return `<header class="aim-page-header"><div><h1>表單紀錄</h1><p>目前沒有可填寫的活動。</p></div></header>`;
    }
    if (!activity) return '';
    const status = activityStatus(activity);
    const module = activeModule();
    const showSettingsButton = canManageActivities() && ui.tab === 'overview';
    return `
      <header class="aim-page-header aim-activity-page-header">
        <div class="aim-activity-identity">
          <div class="aim-activity-title-row"><h1>${Store.escapeHtml(activity.name)}</h1>${statusPill(status)}<span class="aim-form-period">表單開放：${Store.escapeHtml(formatHeaderDateRange(activity.formOpenStart, activity.formOpenEnd, true))}</span></div>
          ${headerExhibitionSubtitle(activity) ? `<p class="aim-exhibition-subtitle">${Store.escapeHtml(headerExhibitionSubtitle(activity))}</p>` : ''}
        </div>
        ${showSettingsButton ? '<button class="aim-button aim-button-settings aim-header-settings-button" type="button" data-action="settings">活動設定</button>' : ''}
        <div class="aim-module-heading"><span>目前模組</span><h2>${moduleLabel(module)}</h2><p>${moduleDescription(module)}</p></div>
      </header>
    `;
  }

  function formatHeaderDateRange(start, end, compactSameMonth) {
    const startText = Store.formatDate(start);
    const endText = Store.formatDate(end);
    if (!startText || !endText) return startText || endText;
    if (compactSameMonth && String(start).slice(0, 7) === String(end).slice(0, 7)) return `${startText} ～ ${String(end).slice(8, 10)}`;
    return `${startText} ～ ${endText}`;
  }

  function headerExhibitionSubtitle(activity) {
    if (!activity.exhibitionStart && !activity.exhibitionEnd) return '';
    if (activity.exhibitionStart === activity.exhibitionEnd) return `展覽日期：${Store.formatDate(activity.exhibitionStart)}`;
    return `展覽期間：${formatHeaderDateRange(activity.exhibitionStart, activity.exhibitionEnd, false)}`;
  }

  function renderPreviewControl() {
    return '';
  }


  function renderAuthState() {
    return `
      <section class="aim-empty">
        <h2>尚未取得實際白名單角色</h2>
        <p>${Store.escapeHtml(currentUser.message || '請先建立有效的 LINE 工作階段。')}</p>
        ${Store.isLocalhost() ? '<p class="aim-small">本機審查仍可透過頁首角色預覽選單檢視三種角色，但「實際白名單角色」不會被偽裝。</p>' : ''}
      </section>
    `;
  }

  function renderRecorderShellContent() {
    if (ui.view === 'activityChooser') return renderActivityChooser();
    if (ui.view === 'noOpenActivity') return renderNoOpenActivity();
    return renderWorkspace();
  }

  function renderActivityChooser() {
    const rows = openActivities();
    return `
      <section>
        <div class="aim-activity-chooser">
          ${rows.map(activity => `
            <button class="aim-chooser-row" type="button" data-action="recorder-open" data-id="${activity.id}">
              <strong>${Store.escapeHtml(activity.name)}</strong>
              <span>${Store.formatDate(activity.formOpenStart)} - ${Store.formatDate(activity.formOpenEnd)}</span>
              ${Store.activitySubtitle(activity) ? `<span>${Store.escapeHtml(Store.activitySubtitle(activity))}</span>` : ''}
              ${statusPill(activityStatus(activity))}
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderNoOpenActivity() {
    return `
      <section class="aim-empty">
        <h2>目前沒有開放中的活動</h2>
        <p>請等待管理員開放活動表單後再新增紀錄。</p>
      </section>
    `;
  }

  function renderOverview() {
    const rows = filteredActivities();
    const kpis = overviewKpis();
    return `
      <section>
        <div class="aim-kpi-grid">
          <div class="aim-kpi"><span>活動總數</span><strong>${state.activities.length}</strong></div>
          <div class="aim-kpi"><span>開放中</span><strong>${kpis.open}</strong></div>
          <div class="aim-kpi"><span>有效情報紀錄</span><strong>${kpis.activeRecords}</strong></div>
          <div class="aim-kpi"><span>今日新增</span><strong>${kpis.today}</strong></div>
        </div>
        <div class="aim-content-card aim-activity-list-card">
          <div class="aim-content-card-head"><div><h2>活動清單</h2><p>${rows.length} 個符合目前條件的活動</p></div></div>
          <div class="aim-toolbar" role="search">
            <input class="aim-input" id="aim-overview-q" value="${Store.escapeHtml(ui.overview.q)}" placeholder="搜尋活動" aria-label="搜尋活動">
            <select class="aim-select" id="aim-overview-status" aria-label="活動狀態">
              ${option('all', '全部狀態', ui.overview.status)}
              ${option('upcoming', '尚未開放', ui.overview.status)}
              ${option('open', '開放中', ui.overview.status)}
              ${option('ended', '已結束', ui.overview.status)}
            </select>
            <span></span>
            <button class="aim-button" type="button" data-action="clear-overview">清除篩選</button>
          </div>
          <div class="aim-table-wrap">
            <table class="aim-table">
            <thead>
              <tr>
                ${th('name', '活動名稱')}
                <th>活動註解</th>
                ${th('formOpenStart', '表單開放期間')}
                ${th('status', '狀態')}
                ${th('total', '情報總數')}
                ${th('today', '今日新增')}
                ${th('lastRecord', '最近紀錄')}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(renderActivityRow).join('') || '<tr><td colspan="8"><div class="aim-empty">沒有符合篩選條件的活動。</div></td></tr>'}
            </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function th(key, label) {
    const mark = ui.overview.sort === key ? (ui.overview.dir === 'asc' ? ' ^' : ' v') : '';
    return `<th><button class="aim-sort" data-action="sort" data-key="${key}" type="button">${label}${mark}</button></th>`;
  }

  function renderActivityRow(activity) {
    const metrics = activityMetrics(activity.id);
    const status = activityStatus(activity);
    const subtitle = Store.activitySubtitle(activity);
    const note = activity.description || '';
    return `
      <tr>
        <td class="aim-activity-name-cell">
          <button class="aim-activity-link" type="button" data-action="open" data-id="${activity.id}">${Store.escapeHtml(activity.name)}</button>
          ${subtitle ? `<span class="aim-activity-subtitle">${Store.escapeHtml(subtitle)}</span>` : ''}
        </td>
        <td><span class="aim-note-clamp" title="${Store.escapeHtml(note)}">${note ? Store.escapeHtml(note) : '<span class="aim-muted-dash">—</span>'}</span></td>
        <td>${formatCompactDateRange(activity.formOpenStart, activity.formOpenEnd)}</td>
        <td>${statusPill(status)}</td>
        <td>${metrics.total}</td>
        <td>${metrics.today}</td>
        <td>${metrics.lastRecord ? Store.formatDateTime(metrics.lastRecord) : '<span class="aim-muted-dash">—</span>'}</td>
        <td>
          <div class="aim-actions">
            <button class="aim-button" type="button" data-action="duplicate" data-id="${activity.id}">複製活動</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderWorkspace() {
    const activity = selectedActivity();
    if (!activity) return canManageActivities() ? renderOverview() : renderNoOpenActivity();
    return `
      <section>
        ${renderTab(activity)}
      </section>
    `;
  }

  function renderTab(activity) {
    if (ui.tab === 'form' && canDesignForm()) return renderForm(activity);
    if (ui.tab === 'records') return renderRecordsWorkspace(activity);
    if (ui.tab === 'analytics' && canUseAnalytics()) return renderAnalytics(activity);
    return renderActivityOverview(activity);
  }

  function renderDeferredModule() {
    return `
      <section class="aim-empty aim-deferred-module">
        <h2>Activity Intelligence</h2>
        <p>${Store.escapeHtml(formalDeferredMessage)}</p>
      </section>
    `;
  }

  function renderActivityOverview(activity) {
    const metrics = activityMetrics(activity.id);
    const status = activityStatus(activity);
    const latest = recordsFor(activity.id).filter(r => r.status !== 'void').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    return `
      <div class="aim-grid-2">
        <div>
          <div class="aim-kpi-grid">
            <div class="aim-kpi"><span>狀態</span><strong style="font-size:19px">${status.label}</strong></div>
            <div class="aim-kpi"><span>今日新增</span><strong>${metrics.today}</strong></div>
            <div class="aim-kpi"><span>有效情報紀錄</span><strong>${metrics.active}</strong></div>
            <div class="aim-kpi"><span>紀錄者數</span><strong>${metrics.recorders}</strong></div>
          </div>
          <div class="aim-grid-2 aim-overview-summary-grid">
            <div class="aim-panel"><h3>表單狀態</h3><dl class="aim-definition-list"><dt>欄位數</dt><dd>${activity.formFields.filter(f => !f.retired).length}</dd><dt>可填寫狀態</dt><dd>${formState(status.key)}</dd></dl></div>
            <div class="aim-panel"><h3>追蹤品質</h3><dl class="aim-definition-list"><dt>高優先</dt><dd>${metrics.high}</dd><dt>低完整度</dt><dd>${metrics.low}</dd></dl></div>
          </div>
          <div class="aim-panel aim-activity-note-panel"><h3>活動註解</h3><p>${activity.description ? Store.escapeHtml(activity.description) : '<span class="aim-muted-dash">—</span>'}</p></div>
        </div>
        <div class="aim-panel">
          <h3>最近紀錄</h3>
          <div class="aim-latest-list">${latest.map(r => `<button class="aim-latest-item" data-action="open-record-inline" data-id="${r.id}" type="button" style="text-align:left"><strong>${Store.escapeHtml(Store.recordSummary(r))}</strong><span class="aim-small">${Store.formatDateTime(r.createdAt)}，${Store.escapeHtml(r.createdByDisplayName)} 建立</span></button>`).join('') || '<div class="aim-empty">目前沒有有效紀錄。</div>'}</div>
        </div>
      </div>
    `;
  }

  function renderRecordsWorkspace(activity) {
    return renderDeferredModule();
    if (!['entry', 'all'].includes(ui.records.scope)) ui.records.scope = 'entry';
    return `
      ${renderRecordScopeSwitch()}
      ${ui.records.scope === 'entry' ? renderQuickEntry(activity) : renderRecords(activity, ui.records.scope)}
    `;
  }

  function renderQuickEntry(activity) {
    const status = activityStatus(activity);
    const open = status.key === 'open';
    const personalRecords = visiblePersonalRecords(activity.id);
    return `
      ${!open ? '<div class="aim-warning">表單目前未開放，無法新增紀錄。</div>' : ''}
      <div class="aim-entry-layout">
        <div class="aim-panel aim-entry-form">
          <div class="aim-panel-title-row">
            <h2>新增紀錄</h2>
          </div>
          <div class="aim-answer-list">
            ${quickEntryFields(activity).map(field => renderQuickField(field, open)).join('')}
          </div>
          <div class="aim-entry-save-actions">
            <button class="aim-button aim-button-primary" data-action="quick-save-next" ${open ? '' : 'disabled'} type="button">儲存並繼續新增</button>
          </div>
        </div>
        <aside class="aim-panel aim-entry-context aim-personal-records" aria-live="polite">
          <div class="aim-personal-records-head">
            <div><h2>我的紀錄</h2><span class="aim-personal-record-count">${personalRecords.length} 筆</span></div>
            <div class="aim-personal-records-tools">
              ${renderVoidRecordsToggle('personal')}
              ${renderExpansionToggle('personal', personalRecords)}
            </div>
          </div>
          <div class="aim-latest-list aim-personal-record-list aim-record-card-list aim-record-card-list-personal">${personalRecords.map(record => renderRecordCard(record, activity, 'personal')).join('') || '<div class="aim-empty">目前尚無我的紀錄。</div>'}</div>
        </aside>
      </div>
    `;
  }

  function renderRecordCard(record, activity, context) {
    const expanded = ui.expandedRecords[context].has(record.id) && canViewRecord(record, activity);
    const preview = recordPreview(record, activity);
    const coverage = recordCoverage(record, activity);
    return `
      <article class="aim-latest-item aim-record-card aim-record-card-${context} ${record.status === 'void' ? 'aim-record-card-void' : ''}">
        <div class="aim-record-card-summary">
          <div class="aim-record-card-copy">
            ${renderRecordCardMeta(record, activity, coverage)}
            <div class="aim-record-card-identity-row">
              <div class="aim-record-card-primary">
                <strong class="${preview.customer ? '' : 'aim-missing-name'}">${Store.escapeHtml(preview.customer || '未填姓名')}</strong>
                ${preview.company ? `<span class="aim-record-card-company">${Store.escapeHtml(preview.company)}</span>` : ''}
                ${preview.priority ? priorityPill(preview.priority) : ''}
              </div>
            </div>
            ${renderRecordPreviewContent(preview, context)}
          </div>
          <div class="aim-record-card-right-rail">
            ${renderRecordReviewActions(record, activity, context, expanded)}
            <div class="aim-record-card-biz-slot" aria-hidden="true">未連結名片</div>
          </div>
        </div>
        ${expanded ? renderInlineRecordDetail(record, activity) : ''}
      </article>
    `;
  }

  function renderRecordCardMeta(record, activity, coverage) {
    const answered = coverage.answered;
    const total = coverage.total;
    const barWidth = total > 0 ? Math.round(answered / total * 36) : 0;
    const pct = coverage.percent;
    const barColor = pct >= 70 ? '#15803d' : pct >= 40 ? '#b45309' : '#b42318';
    const completenessHtml = `<span class="aim-record-card-completeness" title="欄位完整度 ${answered}/${total}"><span class="aim-record-card-completeness-label">完整度</span><span class="aim-record-card-completeness-count">${answered}/${total}</span><span class="aim-record-card-completeness-bar" style="--bar-w:${barWidth}px;--bar-color:${barColor}" aria-hidden="true"></span></span>`;
    return `<div class="aim-record-card-meta">
      <span>${Store.escapeHtml(activity.name)}</span>
      <span>${Store.escapeHtml(record.createdByDisplayName)}</span>
      <span>${Store.formatDateTime(record.createdAt)}</span>
      ${record.status === 'void' ? '<span class="aim-pill aim-pill-void">已作廢</span>' : ''}
      ${completenessHtml}
    </div>`;
  }

  function renderExpansionToggle(context, records) {
    if (!records.length) return '';
    const allExpanded = records.every(record => ui.expandedRecords[context].has(record.id));
    return `<div class="aim-expansion-controls"><button class="aim-button" data-action="toggle-all-records" data-context="${context}" type="button">${allExpanded ? '全部收合' : '全部展開'}</button></div>`;
  }

  function renderVoidRecordsToggle(context) {
    return `<label class="aim-checkbox aim-show-void-records"><input class="aim-show-void-records-input" data-context="${context}" type="checkbox" ${ui.records.showVoidRecords ? 'checked' : ''}> 顯示作廢紀錄</label>`;
  }

  function renderInlineRecordDetail(record, activity) {
    if (!canViewRecord(record, activity)) return '';
    const items = snapshotRecordItems(record, activity);
    const questionCards = items.map(item => renderRecordDetailItem(item, record)).join('');
    return `
      <div class="aim-inline-record-detail">
        <div class="aim-record-detail-tree">
          <section class="aim-inline-record-meta-card" aria-label="紀錄資訊">
            <dl class="aim-inline-record-meta">
              <div><dt>活動</dt><dd>${Store.escapeHtml(activity.name)}</dd></div>
              <div><dt>紀錄者</dt><dd>${Store.escapeHtml(record.createdByDisplayName)}</dd></div>
              <div><dt>建立時間</dt><dd>${Store.formatDateTime(record.createdAt)}</dd></div>
              <div><dt>最近更新</dt><dd>${Store.formatDateTime(record.updatedAt)}，${Store.escapeHtml(record.updatedByDisplayName)}</dd></div>
              ${record.status === 'void' ? '<div><dt>狀態</dt><dd><span class="aim-pill aim-pill-void">已作廢</span></dd></div>' : ''}
            </dl>
          </section>
          <div class="aim-record-question-list">${questionCards || '<p class="aim-inline-record-empty">此紀錄沒有已填寫的內容。</p>'}</div>
        </div>
      </div>
    `;
  }

  function renderRecordDetailItem(item, record) {
    if (item.type === 'section_heading') return `<section class="aim-record-detail-section"><h3>${Store.escapeHtml(item.title)}</h3>${item.helperText ? `<p>${Store.escapeHtml(item.helperText)}</p>` : ''}</section>`;
    if (item.type === 'information_text') return `<section class="aim-record-detail-info"><h3>${Store.escapeHtml(item.title)}</h3>${item.helperText ? `<p>${Store.escapeHtml(item.helperText)}</p>` : ''}</section>`;
    if (item.type === 'form_thumbnail') return `<section class="aim-record-detail-component">${renderFormThumbnailPreview(item)}</section>`;
    if (item.type === 'card_link') {
      const cardLink = cardLinkForRecord(record);
      if (!cardLink.linked) return '';
      return `<section class="aim-record-detail-component">${renderRuntimeCardLink(item, false, cardLink, 'detail')}</section>`;
    }
    const value = displayAnswerValue(item, record.answers[item.fieldId], otherAnswersForRecord(record));
    if (!hasValue(value)) return '';
    return renderRecordQuestionCard(item, value);
  }

  function renderRecordReviewActions(record, activity, context, expanded) {
    const toggle = `<button class="aim-button" data-action="toggle-record-expansion" data-context="${context}" data-id="${record.id}" aria-expanded="${expanded}" type="button">${expanded ? '收合' : '查看'}</button>`;
    if (!expanded) return `<div class="aim-record-actions">${toggle}</div>`;
    const edit = canOpenRecordDrawer(record, activity) ? `<button class="aim-button" data-action="edit-record" data-id="${record.id}" type="button">編輯</button>` : '';
    return `<div class="aim-record-actions">${toggle}${edit}</div>`;
  }

  function isChoiceField(field) {
    return ['yes_no', 'single_choice', 'multiple_choice', 'dropdown', 'boolean', 'checkbox', 'toggle'].includes(field.type);
  }

  function quickEntryFields(activity) {
    return publishedRecordItems(activity);
  }

  function legacyQuickEntryFields(activity) {
    const fields = activity.formFields.filter(field => field.visible && !field.retired);
    if (fields[0] && fields[0].type === 'section_heading' && fields[0].title === '基本資訊') return fields.slice(1);
    return fields;
  }

  function recordEditFields(activity) {
    const fields = activity.formFields.filter(field => field.visible || field.retired);
    if (fields[0] && fields[0].type === 'section_heading' && fields[0].title === '基本資訊') return fields.slice(1);
    return fields;
  }

  function publishedRecordItems(activity) {
    const design = formDesign(activity);
    return Store.clone(design.published.items || []).map(normalizeDesignerItem).filter(item => item.visible !== false && !item.retired && !item.removedInDraft);
  }

  function answerProducingItems(items) {
    return (items || []).filter(item => ['short_text', 'long_text', 'number', 'yes_no', 'single_choice', 'multiple_choice', 'dropdown'].includes(item.type));
  }

  function snapshotRecordItems(record, activity) {
    if (record && record.formRuntimeSnapshot && Array.isArray(record.formRuntimeSnapshot.items)) {
      return record.formRuntimeSnapshot.items.map(normalizeDesignerItem);
    }
    return recordEditFields(activity);
  }

  function otherAnswersForRecord(record) {
    return record && record.runtimeOtherAnswers ? record.runtimeOtherAnswers : {};
  }

  function cardLinkForRecord(record) {
    return record && record.runtimeCardLink ? record.runtimeCardLink : { linked: false, variant: 'default' };
  }

  function displayAnswerValue(field, value, otherAnswers) {
    if (!field || !otherAnswers || !hasValue(otherAnswers[field.fieldId])) return value;
    if (Array.isArray(value)) return value.map(item => item === otherAnswerValue ? `${otherAnswerValue}：${otherAnswers[field.fieldId]}` : item);
    return value === otherAnswerValue ? `${otherAnswerValue}：${otherAnswers[field.fieldId]}` : value;
  }

  function recordPreview(record, activity) {
    const fields = answerProducingItems(snapshotRecordItems(record, activity)).filter(field => hasValue(record.answers[field.fieldId]));
    const otherAnswers = otherAnswersForRecord(record);
    const customerField = fields.find(field => field.fieldId === 'fld_customer_name') || fields.find(field => /客戶|受訪者|姓名/.test(field.title));
    const companyField = fields.find(field => field.fieldId === 'fld_company') || fields.find(field => /公司|企業|組織/.test(field.title));
    const priorityField = fields.find(field => field.fieldId === 'fld_priority') || fields.find(field => /優先/.test(field.title));
    const badgeGroups = [];
    fields.filter(field => isChoiceField(field) && field !== priorityField).forEach(field => {
      const values = categoricalValues(displayAnswerValue(field, record.answers[field.fieldId], otherAnswers));
      if (values.length) badgeGroups.push({ field, values });
    });
    const textField = fields.find(field => field.type === 'long_text');
    return {
      customer: customerField ? Store.answerText(displayAnswerValue(customerField, record.answers[customerField.fieldId], otherAnswers)) : '',
      company: companyField ? Store.answerText(displayAnswerValue(companyField, record.answers[companyField.fieldId], otherAnswers)) : '',
      priority: priorityField ? Store.answerText(displayAnswerValue(priorityField, record.answers[priorityField.fieldId], otherAnswers)) : '',
      badgeGroups,
      text: textField ? { label: textField.title, value: Store.answerText(displayAnswerValue(textField, record.answers[textField.fieldId], otherAnswers)) } : null
    };
  }

  function categoricalValues(value) {
    const values = Array.isArray(value) ? value : [typeof value === 'boolean' ? (value ? '是' : '否') : value];
    return values.filter(hasValue);
  }

  function answerBadgeClass(field, value) {
    if (field.fieldId !== 'fld_priority') return '';
    if (value === '高') return ' aim-answer-badge-high';
    if (value === '中') return ' aim-answer-badge-medium';
    if (value === '低') return ' aim-answer-badge-low';
    return ' aim-answer-badge-neutral';
  }

  function renderCategoricalBadges(field, value, limit) {
    return categoricalValues(value).slice(0, limit || Number.MAX_SAFE_INTEGER).map(item => `<span class="aim-answer-badge${answerBadgeClass(field, item)}">${Store.escapeHtml(item)}</span>`).join('');
  }

  function renderRecordPreviewContent(preview, context) {
    const groups = preview.badgeGroups || [];
    const nonEmptyGroups = groups.filter(g => g.values && g.values.length > 0);
    let badgesHtml = '';
    nonEmptyGroups.forEach((group, groupIndex) => {
      if (groupIndex > 0) {
        badgesHtml += '<span class="aim-preview-sep" data-preview-sep aria-hidden="true">|</span>';
      }
      group.values.forEach(value => {
        badgesHtml += `<span class="aim-answer-badge" data-preview-badge>${Store.escapeHtml(value)}</span>`;
      });
    });
    const badgeLine = badgesHtml ? `<div class="aim-record-preview-badges" data-preview-badges>${badgesHtml}<span class="aim-answer-badge aim-preview-overflow-badge" data-preview-overflow hidden>+0</span></div>` : '';
    const text = preview.text ? `<p class="aim-record-preview-text"><span>${Store.escapeHtml(preview.text.label)}：</span>${Store.escapeHtml(preview.text.value)}</p>` : '';
    if (!badgeLine && !text) return '';
    return `<div class="aim-record-preview-content aim-record-preview-content-${context}">${badgeLine}${text}</div>`;
  }

  function renderRecordQuestionCard(field, value) {
    const choice = isChoiceField(field);
    const longText = field.type === 'long_text';
    const answer = choice ? `<div class="aim-answer-badges">${renderCategoricalBadges(field, value)}</div>` : `<div class="aim-record-question-answer">${Store.escapeHtml(Store.answerText(value))}</div>`;
    return `<section class="aim-record-question-card aim-record-question-${recordQuestionCardSize(field, value)}${choice ? ' aim-record-question-choice' : ''}${longText ? ' aim-record-question-long' : ''}"><h3>${Store.escapeHtml(field.title)}</h3>${answer}</section>`;
  }

  function recordQuestionCardSize(field, value) {
    const answer = Store.answerText(value);
    if (field.type === 'long_text') return 'full';
    if (field.type === 'multiple_choice' || categoricalValues(value).length > 2 || answer.length > 60) return 'wide';
    if (field.type === 'number' || ['boolean', 'checkbox', 'toggle', 'single_choice', 'dropdown'].includes(field.type)) return 'compact';
    if (answer.length > 32) return 'wide';
    return 'standard';
  }

  function renderQuickField(field, enabled) {
    if (field.type === 'section_heading') return `<section class="aim-runtime-section"><h3>${Store.escapeHtml(field.title)}</h3>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</section>`;
    if (field.type === 'information_text') return `<section class="aim-runtime-info"><h3>${Store.escapeHtml(field.title)}</h3>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</section>`;
    if (field.type === 'form_thumbnail') return `<section class="aim-runtime-component">${renderFormThumbnailPreview(field)}</section>`;
    if (field.type === 'card_link') return renderRuntimeCardLink(field, enabled, ui.quickCardLink, 'quick');
    const value = ui.quickAnswers[field.fieldId];
    const otherValue = ui.quickOtherAnswers[field.fieldId] || '';
    const label = `<label>${Store.escapeHtml(field.title)}</label>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}`;
    if (field.type === 'long_text') return `<div class="aim-field">${label}<textarea class="aim-textarea aim-auto-grow aim-quick-input" data-field="${field.fieldId}" rows="1" placeholder="${Store.escapeHtml(field.placeholder || '')}" ${enabled ? '' : 'disabled'}>${Store.escapeHtml(value || '')}</textarea></div>`;
    if (field.type === 'number') return `<div class="aim-field">${label}<input class="aim-input aim-quick-input" type="number" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}" placeholder="${Store.escapeHtml(field.placeholder || '')}" ${enabled ? '' : 'disabled'}></div>`;
    if (field.type === 'yes_no') return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}<div class="aim-runtime-choice-list">${yesNoOptions.map(o => `<label class="aim-checkbox"><input class="aim-quick-radio" name="quick-${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${value === o ? 'checked' : ''} ${enabled ? '' : 'disabled'}> ${Store.escapeHtml(o)}</label>`).join('')}</div></div>`;
    if (field.type === 'dropdown') return `<div class="aim-field">${label}<select class="aim-select aim-quick-input" data-field="${field.fieldId}" ${enabled ? '' : 'disabled'}>${option('', '請選擇', value || '')}${(field.options || []).map(o => option(o, o, value || '')).join('')}${field.allowOther ? option(otherAnswerValue, otherAnswerValue, value || '') : ''}</select>${field.allowOther && value === otherAnswerValue ? renderOtherInput(field, 'quick', otherValue, enabled) : ''}</div>`;
    if (field.type === 'single_choice') return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}<div class="aim-runtime-choice-list">${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-quick-radio" name="quick-${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${value === o ? 'checked' : ''} ${enabled ? '' : 'disabled'}> ${Store.escapeHtml(o)}</label>`).join('')}${field.allowOther ? `<label class="aim-checkbox"><input class="aim-quick-radio" name="quick-${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${otherAnswerValue}" ${value === otherAnswerValue ? 'checked' : ''} ${enabled ? '' : 'disabled'}> ${otherAnswerValue}</label>` : ''}</div>${field.allowOther && value === otherAnswerValue ? renderOtherInput(field, 'quick', otherValue, enabled) : ''}</div>`;
    if (field.type === 'multiple_choice') {
      const values = Array.isArray(value) ? value : [];
      return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}<div class="aim-runtime-choice-list">${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-quick-check" data-field="${field.fieldId}" type="checkbox" value="${Store.escapeHtml(o)}" ${values.includes(o) ? 'checked' : ''} ${enabled ? '' : 'disabled'}> ${Store.escapeHtml(o)}</label>`).join('')}${field.allowOther ? `<label class="aim-checkbox"><input class="aim-quick-check" data-field="${field.fieldId}" type="checkbox" value="${otherAnswerValue}" ${values.includes(otherAnswerValue) ? 'checked' : ''} ${enabled ? '' : 'disabled'}> ${otherAnswerValue}</label>` : ''}</div>${field.allowOther && values.includes(otherAnswerValue) ? renderOtherInput(field, 'quick', otherValue, enabled) : ''}</div>`;
    }
    return `<div class="aim-field">${label}<input class="aim-input aim-quick-input" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}" placeholder="${Store.escapeHtml(field.placeholder || '')}" ${enabled ? '' : 'disabled'}></div>`;
  }

  function renderOtherInput(field, context, value, enabled) {
    const klass = context === 'quick' ? 'aim-quick-other-input' : 'aim-record-other-input';
    return `<input class="aim-input aim-runtime-other-input ${klass}" data-field="${Store.escapeHtml(field.fieldId)}" value="${Store.escapeHtml(value || '')}" placeholder="請輸入其他內容" ${enabled ? '' : 'disabled'}>`;
  }

  function renderRuntimeCardLink(item, enabled, cardLink, context) {
    const linked = cardLink && cardLink.linked;
    if (!linked) {
      return `
        <section class="aim-form-card-link aim-runtime-card-link">
          <h4>${Store.escapeHtml(item.title || '名片連結')}</h4>
          <p>${Store.escapeHtml(item.helperText || '可選擇名片與本次紀錄建立預覽關聯。')}</p>
          ${enabled ? `<button class="aim-button aim-button-soft" data-action="runtime-link-card" data-context="${context}" type="button">選擇名片</button>` : '<span class="aim-small">未連結名片</span>'}
        </section>
      `;
    }
    return `
      <section class="aim-form-card-link aim-form-card-link-preview aim-runtime-card-link">
        <h4>${Store.escapeHtml(item.title || '名片連結')}</h4>
        <button class="aim-form-card-link-thumb" data-action="open-card-lightbox" type="button" aria-label="開啟名片預覽">
          ${renderBusinessCardVisual('thumb')}
        </button>
        ${enabled ? `<div class="aim-form-card-link-actions"><button class="aim-button aim-button-soft" data-action="runtime-link-card" data-context="${context}" type="button">更換</button><button class="aim-button" data-action="runtime-unlink-card" data-context="${context}" type="button">移除</button></div>` : ''}
      </section>
    `;
  }

  function formDesign(activity) {
    if (!activity.formDesignRuntime) {
      activity.formDesignRuntime = normalizeFormBundleDto(null);
    }
    activity.formDesignRuntime.published.items = (activity.formDesignRuntime.published.items || []).map(normalizeDesignerItem);
    activity.formDesignRuntime.draft.items = (activity.formDesignRuntime.draft.items || []).map(normalizeDesignerItem);
    return activity.formDesignRuntime;
  }

  function normalizeDesignerItem(item) {
    if (!item || item.type === 'card_link') return makeCardLinkItem(item || {});
    if (item.type === 'form_thumbnail') return makeFormThumbnailItem(item || {});
    const type = item.type || 'short_text';
    const itemKey = item.itemKey || item.item_key || item.fieldId || item.itemId || newUuid();
    const entries = normalizeOptionEntries(item);
    return {
      formItemId: item.formItemId || item.form_item_id || '',
      itemKey,
      itemId: item.itemId || itemKey,
      fieldId: item.fieldId || itemKey,
      category: ['section_heading', 'information_text'].includes(type) ? 'layout_component' : 'field',
      type,
      title: item.title || fieldTypeLabel(type),
      helperText: item.helperText || '',
      placeholder: item.placeholder || '',
      options: entries.map(option => option.label),
      optionEntries: entries,
      allowOther: Boolean(item.allowOther),
      visible: item.visible !== false,
      retired: Boolean(item.retired),
      removedInDraft: Boolean(item.removedInDraft)
    };
  }

  function makeCardLinkItem(extra) {
    const source = extra || {};
    const itemKey = source.itemKey || source.item_key || source.fieldId || source.itemId || newUuid();
    return {
      formItemId: source.formItemId || source.form_item_id || '',
      itemKey,
      itemId: source.itemId || itemKey,
      fieldId: source.fieldId || itemKey,
      category: 'integration_component',
      type: 'card_link',
      title: '名片連結',
      helperText: '以名片縮圖建立預覽關聯，不產生表單答案。',
      placeholder: '',
      options: [],
      allowOther: false,
      visible: true,
      retired: false,
      removedInDraft: false,
      ...source
    };
  }

  function makeFormThumbnailItem(extra) {
    const source = extra || {};
    const itemKey = source.itemKey || source.item_key || source.fieldId || source.itemId || newUuid();
    return {
      formItemId: source.formItemId || source.form_item_id || '',
      itemKey,
      itemId: source.itemId || itemKey,
      fieldId: source.fieldId || itemKey,
      category: 'layout_component',
      type: 'form_thumbnail',
      title: '表單縮圖',
      helperText: '',
      placeholder: '',
      options: [],
      allowOther: false,
      visible: true,
      retired: false,
      removedInDraft: false,
      thumbnailTitle: '活動表單封面',
      altText: '活動表單示意縮圖',
      thumbnailVariant: 'line',
      ...source
    };
  }

  function designerItemKey(item) {
    return item && (item.itemKey || item.itemId || item.fieldId);
  }

  function normalizeOptionEntries(item) {
    const raw = Array.isArray(item.optionEntries)
      ? item.optionEntries
      : (Array.isArray(item.option_entries) ? item.option_entries : item.options);
    return (Array.isArray(raw) ? raw : []).map(option => {
      const source = option && typeof option === 'object' ? option : { label: option };
      const label = String(source.label || source.value || '').trim();
      return {
        optionKey: source.optionKey || source.option_key || newUuid(),
        label,
        value: source.value || label
      };
    });
  }

  function optionEntriesFromLabels(currentEntries, labels) {
    const current = Array.isArray(currentEntries) ? currentEntries : [];
    return labels.map((label, index) => {
      const existing = current[index] || {};
      const text = String(label || '');
      return {
        optionKey: existing.optionKey || existing.option_key || newUuid(),
        label: text,
        value: text,
        sortOrder: index + 1
      };
    });
  }

  function newUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    throw new Error('A browser with crypto.randomUUID is required for Activity Intelligence form identities.');
  }

  function designerItemSignature(item) {
    const normalized = normalizeDesignerItem(item || {});
    return JSON.stringify({
      category: normalized.category,
      type: normalized.type,
      title: normalized.title || '',
      helperText: normalized.helperText || '',
      placeholder: normalized.placeholder || '',
      options: normalized.options || [],
      allowOther: Boolean(normalized.allowOther),
      visible: normalized.visible !== false,
      retired: Boolean(normalized.retired),
      removedInDraft: Boolean(normalized.removedInDraft),
      thumbnailTitle: normalized.thumbnailTitle || '',
      altText: normalized.altText || '',
      thumbnailVariant: normalized.thumbnailVariant || ''
    });
  }

  function designerItemsEqual(a, b) {
    return designerItemSignature(a) === designerItemSignature(b);
  }

  function syncSelectedDraft(activity) {
    const design = formDesign(activity);
    if (ui.formDesignMode !== 'draft') {
      ui.formDesignDraft = null;
      ui.formDesignDraftDirty = false;
      return null;
    }
    const selected = design.draft.items.find(f => designerItemKey(f) === ui.selectedFieldId) || design.draft.items[0] || null;
    if (!selected) {
      ui.selectedFieldId = null;
      ui.formDesignDraft = null;
      ui.formDesignDraftDirty = false;
      return null;
    }
    if (!ui.formDesignDraft || ui.formDesignDraft.fieldId !== selected.fieldId) {
      ui.selectedFieldId = selected.fieldId;
      ui.formDesignDraft = Store.clone(selected);
      ui.formDesignDraftDirty = false;
    }
    return selected;
  }

  function previewItems(activity) {
    const design = formDesign(activity);
    const source = ui.formDesignMode === 'published' ? design.published.items : design.draft.items;
    return source.map(item => {
      if (ui.formDesignMode === 'draft' && ui.formDesignDraft && designerItemKey(ui.formDesignDraft) === designerItemKey(item)) return normalizeDesignerItem(ui.formDesignDraft);
      return item;
    });
  }

  function renderCardLinkPlaceholder() {
    return '';
  }

  function renderForm(activity) {
    const status = activityStatus(activity);
    const design = formDesign(activity);
    const selected = syncSelectedDraft(activity);
    const draftChanged = formDesignChangeSummary(design).total > 0;
    return `
      ${status.key === 'open' ? '<div class="aim-warning">表單目前開放中；本頁僅調整 Designer，不影響既有填寫資料。</div>' : ''}
      <div class="aim-form-designer">
        <div class="aim-panel">
          <div class="aim-runtime-notice">表單設計已連接正式 Activity Intelligence 後端；紀錄表單將於後續階段開放。</div>
          <div class="aim-panel-title-row">
            <h2>表單設計</h2>
            <div class="aim-form-mode-tabs" role="tablist" aria-label="表單版本">
              <button class="aim-mode-tab" role="tab" aria-selected="${ui.formDesignMode === 'published'}" data-action="form-design-mode" data-mode="published" type="button">正式版本</button>
              <button class="aim-mode-tab" role="tab" aria-selected="${ui.formDesignMode === 'draft'}" data-action="form-design-mode" data-mode="draft" type="button">編輯草稿</button>
            </div>
          </div>
          ${ui.formDesignMode === 'published' ? renderPublishedDesignerWorkspace(design) : renderDraftDesignerWorkspace(activity, design, selected, draftChanged)}
        </div>
        <aside class="aim-panel aim-form-preview-panel">
          <div class="aim-panel-title-row"><h2>${ui.formDesignMode === 'published' ? '正式版本預覽' : '草稿版本預覽'}</h2><span class="aim-pill">${ui.formDesignMode === 'published' ? 'Read-only' : 'Draft'}</span></div>
          <div class="aim-preview">${renderFormPreview(activity)}</div>
        </aside>
      </div>
    `;
  }

  function renderPublishedDesignerWorkspace(design) {
    const publishedAt = design.published.publishedAt ? Store.formatDateTime(design.published.publishedAt) : '尚未發布';
    return `
      <section class="aim-form-version-summary">
        <div><span>最後發布</span><strong>${Store.escapeHtml(publishedAt)}</strong></div>
        <div><span>正式項目</span><strong>${design.published.items.length}</strong></div>
      </section>
      <div class="aim-field-list aim-designer-item-list aim-designer-item-list-readonly">
        ${design.published.items.map((item, index) => renderDesignerItemCard(item, index, design.published.items, { mode: 'published' })).join('') || '<div class="aim-empty">尚未發布正式版本。</div>'}
      </div>
    `;
  }

  function renderDraftDesignerWorkspace(activity, design, selected, draftChanged) {
    return `
      <div class="aim-draft-actions">
        <button class="aim-button aim-button-primary" data-action="toggle-field-picker" type="button" ${writeInFlight ? 'disabled' : ''}>新增項目</button>
        <button class="aim-button aim-button-primary" data-action="save-form-draft" type="button" ${writeInFlight ? 'disabled' : ''}>儲存草稿</button>
        <button class="aim-button" data-action="open-discard-draft" type="button" ${draftChanged && !writeInFlight ? '' : 'disabled'}>放棄草稿</button>
        <button class="aim-button aim-button-primary" data-action="open-publish-form" type="button" ${writeInFlight ? 'disabled' : ''}>發布表單</button>
      </div>
      ${renderDraftChangeSummary(design)}
      ${ui.fieldTypePickerOpen ? renderFieldTypePicker(design) : ''}
      <div class="aim-field-list aim-designer-item-list">
        ${design.draft.items.map((item, index) => renderDesignerItemCard(item, index, design.draft.items, { mode: 'draft', activity, selected })).join('') || '<div class="aim-empty">尚未建立項目。</div>'}
      </div>
    `;
  }

  function renderFieldTypePicker(design) {
    return `
      <div class="aim-field-type-picker" aria-label="新增欄位類型">
        ${fieldTypeGroups.map(group => `
          <section class="aim-field-type-group">
            <h3>${Store.escapeHtml(group.label)}</h3>
            <div class="aim-field-type-options">
              ${group.types.map(type => renderFieldTypeOption(type, design)).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    `;
  }

  function renderFieldTypeOption(type, design) {
    const isCardLink = type === 'card_link';
    const isThumbnail = type === 'form_thumbnail';
    const disabled = (isCardLink || isThumbnail) && design.draft.items.some(item => item.type === type);
    const label = fieldTypeLabel(type);
    const desc = {
      section_heading: '分隔表單段落',
      information_text: '顯示填寫提示',
      short_text: '單行文字回答',
      long_text: '多行備註回答',
      number: '數字輸入預覽',
      yes_no: '固定是／否選擇',
      single_choice: '單一選項回答',
      multiple_choice: '多個選項回答',
      dropdown: '下拉選單回答',
      form_thumbnail: disabled ? '已加入此表單' : '在指定位置顯示活動表單縮圖',
      card_link: disabled ? '已加入此表單' : '在指定位置顯示名片縮圖'
    }[type];
    return `<button class="aim-field-type-option" data-action="add-designer-item" data-type="${Store.escapeHtml(type)}" ${disabled ? 'disabled' : ''} type="button"><strong>${Store.escapeHtml(label)}</strong><span>${Store.escapeHtml(desc)}</span></button>`;
  }

  function renderDesignerItemCard(item, index, list, context) {
    const key = designerItemKey(item);
    const isDraft = context.mode === 'draft';
    const isSelected = isDraft && key === ui.selectedFieldId;
    const status = isDraft ? draftItemStatus(formDesign(context.activity), item) : { key: 'published', label: '正式使用中' };
    const summary = designerItemSummary(item);
    const classes = [
      'aim-form-field-card',
      'aim-designer-item-card',
      `aim-designer-item-${status.key}`,
      item.removedInDraft ? 'aim-designer-item-removed' : '',
      item.visible === false ? 'aim-designer-item-hidden' : '',
      isSelected ? 'aim-form-field-card-selected aim-designer-item-editing' : '',
      context.mode === 'published' ? 'aim-designer-item-readonly' : ''
    ].filter(Boolean).join(' ');
    return `
      <article class="${classes}" aria-selected="${isSelected}" data-designer-item="${Store.escapeHtml(key)}">
        <button class="aim-field-row-select" type="button" data-action="${isDraft ? 'select-field' : 'noop'}" data-id="${Store.escapeHtml(key)}">
          <span class="aim-form-field-card-type">${Store.escapeHtml(fieldTypeLabel(item.type))}</span>
          <strong>${Store.escapeHtml(item.title || '未命名項目')}</strong>
          ${summary ? `<small>${Store.escapeHtml(summary)}</small>` : ''}
          <span class="aim-status-row">${renderDraftStatusBadges(status, isSelected && ui.formDesignDraftDirty)}</span>
        </button>
        ${isSelected ? renderDesignerToolbar(item, index, list) : ''}
        ${isSelected ? renderFieldEditor(context.activity, ui.formDesignDraft || item) : ''}
      </article>
    `;
  }

  function renderDesignerToolbar(item, index, list) {
    const key = designerItemKey(item);
    const removable = !item.removedInDraft;
    const duplicate = !['card_link', 'form_thumbnail'].includes(item.type);
    return `
      <div class="aim-designer-toolbar" aria-label="項目操作">
        <button class="aim-button aim-button-soft" data-action="move-field" data-id="${Store.escapeHtml(key)}" data-dir="-1" ${index === 0 ? 'disabled' : ''} type="button" aria-label="上移 ${Store.escapeHtml(item.title)}">↑ 上移</button>
        <button class="aim-button aim-button-soft" data-action="move-field" data-id="${Store.escapeHtml(key)}" data-dir="1" ${index === list.length - 1 ? 'disabled' : ''} type="button" aria-label="下移 ${Store.escapeHtml(item.title)}">↓ 下移</button>
        ${duplicate ? `<button class="aim-button aim-button-soft" data-action="copy-field" data-id="${Store.escapeHtml(key)}" type="button" aria-label="複製 ${Store.escapeHtml(item.title)}">⧉ 複製</button>` : ''}
        <button class="aim-button aim-button-soft" data-action="toggle-field" data-id="${Store.escapeHtml(key)}" ${item.removedInDraft ? 'disabled' : ''} type="button">${item.visible === false ? '○ 顯示' : '◐ 隱藏'}</button>
        ${item.removedInDraft ? `<button class="aim-button aim-button-soft" data-action="restore-field" data-id="${Store.escapeHtml(key)}" type="button">↩ 復原</button>` : `<button class="aim-button aim-button-danger-soft" data-action="delete-field" data-id="${Store.escapeHtml(key)}" type="button">${removable ? '× 移除' : '移除'}</button>`}
      </div>
    `;
  }

  function renderDraftStatusBadges(status, editing) {
    const badges = [`<span class="aim-designer-status aim-designer-status-${status.key}">${Store.escapeHtml(status.label)}</span>`];
    if (editing) badges.push('<span class="aim-designer-status aim-designer-status-editing">編輯中</span>');
    return badges.join('');
  }

  function renderFieldEditor(activity, field) {
    if (field.type === 'card_link') return renderCardLinkEditor(field);
    if (field.type === 'form_thumbnail') return renderFormThumbnailEditor(field);
    const canHavePlaceholder = ['short_text', 'long_text', 'number'].includes(field.type);
    return `
      <div class="aim-field-editor" data-editor-field="${field.fieldId}">
        <div class="aim-field-editor-head">
          <div>
            <h3>項目設定</h3>
            <p>${ui.formDesignDraftDirty ? '尚未套用的變更只會顯示在草稿預覽。' : '目前顯示草稿已套用設定。'}</p>
          </div>
          <div class="aim-field-editor-status">
            ${ui.formDesignDraftDirty ? '<span class="aim-pill aim-pill-high">未套用</span>' : '<span class="aim-pill">已套用</span>'}
          </div>
        </div>
        <div class="aim-field-editor-body">
          ${ui.formDesignMessage ? `<div class="aim-field-editor-message" role="alert">${Store.escapeHtml(ui.formDesignMessage)}</div>` : ''}
          <div class="aim-editor-grid">
            <div class="aim-field"><label for="aim-field-title">標題</label><textarea class="aim-textarea aim-auto-grow aim-field-design-input" id="aim-field-title" data-design-field="title" rows="1" ${field.retired ? 'disabled' : ''}>${Store.escapeHtml(field.title)}</textarea></div>
            <div class="aim-field"><label for="aim-field-type">類型</label><select class="aim-select" id="aim-field-type" ${field.retired ? 'disabled' : ''}>${fieldTypes.map(([k, l]) => option(k, l, field.type)).join('')}</select></div>
          </div>
          <div class="aim-field"><label for="aim-field-helper">${field.type === 'information_text' ? '描述內容' : '說明文字'}</label><textarea class="aim-textarea aim-auto-grow aim-field-design-input" id="aim-field-helper" data-design-field="helperText" rows="2" ${field.retired ? 'disabled' : ''}>${Store.escapeHtml(field.helperText || '')}</textarea></div>
          ${canHavePlaceholder ? `<div class="aim-field"><label for="aim-field-placeholder">提示文字</label><input class="aim-input aim-field-design-input" id="aim-field-placeholder" data-design-field="placeholder" value="${Store.escapeHtml(field.placeholder || '')}" ${field.retired ? 'disabled' : ''}></div>` : ''}
          ${choiceFieldTypes.includes(field.type) ? renderOptionEditor(field) : ''}
          ${choiceFieldTypes.includes(field.type) ? `<label class="aim-checkbox aim-form-other-toggle"><input id="aim-field-allow-other" type="checkbox" ${field.allowOther ? 'checked' : ''} ${field.retired ? 'disabled' : ''}> 允許填寫「其他」補充答案</label>` : ''}
        </div>
        <div class="aim-field-editor-actions">
          <button class="aim-button" data-action="cancel-field-draft" type="button" ${!ui.formDesignDraftDirty ? 'disabled' : ''}>取消修改</button>
          <button class="aim-button aim-button-primary" data-action="apply-field-draft" type="button" ${field.retired ? 'disabled' : ''}>套用至草稿</button>
        </div>
      </div>
    `;
  }

  function renderCardLinkEditor(field) {
    return `
      <div class="aim-field-editor">
        <div class="aim-field-editor-head">
          <div><h3>名片串聯設定</h3><p>此元件只在 Designer 預覽中呈現，不產生表單答案。</p></div>
          <div class="aim-field-editor-status">${ui.formDesignDraftDirty ? '<span class="aim-pill aim-pill-high">未套用</span>' : '<span class="aim-pill">已套用</span>'}</div>
        </div>
        <div class="aim-field-editor-body">
          ${ui.formDesignMessage ? `<div class="aim-field-editor-message" role="alert">${Store.escapeHtml(ui.formDesignMessage)}</div>` : ''}
          <div class="aim-field"><label for="aim-field-title">標題</label><input class="aim-input aim-field-design-input" id="aim-field-title" data-design-field="title" value="${Store.escapeHtml(field.title)}"></div>
          <div class="aim-preview-field aim-preview-info"><h4>預覽行為</h4><p>連結後只顯示名片縮圖，可點擊放大預覽。</p></div>
        </div>
        <div class="aim-field-editor-actions">
          <button class="aim-button" data-action="cancel-field-draft" type="button" ${!ui.formDesignDraftDirty ? 'disabled' : ''}>取消修改</button>
          <button class="aim-button aim-button-primary" data-action="apply-field-draft" type="button">套用至草稿</button>
        </div>
      </div>
    `;
  }

  function renderFormThumbnailEditor(field) {
    return `
      <div class="aim-field-editor">
        <div class="aim-field-editor-head">
          <div><h3>表單縮圖設定</h3><p>縮圖只屬於 Designer，不會寫入紀錄答案。</p></div>
          <div class="aim-field-editor-status">${ui.formDesignDraftDirty ? '<span class="aim-pill aim-pill-high">未套用</span>' : '<span class="aim-pill">已套用</span>'}</div>
        </div>
        <div class="aim-field-editor-body">
          ${ui.formDesignMessage ? `<div class="aim-field-editor-message" role="alert">${Store.escapeHtml(ui.formDesignMessage)}</div>` : ''}
          <div class="aim-editor-grid">
            <div class="aim-field"><label for="aim-field-thumbnail-title">縮圖標題（選填）</label><input class="aim-input aim-field-design-input" id="aim-field-thumbnail-title" data-design-field="thumbnailTitle" value="${Store.escapeHtml(field.thumbnailTitle || '')}"></div>
            <div class="aim-field"><label for="aim-field-thumbnail-alt">替代文字（選填）</label><input class="aim-input aim-field-design-input" id="aim-field-thumbnail-alt" data-design-field="altText" value="${Store.escapeHtml(field.altText || '')}"></div>
          </div>
          ${renderFormThumbnailVisual(field)}
        </div>
        <div class="aim-field-editor-actions">
          <button class="aim-button aim-button-soft" data-action="cycle-thumbnail" type="button">更換範例圖</button>
          <button class="aim-button aim-button-danger-soft" data-action="delete-field" data-id="${Store.escapeHtml(designerItemKey(field))}" type="button">移除縮圖</button>
          <button class="aim-button" data-action="cancel-field-draft" type="button" ${!ui.formDesignDraftDirty ? 'disabled' : ''}>取消修改</button>
          <button class="aim-button aim-button-primary" data-action="apply-field-draft" type="button">套用至草稿</button>
        </div>
      </div>
    `;
  }

  function renderOptionEditor(field) {
    const options = field.options.length ? field.options : [''];
    return `
      <div class="aim-option-list" aria-label="選項編輯">
        ${options.map((value, index) => `
          <div class="aim-option-row">
            <input class="aim-input aim-option-input" data-option-index="${index}" value="${Store.escapeHtml(value)}" aria-label="選項 ${index + 1}">
            <div class="aim-option-actions">
              <button class="aim-button aim-icon-button" data-action="move-option" data-index="${index}" data-dir="-1" ${index === 0 ? 'disabled' : ''} aria-label="上移選項" title="上移" type="button">↑</button>
              <button class="aim-button aim-icon-button" data-action="move-option" data-index="${index}" data-dir="1" ${index === options.length - 1 ? 'disabled' : ''} aria-label="下移選項" title="下移" type="button">↓</button>
              <button class="aim-button aim-icon-button aim-button-danger" data-action="delete-option" data-index="${index}" ${options.length <= 1 ? 'disabled' : ''} aria-label="刪除選項" title="刪除" type="button">×</button>
            </div>
          </div>
        `).join('')}
        <button class="aim-button aim-button-soft" data-action="add-option" type="button">新增選項</button>
      </div>
    `;
  }

  function renderFormPreview(activity) {
    const items = previewItems(activity).filter(item => item.visible !== false && !item.retired && !item.removedInDraft);
    const parts = items.map(renderPreviewItem);
    return parts.join('') || '<div class="aim-empty">尚未建立可顯示欄位。</div>';
  }

  function renderPreviewItem(item) {
    if (item.type === 'card_link') return renderFormCardLinkPreview(item);
    if (item.type === 'form_thumbnail') return renderFormThumbnailPreview(item);
    return renderPreviewField(item);
  }

  function renderFormThumbnailPreview(item) {
    return `
      <section class="aim-form-thumbnail-preview" aria-label="${Store.escapeHtml(item.altText || item.thumbnailTitle || '表單縮圖')}">
        ${renderFormThumbnailVisual(item)}
        ${item.thumbnailTitle ? `<h4>${Store.escapeHtml(item.thumbnailTitle)}</h4>` : ''}
      </section>
    `;
  }

  function renderFormThumbnailVisual(item) {
    const variant = item.thumbnailVariant || 'line';
    return `
      <div class="aim-form-thumbnail-visual aim-form-thumbnail-${Store.escapeHtml(variant)}" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
    `;
  }

  function renderPreviewField(field) {
    if (field.type === 'section_heading') {
      return `<section class="aim-preview-section"><h4>${Store.escapeHtml(field.title)}</h4>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</section>`;
    }
    if (field.type === 'information_text') {
      return `<div class="aim-preview-field aim-preview-info"><h4>${Store.escapeHtml(field.title)}</h4>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</div>`;
    }
    const label = `<h4>${Store.escapeHtml(field.title)}</h4>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}`;
    const answer = ui.formPreviewAnswers[field.fieldId] || {};
    if (field.type === 'long_text') return `<div class="aim-preview-field">${label}<textarea class="aim-textarea aim-form-preview-control" data-preview-field="${field.fieldId}" placeholder="${Store.escapeHtml(field.placeholder || '')}">${Store.escapeHtml(answer.value || '')}</textarea></div>`;
    if (field.type === 'number') return `<div class="aim-preview-field">${label}<input class="aim-input aim-form-preview-control" data-preview-field="${field.fieldId}" type="number" value="${Store.escapeHtml(answer.value || '')}" placeholder="${Store.escapeHtml(field.placeholder || '')}"></div>`;
    if (field.type === 'yes_no') return `<div class="aim-preview-field">${label}<div class="aim-preview-options">${yesNoOptions.map(o => `<label><input class="aim-form-preview-radio" name="preview-${field.fieldId}" data-preview-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${answer.value === o ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}</div></div>`;
    if (field.type === 'single_choice') {
      const options = field.options || [];
      return `<div class="aim-preview-field">${label}<div class="aim-preview-options">${options.map(o => `<label><input class="aim-form-preview-radio" name="preview-${field.fieldId}" data-preview-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${answer.value === o ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}${field.allowOther ? `<label><input class="aim-form-preview-radio" name="preview-${field.fieldId}" data-preview-field="${field.fieldId}" type="radio" value="__other" ${answer.other ? 'checked' : ''}> 其他</label>` : ''}</div>${field.allowOther && answer.other ? `<input class="aim-input aim-form-preview-other" data-preview-other="${field.fieldId}" value="${Store.escapeHtml(answer.otherText || '')}" placeholder="請輸入其他答案">` : ''}</div>`;
    }
    if (field.type === 'multiple_choice') {
      const values = new Set(answer.values || []);
      return `<div class="aim-preview-field">${label}<div class="aim-preview-options">${(field.options || []).map(o => `<label><input class="aim-form-preview-check" data-preview-field="${field.fieldId}" type="checkbox" value="${Store.escapeHtml(o)}" ${values.has(o) ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}${field.allowOther ? `<label><input class="aim-form-preview-check" data-preview-field="${field.fieldId}" type="checkbox" value="__other" ${answer.other ? 'checked' : ''}> 其他</label>` : ''}</div>${field.allowOther && answer.other ? `<input class="aim-input aim-form-preview-other" data-preview-other="${field.fieldId}" value="${Store.escapeHtml(answer.otherText || '')}" placeholder="請輸入其他答案">` : ''}</div>`;
    }
    if (field.type === 'dropdown') {
      const otherSelected = answer.other;
      return `<div class="aim-preview-field">${label}<select class="aim-select aim-form-preview-select" data-preview-field="${field.fieldId}"><option value="">請選擇</option>${(field.options || []).map(o => `<option value="${Store.escapeHtml(o)}" ${answer.value === o ? 'selected' : ''}>${Store.escapeHtml(o)}</option>`).join('')}${field.allowOther ? `<option value="__other" ${otherSelected ? 'selected' : ''}>其他</option>` : ''}</select>${field.allowOther && otherSelected ? `<input class="aim-input aim-form-preview-other" data-preview-other="${field.fieldId}" value="${Store.escapeHtml(answer.otherText || '')}" placeholder="請輸入其他答案">` : ''}</div>`;
    }
    return `<div class="aim-preview-field">${label}<input class="aim-input aim-form-preview-control" data-preview-field="${field.fieldId}" value="${Store.escapeHtml(answer.value || '')}" placeholder="${Store.escapeHtml(field.placeholder || '')}"></div>`;
  }

  function renderFormCardLinkPreview() {
    if (!ui.formPreviewCardLinked) {
      return `
        <section class="aim-form-card-link">
          <h4>名片連結</h4>
          <p>可選擇名片與本次紀錄建立預覽關聯。</p>
          <button class="aim-button aim-button-soft" data-action="mock-link-card" type="button">選擇名片</button>
        </section>
      `;
    }
    return `
      <section class="aim-form-card-link aim-form-card-link-preview">
        <button class="aim-form-card-link-thumb" data-action="open-card-lightbox" type="button" aria-label="開啟名片預覽">
          ${renderBusinessCardVisual('thumb')}
        </button>
        <div class="aim-form-card-link-actions">
          <button class="aim-button aim-button-soft" data-action="mock-link-card" type="button">更換</button>
          <button class="aim-button" data-action="mock-unlink-card" type="button">移除</button>
        </div>
      </section>
    `;
  }

  function renderBusinessCardVisual(size) {
    return `
      <div class="aim-mock-card aim-mock-card-${size || 'thumb'}" aria-hidden="true">
        <span class="aim-mock-card-logo"></span>
        <span class="aim-mock-card-line aim-mock-card-line-wide"></span>
        <span class="aim-mock-card-line"></span>
        <span class="aim-mock-card-bar"></span>
        <span class="aim-mock-card-line aim-mock-card-line-short"></span>
        <span class="aim-mock-card-line aim-mock-card-line-wide"></span>
      </div>
    `;
  }

  function renderCardPreviewLightbox() {
    if (!ui.cardPreviewLightboxOpen) return '';
    return `
      <div class="aim-dialog-backdrop aim-card-preview-lightbox" data-action="close-card-lightbox">
        <div class="aim-dialog aim-card-preview-dialog" role="dialog" aria-modal="true" aria-label="名片預覽" data-action="noop">
          <div class="aim-dialog-head"><h2>名片預覽</h2><button class="aim-button aim-icon-button" data-action="close-card-lightbox" type="button" aria-label="關閉">×</button></div>
          <div class="aim-dialog-body">${renderBusinessCardVisual('large')}</div>
        </div>
      </div>
    `;
  }

  function renderFormDesignConfirmDialog() {
    if (!ui.formDesignConfirm) return '';
    if (ui.formDesignConfirm.type === 'discard') {
      return `
        <div class="aim-dialog-backdrop aim-form-confirm-backdrop" data-action="close-form-design-dialog"></div>
        <section class="aim-dialog aim-form-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="aim-discard-draft-title">
          <div class="aim-dialog-head"><h2 id="aim-discard-draft-title">放棄草稿</h2><button class="aim-button aim-icon-button" data-action="close-form-design-dialog" type="button" aria-label="關閉">×</button></div>
          <div class="aim-dialog-body"><p>這會將編輯草稿還原為目前正式版本，草稿新增、修改與預計移除都會被清除。</p></div>
          <div class="aim-dialog-foot"><button class="aim-button" data-action="close-form-design-dialog" type="button">取消</button><button class="aim-button aim-button-danger-soft" data-action="confirm-discard-draft" type="button">放棄草稿</button></div>
        </section>
      `;
    }
    const summary = ui.formDesignConfirm.summary || { added: 0, modified: 0, removed: 0 };
    return `
      <div class="aim-dialog-backdrop aim-form-confirm-backdrop" data-action="close-form-design-dialog"></div>
      <section class="aim-dialog aim-form-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="aim-publish-form-title">
        <div class="aim-dialog-head"><h2 id="aim-publish-form-title">發布表單</h2><button class="aim-button aim-icon-button" data-action="close-form-design-dialog" type="button" aria-label="關閉">×</button></div>
        <div class="aim-dialog-body">
          <p>發布後會更新 Designer 的正式版本快照，但不會連動紀錄表單或既有資料。</p>
          <div class="aim-publish-summary">
            <div><span>新增</span><strong>${summary.added}</strong></div>
            <div><span>修改</span><strong>${summary.modified}</strong></div>
            <div><span>移除</span><strong>${summary.removed}</strong></div>
          </div>
        </div>
        <div class="aim-dialog-foot"><button class="aim-button" data-action="close-form-design-dialog" type="button">取消</button><button class="aim-button aim-button-primary" data-action="confirm-publish-form" type="button">發布表單</button></div>
      </section>
    `;
  }

  function renderRecords(activity, forcedScope) {
    const scope = forcedScope || ui.records.scope;
    const rows = filteredRecords(activity, scope);
    const recorders = unique(recordsFor(activity.id).map(r => r.createdByDisplayName));
    const advancedCount = activeAdvancedFilterCount();
    return `
      <div class="aim-panel">
        <div class="aim-records-head">
          <div>
            <h2>${scope === 'mine' ? '我的紀錄' : '全部紀錄'}</h2>
            <p class="aim-small">目前結果共 ${rows.length} 筆</p>
          </div>
          <div class="aim-records-head-actions">
            ${renderVoidRecordsToggle('all')}
            ${renderExpansionToggle('all', rows)}
            ${canExport() ? `
              <div class="aim-data-functions" aria-label="資料功能">
                <span>資料功能</span>
                <button class="aim-button" data-action="export-filtered" type="button">匯出目前結果 CSV</button>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="aim-record-filter-bar" role="search">
          <div class="aim-record-search"><input class="aim-input" id="aim-record-q" value="${Store.escapeHtml(ui.records.q)}" placeholder="搜尋姓名、公司或內容" aria-label="搜尋紀錄"></div>
          <div class="aim-period-group" role="group" aria-label="快速期間篩選">
            ${periodButton('all', '全部')}
            ${periodButton('today', '今日')}
            ${periodButton('yesterday', '昨日')}
            ${periodButton('day_before', '前日')}
            ${periodButton('custom', customPeriodLabel())}
          </div>
          <button class="aim-button aim-more-filter-button" data-action="toggle-more-filters" aria-expanded="${ui.records.moreOpen}" type="button">更多篩選${advancedCount ? `（${advancedCount}）` : ''}</button>
        </div>
        ${ui.records.customOpen ? `
          <div class="aim-filter-panel aim-custom-period-panel">
            <div class="aim-field"><label for="aim-record-start">開始日期</label><input class="aim-input" id="aim-record-start" type="date" value="${ui.records.start}"></div>
            <div class="aim-field"><label for="aim-record-end">結束日期</label><input class="aim-input" id="aim-record-end" type="date" value="${ui.records.end}"></div>
            <div class="aim-filter-panel-actions"><button class="aim-button aim-button-primary" data-action="apply-custom-period" type="button">套用</button><button class="aim-button" data-action="clear-custom-period" type="button">清除</button></div>
            <p class="aim-field-error" id="aim-record-date-error" role="alert">${Store.escapeHtml(ui.records.filterError)}</p>
          </div>
        ` : ''}
        ${ui.records.moreOpen ? `
          <div class="aim-filter-panel aim-more-filters-panel">
            <div class="aim-field"><label for="aim-record-recorder">紀錄者</label><select class="aim-select" id="aim-record-recorder">${option('all', '全部紀錄者', ui.records.recorder)}${recorders.map(r => option(r, r, ui.records.recorder)).join('')}</select></div>
            <div class="aim-field"><label for="aim-record-priority">後續優先度</label><select class="aim-select" id="aim-record-priority">${option('all', '全部優先度', ui.records.priority)}${['高', '中', '低', '未判斷'].map(p => option(p, p, ui.records.priority)).join('')}</select></div>
            <div class="aim-field"><label for="aim-record-state">紀錄狀態</label><select class="aim-select" id="aim-record-state">${option('normal', '有效', ui.records.state)}${option('void', '作廢', ui.records.state)}${option('all', '有效與作廢', ui.records.state)}</select></div>
            <label class="aim-checkbox"><input id="aim-record-low" type="checkbox" ${ui.records.low ? 'checked' : ''}> 低完整度</label>
            <button class="aim-button" data-action="reset-more-filters" type="button">重設進階篩選</button>
          </div>
        ` : ''}
        <div class="aim-record-card-list aim-record-card-list-all">${rows.map(record => renderRecordCard(record, activity, 'all')).join('') || '<div class="aim-empty">沒有符合篩選條件的紀錄。</div>'}</div>
      </div>
    `;
  }

  function renderRecordScopeSwitch() {
    const choices = [['entry', '新增紀錄'], ['all', '全部紀錄']];
    return `<div class="aim-record-subviews" aria-label="表單紀錄檢視">${choices.map(([scope, label]) => `<button data-action="scope" data-scope="${scope}" aria-pressed="${ui.records.scope === scope}" type="button">${label}</button>`).join('')}</div>`;
  }

  function renderAnalytics(activity) {
    return renderDeferredModule();
    const records = analyticsRecords(activity);
    const metrics = analyticsMetrics(activity, records);
    const recorders = unique(recordsFor(activity.id).map(r => r.createdByDisplayName));
    return `
      <div class="aim-panel" style="margin-bottom:14px"><div class="aim-record-toolbar aim-analytics-toolbar"><input class="aim-input" id="aim-analytics-start" type="date" value="${ui.analytics.start}"><input class="aim-input" id="aim-analytics-end" type="date" value="${ui.analytics.end}"><select class="aim-select" id="aim-analytics-recorder">${option('all', '全部紀錄者', ui.analytics.recorder)}${recorders.map(r => option(r, r, ui.analytics.recorder)).join('')}</select><input class="aim-input" id="aim-analytics-q" value="${Store.escapeHtml(ui.analytics.q)}" placeholder="搜尋長文字內容"><button class="aim-button" data-action="clear-analytics" type="button">清除</button></div></div>
      <div class="aim-kpi-grid"><div class="aim-kpi"><span>有效紀錄</span><strong>${metrics.total}</strong></div><div class="aim-kpi"><span>今日新增</span><strong>${metrics.today}</strong></div><div class="aim-kpi"><span>紀錄者數</span><strong>${metrics.recorders}</strong></div><div class="aim-kpi"><span>低完整度</span><strong>${metrics.low}</strong></div><div class="aim-kpi"><span>平均填答欄位</span><strong>${metrics.avg}</strong></div></div>
      <div class="aim-chart-grid"><div class="aim-panel"><h2>每日新增趨勢</h2>${renderTrend(records)}</div><div class="aim-panel"><h2>紀錄者分布</h2>${bars(count(records, r => r.createdByDisplayName))}</div>${choiceCharts(activity, records)}${numberCharts(activity, records)}${textBrowser(activity, records)}</div>
    `;
  }

  function renderTrend(records) {
    const counts = count(records, r => r.createdAt.slice(0, 10));
    const keys = Object.keys(counts).sort();
    if (!keys.length) return '<div class="aim-empty">目前沒有可分析的紀錄。</div>';
    const max = Math.max(...Object.values(counts), 1);
    const barsSvg = keys.map((key, i) => {
      const h = Math.max(4, (counts[key] / max) * 120);
      const x = 10 + i * 54;
      const y = 145 - h;
      return `<g><rect x="${x}" y="${y}" width="34" height="${h}" rx="3" fill="#2563eb"></rect><text x="${x + 17}" y="170" text-anchor="middle" font-size="10" fill="#64748b">${key.slice(5).replace('-', '/')}</text><text x="${x + 17}" y="${y - 6}" text-anchor="middle" font-size="11">${counts[key]}</text></g>`;
    }).join('');
    return `<svg class="aim-trend" viewBox="0 0 560 190" role="img" aria-label="每日新增趨勢">${barsSvg}</svg>`;
  }

  function bars(counts) {
    const entries = Object.entries(counts);
    if (!entries.length) return '<div class="aim-empty">目前沒有資料。</div>';
    const max = Math.max(...entries.map(e => e[1]), 1);
    return `<div class="aim-bars">${entries.map(([label, value]) => `<div class="aim-bar-row"><span>${Store.escapeHtml(label)}</span><div class="aim-bar-track"><div class="aim-bar-fill" style="width:${Math.round(value / max * 100)}%"></div></div><strong>${value}</strong></div>`).join('')}</div>`;
  }

  function choiceCharts(activity, records) {
    return activity.formFields.filter(f => ['single_choice', 'multiple_choice', 'dropdown'].includes(f.type)).map(field => {
      const counts = {};
      (field.options || []).forEach(o => { counts[o] = 0; });
      records.forEach(record => {
        const value = record.answers[field.fieldId];
        if (Array.isArray(value)) value.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        else if (value) counts[value] = (counts[value] || 0) + 1;
      });
      return `<div class="aim-panel"><h2>${Store.escapeHtml(field.title)}</h2>${bars(counts)}</div>`;
    }).join('');
  }

  function numberCharts(activity, records) {
    return activity.formFields.filter(f => f.type === 'number').map(field => {
      const values = records.map(r => Number(r.answers[field.fieldId])).filter(Number.isFinite);
      const sum = values.reduce((a, b) => a + b, 0);
      return `<div class="aim-panel"><h2>${Store.escapeHtml(field.title)}</h2><dl class="aim-definition-list"><dt>筆數</dt><dd>${values.length}</dd><dt>平均</dt><dd>${values.length ? (sum / values.length).toFixed(1) : '-'}</dd><dt>最小</dt><dd>${values.length ? Math.min(...values) : '-'}</dd><dt>最大</dt><dd>${values.length ? Math.max(...values) : '-'}</dd></dl></div>`;
    }).join('');
  }

  function textBrowser(activity, records) {
    const fields = activity.formFields.filter(f => f.type === 'long_text');
    const q = ui.analytics.q.trim().toLowerCase();
    const rows = [];
    fields.forEach(field => records.forEach(record => {
      const value = String(record.answers[field.fieldId] || '');
      if (value && (!q || value.toLowerCase().includes(q))) rows.push({ field, record, value });
    }));
    return `<div class="aim-panel" style="grid-column:1/-1"><h2>長文字內容瀏覽</h2><div class="aim-small" style="margin-bottom:8px">共 ${rows.length} 則內容</div><div class="aim-text-browser">${rows.map(row => `<div class="aim-answer"><h4>${Store.escapeHtml(row.field.title)} - ${Store.escapeHtml(row.record.createdByDisplayName)} - ${Store.formatDateTime(row.record.createdAt)}</h4><div>${Store.escapeHtml(row.value)}</div></div>`).join('') || '<div class="aim-empty">沒有符合搜尋條件的文字內容。</div>'}</div></div>`;
  }

  function renderDialog() {
    if (!ui.dialog || ui.dialog.type !== 'activity' || !canManageActivities()) return '';
    const duplicate = ui.dialog.mode === 'duplicate';
    return `
      <div class="aim-dialog-backdrop" data-action="close-dialog"></div>
      <section class="aim-dialog" role="dialog" aria-modal="true">
        <div class="aim-dialog-head"><h2>${duplicate ? '複製活動' : '新增活動'}</h2><button class="aim-button aim-icon-button" data-action="close-dialog" aria-label="關閉活動視窗" type="button">x</button></div>
        <div class="aim-dialog-body"><div class="aim-modal-grid">
          <div class="aim-field aim-full"><label>活動名稱</label><input class="aim-input" id="aim-dialog-name" value="${Store.escapeHtml(ui.dialog.name || '')}"></div>
          <div class="aim-field"><label>表單開放開始日期</label><input class="aim-input" id="aim-dialog-form-start" type="date" value="${ui.dialog.formOpenStart || ''}"></div>
          <div class="aim-field"><label>表單開放結束日期</label><input class="aim-input" id="aim-dialog-form-end" type="date" value="${ui.dialog.formOpenEnd || ''}"></div>
          <div class="aim-field"><label>展期開始日期（選填）</label><input class="aim-input" id="aim-dialog-ex-start" type="date" value="${ui.dialog.exhibitionStart || ''}"></div>
          <div class="aim-field"><label>展期結束日期（選填）</label><input class="aim-input" id="aim-dialog-ex-end" type="date" value="${ui.dialog.exhibitionEnd || ''}"></div>
          <div class="aim-field aim-full"><label>活動說明（選填）</label><textarea class="aim-textarea" id="aim-dialog-description">${Store.escapeHtml(ui.dialog.description || '')}</textarea></div>
        </div><p class="aim-field-error" id="aim-dialog-error" role="alert">${Store.escapeHtml(ui.dialog.error || '')}</p></div>
        <div class="aim-dialog-foot"><button class="aim-button" data-action="close-dialog" type="button">取消</button><button class="aim-button aim-button-primary" data-action="save-activity-dialog" type="button">${duplicate ? '建立複製活動' : '建立活動'}</button></div>
      </section>
    `;
  }

  function renderDrawer() {
    if (!ui.drawer) return '';
    if (ui.drawer.type === 'settings' && canManageActivities()) return settingsDrawer();
    if (ui.drawer.type === 'record' && ['edit', 'void'].includes(ui.drawer.mode)) return recordDrawer();
    return '';
  }

  function settingsDrawer() {
    const activity = selectedActivity();
    const draft = ui.drawer;
    return `
      <div class="aim-drawer-backdrop" data-action="close-drawer"></div>
      <aside class="aim-drawer" role="dialog" aria-modal="true">
        <div class="aim-drawer-head"><h2>活動設定</h2><button class="aim-button aim-icon-button" data-action="close-drawer" aria-label="關閉活動設定" type="button">x</button></div>
        <div class="aim-drawer-body">
          <div class="aim-field"><label>活動名稱</label><input class="aim-input" id="aim-settings-name" value="${Store.escapeHtml(draft.name || '')}"></div>
          <div class="aim-modal-grid"><div class="aim-field"><label>表單開放開始日期</label><input class="aim-input" id="aim-settings-form-start" type="date" value="${draft.formOpenStart || ''}"></div><div class="aim-field"><label>表單開放結束日期</label><input class="aim-input" id="aim-settings-form-end" type="date" value="${draft.formOpenEnd || ''}"></div><div class="aim-field"><label>展期開始日期（選填）</label><input class="aim-input" id="aim-settings-ex-start" type="date" value="${draft.exhibitionStart || ''}"></div><div class="aim-field"><label>展期結束日期（選填）</label><input class="aim-input" id="aim-settings-ex-end" type="date" value="${draft.exhibitionEnd || ''}"></div></div>
          <div class="aim-field"><label>活動說明</label><textarea class="aim-textarea" id="aim-settings-description">${Store.escapeHtml(draft.description || '')}</textarea></div>
          <dl class="aim-definition-list"><dt>建立者</dt><dd>${Store.escapeHtml(activity.createdByDisplayName)}</dd><dt>建立時間</dt><dd>${Store.formatDateTime(activity.createdAt)}</dd><dt>最近更新者</dt><dd>${Store.escapeHtml(activity.updatedByDisplayName)}</dd><dt>最近更新</dt><dd>${Store.formatDateTime(activity.updatedAt)}</dd><dt>狀態</dt><dd>${statusPill(activityStatus({ ...activity, ...draft }))}</dd></dl>
        </div>
        <div class="aim-drawer-foot"><button class="aim-button" data-action="close-drawer" type="button">關閉</button><button class="aim-button aim-button-primary" data-action="save-settings" type="button">儲存設定</button></div>
      </aside>
    `;
  }

  function settingsDraft(activity) {
    return {
      type: 'settings',
      name: activity.name,
      formOpenStart: activity.formOpenStart,
      formOpenEnd: activity.formOpenEnd,
      exhibitionStart: activity.exhibitionStart || '',
      exhibitionEnd: activity.exhibitionEnd || '',
      description: activity.description || ''
    };
  }

  function recordDrawer() {
    const activity = selectedActivity();
    const record = ui.drawer.id ? state.records.find(r => r.id === ui.drawer.id) : null;
    if (!canOpenRecordDrawer(record, activity)) return '';
    const editing = record.status !== 'void';
    const working = ui.drawer.working || Store.clone(record.answers);
    const workingOther = ui.drawer.workingOther || Store.clone(otherAnswersForRecord(record));
    const workingCardLink = ui.drawer.workingCardLink || Store.clone(cardLinkForRecord(record));
    const items = snapshotRecordItems(record, activity);
    return `
      <div class="aim-drawer-backdrop" data-action="close-drawer"></div>
      <aside class="aim-drawer" role="dialog" aria-modal="true">
        <div class="aim-drawer-head"><div><h2>編輯紀錄</h2>${editing ? '' : '<span class="aim-pill aim-pill-void">已作廢</span>'}</div><button class="aim-button aim-icon-button" data-action="close-drawer" type="button" aria-label="關閉紀錄">x</button></div>
        <div class="aim-drawer-body">
          <dl class="aim-definition-list" style="margin-bottom:14px"><dt>建立者</dt><dd>${Store.escapeHtml(record.createdByDisplayName)}</dd><dt>建立時間</dt><dd>${Store.formatDateTime(record.createdAt)}</dd><dt>最近更新者</dt><dd>${Store.escapeHtml(record.updatedByDisplayName)}</dd><dt>最近更新</dt><dd>${Store.formatDateTime(record.updatedAt)}</dd>${editing ? '' : '<dt>狀態</dt><dd><span class="aim-pill aim-pill-void">已作廢</span></dd>'}</dl>
          <div class="aim-answer-list">${items.map(field => renderAnswer(field, working, editing, workingOther, workingCardLink)).join('')}</div>
        </div>
        <div class="aim-drawer-foot aim-record-drawer-foot">
          ${editing && canVoidRecord(record, activity) ? `<button class="aim-button aim-button-danger" data-action="void-record" data-id="${record.id}" type="button">作廢紀錄</button>` : ''}
          ${!editing && canCancelVoidRecord(record, activity) ? `<button class="aim-button aim-button-danger" data-action="cancel-void-record" data-id="${record.id}" type="button">取消作廢</button>` : ''}
          <div class="aim-drawer-actions"><button class="aim-button" data-action="close-drawer" type="button">關閉</button>${editing ? '<button class="aim-button aim-button-primary" data-action="save-record" type="button">儲存修改</button>' : ''}</div>
        </div>
      </aside>
    `;
  }

  function renderAnswer(field, answers, editable, otherAnswers, cardLink) {
    if (field.type === 'section_heading') return `<section class="aim-runtime-section"><h3>${Store.escapeHtml(field.title)}</h3>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</section>`;
    if (field.type === 'information_text') return `<section class="aim-runtime-info"><h3>${Store.escapeHtml(field.title)}</h3>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</section>`;
    if (field.type === 'form_thumbnail') return `<section class="aim-runtime-component">${renderFormThumbnailPreview(field)}</section>`;
    if (field.type === 'card_link') return renderRuntimeCardLink(field, editable, cardLink, 'drawer');
    const value = answers[field.fieldId];
    const otherValue = otherAnswers && otherAnswers[field.fieldId] ? otherAnswers[field.fieldId] : '';
    if (!editable) return `<div class="aim-answer"><h4>${Store.escapeHtml(field.title)} ${field.retired ? '<span class="aim-pill aim-pill-retired">已停用</span>' : ''}</h4><div>${Store.escapeHtml(Store.answerText(displayAnswerValue(field, value, otherAnswers)) || '-')}</div></div>`;
    if (field.retired) return '';
    const label = `<label>${Store.escapeHtml(field.title)}</label>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}`;
    if (field.type === 'long_text') return `<div class="aim-field">${label}<textarea class="aim-textarea aim-auto-grow aim-record-input" data-field="${field.fieldId}" rows="1" placeholder="${Store.escapeHtml(field.placeholder || '')}">${Store.escapeHtml(value || '')}</textarea></div>`;
    if (field.type === 'number') return `<div class="aim-field">${label}<input class="aim-input aim-record-input" type="number" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}" placeholder="${Store.escapeHtml(field.placeholder || '')}"></div>`;
    if (field.type === 'yes_no') return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}<div class="aim-runtime-choice-list">${yesNoOptions.map(o => `<label class="aim-checkbox"><input class="aim-record-radio" name="${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${value === o ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}</div></div>`;
    if (field.type === 'dropdown') return `<div class="aim-field">${label}<select class="aim-select aim-record-input" data-field="${field.fieldId}">${option('', '請選擇', value || '')}${(field.options || []).map(o => option(o, o, value || '')).join('')}${field.allowOther ? option(otherAnswerValue, otherAnswerValue, value || '') : ''}</select>${field.allowOther && value === otherAnswerValue ? renderOtherInput(field, 'record', otherValue, true) : ''}</div>`;
    if (field.type === 'single_choice') return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}<div class="aim-runtime-choice-list">${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-record-radio" name="${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${value === o ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}${field.allowOther ? `<label class="aim-checkbox"><input class="aim-record-radio" name="${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${otherAnswerValue}" ${value === otherAnswerValue ? 'checked' : ''}> ${otherAnswerValue}</label>` : ''}</div>${field.allowOther && value === otherAnswerValue ? renderOtherInput(field, 'record', otherValue, true) : ''}</div>`;
    if (field.type === 'multiple_choice') {
      const values = Array.isArray(value) ? value : [];
      return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}<div class="aim-runtime-choice-list">${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-record-check" data-field="${field.fieldId}" type="checkbox" value="${Store.escapeHtml(o)}" ${values.includes(o) ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}${field.allowOther ? `<label class="aim-checkbox"><input class="aim-record-check" data-field="${field.fieldId}" type="checkbox" value="${otherAnswerValue}" ${values.includes(otherAnswerValue) ? 'checked' : ''}> ${otherAnswerValue}</label>` : ''}</div>${field.allowOther && values.includes(otherAnswerValue) ? renderOtherInput(field, 'record', otherValue, true) : ''}</div>`;
    }
    return `<div class="aim-field">${label}<input class="aim-input aim-record-input" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}" placeholder="${Store.escapeHtml(field.placeholder || '')}"></div>`;
  }

  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && ui.formDesignConfirm) {
      ui.formDesignConfirm = null;
      render();
      return;
    }
    if (event.key === 'Escape' && ui.cardPreviewLightboxOpen) {
      ui.cardPreviewLightboxOpen = false;
      render();
      return;
    }
    const activityLink = event.target.closest('.aim-activity-link');
    if (!activityLink || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    activityLink.click();
  });

  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (ui.formDesignConfirm) ui.formDesignConfirm = null;
    else if (ui.cardPreviewLightboxOpen) ui.cardPreviewLightboxOpen = false;
    else return;
    render();
  });

  root.addEventListener('click', async event => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (await handleFormDesignAction(action, el, event)) return;
    if (action === 'all' && canManageActivities()) { ui.view = 'overview'; ui.tab = 'overview'; }
    if (action === 'open' && canManageActivities()) { ui.selectedActivityId = el.dataset.id; ui.view = 'workspace'; ui.tab = 'overview'; await loadFormForActivity(ui.selectedActivityId); }
    if (action === 'recorder-open' && isRecorder()) { ui.selectedActivityId = el.dataset.id; ui.view = 'workspace'; ui.tab = 'records'; ui.records.scope = 'entry'; }
    if (action === 'tab') {
      selectTab(el.dataset.tab);
      if (ui.tab === 'form') await loadFormForActivity(ui.selectedActivityId);
    }
    if (action === 'sort' && canManageActivities()) sort(el.dataset.key);
    if (action === 'clear-overview' && canManageActivities()) ui.overview = { q: '', status: 'all', sort: 'name', dir: 'asc' };
    if (action === 'new-activity' && canManageActivities()) ui.dialog = freshActivityDraft();
    if (action === 'duplicate' && canManageActivities()) openDuplicate(el.dataset.id);
    if (action === 'close-dialog') ui.dialog = null;
    if (action === 'save-activity-dialog' && canManageActivities() && !(await saveActivityDialog())) return;
    if (action === 'settings' && canManageActivities()) ui.drawer = settingsDraft(selectedActivity());
    if (action === 'close-drawer') ui.drawer = null;
    if (action === 'save-settings' && canManageActivities()) await saveSettings();
    if (action === 'reset' && canManageActivities()) toast(formalDeferredMessage);
    if (action === 'add-field' && canDesignForm()) addField();
    if (action === 'select-field' && canDesignForm()) ui.selectedFieldId = el.dataset.id;
    if (action === 'move-field' && canDesignForm()) moveField(el.dataset.id, Number(el.dataset.dir));
    if (action === 'toggle-field' && canDesignForm()) toggleField(el.dataset.id);
    if (action === 'copy-field' && canDesignForm()) copyField(el.dataset.id);
    if (action === 'delete-field' && canDesignForm()) deleteField(el.dataset.id);
    if (action === 'retire-field' && canDesignForm()) retireField(el.dataset.id);
    if (action === 'scope' && (canManageRecords() || isRecorder())) {
      const allowed = ['entry', 'mine', 'all'];
      if (allowed.includes(el.dataset.scope)) ui.records.scope = el.dataset.scope;
    }
    if (action === 'record-period') setRecordPeriod(el.dataset.period);
    if (action === 'toggle-more-filters') ui.records.moreOpen = !ui.records.moreOpen;
    if (action === 'apply-custom-period' && !applyCustomPeriod()) return;
    if (action === 'clear-custom-period') clearCustomPeriod();
    if (action === 'reset-more-filters') resetMoreFilters();
    if (action === 'open-record-inline') {
      const record = state.records.find(r => r.id === el.dataset.id);
      if (canViewRecord(record, selectedActivity())) {
        ui.tab = 'records';
        ui.records.scope = 'all';
        ui.expandedRecords.all.add(record.id);
      }
    }
    if (action === 'toggle-record-expansion') {
      toggleRecordExpansion(el.dataset.context, el.dataset.id);
    }
    if (action === 'toggle-all-records') toggleAllRecordExpansions(el.dataset.context);
    if (action === 'edit-record') {
      const record = state.records.find(r => r.id === el.dataset.id);
      if (canOpenRecordDrawer(record, selectedActivity())) ui.drawer = {
        type: 'record',
        mode: record.status === 'void' ? 'void' : 'edit',
        id: record.id,
        working: Store.clone(record.answers || {}),
        workingOther: Store.clone(otherAnswersForRecord(record)),
        workingCardLink: Store.clone(cardLinkForRecord(record))
      };
    }
    if (action === 'save-record') saveRecord();
    if (action === 'void-record') voidRecord(el.dataset.id);
    if (action === 'cancel-void-record') cancelVoidRecord(el.dataset.id);
    if (action === 'quick-save-next') saveQuickRecord();
    if (action === 'export-filtered' && canExport()) exportCsv(filteredRecords(selectedActivity(), ui.records.scope), selectedActivity(), 'filtered');
    if (action === 'clear-analytics' && canUseAnalytics()) ui.analytics = { recorder: 'all', start: '', end: '', q: '' };
    save();
    render();
  });

  async function handleFormDesignAction(action, el, event) {
    if (action === 'noop') return true;
    if (action === 'close-form-design-dialog') {
      ui.formDesignConfirm = null;
      render();
      return true;
    }
    if (action === 'confirm-discard-draft') {
      await discardDesignerDraft();
      return true;
    }
    if (action === 'confirm-publish-form') {
      await publishDesignerDraft();
      return true;
    }
    if (action === 'close-card-lightbox') {
      ui.cardPreviewLightboxOpen = false;
      render();
      return true;
    }
    if (action === 'open-card-lightbox') {
      ui.cardPreviewLightboxOpen = true;
      render();
      return true;
    }
    if (action === 'mock-link-card') {
      ui.formPreviewCardLinked = true;
      refreshFormPreview();
      return true;
    }
    if (action === 'mock-unlink-card') {
      ui.formPreviewCardLinked = false;
      ui.cardPreviewLightboxOpen = false;
      refreshFormPreview();
      return true;
    }
    if (action === 'runtime-link-card') {
      setRuntimeCardLink(el.dataset.context, true);
      render();
      return true;
    }
    if (action === 'runtime-unlink-card') {
      setRuntimeCardLink(el.dataset.context, false);
      render();
      return true;
    }
    if (!canDesignForm()) return false;
    if (action === 'form-design-mode') {
      if (blockDirtyDesignerAction()) return true;
      ui.formDesignMode = el.dataset.mode === 'published' ? 'published' : 'draft';
      ui.fieldTypePickerOpen = false;
      ui.formDesignMessage = '';
      render();
      return true;
    }
    if (action === 'toggle-field-picker') {
      ui.fieldTypePickerOpen = !ui.fieldTypePickerOpen;
      render();
      return true;
    }
    if (action === 'add-designer-item') {
      if (blockDirtyDesignerAction()) return true;
      addDesignerItem(el.dataset.type);
      save();
      render();
      return true;
    }
    if (action === 'open-discard-draft') {
      if (blockDirtyDesignerAction()) return true;
      openDiscardDraftDialog();
      render();
      return true;
    }
    if (action === 'open-publish-form') {
      if (blockDirtyDesignerAction()) return true;
      openPublishFormDialog();
      render();
      return true;
    }
    if (action === 'save-form-draft') {
      if (blockDirtyDesignerAction()) return true;
      await saveDesignerDraft();
      return true;
    }
    if (action === 'add-field-type' || action === 'add-field') {
      if (blockDirtyDesignerAction()) return true;
      addDesignerItem(el.dataset.type || 'short_text');
      save();
      render();
      return true;
    }
    if (action === 'select-field') {
      if (blockDirtyDesignerAction()) return true;
      selectDesignerField(el.dataset.id);
      render();
      return true;
    }
    if (action === 'move-field') {
      if (blockDirtyDesignerAction()) return true;
      moveField(el.dataset.id, Number(el.dataset.dir));
      save();
      render();
      return true;
    }
    if (action === 'toggle-field') {
      if (blockDirtyDesignerAction()) return true;
      toggleField(el.dataset.id);
      save();
      render();
      return true;
    }
    if (action === 'copy-field') {
      if (blockDirtyDesignerAction()) return true;
      copyField(el.dataset.id);
      save();
      render();
      return true;
    }
    if (action === 'delete-field') {
      if (blockDirtyDesignerAction()) return true;
      deleteField(el.dataset.id);
      save();
      render();
      return true;
    }
    if (action === 'restore-field') {
      if (blockDirtyDesignerAction()) return true;
      restoreDesignerItem(el.dataset.id);
      save();
      render();
      return true;
    }
    if (action === 'retire-field') {
      if (blockDirtyDesignerAction()) return true;
      deleteField(el.dataset.id);
      save();
      render();
      return true;
    }
    if (action === 'apply-field-draft') {
      applyFieldDraft();
      return true;
    }
    if (action === 'cancel-field-draft') {
      cancelFieldDraft();
      return true;
    }
    if (action === 'add-option') {
      mutateDraftOptions(options => { options.push(`選項 ${options.length + 1}`); });
      render();
      return true;
    }
    if (action === 'delete-option') {
      mutateDraftOptions(options => { options.splice(Number(el.dataset.index), 1); });
      render();
      return true;
    }
    if (action === 'move-option') {
      mutateDraftOptions(options => {
        const index = Number(el.dataset.index);
        const next = index + Number(el.dataset.dir);
        if (index < 0 || next < 0 || next >= options.length) return;
        const [value] = options.splice(index, 1);
        options.splice(next, 0, value);
      });
      render();
      return true;
    }
    if (action === 'cycle-thumbnail') {
      cycleThumbnailVariant();
      refreshFormPreview();
      render();
      return true;
    }
    return false;
  }

  function blockDirtyDesignerAction() {
    if (!ui.formDesignDraftDirty) return false;
    ui.formDesignMessage = '請先套用至草稿或取消目前修改。';
    toast('請先套用至草稿或取消目前修改。');
    render();
    return true;
  }

  function selectDesignerField(fieldId) {
    const activity = selectedActivity();
    const field = formDesign(activity).draft.items.find(f => designerItemKey(f) === fieldId);
    if (!field) return;
    ui.selectedFieldId = designerItemKey(field);
    ui.formDesignDraft = Store.clone(field);
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
  }

  function updateFormDesignDraft(patch) {
    if (!ui.formDesignDraft) return;
    const next = { ...ui.formDesignDraft, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, 'options')) {
      const labels = Array.isArray(patch.options) ? patch.options : [];
      next.optionEntries = Array.isArray(patch.optionEntries)
        ? patch.optionEntries.map((entry, index) => ({
          optionKey: entry.optionKey || entry.option_key || newUuid(),
          label: String(entry.label || entry.value || labels[index] || ''),
          value: entry.value || entry.label || labels[index] || '',
          sortOrder: index + 1
        }))
        : optionEntriesFromLabels(ui.formDesignDraft.optionEntries || [], labels);
      next.options = labels;
    }
    if (next.type === 'card_link' || next.type === 'form_thumbnail') {
      next.options = [];
      next.optionEntries = [];
      next.allowOther = false;
      ui.formDesignDraft = normalizeDesignerItem(next);
      ui.formDesignDraftDirty = true;
      ui.formDesignMessage = '';
      return;
    }
    if (!choiceFieldTypes.includes(next.type)) {
      next.allowOther = false;
      next.options = next.type === 'yes_no' ? yesNoOptions.slice() : [];
    } else if (!Array.isArray(next.options) || !next.options.length) {
      next.options = ['選項 1', '選項 2'];
    }
    ui.formDesignDraft = normalizeDesignerItem(next);
    ui.formDesignDraftDirty = true;
    ui.formDesignMessage = '';
  }

  function mutateDraftOptions(mutator) {
    if (!ui.formDesignDraft || !choiceFieldTypes.includes(ui.formDesignDraft.type)) return;
    const entries = normalizeOptionEntries(ui.formDesignDraft);
    mutator(entries);
    const nextEntries = entries.length ? entries : [{ optionKey: newUuid(), label: '', value: '' }];
    updateFormDesignDraft({
      optionEntries: nextEntries.map((entry, index) => ({
        optionKey: entry.optionKey || newUuid(),
        label: String(entry.label || entry.value || ''),
        value: entry.value || entry.label || '',
        sortOrder: index + 1
      })),
      options: nextEntries.map(entry => String(entry.label || entry.value || ''))
    });
  }

  function applyFieldDraft() {
    const activity = selectedActivity();
    const design = formDesign(activity);
    const draft = normalizeDesignerItem(ui.formDesignDraft || {});
    const title = draft.title.trim();
    if (!title) {
      ui.formDesignMessage = '項目標題不可空白。';
      render();
      return;
    }
    draft.title = title;
    draft.helperText = draft.helperText.trim();
    draft.placeholder = draft.placeholder.trim();
    if (choiceFieldTypes.includes(draft.type)) {
      draft.options = draft.options.map(value => value.trim()).filter(Boolean);
      if (!draft.options.length) {
        ui.formDesignMessage = '請至少保留一個非空白選項。';
        render();
        return;
      }
    } else {
      draft.options = draft.type === 'yes_no' ? yesNoOptions.slice() : [];
      draft.allowOther = false;
    }
    const index = design.draft.items.findIndex(f => designerItemKey(f) === designerItemKey(draft));
    if (index < 0) return;
    design.draft.items[index] = draft;
    ui.formDesignDraft = Store.clone(draft);
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    Store.touch(activity, currentUser);
    save();
    render();
  }

  function cancelFieldDraft() {
    const activity = selectedActivity();
    const field = formDesign(activity).draft.items.find(f => designerItemKey(f) === ui.selectedFieldId);
    if (!field) return;
    ui.formDesignDraft = Store.clone(field);
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    render();
  }

  function refreshFormPreview() {
    const preview = document.querySelector('.aim-preview');
    if (!preview) return;
    preview.innerHTML = renderFormPreview(selectedActivity());
    bindFormPreviewControls();
  }

  function bindInputs() {
    const preview = document.getElementById('aim-role-preview');
    if (preview) preview.addEventListener('change', () => switchPreviewRole(preview.value));
    bind('aim-overview-q', value => { ui.overview.q = value; });
    bind('aim-overview-status', value => { ui.overview.status = value; }, 'change');
    bindActivityDraftField('aim-dialog-name', 'name');
    bindActivityDraftField('aim-dialog-form-start', 'formOpenStart');
    bindActivityDraftField('aim-dialog-form-end', 'formOpenEnd');
    bindActivityDraftField('aim-dialog-ex-start', 'exhibitionStart');
    bindActivityDraftField('aim-dialog-ex-end', 'exhibitionEnd');
    bindActivityDraftField('aim-dialog-description', 'description');
    bindSettingsField('aim-settings-name', 'name');
    bindSettingsField('aim-settings-form-start', 'formOpenStart', 'change');
    bindSettingsField('aim-settings-form-end', 'formOpenEnd', 'change');
    bindSettingsField('aim-settings-ex-start', 'exhibitionStart', 'change');
    bindSettingsField('aim-settings-ex-end', 'exhibitionEnd', 'change');
    bindSettingsField('aim-settings-description', 'description');
    bindFormDesignTextareas();
    bindFormPreviewControls();
    bind('aim-record-q', value => { ui.records.q = value; });
    bind('aim-record-recorder', value => { ui.records.recorder = value; }, 'change');
    bind('aim-record-priority', value => { ui.records.priority = value; }, 'change');
    bind('aim-record-state', value => {
      ui.records.state = value;
      ui.records.showVoidRecords = value !== 'normal';
    }, 'change');
    bindRecordDateField('aim-record-start', 'start');
    bindRecordDateField('aim-record-end', 'end');
    bindCheck('aim-record-low', value => { ui.records.low = value; });
    document.querySelectorAll('.aim-show-void-records-input').forEach(node => node.addEventListener('change', () => {
      setVoidRecordsVisibility(node.checked);
      render();
    }));
    bind('aim-analytics-start', value => { ui.analytics.start = value; }, 'change');
    bind('aim-analytics-end', value => { ui.analytics.end = value; }, 'change');
    bind('aim-analytics-recorder', value => { ui.analytics.recorder = value; }, 'change');
    bind('aim-analytics-q', value => { ui.analytics.q = value; });
    document.querySelectorAll('.aim-record-input').forEach(node => {
      const eventName = node.tagName === 'SELECT' ? 'change' : 'input';
      node.addEventListener(eventName, () => {
        setWorking(node.dataset.field, node.value);
        if (node.tagName === 'SELECT') render();
      });
    });
    document.querySelectorAll('.aim-record-radio').forEach(node => node.addEventListener('change', () => { if (node.checked) { setWorking(node.dataset.field, node.value); render(); } }));
    document.querySelectorAll('.aim-record-check').forEach(node => node.addEventListener('change', () => {
      const list = new Set(ui.drawer.working[node.dataset.field] || []);
      if (node.checked) list.add(node.value);
      else list.delete(node.value);
      setWorking(node.dataset.field, Array.from(list));
      render();
    }));
    document.querySelectorAll('.aim-record-other-input').forEach(node => node.addEventListener('input', () => setWorkingOther(node.dataset.field, node.value)));
    document.querySelectorAll('.aim-quick-input').forEach(node => {
      const eventName = node.tagName === 'SELECT' ? 'change' : 'input';
      node.addEventListener(eventName, () => {
        setQuickAnswer(node.dataset.field, node.value);
        if (node.tagName === 'SELECT') render();
      });
    });
    document.querySelectorAll('.aim-quick-radio').forEach(node => node.addEventListener('change', () => { if (node.checked) { setQuickAnswer(node.dataset.field, node.value); render(); } }));
    document.querySelectorAll('.aim-quick-check').forEach(node => node.addEventListener('change', () => {
      const list = new Set(ui.quickAnswers[node.dataset.field] || []);
      if (node.checked) list.add(node.value);
      else list.delete(node.value);
      setQuickAnswer(node.dataset.field, Array.from(list));
      render();
    }));
    document.querySelectorAll('.aim-quick-other-input').forEach(node => node.addEventListener('input', () => setQuickOtherAnswer(node.dataset.field, node.value)));
    bindAutoGrowingTextareas();
    initFormDesignAutoGrow();
    fitRecordPreviewBadges();
  }

  function bindAutoGrowingTextareas() {
    document.querySelectorAll('.aim-auto-grow:not(.aim-field-design-input)').forEach(textarea => {
      autoGrowTextarea(textarea);
      textarea.addEventListener('input', () => autoGrowTextarea(textarea));
    });
  }

  function autoGrowTextarea(textarea) {
    if (!textarea || textarea.offsetParent === null) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function initFormDesignAutoGrow() {
    document.querySelectorAll('.aim-field-design-input').forEach(textarea => {
      autoGrowTextarea(textarea);
    });
  }

  function bindFormDesignTextareas() {
    document.querySelectorAll('.aim-field-design-input').forEach(textarea => {
      const designField = textarea.dataset.designField;
      if (!designField) return;
      const handleInput = () => {
        if (textarea.classList.contains('aim-auto-grow')) autoGrowTextarea(textarea);
        updateFormDesignDraft({ [designField]: textarea.value });
        refreshFormPreview();
      };
      textarea.addEventListener('input', handleInput);
    });
    const type = document.getElementById('aim-field-type');
    if (type) type.addEventListener('change', () => {
      updateFormDesignDraft({ type: type.value });
      render();
    });
    const allowOther = document.getElementById('aim-field-allow-other');
    if (allowOther) allowOther.addEventListener('change', () => {
      updateFormDesignDraft({ allowOther: allowOther.checked });
      refreshFormPreview();
    });
    document.querySelectorAll('.aim-option-input').forEach(input => {
      input.addEventListener('input', () => {
        const options = (ui.formDesignDraft && ui.formDesignDraft.options ? ui.formDesignDraft.options : []).slice();
        options[Number(input.dataset.optionIndex)] = input.value;
        updateFormDesignDraft({ options });
        refreshFormPreview();
      });
    });
  }

  function bindFormPreviewControls() {
    document.querySelectorAll('.aim-form-preview-control').forEach(node => {
      node.addEventListener('input', () => {
        ui.formPreviewAnswers[node.dataset.previewField] = { value: node.value };
      });
    });
    document.querySelectorAll('.aim-form-preview-radio').forEach(node => {
      node.addEventListener('change', () => {
        if (!node.checked) return;
        const fieldId = node.dataset.previewField;
        if (node.value === '__other') ui.formPreviewAnswers[fieldId] = { other: true, otherText: '' };
        else ui.formPreviewAnswers[fieldId] = { value: node.value };
        refreshFormPreview();
      });
    });
    document.querySelectorAll('.aim-form-preview-check').forEach(node => {
      node.addEventListener('change', () => {
        const fieldId = node.dataset.previewField;
        const current = ui.formPreviewAnswers[fieldId] || {};
        if (node.value === '__other') {
          current.other = node.checked;
          if (!node.checked) current.otherText = '';
        } else {
          const values = new Set(current.values || []);
          if (node.checked) values.add(node.value);
          else values.delete(node.value);
          current.values = Array.from(values);
        }
        ui.formPreviewAnswers[fieldId] = current;
        refreshFormPreview();
      });
    });
    document.querySelectorAll('.aim-form-preview-select').forEach(node => {
      node.addEventListener('change', () => {
        const fieldId = node.dataset.previewField;
        ui.formPreviewAnswers[fieldId] = node.value === '__other' ? { other: true, otherText: '' } : { value: node.value };
        refreshFormPreview();
      });
    });
    document.querySelectorAll('.aim-form-preview-other').forEach(node => {
      node.addEventListener('input', () => {
        const fieldId = node.dataset.previewOther;
        ui.formPreviewAnswers[fieldId] = { ...(ui.formPreviewAnswers[fieldId] || {}), other: true, otherText: node.value };
      });
    });
  }

  function fitRecordPreviewBadges() {
    document.querySelectorAll('[data-preview-badges]').forEach(container => {
      const badges = Array.from(container.querySelectorAll('[data-preview-badge]'));
      const seps = Array.from(container.querySelectorAll('[data-preview-sep]'));
      const overflow = container.querySelector('[data-preview-overflow]');
      if (!overflow) return;
      // Reset: show all badges and seps, hide overflow
      badges.forEach(badge => { badge.hidden = false; });
      seps.forEach(sep => { sep.hidden = false; });
      overflow.hidden = true;
      if (container.scrollWidth <= container.clientWidth) return;
      // Need to hide some badges
      overflow.hidden = false;
      let hiddenCount = 0;
      for (let index = badges.length - 1; index >= 0; index -= 1) {
        badges[index].hidden = true;
        hiddenCount += 1;
        overflow.textContent = `+${hiddenCount}`;
        // After hiding a badge, also hide any separator that would now be trailing
        // (i.e. a sep whose following sibling badges are all hidden, or it is the first visible element)
        seps.forEach(sep => {
          // Find the previous and next visible badges relative to sep
          const allItems = Array.from(container.children);
          const sepIndex = allItems.indexOf(sep);
          // badges before this sep (same or preceding group) - check if any visible badge follows this sep
          const hasBadgeAfter = allItems.slice(sepIndex + 1).some(el => el.dataset.previewBadge !== undefined && !el.hidden);
          // badges before this sep - check if any visible badge precedes it
          const hasBadgeBefore = allItems.slice(0, sepIndex).some(el => el.dataset.previewBadge !== undefined && !el.hidden);
          sep.hidden = !hasBadgeAfter || !hasBadgeBefore;
        });
        if (container.scrollWidth <= container.clientWidth) break;
      }
    });
  }

  function bindActivityDraftField(id, key) {
    const node = document.getElementById(id);
    if (!node || !ui.dialog) return;
    const updateDraft = () => {
      if (!ui.dialog) return;
      ui.dialog[key] = node.value;
      ui.dialog.error = '';
      const error = document.getElementById('aim-dialog-error');
      if (error) error.textContent = '';
    };
    node.addEventListener('compositionstart', () => {
      if (ui.dialog) ui.dialog.composing = true;
    });
    node.addEventListener('compositionend', () => {
      if (ui.dialog) ui.dialog.composing = false;
      updateDraft();
    });
    node.addEventListener('input', updateDraft);
    node.addEventListener('change', updateDraft);
  }

  function bindSettingsField(id, key, eventName) {
    const node = document.getElementById(id);
    if (!node || !ui.drawer || ui.drawer.type !== 'settings') return;
    const updateDraft = () => {
      if (ui.drawer && ui.drawer.type === 'settings') ui.drawer[key] = node.value;
    };
    node.addEventListener(eventName || 'input', updateDraft);
    if (!eventName) node.addEventListener('change', updateDraft);
  }

  function bindRecordDateField(id, key) {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener('change', () => {
      ui.records[key] = node.value;
      ui.records.filterError = '';
      const error = document.getElementById('aim-record-date-error');
      if (error) error.textContent = '';
    });
  }

  async function switchPreviewRole() {
    currentUser = resolveFormalCurrentUser();
    ui.drawer = null;
    ui.dialog = null;
    ui.expandedRecords.personal.clear();
    ui.expandedRecords.all.clear();
    applyRoleLanding();
    render();
  }


  function bind(id, handler, eventName, rerender) {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener(eventName || 'input', () => {
      handler(node.value);
      save();
      if (rerender !== false) {
        clearTimeout(ui.timer);
        ui.timer = setTimeout(render, eventName === 'change' ? 0 : 160);
      }
    });
  }

  function bindCheck(id, handler) {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener('change', () => { handler(node.checked); save(); render(); });
  }

  function selectTab(tabName) {
    if (isRecorder()) {
      ui.tab = 'records';
      if (tabName === 'records') ui.records.scope = 'entry';
      return;
    }
    if (tabName === 'form' && !canDesignForm()) ui.tab = 'overview';
    else if (tabName === 'analytics' && !canUseAnalytics()) ui.tab = 'overview';
    else {
      ui.tab = tabName;
      if (tabName === 'records') ui.records.scope = 'entry';
    }
  }

  function periodButton(period, label) {
    const active = ui.records.period === period;
    const expanded = period === 'custom' ? ` aria-expanded="${ui.records.customOpen}"` : '';
    return `<button data-action="record-period" data-period="${period}" aria-pressed="${active}"${expanded} type="button">${Store.escapeHtml(label)}</button>`;
  }

  function setRecordPeriod(period) {
    if (!['all', 'today', 'yesterday', 'day_before', 'custom'].includes(period)) return;
    ui.records.filterError = '';
    if (period === 'custom') {
      ui.records.customOpen = !ui.records.customOpen;
      return;
    }
    ui.records.period = period;
    ui.records.customOpen = false;
  }

  function applyCustomPeriod() {
    const startNode = document.getElementById('aim-record-start');
    const endNode = document.getElementById('aim-record-end');
    if (startNode) ui.records.start = startNode.value;
    if (endNode) ui.records.end = endNode.value;
    let message = '';
    if (!ui.records.start || !ui.records.end) message = '請同時填寫開始日期與結束日期。';
    else if (ui.records.start > ui.records.end) message = '開始日期不可晚於結束日期。';
    if (message) {
      ui.records.filterError = message;
      const error = document.getElementById('aim-record-date-error');
      if (error) error.textContent = message;
      return false;
    }
    ui.records.period = 'custom';
    ui.records.customOpen = false;
    ui.records.filterError = '';
    return true;
  }

  function clearCustomPeriod() {
    ui.records.period = 'all';
    ui.records.start = '';
    ui.records.end = '';
    ui.records.customOpen = false;
    ui.records.filterError = '';
  }

  function resetMoreFilters() {
    ui.records.recorder = 'all';
    ui.records.priority = 'all';
    ui.records.state = 'normal';
    ui.records.showVoidRecords = false;
    ui.records.low = false;
  }

  function activeAdvancedFilterCount() {
    const stateFilterIsExplicit = ui.records.showVoidRecords ? ui.records.state !== 'all' : ui.records.state !== 'normal';
    return [
      ui.records.recorder !== 'all',
      ui.records.priority !== 'all',
      stateFilterIsExplicit,
      ui.records.low
    ].filter(Boolean).length;
  }

  function customPeriodLabel() {
    if (ui.records.period !== 'custom' || !ui.records.start || !ui.records.end) return '自訂區間';
    return `自訂區間 ${formatCompactDateRange(ui.records.start, ui.records.end)}`;
  }

  function recordDateRange() {
    if (ui.records.period === 'today') return [Store.CURRENT_DATE, Store.CURRENT_DATE];
    if (ui.records.period === 'yesterday') {
      const date = shiftLocalDate(Store.CURRENT_DATE, -1);
      return [date, date];
    }
    if (ui.records.period === 'day_before') {
      const date = shiftLocalDate(Store.CURRENT_DATE, -2);
      return [date, date];
    }
    if (ui.records.period === 'custom') return [ui.records.start, ui.records.end];
    return ['', ''];
  }

  function shiftLocalDate(isoDate, days) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function formatCompactDateRange(start, end) {
    const startText = Store.formatDate(start);
    const endText = Store.formatDate(end);
    if (start && end && start.slice(0, 4) === end.slice(0, 4)) {
      return `${startText}－${endText.slice(5)}`;
    }
    return `${startText}－${endText}`;
  }

  function filteredActivities() {
    const q = ui.overview.q.trim().toLowerCase();
    return state.activities.map(a => ({ ...a, ...activityMetrics(a.id), status: activityStatus(a).key }))
      .filter(a => ui.overview.status === 'all' || activityStatus(a).key === ui.overview.status)
      .filter(a => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => String(a[ui.overview.sort] || '').localeCompare(String(b[ui.overview.sort] || ''), undefined, { numeric: true }) * (ui.overview.dir === 'asc' ? 1 : -1));
  }

  function sort(key) {
    if (ui.overview.sort === key) ui.overview.dir = ui.overview.dir === 'asc' ? 'desc' : 'asc';
    else { ui.overview.sort = key; ui.overview.dir = 'asc'; }
  }

  function recordsFor(activityId) {
    return state.records.filter(r => r.activityId === activityId);
  }

  function recordsOwnedByCurrentUser(activityId) {
    if (!currentUser || !currentUser.authenticated) return [];
    return recordsFor(activityId)
      .filter(record => record.createdByUserId === currentUser.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || state.records.indexOf(b) - state.records.indexOf(a));
  }

  function visiblePersonalRecords(activityId) {
    return recordsOwnedByCurrentUser(activityId).filter(record => ui.records.showVoidRecords || record.status !== 'void');
  }

  function toggleRecordExpansion(context, recordId) {
    if (!['personal', 'all'].includes(context)) return;
    const record = state.records.find(item => item.id === recordId);
    if (!canViewRecord(record, selectedActivity())) return;
    const expanded = ui.expandedRecords[context];
    if (expanded.has(recordId)) expanded.delete(recordId);
    else expanded.add(recordId);
  }

  function visibleRecordsForContext(context, activity) {
    return context === 'personal' ? visiblePersonalRecords(activity.id) : filteredRecords(activity, 'all');
  }

  function toggleAllRecordExpansions(context) {
    if (!['personal', 'all'].includes(context)) return;
    const activity = selectedActivity();
    if (!activity) return;
    const expanded = ui.expandedRecords[context];
    const records = visibleRecordsForContext(context, activity).filter(record => canViewRecord(record, activity));
    const allExpanded = records.length > 0 && records.every(record => expanded.has(record.id));
    records.forEach(record => {
      if (allExpanded) expanded.delete(record.id);
      else expanded.add(record.id);
    });
  }

  function setVoidRecordsVisibility(showVoidRecords) {
    ui.records.showVoidRecords = showVoidRecords;
    ui.records.state = showVoidRecords ? 'all' : 'normal';
  }

  function activityMetrics(activityId) {
    const rows = recordsFor(activityId);
    const active = rows.filter(r => r.status !== 'void');
    const latest = rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const activity = state.activities.find(a => a.id === activityId);
    return {
      total: rows.length,
      active: active.length,
      today: active.filter(r => r.createdAt.slice(0, 10) === Store.CURRENT_DATE).length,
      recorders: unique(active.map(r => r.createdByUserId)).length,
      high: active.filter(r => r.answers.fld_priority === '高').length,
      low: active.filter(r => recordCoverage(r, activity).answered <= 1).length,
      lastRecord: latest && latest.createdAt
    };
  }

  function overviewKpis() {
    return {
      open: state.activities.filter(a => activityStatus(a).key === 'open').length,
      activeRecords: state.records.filter(r => r.status !== 'void').length,
      today: state.records.filter(r => r.status !== 'void' && r.createdAt.slice(0, 10) === Store.CURRENT_DATE).length
    };
  }

  function recordCoverage(record, activity) {
    const fields = answerProducingItems(snapshotRecordItems(record, activity)).filter(f => !f.retired);
    const answered = fields.filter(f => hasValue(record.answers[f.fieldId])).length;
    return { answered, total: fields.length, percent: fields.length ? Math.round(answered / fields.length * 100) : 0 };
  }

  function filteredRecords(activity, scope) {
    const q = ui.records.q.trim().toLowerCase();
    const [dateStart, dateEnd] = recordDateRange();
    return recordsFor(activity.id).filter(r => {
      if (scope === 'mine' && r.createdByUserId !== currentUser.userId) return false;
      if (!ui.records.showVoidRecords && r.status === 'void') return false;
      if (ui.records.state !== 'all' && (ui.records.state === 'void') !== (r.status === 'void')) return false;
      if (ui.records.recorder !== 'all' && r.createdByDisplayName !== ui.records.recorder) return false;
      if (ui.records.priority !== 'all' && (r.answers.fld_priority || '未判斷') !== ui.records.priority) return false;
      if (dateStart && r.createdAt.slice(0, 10) < dateStart) return false;
      if (dateEnd && r.createdAt.slice(0, 10) > dateEnd) return false;
      if (ui.records.low && recordCoverage(r, activity).answered > 1) return false;
      const text = `${Store.recordSummary(r)} ${Object.values(r.answers).flat().join(' ')}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function analyticsRecords(activity) {
    return recordsFor(activity.id).filter(r => {
      if (r.status === 'void') return false;
      if (ui.analytics.recorder !== 'all' && r.createdByDisplayName !== ui.analytics.recorder) return false;
      if (ui.analytics.start && r.createdAt.slice(0, 10) < ui.analytics.start) return false;
      if (ui.analytics.end && r.createdAt.slice(0, 10) > ui.analytics.end) return false;
      return true;
    });
  }

  function analyticsMetrics(activity, records) {
    const coverages = records.map(r => recordCoverage(r, activity).answered);
    return {
      total: records.length,
      today: records.filter(r => r.createdAt.slice(0, 10) === Store.CURRENT_DATE).length,
      recorders: unique(records.map(r => r.createdByUserId)).length,
      low: records.filter(r => recordCoverage(r, activity).answered <= 1).length,
      avg: coverages.length ? (coverages.reduce((a, b) => a + b, 0) / coverages.length).toFixed(1) : '0.0'
    };
  }

  function openDuplicate(activityId) {
    const source = state.activities.find(a => a.id === activityId);
    ui.dialog = {
      type: 'activity',
      mode: 'duplicate',
      sourceId: activityId,
      name: `${source.name} 複製`,
      formOpenStart: source.formOpenStart,
      formOpenEnd: source.formOpenEnd,
      exhibitionStart: source.exhibitionStart || '',
      exhibitionEnd: source.exhibitionEnd || '',
      description: source.description,
      error: '',
      composing: false
    };
  }

  function freshActivityDraft() {
    return {
      type: 'activity',
      mode: 'create',
      name: '',
      formOpenStart: '',
      formOpenEnd: '',
      exhibitionStart: '',
      exhibitionEnd: '',
      description: '',
      error: '',
      composing: false
    };
  }

  function activityPayloadFromDialog(dialog) {
    return {
      name: String(dialog.name || '').trim(),
      formOpenStart: dialog.formOpenStart,
      formOpenEnd: dialog.formOpenEnd,
      exhibitionStart: dialog.exhibitionStart || '',
      exhibitionEnd: dialog.exhibitionEnd || '',
      description: dialog.description || ''
    };
  }

  async function saveActivityDialog() {
    const d = ui.dialog || {};
    if (d.composing) {
      showActivityDialogError('請先完成文字輸入。');
      return false;
    }
    const validation = validateActivity(d);
    if (validation) {
      showActivityDialogError(validation);
      return false;
    }
    if (writeInFlight) return false;
    writeInFlight = true;
    render();
    try {
      const payload = activityPayloadFromDialog(d);
      const activity = d.sourceId
        ? await window.ActivityIntelligenceApi.duplicateActivity(d.sourceId, payload)
        : await window.ActivityIntelligenceApi.createActivity(payload);
      const normalized = normalizeActivityDto(activity);
      state.activities = d.sourceId
        ? [...state.activities, normalized]
        : [...state.activities.filter(item => item.id !== normalized.id), normalized];
      ui.dialog = null;
      ui.selectedActivityId = normalized.id;
      ui.view = 'workspace';
      ui.tab = 'overview';
      await loadFormForActivity(normalized.id);
      toast(d.sourceId ? 'Activity duplicated.' : 'Activity created.');
      return true;
    } catch (error) {
      showActivityDialogError(error.message || 'Activity save failed.');
      return false;
    } finally {
      writeInFlight = false;
    }
    const source = d.sourceId ? state.activities.find(a => a.id === d.sourceId) : null;
    const activity = {
      id: newUuid(),
      name: d.name.trim(),
      formOpenStart: d.formOpenStart,
      formOpenEnd: d.formOpenEnd,
      exhibitionStart: d.exhibitionStart || '',
      exhibitionEnd: d.exhibitionEnd || '',
      description: d.description || '',
      formFields: Store.clone(source ? source.formFields : Store.defaultFields()),
      formDesignRuntime: Store.clone(source ? formDesign(source) : Store.formDesignFromFormFields(Store.defaultFields())),
      createdByUserId: currentUser.userId,
      createdByDisplayName: currentUser.displayName,
      createdAt: Store.nowStamp(),
      updatedByUserId: currentUser.userId,
      updatedByDisplayName: currentUser.displayName,
      updatedAt: Store.nowStamp()
    };
    if (source) {
      activity.formFields = activity.formFields.map(f => ({ ...f, fieldId: newUuid() }));
      rekeyFormDesignRuntime(activity.formDesignRuntime);
    }
    state.activities.push(activity);
    ui.dialog = null;
    ui.selectedActivityId = activity.id;
    ui.view = 'workspace';
    ui.tab = 'overview';
    toast(source ? '已建立複製活動。' : '已建立活動。');
    return true;
  }

  function showActivityDialogError(message) {
    if (ui.dialog) ui.dialog.error = message;
    const error = document.getElementById('aim-dialog-error');
    if (error) error.textContent = message;
  }

  async function saveSettings() {
    const a = selectedActivity();
    const d = { ...a, ...ui.drawer };
    const validation = validateActivity(d);
    if (validation) return toast(validation);
    if (writeInFlight) return;
    writeInFlight = true;
    render();
    try {
      const updated = await window.ActivityIntelligenceApi.updateActivity(a.id, activityPayloadFromDialog(d));
      const normalized = normalizeActivityDto(updated);
      state.activities = state.activities.map(activity => activity.id === normalized.id ? { ...activity, ...normalized } : activity);
      ui.drawer = null;
      toast('Activity settings saved.');
    } catch (error) {
      toast(error.message || 'Activity settings save failed.');
    } finally {
      writeInFlight = false;
    }
    return;
    ['name', 'formOpenStart', 'formOpenEnd', 'exhibitionStart', 'exhibitionEnd', 'description'].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(ui.drawer, key)) a[key] = ui.drawer[key];
    });
    Store.touch(a, currentUser);
    ui.drawer = null;
    toast('已儲存活動設定。');
  }

  function validateActivity(data) {
    if (!data.name || !data.name.trim()) return '請填寫活動名稱。';
    if (!data.formOpenStart || !data.formOpenEnd) return '請填寫表單開放開始與結束日期。';
    if (data.formOpenEnd < data.formOpenStart) return '表單開放結束日期不可早於開始日期。';
    if ((data.exhibitionStart && !data.exhibitionEnd) || (!data.exhibitionStart && data.exhibitionEnd)) return '展期日期請同時填寫開始與結束，或兩者都留空。';
    if (data.exhibitionStart && data.exhibitionEnd && data.exhibitionEnd < data.exhibitionStart) return '展期結束日期不可早於開始日期。';
    return '';
  }

  function formDesignChangeSummary(design) {
    const publishedMap = new Map(design.published.items.map(item => [designerItemKey(item), item]));
    let added = 0;
    let modified = 0;
    let removed = 0;
    const addedItems = [];
    const modifiedItems = [];
    const removedItems = [];
    design.draft.items.forEach(item => {
      const key = designerItemKey(item);
      const published = publishedMap.get(key);
      if (item.removedInDraft && published) {
        removed += 1;
        removedItems.push(item);
      } else if (!published) {
        added += 1;
        addedItems.push(item);
      } else if (!designerItemsEqual(item, published)) {
        modified += 1;
        modifiedItems.push(item);
      }
    });
    return { added, modified, removed, total: added + modified + removed, addedItems, modifiedItems, removedItems };
  }

  function renderDraftChangeSummary(design) {
    const summary = formDesignChangeSummary(design);
    const groups = [
      ['新增未發布', summary.addedItems],
      ['有未發布變更', summary.modifiedItems],
      ['發布後將移除', summary.removedItems]
    ];
    return `
      <section class="aim-draft-summary">
        <div>
          <strong>草稿有 ${summary.total} 項尚未發布的變更</strong>
          <p>新增 ${summary.added}｜修改 ${summary.modified}｜預計移除 ${summary.removed}</p>
        </div>
        <div class="aim-draft-summary-groups">
          ${groups.map(([label, items]) => `
            <div class="aim-draft-summary-group">
              <span>${Store.escapeHtml(label)}</span>
              <strong>${items.length}</strong>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function draftItemStatus(design, item) {
    const published = design.published.items.find(entry => designerItemKey(entry) === designerItemKey(item));
    if (item.removedInDraft && published) return { key: 'removed', label: '草稿中移除' };
    if (item.visible === false) return { key: 'hidden', label: '已隱藏' };
    if (!published) return { key: 'new', label: '新增未發布' };
    if (!designerItemsEqual(item, published)) return { key: 'modified', label: '有未發布變更' };
    return { key: 'active', label: '正式使用中' };
  }

  function designerItemSummary(item) {
    if (item.type === 'card_link') return 'Preview-only；不寫入紀錄答案';
    if (item.type === 'form_thumbnail') return item.thumbnailTitle || item.altText || '16:9 表單縮圖';
    if (choiceFieldTypes.includes(item.type) && item.options.length) return item.options.join('、');
    return item.helperText || item.placeholder || '';
  }

  function invalidDesignerChoiceItem(items) {
    return (items || []).find(item => choiceFieldTypes.includes(item.type) && !item.removedInDraft && (item.options || []).some(value => !String(value || '').trim()));
  }

  function openDiscardDraftDialog() {
    const design = formDesign(selectedActivity());
    if (!formDesignChangeSummary(design).total) return toast('草稿沒有尚未發布的變更。');
    ui.formDesignConfirm = { type: 'discard' };
  }

  function openPublishFormDialog() {
    const design = formDesign(selectedActivity());
    const invalid = invalidDesignerChoiceItem(design.draft.items);
    if (invalid) {
      ui.selectedFieldId = designerItemKey(invalid);
      ui.formDesignDraft = Store.clone(invalid);
      ui.formDesignMessage = '請先移除空白選項，才能發布表單。';
      return;
    }
    ui.formDesignConfirm = { type: 'publish', summary: formDesignChangeSummary(design) };
  }

  async function saveDesignerDraft() {
    const activity = selectedActivity();
    if (!activity || writeInFlight) return;
    writeInFlight = true;
    render();
    try {
      const form = await window.ActivityIntelligenceApi.saveDraft(activity.id, serializeDraftItems(formDesign(activity).draft.items));
      const design = updateActivityFormBundle(activity.id, form);
      ui.formDesignDraftDirty = false;
      ui.formDesignMessage = '';
      ui.selectedFieldId = design.draft.items.find(item => designerItemKey(item) === ui.selectedFieldId)
        ? ui.selectedFieldId
        : (design.draft.items[0] && designerItemKey(design.draft.items[0]));
      const selected = design.draft.items.find(item => designerItemKey(item) === ui.selectedFieldId);
      ui.formDesignDraft = selected ? Store.clone(selected) : null;
      toast('Draft saved.');
    } catch (error) {
      toast(error.message || 'Draft save failed.');
    } finally {
      writeInFlight = false;
      render();
    }
  }

  function serializeDraftItems(items) {
    return (items || []).map((item, index) => {
      const normalized = normalizeDesignerItem(item);
      return {
        formItemId: normalized.formItemId || undefined,
        itemKey: normalized.itemKey,
        type: normalized.type,
        title: normalized.title,
        helperText: normalized.helperText || '',
        placeholder: normalized.placeholder || '',
        optionEntries: normalizeOptionEntries(normalized).map((option, optionIndex) => ({
          optionKey: option.optionKey,
          label: option.label,
          value: option.value || option.label,
          sortOrder: optionIndex + 1
        })),
        allowOther: Boolean(normalized.allowOther),
        visible: normalized.visible !== false,
        removedInDraft: Boolean(normalized.removedInDraft),
        sortOrder: index + 1,
        settings: {
          ...(normalized.settings || {}),
          ...(normalized.thumbnailTitle !== undefined ? { thumbnailTitle: normalized.thumbnailTitle } : {}),
          ...(normalized.altText !== undefined ? { altText: normalized.altText } : {}),
          ...(normalized.thumbnailVariant !== undefined ? { thumbnailVariant: normalized.thumbnailVariant } : {})
        }
      };
    });
  }

  async function discardDesignerDraft() {
    const activity = selectedActivity();
    if (!activity || writeInFlight) return;
    writeInFlight = true;
    render();
    try {
      const form = await window.ActivityIntelligenceApi.discardDraft(activity.id);
      const design = updateActivityFormBundle(activity.id, form);
      ui.formDesignConfirm = null;
      ui.formDesignDraftDirty = false;
      ui.formDesignMessage = '';
      ui.selectedFieldId = design.draft.items[0] && designerItemKey(design.draft.items[0]);
      ui.formDesignDraft = design.draft.items[0] ? Store.clone(design.draft.items[0]) : null;
      toast('Draft discarded.');
    } catch (error) {
      toast(error.message || 'Draft discard failed.');
    } finally {
      writeInFlight = false;
      render();
    }
    return;
    const design = formDesign(activity);
    design.draft.items = Store.clone(design.published.items);
    ui.formDesignConfirm = null;
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    ui.selectedFieldId = design.draft.items[0] && designerItemKey(design.draft.items[0]);
    ui.formDesignDraft = design.draft.items[0] ? Store.clone(design.draft.items[0]) : null;
    Store.touch(activity, currentUser);
    save();
    render();
  }

  async function publishDesignerDraft() {
    const activity = selectedActivity();
    if (!activity || writeInFlight) return;
    writeInFlight = true;
    render();
    try {
      await window.ActivityIntelligenceApi.saveDraft(activity.id, serializeDraftItems(formDesign(activity).draft.items));
      const form = await window.ActivityIntelligenceApi.publishDraft(activity.id);
      const design = updateActivityFormBundle(activity.id, form);
      ui.formDesignConfirm = null;
      ui.formDesignDraftDirty = false;
      ui.formDesignMessage = '';
      ui.formDesignMode = 'published';
      ui.selectedFieldId = design.draft.items[0] && designerItemKey(design.draft.items[0]);
      ui.formDesignDraft = design.draft.items[0] ? Store.clone(design.draft.items[0]) : null;
      toast('Draft published.');
    } catch (error) {
      toast(error.message || 'Draft publish failed.');
    } finally {
      writeInFlight = false;
      render();
    }
    return;
    const design = formDesign(activity);
    const validItems = design.draft.items
      .filter(item => !item.removedInDraft)
      .map(item => ({ ...normalizeDesignerItem(item), removedInDraft: false }));
    design.published.items = Store.clone(validItems);
    design.published.publishedAt = Store.nowStamp();
    design.draft.items = Store.clone(validItems);
    ui.formDesignConfirm = null;
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    ui.formDesignMode = 'published';
    ui.selectedFieldId = design.draft.items[0] && designerItemKey(design.draft.items[0]);
    ui.formDesignDraft = design.draft.items[0] ? Store.clone(design.draft.items[0]) : null;
    Store.touch(activity, currentUser);
    save();
    render();
  }

  function cycleThumbnailVariant() {
    if (!ui.formDesignDraft || ui.formDesignDraft.type !== 'form_thumbnail') return;
    const variants = ['line', 'grid', 'stage'];
    const index = variants.indexOf(ui.formDesignDraft.thumbnailVariant || 'line');
    updateFormDesignDraft({ thumbnailVariant: variants[(index + 1) % variants.length] });
  }

  function rekeyFormDesignRuntime(design) {
    ['published', 'draft'].forEach(version => {
      if (!design[version] || !Array.isArray(design[version].items)) return;
      design[version].items = design[version].items.map(item => {
        if (['card_link', 'form_thumbnail'].includes(item.type)) return item;
        const nextId = newUuid();
        return {
          ...item,
          formItemId: '',
          itemKey: nextId,
          fieldId: nextId,
          itemId: nextId,
          optionEntries: normalizeOptionEntries(item).map(option => ({ ...option, optionKey: newUuid() }))
        };
      });
    });
  }

  function addField(type) {
    addDesignerItem(type || 'short_text');
  }

  function addDesignerItem(type) {
    const activity = selectedActivity();
    const nextType = type || 'short_text';
    const design = formDesign(activity);
    if (['card_link', 'form_thumbnail'].includes(nextType) && design.draft.items.some(item => item.type === nextType)) {
      toast('此元件已加入表單。');
      return;
    }
    let item;
    if (nextType === 'card_link') item = makeCardLinkItem();
    else if (nextType === 'form_thumbnail') item = makeFormThumbnailItem();
    else item = normalizeDesignerItem({
      itemKey: newUuid(),
      type: nextType,
      title: fieldTypeLabel(nextType),
      helperText: '',
      placeholder: '',
      options: choiceFieldTypes.includes(nextType) ? ['選項 1', '選項 2'] : nextType === 'yes_no' ? yesNoOptions.slice() : [],
      allowOther: false,
      visible: true,
      retired: false
    });
    const insertIndex = nextType === 'form_thumbnail' ? Math.min(1, design.draft.items.length) : design.draft.items.length;
    design.draft.items.splice(insertIndex, 0, item);
    ui.selectedFieldId = designerItemKey(item);
    ui.formDesignDraft = Store.clone(item);
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    Store.touch(activity, currentUser);
    toast('已新增項目。');
  }

  function updateField(patch) {
    if (!canDesignForm()) return;
    updateFormDesignDraft(patch);
  }

  function moveField(fieldId, dir) {
    const activity = selectedActivity();
    const list = formDesign(activity).draft.items;
    const index = list.findIndex(f => designerItemKey(f) === fieldId);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(next, 0, item);
    Store.touch(selectedActivity(), currentUser);
    toast('已更新項目順序。');
  }

  function toggleField(fieldId) {
    const item = formDesign(selectedActivity()).draft.items.find(f => designerItemKey(f) === fieldId);
    if (!item || item.removedInDraft) return;
    item.visible = !item.visible;
    if (ui.formDesignDraft && designerItemKey(ui.formDesignDraft) === fieldId) ui.formDesignDraft.visible = item.visible;
    Store.touch(selectedActivity(), currentUser);
    toast(item.visible ? '已顯示項目。' : '已隱藏項目。');
  }

  function copyField(fieldId) {
    const activity = selectedActivity();
    const list = formDesign(activity).draft.items;
    const index = list.findIndex(f => designerItemKey(f) === fieldId);
    if (index < 0) return;
    if (['card_link', 'form_thumbnail'].includes(list[index].type)) return toast('此元件不可複製。');
    const nextId = newUuid();
    const copy = {
      ...Store.clone(list[index]),
      formItemId: '',
      itemKey: nextId,
      fieldId: nextId,
      itemId: nextId,
      optionEntries: normalizeOptionEntries(list[index]).map(option => ({ ...option, optionKey: newUuid() })),
      title: `${list[index].title} 複製`,
      retired: false,
      removedInDraft: false
    };
    copy.options = copy.optionEntries.map(option => option.label);
    list.splice(index + 1, 0, copy);
    ui.selectedFieldId = designerItemKey(copy);
    ui.formDesignDraft = Store.clone(copy);
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    Store.touch(selectedActivity(), currentUser);
    toast('已複製項目。');
  }

  function deleteField(fieldId) {
    const activity = selectedActivity();
    const design = formDesign(activity);
    const index = design.draft.items.findIndex(f => designerItemKey(f) === fieldId);
    if (index < 0) return;
    const published = design.published.items.some(item => designerItemKey(item) === fieldId);
    if (published) {
      design.draft.items[index].removedInDraft = true;
      design.draft.items[index].visible = false;
      ui.formDesignDraft = Store.clone(design.draft.items[index]);
      ui.selectedFieldId = fieldId;
    } else {
      design.draft.items.splice(index, 1);
      const next = design.draft.items[Math.min(index, design.draft.items.length - 1)] || null;
      ui.selectedFieldId = next && designerItemKey(next);
      ui.formDesignDraft = next ? Store.clone(next) : null;
    }
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    Store.touch(activity, currentUser);
    toast(published ? '已標記發布後移除。' : '已移除草稿項目。');
  }

  function restoreDesignerItem(fieldId) {
    const item = formDesign(selectedActivity()).draft.items.find(f => designerItemKey(f) === fieldId);
    if (!item) return;
    item.removedInDraft = false;
    item.visible = true;
    ui.selectedFieldId = fieldId;
    ui.formDesignDraft = Store.clone(item);
    ui.formDesignDraftDirty = false;
    ui.formDesignMessage = '';
    Store.touch(selectedActivity(), currentUser);
    toast('已復原項目。');
  }

  function retireField(fieldId) {
    deleteField(fieldId);
  }

  function fieldHasAnswers(activityId, fieldId) {
    return recordsFor(activityId).some(r => hasValue(r.answers[fieldId]));
  }

  function setWorking(fieldId, value) {
    if (!ui.drawer || !ui.drawer.working) return;
    if (Array.isArray(value) ? value.length : String(value || '').trim()) ui.drawer.working[fieldId] = value;
    else delete ui.drawer.working[fieldId];
    if (value !== otherAnswerValue && (!Array.isArray(value) || !value.includes(otherAnswerValue))) setWorkingOther(fieldId, '');
  }

  function setQuickAnswer(fieldId, value) {
    if (Array.isArray(value) ? value.length : String(value || '').trim()) ui.quickAnswers[fieldId] = value;
    else delete ui.quickAnswers[fieldId];
    if (value !== otherAnswerValue && (!Array.isArray(value) || !value.includes(otherAnswerValue))) setQuickOtherAnswer(fieldId, '');
  }

  function setWorkingOther(fieldId, value) {
    if (!ui.drawer) return;
    if (!ui.drawer.workingOther) ui.drawer.workingOther = {};
    if (String(value || '').trim()) ui.drawer.workingOther[fieldId] = value;
    else delete ui.drawer.workingOther[fieldId];
  }

  function setQuickOtherAnswer(fieldId, value) {
    if (String(value || '').trim()) ui.quickOtherAnswers[fieldId] = value;
    else delete ui.quickOtherAnswers[fieldId];
  }

  function setRuntimeCardLink(context, linked) {
    const next = { linked: Boolean(linked), variant: 'default' };
    if (context === 'drawer' && ui.drawer) ui.drawer.workingCardLink = next;
    else if (context === 'quick') ui.quickCardLink = next;
  }

  function canCreateRecord(activity) {
    return currentUser && currentUser.authenticated && activity && activityStatus(activity).key === 'open';
  }

  function canViewRecord(record, activity) {
    if (!currentUser || !currentUser.authenticated || !record || !activity || record.activityId !== activity.id) return false;
    return canManageRecords() || isRecorder();
  }

  function canEditRecord(record, activity) {
    if (!canViewRecord(record, activity) || record.status === 'void') return false;
    if (canManageRecords()) return true;
    return isRecorder() && record.createdByUserId === currentUser.userId;
  }

  function canVoidRecord(record, activity) {
    if (!canViewRecord(record, activity) || record.status === 'void') return false;
    if (canManageRecords()) return true;
    return isRecorder() && record.createdByUserId === currentUser.userId;
  }

  function canCancelVoidRecord(record, activity) {
    if (!canViewRecord(record, activity) || record.status !== 'void') return false;
    if (canManageRecords()) return true;
    return isRecorder() && record.createdByUserId === currentUser.userId;
  }

  function canOpenRecordDrawer(record, activity) {
    if (!canViewRecord(record, activity)) return false;
    return record.status === 'void' ? canCancelVoidRecord(record, activity) : canEditRecord(record, activity);
  }

  function saveQuickRecord() {
    toast(formalDeferredMessage);
    return;
    const activity = selectedActivity();
    if (!canCreateRecord(activity)) return toast('表單目前未開放，無法新增紀錄。');
    const items = publishedRecordItems(activity);
    createRecord(activity, cleanAnswersForItems(ui.quickAnswers || {}, items), cleanOtherAnswers(ui.quickOtherAnswers || {}, ui.quickAnswers || {}, items), cleanCardLink(ui.quickCardLink), items);
    ui.quickAnswers = {};
    ui.quickOtherAnswers = {};
    ui.quickCardLink = { linked: false, variant: 'default' };
    ui.focusQuickFirst = true;
    ui.tab = 'records';
    ui.records.scope = 'entry';
    toast('已儲存一筆紀錄。');
  }

  function createRecord(activity, answers, otherAnswers, cardLink, items) {
    const snapshotItems = Store.clone(items || publishedRecordItems(activity));
    state.records.push({
      id: newUuid(),
      activityId: activity.id,
      status: 'active',
      answers,
      runtimeOtherAnswers: otherAnswers || {},
      runtimeCardLink: cardLink || { linked: false, variant: 'default' },
      formRuntimeSnapshot: {
        publishedAt: formDesign(activity).published.publishedAt || '',
        items: snapshotItems
      },
      createdByUserId: currentUser.userId,
      createdByDisplayName: currentUser.displayName,
      createdAt: Store.nowStamp(),
      updatedByUserId: currentUser.userId,
      updatedByDisplayName: currentUser.displayName,
      updatedAt: Store.nowStamp()
    });
  }

  function saveRecord() {
    const record = state.records.find(r => r.id === ui.drawer.id);
    if (!canEditRecord(record, selectedActivity())) return toast('沒有權限編輯此紀錄。');
    const items = snapshotRecordItems(record, selectedActivity());
    record.answers = cleanAnswersForItems(ui.drawer.working || {}, items);
    record.runtimeOtherAnswers = cleanOtherAnswers(ui.drawer.workingOther || {}, ui.drawer.working || {}, items);
    record.runtimeCardLink = cleanCardLink(ui.drawer.workingCardLink || cardLinkForRecord(record));
    record.updatedByUserId = currentUser.userId;
    record.updatedByDisplayName = currentUser.displayName;
    record.updatedAt = Store.nowStamp();
    ui.drawer = null;
    toast('已儲存紀錄。');
  }

  function cleanAnswersForItems(source, items) {
    const result = {};
    answerProducingItems(items).forEach(item => {
      const value = source[item.fieldId];
      if (Array.isArray(value) ? value.length : String(value || '').trim()) result[item.fieldId] = value;
    });
    return result;
  }

  function cleanOtherAnswers(source, answers, items) {
    const result = {};
    answerProducingItems(items).filter(item => item.allowOther).forEach(item => {
      const answer = answers[item.fieldId];
      const usesOther = Array.isArray(answer) ? answer.includes(otherAnswerValue) : answer === otherAnswerValue;
      const value = source[item.fieldId];
      if (usesOther && String(value || '').trim()) result[item.fieldId] = String(value).trim();
    });
    return result;
  }

  function cleanCardLink(cardLink) {
    return cardLink && cardLink.linked ? { linked: true, variant: cardLink.variant || 'default' } : { linked: false, variant: 'default' };
  }

  function voidRecord(id) {
    const record = state.records.find(r => r.id === id);
    if (!canVoidRecord(record, selectedActivity())) return toast('沒有權限作廢此紀錄。');
    if (!window.confirm('確定要作廢此紀錄？')) return;
    record.status = 'void';
    record.updatedByUserId = currentUser.userId;
    record.updatedByDisplayName = currentUser.displayName;
    record.updatedAt = Store.nowStamp();
    if (ui.drawer && ui.drawer.type === 'record' && ui.drawer.id === record.id) ui.drawer = null;
    toast('已作廢紀錄。');
  }

  function cancelVoidRecord(id) {
    const record = state.records.find(r => r.id === id);
    if (!canCancelVoidRecord(record, selectedActivity())) return toast('沒有權限取消作廢此紀錄。');
    if (!window.confirm('確定要取消作廢此紀錄？')) return;
    record.status = 'active';
    record.updatedByUserId = currentUser.userId;
    record.updatedByDisplayName = currentUser.displayName;
    record.updatedAt = Store.nowStamp();
    if (ui.drawer && ui.drawer.type === 'record' && ui.drawer.id === record.id) ui.drawer = null;
    toast('已取消作廢紀錄。');
  }

  function exportCsv(records, activity, scope) {
    toast(formalDeferredMessage);
    return;
    const rows = records;
    const fields = exportFields(activity, rows);
    const header = ['活動名稱', '紀錄 ID', '建立者', '建立時間', '最近更新者', '最近更新', '紀錄狀態', ...fields.map(f => f.title)];
    const body = rows.map(r => [activity.name, r.id, r.createdByDisplayName, Store.formatDateTime(r.createdAt), r.updatedByDisplayName, Store.formatDateTime(r.updatedAt), r.status === 'void' ? '作廢' : '有效', ...fields.map(f => Store.answerText(r.answers[f.fieldId]))]);
    const csv = '\uFEFF' + [header, ...body].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activity.name}-${scope}-${Store.CURRENT_DATE}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast('已匯出 CSV。');
  }

  function exportFields(activity, records) {
    const current = activity.formFields.filter(f => f.type !== 'section_heading');
    const known = new Set(current.map(f => f.fieldId));
    const historical = [];
    records.forEach(r => Object.keys(r.answers).forEach(fieldId => {
      if (!known.has(fieldId)) {
        known.add(fieldId);
        historical.push({ fieldId, title: fieldId });
      }
    }));
    return [...current, ...historical];
  }

  function resetData() {
    if (!window.confirm('確定要重設 本階段資料？這會還原 V2 繁體中文範例資料。')) return;
    state = Store.reset();
    ui.selectedActivityId = state.selectedActivityId;
    ui.view = 'overview';
    ui.tab = 'overview';
    ui.drawer = null;
    ui.expandedRecords.personal.clear();
    ui.expandedRecords.all.clear();
    ui.records.showVoidRecords = false;
    ui.records.state = 'normal';
    toast('已重設 本階段資料。');
  }

  function clean(answers) {
    const result = {};
    Object.keys(answers).forEach(key => {
      const value = answers[key];
      if (Array.isArray(value) ? value.length : String(value || '').trim()) result[key] = value;
    });
    return result;
  }

  function count(items, getter) {
    return items.reduce((acc, item) => {
      const key = getter(item) || '未提供';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean))).sort();
  }

  function hasValue(value) {
    return Array.isArray(value) ? value.length > 0 : String(value || '').trim().length > 0;
  }

  function option(value, label, selected) {
    return `<option value="${Store.escapeHtml(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${Store.escapeHtml(label)}</option>`;
  }

  function statusPill(status) {
    return `<span class="aim-pill aim-pill-${status.key}">${Store.escapeHtml(status.label)}</span>`;
  }

  function priorityPill(value) {
    const klass = value === '高' ? 'aim-pill-high' : value === '中' ? 'aim-pill-medium' : value === '低' ? 'aim-pill-low' : '';
    return `<span class="aim-pill ${klass}">${Store.escapeHtml(value)}</span>`;
  }

  function fieldTypeLabel(type) {
    const found = fieldTypes.concat(specialDesignerTypes).find(([key]) => key === type);
    return found ? found[1] : type;
  }

  function formState(key) {
    if (key === 'upcoming') return '尚未開放新增紀錄';
    if (key === 'open') return '可以新增紀錄';
    return '已停止新增紀錄';
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function toast(message) {
    ui.toast = message;
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => {
      ui.toast = '';
      render();
    }, 2200);
  }
})();
