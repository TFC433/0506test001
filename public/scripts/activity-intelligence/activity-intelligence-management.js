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
    ['form_thumbnail', '頁首橫幅'],
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
  const cardLinkHelperCopy = '連結本表單紀錄訪客的名片';
  const formalDeferredMessage = '此功能尚未啟用。';
  const otherAnswerValue = '其他';
  const rawCardPickerPageSize = 15;
  const previewPlacementValues = new Set(['none', 'primary', 'badges', 'text']);
  const previewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'multiple_choice', 'dropdown']);
  const compactPreviewChoiceFieldTypes = new Set(['yes_no', 'single_choice', 'dropdown']);
  const expandedCompactFieldTypes = new Set(['short_text', 'number', 'yes_no', 'single_choice', 'dropdown', 'boolean', 'checkbox', 'toggle']);
  const expandedCompactCategoricalFieldTypes = new Set(['yes_no', 'single_choice', 'dropdown']);
  const fixedPreviewFieldIds = new Set(['fld_customer_name', 'fld_company', 'fld_job_title', 'fld_priority']);
  const thumbnailDefaults = Object.freeze({
    driveFileId: '',
    fit: 'cover',
    focalX: 50,
    focalY: 50,
    zoom: 1
  });
  const thumbnailFitOptions = new Set(['cover', 'contain']);

  let state = { activities: [], records: [], selectedActivityId: null };
  let currentUser = null;
  const formBundles = new Map();
  const recordLoadState = new Map();
  let rawCards = [];
  let rawCardsLoaded = false;
  let writeInFlight = false;
  let previewRefreshFrame = 0;
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
    quickCardLink: { linked: false, cardId: null, card: null },
    cardPicker: null,
    hardDeleteConfirm: null,
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
    currentUser = await resolveFormalCurrentUser();
    if (currentUser.authenticated) {
      try {
        await loadActivitiesFromApi();
      } catch (error) {
        toast(error.message || 'Activity Intelligence load failed.');
      }
    }
    applyRoleLanding();
    if (currentUser.authenticated && ui.selectedActivityId && (ui.tab === 'records' || ui.tab === 'analytics')) {
      await loadRecordsForActivity(ui.selectedActivityId, { includeVoid: true });
    }
    render();
  }

  function save() {
    state.selectedActivityId = ui.selectedActivityId;
  }

  async function resolveFormalCurrentUser() {
    if (!window.ActivityIntelligenceSession || typeof window.ActivityIntelligenceSession.ensureSession !== 'function') {
      return {
        authenticated: false,
        role: 'recorder',
        userId: '',
        displayName: '尚未登入',
        pictureUrl: '',
        message: 'Activity Intelligence LINE 工作階段尚未準備完成。'
      };
    }

    const session = await window.ActivityIntelligenceSession.ensureSession();
    return {
      authenticated: Boolean(session && session.authenticated),
      role: session && session.role ? session.role : 'recorder',
      realRole: session && session.realRole,
      localPreviewRole: session && session.localPreviewRole,
      localPreviewEnabled: Boolean(session && session.localPreviewEnabled),
      userId: session && session.userId ? session.userId : '',
      displayName: session && session.displayName ? session.displayName : '尚未登入',
      pictureUrl: session && session.pictureUrl ? session.pictureUrl : '',
      message: session && session.message,
      forbidden: Boolean(session && session.forbidden),
      canLineLogin: Boolean(session && session.canLineLogin),
      source: 'line-session'
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
    recordLoadState.clear();
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
    const cached = formBundles.get(activityId);
    if (cached && cached.isCompleteBundle && cached.published.versionId && cached.draft.versionId) return cached;
    const form = await window.ActivityIntelligenceApi.getForm(activityId);
    return updateActivityFormBundle(activityId, form);
  }

  async function loadPublishedFormForActivity(activityId) {
    if (!activityId) return null;
    const existing = formBundles.get(activityId);
    if (existing && existing.published && existing.published.versionId && existing.published.items.length) return existing;
    const published = await window.ActivityIntelligenceApi.getPublishedForm(activityId);
    const merged = {
      ...(existing || normalizeFormBundleDto(null)),
      published: normalizeVersionDto(published),
      isCompleteBundle: Boolean(existing && existing.isCompleteBundle)
    };
    formBundles.set(activityId, merged);
    const activity = state.activities.find(item => item.id === activityId);
    if (activity) {
      activity.formDesignRuntime = merged;
      activity.formFields = Store.clone(merged.published.items || []);
    }
    return merged;
  }

  function updateActivityFormBundle(activityId, form) {
    const bundle = normalizeFormBundleDto(form);
    bundle.isCompleteBundle = true;
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
      draft: normalizeVersionDto(form && form.draft),
      isCompleteBundle: Boolean(form && form.published && form.draft)
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

  async function loadRecordsForActivity(activityId, options) {
    if (!activityId || !window.ActivityIntelligenceApi) return [];
    const includeVoid = options && options.includeVoid !== undefined ? options.includeVoid : true;
    const loadKey = `${activityId}:${includeVoid ? 'all' : 'active'}`;
    const current = recordLoadState.get(loadKey);
    if (current === 'loaded') return recordsFor(activityId);
    if (current === 'loading') return recordsFor(activityId);

    recordLoadState.set(loadKey, 'loading');
    try {
      await loadPublishedFormForActivity(activityId);
      const submissions = await window.ActivityIntelligenceApi.listSubmissions(activityId, {
        state: includeVoid ? 'all' : 'active'
      });
      const normalized = (submissions || []).map(normalizeSubmissionDto);
      const submissionIds = new Set(normalized.map(record => record.id));
      state.records = state.records.filter(record => record.activityId !== activityId || !submissionIds.has(record.id));
      state.records = state.records.filter(record => record.activityId !== activityId).concat(normalized);
      recordLoadState.set(loadKey, 'loaded');
      return recordsFor(activityId);
    } catch (error) {
      recordLoadState.delete(loadKey);
      toast(error.message || 'Submission load failed.');
      return recordsFor(activityId);
    }
  }

  function replaceRecord(record) {
    const normalized = normalizeSubmissionDto(record);
    state.records = state.records.filter(item => item.id !== normalized.id).concat(normalized);
    return normalized;
  }

  function normalizeSubmissionDto(submission) {
    const formSnapshot = submission && (submission.formSnapshot || submission.formRuntimeSnapshot);
    const card = normalizeRawCard(submission && submission.card);
    return {
      ...submission,
      id: submission.submissionId || submission.id,
      submissionId: submission.submissionId || submission.id,
      activityId: submission.activityId,
      formVersionId: submission.formVersionId,
      status: submission.status || 'active',
      cardId: submission.cardId || (card && card.cardId) || null,
      answers: normalizeAnswerValues(submission.answers || {}, formSnapshot && formSnapshot.items),
      runtimeOtherAnswers: submission.otherAnswers || submission.runtimeOtherAnswers || {},
      runtimeCardLink: card ? { linked: true, cardId: card.cardId, card } : (submission.cardId ? { linked: true, cardId: submission.cardId, card: null } : { linked: false, cardId: null, card: null }),
      formRuntimeSnapshot: formSnapshot ? {
        versionId: formSnapshot.versionId,
        versionNumber: formSnapshot.versionNumber,
        publishedAt: formSnapshot.publishedAt || '',
        items: ((formSnapshot.items) || []).map(normalizeDesignerItem)
      } : null
    };
  }

  function normalizeAnswerValues(answers, items) {
    const itemMap = new Map(((items || []).map(normalizeDesignerItem)).map(item => [item.fieldId, item]));
    return Object.entries(answers || {}).reduce((acc, [fieldId, value]) => {
      acc[fieldId] = normalizeAnswerValue(value, itemMap.get(fieldId));
      return acc;
    }, {});
  }

  function normalizeAnswerValue(value, item) {
    if (item && item.type === 'yes_no') {
      if (value === true) return yesNoOptions[0];
      if (value === false) return yesNoOptions[1];
    }
    if (!item || !choiceFieldTypes.includes(item.type)) return value;
    if (Array.isArray(value)) return value.map(entry => optionLabel(entry, item)).filter(hasValue);
    return optionLabel(value, item);
  }

  function optionLabel(value, item) {
    if (value && typeof value === 'object') {
      if (value.optionKey) {
        const match = (item.optionEntries || []).find(option => option.optionKey === value.optionKey);
        if (match) return match.label;
      }
      return value.label || value.value || '';
    }
    return value;
  }

  async function loadRawCards(options) {
    if (rawCardsLoaded && !(options && options.force)) return rawCards;
    const cards = await window.ActivityIntelligenceApi.listRawCards();
    rawCards = (cards || []).map(normalizeRawCard).filter(card => card && card.cardId);
    rawCardsLoaded = true;
    return rawCards;
  }

  function normalizeRawCard(card) {
    if (!card) return null;
    const driveFileId = card.driveFileId || card.drive_file_id || '';
    return {
      cardId: card.cardId || card.card_id || '',
      rowIndex: card.rowIndex || card.row_index || '',
      name: card.name || '',
      company: card.company || card.companyName || '',
      department: card.department || '',
      position: card.position || card.jobTitle || '',
      email: card.email || '',
      phone: card.phone || '',
      mobile: card.mobile || '',
      driveFileId,
      driveLink: card.driveLink || card.drive_link || '',
      driveFilename: card.driveFilename || card.drive_filename || card.sourceFilename || '',
      createdTime: card.createdTime || card.created_time || card.createdAt || card.created_at || '',
      thumbnailUrl: rawCardImageUrl({ driveLink: card.driveLink || card.drive_link || '', driveFileId })
    };
  }

  function rawCardImageUrl(card) {
    if (!card) return '';
    const driveLink = card.driveLink || card.drive_link || '';
    const driveFileId = card.driveFileId || card.drive_file_id || '';
    if (driveLink && driveLink !== 'undefined' && driveLink !== 'null') return `/api/drive/thumbnail?link=${encodeURIComponent(driveLink)}`;
    if (driveFileId && driveFileId !== 'undefined' && driveFileId !== 'null') return `/api/drive/thumbnail?fileId=${encodeURIComponent(driveFileId)}`;
    return '';
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

  function canHardDelete() {
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
    cancelScheduledFormPreviewRefresh();
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
      ${renderHardDeleteConfirmDialog()}
      ${renderCardPickerDialog()}
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
        <button class="aim-product-brand" data-action="home" type="button" aria-label="回到活動情報管理首頁">
          <img class="aim-brand-logo" src="../images/logo-full.svg" alt="FANUC force">
          <strong class="aim-product-title">活動情報管理</strong>
        </button>
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
    if (!currentUser.authenticated) items.push({ label: '活動情報管理' });
    else if (isRecorder()) {
      if (ui.view === 'workspace' && openActivities().length > 1) items.push({ label: '開放活動', action: 'home' });
      if (ui.view === 'workspace' && activity) items.push({ label: activity.name });
      items.push({ label: '表單紀錄' });
    } else {
      items.push({ label: '所有活動', action: ui.view === 'workspace' ? 'home' : '' });
      if (ui.view === 'workspace' && activity) {
        items.push({ label: activity.name, action: ui.tab !== 'overview' ? 'activity-overview' : '' });
        items.push({ label: moduleLabel(activeModule()) });
      }
    }
    return `<nav class="aim-breadcrumb" aria-label="麵包屑">${items.map((item, index) => {
      const isCurrent = index === items.length - 1 || !item.action;
      if (isCurrent) return `<span${index === items.length - 1 ? ' aria-current="page"' : ''}>${Store.escapeHtml(item.label)}</span>`;
      return `<button class="aim-breadcrumb-link" data-action="${item.action}" type="button">${Store.escapeHtml(item.label)}</button>`;
    }).join('<b aria-hidden="true">/</b>')}</nav>`;
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
    if (!currentUser || !currentUser.localPreviewEnabled || !window.ActivityIntelligenceSession?.isLocalDevelopment()) return '';
    const selected = currentUser.localPreviewRole || currentUser.role || 'recorder';
    return `
      <label class="aim-preview-control">本機測試角色
        <select class="aim-select" id="aim-role-preview" aria-label="本機測試角色">
          ${option('super_admin', 'super_admin', selected)}
          ${option('admin', 'admin', selected)}
          ${option('recorder', 'recorder', selected)}
        </select>
      </label>
    `;
  }


  function renderAuthState() {
    return `
      <section class="aim-empty">
        <h2>尚未取得實際白名單角色</h2>
        <p>${Store.escapeHtml(currentUser.message || '請先建立有效的 LINE 工作階段。')}</p>
        ${currentUser.canLineLogin ? '<button class="aim-button aim-button-primary" data-action="line-login" type="button">使用 LINE 登入</button>' : ''}
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

  function goHome() {
    ui.drawer = null;
    ui.dialog = null;
    ui.cardPicker = null;
    if (isRecorder()) {
      applyRoleLanding();
      return;
    }
    ui.view = 'overview';
    ui.tab = 'overview';
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
            ${canHardDelete() ? `<button class="aim-button aim-button-danger-soft" type="button" data-action="open-hard-delete-activity" data-id="${activity.id}">永久刪除</button>` : ''}
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
            <div class="aim-panel"><h3>追蹤品質</h3><dl class="aim-definition-list"><dt>低完整度</dt><dd>${metrics.low}</dd><dt>最近紀錄</dt><dd>${metrics.lastRecord ? Store.formatDateTime(metrics.lastRecord) : '<span class="aim-muted-dash">—</span>'}</dd></dl></div>
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
                ${preview.jobTitle ? `<span class="aim-record-card-job-title">${Store.escapeHtml(preview.jobTitle)}</span>` : ''}
                ${preview.company ? `<span class="aim-record-card-company">${Store.escapeHtml(preview.company)}</span>` : ''}
                ${preview.primaryGroup || preview.priority ? '<span class="aim-preview-sep" aria-hidden="true">|</span>' : ''}
                ${preview.primaryGroup ? renderPreviewPrimaryGroup(preview.primaryGroup) : ''}
                ${preview.priority ? `<span class="aim-record-card-status-group"><span class="aim-record-preview-label">${Store.escapeHtml(preview.priorityLabel || '後續追蹤優先度')}</span>${priorityPill(preview.priority)}</span>` : ''}
              </div>
            </div>
            ${renderRecordPreviewContent(preview, context)}
          </div>
          <div class="aim-record-card-right-rail">
            ${renderRecordReviewActions(record, activity, context, expanded)}
            <div class="aim-record-card-biz-slot">${renderRecordCardThumb(record)}</div>
          </div>
        </div>
        ${expanded ? renderInlineRecordDetail(record, activity) : ''}
      </article>
    `;
  }

  function renderRecordCardThumb(record) {
    const link = cardLinkForRecord(record);
    if (!link.linked) return '未連結名片';
    return `<button class="aim-record-card-thumb-button" data-action="open-card-lightbox" data-card-id="${Store.escapeHtml(link.cardId || '')}" data-viewer-context="linked" type="button" aria-label="開啟名片預覽">${renderRawCardVisual(link.card, 'thumb')}</button>`;
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
    const detail = renderRecordDetailItems(items, record);
    return `
      <div class="aim-inline-record-detail">
        <section class="aim-inline-record-meta-card" aria-label="紀錄資訊">
          <dl class="aim-inline-record-meta">
            <div><dt>活動</dt><dd>${Store.escapeHtml(activity.name)}</dd></div>
            <div><dt>紀錄者</dt><dd>${Store.escapeHtml(record.createdByDisplayName)}</dd></div>
            <div><dt>建立時間</dt><dd>${Store.formatDateTime(record.createdAt)}</dd></div>
            <div><dt>最近更新</dt><dd>${Store.formatDateTime(record.updatedAt)}，${Store.escapeHtml(record.updatedByDisplayName)}</dd></div>
            ${record.status === 'void' ? '<div><dt>狀態</dt><dd><span class="aim-pill aim-pill-void">已作廢</span></dd></div>' : ''}
          </dl>
        </section>
        <div class="aim-record-detail-body ${detail.cardRailHtml ? 'aim-record-detail-body-with-rail' : ''}">
          <div class="aim-record-detail-sheet">${detail.rowsHtml || '<p class="aim-inline-record-empty">此紀錄沒有已填寫的內容。</p>'}</div>
          ${detail.cardRailHtml ? `<aside class="aim-record-detail-card-rail" aria-label="名片">${detail.cardRailHtml}</aside>` : ''}
        </div>
      </div>
    `;
  }

  function renderRecordDetailItems(items, record) {
    const rows = [];
    const cardRail = [];
    let compactRun = [];
    const flushCompactRun = () => {
      if (!compactRun.length) return;
      rows.push(`<div class="aim-record-detail-grid">${compactRun.join('')}</div>`);
      compactRun = [];
    };
    (items || []).forEach(item => {
      const detail = renderRecordDetailItem(item, record);
      if (!detail) return;
      if (detail.kind === 'card') {
        cardRail.push(detail.html);
        return;
      }
      if (detail.kind === 'compact') {
        compactRun.push(detail.html);
        return;
      }
      flushCompactRun();
      rows.push(detail.html);
    });
    flushCompactRun();
    return {
      rowsHtml: rows.join(''),
      cardRailHtml: cardRail.join('')
    };
  }

  function renderRecordDetailItem(item, record) {
    if (item.type === 'section_heading') return { kind: 'full', html: `<section class="aim-record-detail-section"><h3>${Store.escapeHtml(item.title)}</h3></section>` };
    if (item.type === 'information_text' || item.type === 'form_thumbnail') return null;
    if (item.type === 'card_link') {
      const cardLink = cardLinkForRecord(record);
      if (!cardLink.linked) return null;
      return { kind: 'card', html: renderRuntimeCardLink(item, false, cardLink, 'detail') };
    }
    const answers = record && record.answers ? record.answers : {};
    const value = displayAnswerValue(item, answers[item.fieldId], otherAnswersForRecord(record));
    if (!hasValue(value)) return null;
    if (expandedCompactCategoricalFieldTypes.has(item.type)) return { kind: 'compact', html: renderRecordDetailCompactCategoricalField(item, value) };
    if (expandedCompactFieldTypes.has(item.type)) return { kind: 'compact', html: renderRecordDetailCompactField(item, value) };
    if (item.type === 'multiple_choice') return { kind: 'full', html: renderRecordDetailChoiceField(item, value) };
    if (item.type === 'long_text') return { kind: 'full', html: renderRecordDetailLongText(item, value) };
    return null;
  }

  function renderRecordReviewActions(record, activity, context, expanded) {
    const toggle = `<button class="aim-button" data-action="toggle-record-expansion" data-context="${context}" data-id="${record.id}" aria-expanded="${expanded}" type="button">${expanded ? '收合' : '查看'}</button>`;
    const hardDelete = canHardDelete() ? `<button class="aim-button aim-button-danger-soft" data-action="open-hard-delete-submission" data-id="${record.id}" type="button">永久刪除</button>` : '';
    if (!expanded) return `<div class="aim-record-actions">${toggle}${hardDelete}</div>`;
    const edit = canOpenRecordDrawer(record, activity) ? `<button class="aim-button" data-action="edit-record" data-id="${record.id}" type="button">編輯</button>` : '';
    return `<div class="aim-record-actions">${toggle}${edit}${hardDelete}</div>`;
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
    const items = answerProducingItems(snapshotRecordItems(record, activity));
    const fields = items.filter(field => hasValue(record.answers[field.fieldId]));
    const otherAnswers = otherAnswersForRecord(record);
    const customerField = fields.find(field => field.fieldId === 'fld_customer_name') || fields.find(field => /客戶|受訪者|姓名/.test(field.title));
    const companyField = fields.find(field => field.fieldId === 'fld_company') || fields.find(field => /公司|企業|組織/.test(field.title));
    const jobTitleField = fields.find(field => field.fieldId === 'fld_job_title') || fields.find(field => /職稱|職位|頭銜|title/i.test(field.title));
    const priorityField = fields.find(field => field.fieldId === 'fld_priority') || fields.find(field => /優先/.test(field.title));
    const primaryField = fields.find(field => previewPlacementForItem(field) === 'primary' && compactPreviewChoiceFieldTypes.has(field.type) && field !== priorityField);
    const badgeGroups = [];
    fields.filter(field => isChoiceField(field) && field !== priorityField && field !== primaryField && previewPlacementForItem(field) !== 'none' && previewPlacementForItem(field) !== 'primary' && previewPlacementForItem(field) !== 'text').forEach(field => {
      const placement = previewPlacementForItem(field);
      if (placement && placement !== 'badges') return;
      const values = categoricalValues(displayAnswerValue(field, record.answers[field.fieldId], otherAnswers));
      if (values.length) badgeGroups.push({ field, values });
    });
    const explicitTextFields = items.filter(field => field.type === 'long_text' && previewPlacementForItem(field) === 'text').slice(0, 2);
    const textFields = explicitTextFields.length
      ? explicitTextFields
      : fields.filter(field => field.type === 'long_text' && previewPlacementForItem(field) !== 'none').slice(0, 1);
    const textPreviews = textFields.map(field => {
      const value = displayAnswerValue(field, record.answers[field.fieldId], otherAnswers);
      return hasValue(value) ? { label: field.title, value: Store.answerText(value) } : null;
    }).filter(Boolean);
    const primaryValues = primaryField ? categoricalValues(displayAnswerValue(primaryField, record.answers[primaryField.fieldId], otherAnswers)) : [];
    return {
      customer: customerField ? Store.answerText(displayAnswerValue(customerField, record.answers[customerField.fieldId], otherAnswers)) : '',
      company: companyField ? Store.answerText(displayAnswerValue(companyField, record.answers[companyField.fieldId], otherAnswers)) : '',
      jobTitle: jobTitleField ? Store.answerText(displayAnswerValue(jobTitleField, record.answers[jobTitleField.fieldId], otherAnswers)) : '',
      priority: priorityField ? Store.answerText(displayAnswerValue(priorityField, record.answers[priorityField.fieldId], otherAnswers)) : '',
      priorityLabel: priorityField ? '後續追蹤優先度' : '',
      primaryGroup: primaryField && primaryValues.length ? { field: primaryField, values: primaryValues } : null,
      badgeGroups,
      text: textPreviews[0] || null,
      textPreviews
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

  function renderPreviewPrimaryGroup(group) {
    if (!group || !group.field || !group.values || !group.values.length) return '';
    return `<span class="aim-record-card-status-group"><span class="aim-record-preview-label">${Store.escapeHtml(group.field.title)}</span>${renderCategoricalBadges(group.field, group.values)}</span>`;
  }

  function renderRecordPreviewContent(preview, context) {
    const groups = preview.badgeGroups || [];
    const nonEmptyGroups = groups.filter(g => g.values && g.values.length > 0);
    let badgesHtml = '';
    nonEmptyGroups.forEach((group, groupIndex) => {
      if (groupIndex > 0) {
        badgesHtml += '<span class="aim-preview-sep" data-preview-sep aria-hidden="true">|</span>';
      }
      badgesHtml += `<span class="aim-preview-group" data-preview-group data-preview-count="${group.values.length}"><span class="aim-record-preview-label">${Store.escapeHtml(group.field.title)}</span>${renderCategoricalBadges(group.field, group.values)}</span>`;
    });
    const badgeLine = badgesHtml ? `<div class="aim-record-preview-badges" data-preview-badges>${badgesHtml}<span class="aim-answer-badge aim-preview-overflow-badge" data-preview-overflow hidden>+0</span></div>` : '';
    const text = (preview.textPreviews || (preview.text ? [preview.text] : [])).map(item => `<p class="aim-record-preview-text"><span class="aim-record-preview-label">${Store.escapeHtml(item.label)}：</span>${Store.escapeHtml(item.value)}</p>`).join('');
    if (!badgeLine && !text) return '';
    return `<div class="aim-record-preview-content aim-record-preview-content-${context}">${badgeLine}${text}</div>`;
  }

  function renderRecordDetailCompactField(field, value) {
    return `<div class="aim-record-detail-field"><span class="aim-record-detail-label">${Store.escapeHtml(field.title)}</span><span class="aim-record-detail-value">${Store.escapeHtml(Store.answerText(value))}</span></div>`;
  }

  function renderRecordDetailCompactCategoricalField(field, value) {
    const badges = renderCategoricalBadges(field, value);
    if (!badges) return '';
    return `<div class="aim-record-detail-field aim-record-detail-field-categorical"><span class="aim-record-detail-label">${Store.escapeHtml(field.title)}</span><span class="aim-answer-badges">${badges}</span></div>`;
  }

  function renderRecordDetailChoiceField(field, value) {
    const badges = renderCategoricalBadges(field, value);
    if (!badges) return '';
    return `<section class="aim-record-detail-choice"><h3>${Store.escapeHtml(field.title)}</h3><div class="aim-answer-badges">${badges}</div></section>`;
  }

  function renderRecordDetailLongText(field, value) {
    return `<section class="aim-record-detail-text"><h3>${Store.escapeHtml(field.title)}</h3><div>${Store.escapeHtml(Store.answerText(value))}</div></section>`;
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
          <p>${Store.escapeHtml(cardLinkHelperCopy)}</p>
          ${enabled ? `<button class="aim-button aim-button-soft" data-action="runtime-link-card" data-context="${context}" type="button">選擇名片</button>` : '<span class="aim-small">未連結名片</span>'}
        </section>
      `;
    }
    return renderLinkedCardSummary(item, enabled, cardLink, context);
  }

  function renderLinkedCardSummary(item, enabled, cardLink, context) {
    const card = normalizeRawCard(cardLink.card) || { cardId: cardLink.cardId || '', name: '', company: '', department: '', position: '' };
    const roleText = rawCardRoleText(card);
    return `
      <section class="aim-form-card-link aim-form-card-link-preview aim-runtime-card-link aim-linked-card-summary">
        <h4>${Store.escapeHtml(item.title || '名片連結')}</h4>
        <div class="aim-linked-card-summary-body">
          <button class="aim-form-card-link-thumb" data-action="open-card-lightbox" data-card-id="${Store.escapeHtml(card.cardId || cardLink.cardId || '')}" data-viewer-context="linked" type="button" aria-label="開啟名片預覽">
            ${renderRawCardVisual(card, 'thumb')}
          </button>
          <div class="aim-linked-card-summary-info">
            <strong>${Store.escapeHtml(card.name || '已連結名片')}</strong>
            ${card.company ? `<span>${Store.escapeHtml(card.company)}</span>` : ''}
            ${roleText ? `<span>${Store.escapeHtml(roleText)}</span>` : ''}
          </div>
          ${enabled ? `<div class="aim-form-card-link-actions"><button class="aim-button aim-button-soft" data-action="runtime-link-card" data-context="${context}" type="button">更換</button><button class="aim-button" data-action="runtime-unlink-card" data-context="${context}" type="button">移除</button></div>` : ''}
        </div>
      </section>
    `;
  }

  function renderRawCardVisual(card, size) {
    const normalized = normalizeRawCard(card);
    if (!normalized || !normalized.thumbnailUrl) return renderBusinessCardVisual(size || 'thumb');
    return `<img class="aim-raw-card-thumb aim-raw-card-thumb-${Store.escapeHtml(size || 'thumb')}" src="${Store.escapeHtml(normalized.thumbnailUrl)}" alt="${Store.escapeHtml(normalized.driveFilename || normalized.name || 'RAW card')}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'aim-raw-card-placeholder',textContent:'名片'}));">`;
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
    const sourceSettings = item.settings && typeof item.settings === 'object' ? Store.clone(item.settings) : {};
    const previewPlacement = normalizePreviewPlacement(
      item.previewPlacement !== undefined ? item.previewPlacement : sourceSettings.previewPlacement,
      type
    );
    const settings = { ...sourceSettings };
    if (previewPlacement) settings.previewPlacement = previewPlacement;
    else delete settings.previewPlacement;
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
      allowOther: Boolean(item.allowOther || (item.settings && item.settings.allowOther)),
      settings,
      previewPlacement,
      visible: item.visible !== false,
      retired: Boolean(item.retired),
      removedInDraft: Boolean(item.removedInDraft)
    };
  }

  function normalizePreviewPlacement(value, type) {
    const placement = String(value || '').trim();
    if (!previewPlacementValues.has(placement)) return '';
    if (placement === 'primary' && !compactPreviewChoiceFieldTypes.has(type)) return '';
    if (placement === 'badges' && !previewChoiceFieldTypes.has(type)) return '';
    if (placement === 'text' && type !== 'long_text') return '';
    return placement;
  }

  function previewPlacementForItem(item) {
    const normalized = normalizeDesignerItem(item || {});
    return normalized.previewPlacement || '';
  }

  function isFixedPreviewField(item) {
    return fixedPreviewFieldIds.has(item && item.fieldId);
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
      helperText: cardLinkHelperCopy,
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
    const sourceSettings = source.settings && typeof source.settings === 'object' ? Store.clone(source.settings) : {};
    const settings = {
      ...sourceSettings,
      thumbnail: normalizeThumbnailSettings(source)
    };
    return {
      formItemId: source.formItemId || source.form_item_id || '',
      itemKey,
      itemId: source.itemId || itemKey,
      fieldId: source.fieldId || itemKey,
      category: 'layout_component',
      type: 'form_thumbnail',
      title: '頁首橫幅',
      helperText: '',
      placeholder: '',
      options: [],
      allowOther: false,
      visible: true,
      retired: false,
      removedInDraft: false,
      settings,
      thumbnailTitle: source.thumbnailTitle || sourceSettings.thumbnailTitle || '活動表單封面',
      altText: source.altText || sourceSettings.altText || '活動表單示意縮圖',
      thumbnailVariant: source.thumbnailVariant || sourceSettings.thumbnailVariant || 'line',
      ...source,
      settings
    };
  }

  function normalizeThumbnailSettings(source) {
    const sourceSettings = source && source.settings && typeof source.settings === 'object' ? source.settings : {};
    const thumbnail = source && source.thumbnail && typeof source.thumbnail === 'object'
      ? source.thumbnail
      : (sourceSettings.thumbnail && typeof sourceSettings.thumbnail === 'object' ? sourceSettings.thumbnail : {});
    const fit = thumbnailFitOptions.has(thumbnail.fit) ? thumbnail.fit : thumbnailDefaults.fit;
    return {
      driveFileId: String(thumbnail.driveFileId || source.driveFileId || source.drive_file_id || thumbnailDefaults.driveFileId).trim(),
      fit,
      focalX: clampNumber(thumbnail.focalX, 0, 100, thumbnailDefaults.focalX),
      focalY: clampNumber(thumbnail.focalY, 0, 100, thumbnailDefaults.focalY),
      zoom: clampNumber(thumbnail.zoom, 1, 3, thumbnailDefaults.zoom)
    };
  }

  function thumbnailSettingsForItem(item) {
    return normalizeThumbnailSettings(item || {});
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
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
      previewPlacement: normalized.previewPlacement || '',
      thumbnailTitle: normalized.thumbnailTitle || '',
      altText: normalized.altText || '',
      thumbnailVariant: normalized.thumbnailVariant || '',
      thumbnail: thumbnailSettingsForItem(normalized)
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
      form_thumbnail: disabled ? '已加入此表單' : '在表單上方顯示 4:1 頁首橫幅',
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
          ${renderPreviewPlacementEditor(field)}
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
    const thumbnail = thumbnailSettingsForItem(field);
    const hasImage = Boolean(thumbnail.driveFileId);
    return `
      <div class="aim-field-editor">
        <div class="aim-field-editor-head">
          <div><h3>表單頁首橫幅設定</h3><p>頁首橫幅只屬於表單顯示，不會寫入紀錄答案。</p></div>
          <div class="aim-field-editor-status">${ui.formDesignDraftDirty ? '<span class="aim-pill aim-pill-high">未套用</span>' : '<span class="aim-pill">已套用</span>'}</div>
        </div>
        <div class="aim-field-editor-body">
          ${ui.formDesignMessage ? `<div class="aim-field-editor-message" role="alert">${Store.escapeHtml(ui.formDesignMessage)}</div>` : ''}
          <div class="aim-editor-grid">
            <div class="aim-field"><label for="aim-field-thumbnail-title">縮圖標題（選填）</label><input class="aim-input aim-field-design-input" id="aim-field-thumbnail-title" data-design-field="thumbnailTitle" value="${Store.escapeHtml(field.thumbnailTitle || '')}"></div>
            <div class="aim-field"><label for="aim-field-thumbnail-alt">替代文字（選填）</label><input class="aim-input aim-field-design-input" id="aim-field-thumbnail-alt" data-design-field="altText" value="${Store.escapeHtml(field.altText || '')}"></div>
          </div>
          <div class="aim-thumbnail-media-panel">
            <div class="aim-thumbnail-upload-row">
              <label class="aim-button aim-button-soft" for="aim-thumbnail-upload">上傳圖片</label>
              <input class="aim-thumbnail-file-input" id="aim-thumbnail-upload" type="file" accept="image/jpeg,image/png,image/webp">
              <span>${hasImage ? '已選擇圖片' : '尚未上傳圖片'}</span>
            </div>
            <div class="aim-thumbnail-position-row">
              <label for="aim-thumbnail-zoom">縮放</label>
              <input id="aim-thumbnail-zoom" class="aim-thumbnail-range" data-thumbnail-control="zoom" type="range" min="1" max="3" step="0.05" value="${Store.escapeHtml(thumbnail.zoom)}">
              <button class="aim-button aim-button-soft" data-action="reset-thumbnail-media" type="button">重設</button>
            </div>
          </div>
          ${renderFormThumbnailVisual(field)}
        </div>
        <div class="aim-field-editor-actions">
          <button class="aim-button aim-button-soft" data-action="cycle-thumbnail" type="button" ${hasImage ? 'disabled' : ''}>更換範例圖</button>
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
      <section class="aim-form-thumbnail-preview" aria-label="${Store.escapeHtml(item.altText || item.thumbnailTitle || '表單頁首橫幅')}">
        ${renderFormThumbnailVisual(item)}
      </section>
    `;
  }

  function renderPreviewPlacementEditor(field) {
    if (!isPreviewPlacementEligible(field)) return '';
    const placement = effectiveDesignerPreviewPlacement(field);
    const enabled = placement && placement !== 'none';
    const disabled = field.retired ? 'disabled' : '';
    const options = previewPlacementOptionsForField(field);
    return `
      <div class="aim-field aim-preview-placement-editor">
        <label>預覽卡片</label>
        <label class="aim-checkbox"><input id="aim-field-preview-enabled" type="checkbox" ${enabled ? 'checked' : ''} ${disabled}> 顯示在 collapsed 預覽</label>
        ${enabled && options.length > 1 ? `
          <label for="aim-field-preview-placement">預覽位置</label>
          <select class="aim-select" id="aim-field-preview-placement" ${disabled}>
            ${options.map(([value, label]) => option(value, label, placement)).join('')}
          </select>
        ` : ''}
        ${enabled && options.length === 1 ? `<span class="aim-small">預覽位置：${Store.escapeHtml(options[0][1])}</span>` : ''}
      </div>
    `;
  }

  function isPreviewPlacementEligible(field) {
    return field && !isFixedPreviewField(field) && (previewChoiceFieldTypes.has(field.type) || field.type === 'long_text');
  }

  function previewPlacementOptionsForField(field) {
    if (!field || field.type === 'long_text') return [['text', '文字摘要']];
    if (compactPreviewChoiceFieldTypes.has(field.type)) return [['primary', '主要摘要'], ['badges', '標籤列']];
    if (field.type === 'multiple_choice') return [['badges', '標籤列']];
    return [];
  }

  function effectiveDesignerPreviewPlacement(field) {
    const placement = previewPlacementForItem(field);
    if (placement) return placement;
    if (!field || isFixedPreviewField(field)) return '';
    if (previewChoiceFieldTypes.has(field.type)) return 'badges';
    if (field.type === 'long_text') {
      const activity = selectedActivity();
      const design = activity && formDesign(activity);
      const firstLongText = design && design.draft && design.draft.items.find(item => item.type === 'long_text');
      return firstLongText && designerItemKey(firstLongText) === designerItemKey(field) ? 'text' : '';
    }
    return '';
  }

  function renderFormThumbnailVisual(item) {
    const thumbnail = thumbnailSettingsForItem(item);
    if (thumbnail.driveFileId) {
      return `
        <div class="aim-form-thumbnail-visual aim-form-thumbnail-image aim-thumbnail-position-target" data-thumbnail-drag="true">
          <img src="${Store.escapeHtml(driveThumbnailUrl(thumbnail.driveFileId))}" alt="${Store.escapeHtml(item.altText || item.thumbnailTitle || '表單頁首橫幅')}" style="${Store.escapeHtml(thumbnailImageStyle(thumbnail))}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('aim-form-thumbnail-fallback');">
        </div>
      `;
    }
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
          <p>${Store.escapeHtml(cardLinkHelperCopy)}</p>
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

  function driveThumbnailUrl(fileId) {
    return `/api/drive/thumbnail?fileId=${encodeURIComponent(fileId)}`;
  }

  function thumbnailImageStyle(thumbnail) {
    const focalX = clampNumber(thumbnail.focalX, 0, 100, thumbnailDefaults.focalX);
    const focalY = clampNumber(thumbnail.focalY, 0, 100, thumbnailDefaults.focalY);
    const zoom = clampNumber(thumbnail.zoom, 1, 3, thumbnailDefaults.zoom);
    const fit = thumbnailFitOptions.has(thumbnail.fit) ? thumbnail.fit : thumbnailDefaults.fit;
    return `object-fit:${fit};object-position:${focalX}% ${focalY}%;transform:scale(${zoom});transform-origin:${focalX}% ${focalY}%;`;
  }

  function renderCardPickerDialog() {
    if (!ui.cardPicker) return '';
    return `
      <div class="aim-dialog-backdrop" data-action="close-card-picker"></div>
      <section class="aim-dialog aim-card-picker-dialog" role="dialog" aria-modal="true" aria-label="選擇 RAW 名片">
        <div class="aim-dialog-head"><h2>選擇 RAW 名片</h2><button class="aim-button aim-icon-button" data-action="close-card-picker" type="button" aria-label="關閉">x</button></div>
        <div class="aim-dialog-body">
          <div class="aim-card-picker-search aim-field"><label for="aim-card-picker-q">搜尋名片</label><input class="aim-input" id="aim-card-picker-q" value="${Store.escapeHtml(ui.cardPicker.q || '')}" placeholder="姓名、公司、部門、職稱、電話、Email 或檔名"></div>
          <div class="aim-card-picker-results" id="aim-card-picker-results">${renderCardPickerResults()}</div>
        </div>
        <div class="aim-dialog-foot aim-card-picker-foot"><div id="aim-card-picker-pagination">${renderCardPickerPaginationForCurrent()}</div><button class="aim-button" data-action="close-card-picker" type="button">取消</button></div>
      </section>
    `;
  }

  function filteredRawCards(query) {
    const q = String(query || '').trim().toLowerCase();
    return rawCards.filter(card => {
      if (!q) return true;
      return [card.name, card.company, card.department, card.position, card.email, card.phone, card.mobile, card.driveFilename]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }

  function renderCardPickerResults() {
    const rows = filteredRawCards(ui.cardPicker && ui.cardPicker.q);
    const totalPages = Math.max(1, Math.ceil(rows.length / rawCardPickerPageSize));
    const page = Math.min(Math.max(Number((ui.cardPicker && ui.cardPicker.page) || 1), 1), totalPages);
    if (ui.cardPicker) ui.cardPicker.page = page;
    const offset = (page - 1) * rawCardPickerPageSize;
    const pageRows = rows.slice(offset, offset + rawCardPickerPageSize);
    return pageRows.map(card => renderRawCardPickerRow(card)).join('') || '<div class="aim-empty">目前沒有可選擇的 RAW 名片。</div>';
  }

  function renderCardPickerPaginationForCurrent() {
    const rows = filteredRawCards(ui.cardPicker && ui.cardPicker.q);
    const totalPages = Math.max(1, Math.ceil(rows.length / rawCardPickerPageSize));
    const page = Math.min(Math.max(Number((ui.cardPicker && ui.cardPicker.page) || 1), 1), totalPages);
    if (ui.cardPicker) ui.cardPicker.page = page;
    return renderCardPickerPagination(rows.length, page, totalPages);
  }

  function renderCardPickerPagination(total, page, totalPages) {
    if (totalPages <= 1) return '';
    return `
      <div class="aim-card-picker-pagination" aria-label="RAW 名片分頁">
        <button class="aim-button" data-action="card-picker-page" data-page="${page - 1}" type="button" ${page <= 1 ? 'disabled' : ''}>上一頁</button>
        <span>${page} / ${totalPages}，共 ${total} 張</span>
        <button class="aim-button" data-action="card-picker-page" data-page="${page + 1}" type="button" ${page >= totalPages ? 'disabled' : ''}>下一頁</button>
      </div>
    `;
  }

  function renderRawCardPickerRow(card) {
    const roleText = rawCardRoleText(card);
    return `
      <article class="aim-raw-card-picker-row">
        <button class="aim-raw-card-picker-thumb" data-action="open-card-lightbox" data-card-id="${Store.escapeHtml(card.cardId)}" data-viewer-context="picker" type="button" aria-label="開啟名片預覽">
          ${renderRawCardVisual(card, 'thumb')}
        </button>
        <div class="aim-raw-card-picker-info">
          <div class="aim-raw-card-identity">
            <div class="aim-raw-card-picker-title-row">
              <strong class="aim-raw-card-name">${Store.escapeHtml(card.name || '未命名名片')}</strong>
              <button class="aim-button aim-button-primary" data-action="choose-card" data-card-id="${Store.escapeHtml(card.cardId)}" type="button">選擇</button>
            </div>
            <div class="aim-raw-card-company-row">
              ${card.company ? `<span class="aim-raw-card-company">${Store.escapeHtml(card.company)}</span>` : ''}
              ${roleText ? `<span class="aim-raw-card-role">${Store.escapeHtml(roleText)}</span>` : ''}
            </div>
          </div>
          <div class="aim-raw-card-contact-list">
            ${card.mobile ? `<span class="aim-raw-card-contact">Mobile ${Store.escapeHtml(card.mobile)}</span>` : ''}
            ${card.email ? `<span class="aim-raw-card-contact">Email ${Store.escapeHtml(card.email)}</span>` : ''}
            ${card.phone && card.phone !== card.mobile ? `<span class="aim-raw-card-contact">Phone ${Store.escapeHtml(card.phone)}</span>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function rawCardRoleText(card) {
    return [card.department, card.position].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join('／');
  }

  function rawCardById(cardId) {
    return rawCards.find(card => card.cardId === cardId) || null;
  }

  function rawCardForViewer(cardId) {
    if (!cardId) return null;
    const linkedCards = [
      ui.quickCardLink && ui.quickCardLink.card,
      ui.drawer && ui.drawer.workingCardLink && ui.drawer.workingCardLink.card,
      ...(state.records || []).map(record => cardLinkForRecord(record).card)
    ];
    return rawCardById(cardId) || linkedCards.find(card => normalizeRawCard(card)?.cardId === cardId) || null;
  }

  function ensureRawCardViewer() {
    let dialog = document.getElementById('aim-raw-card-viewer');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'aim-raw-card-viewer';
    dialog.className = 'aim-raw-card-viewer';
    dialog.addEventListener('click', event => {
      const selectButton = event.target.closest('[data-action="select-viewer-card"]');
      if (selectButton) {
        closeRawCardViewer();
        selectRawCard(selectButton.dataset.cardId);
        render();
        return;
      }
      if (event.target === dialog || event.target.closest('[data-action="close-raw-card-viewer"]')) closeRawCardViewer();
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function openRawCardViewer(card, context) {
    const normalized = normalizeRawCard(card);
    if (!normalized) return;
    const dialog = ensureRawCardViewer();
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    dialog.innerHTML = renderRawCardViewerContent(normalized, context);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeRawCardViewer() {
    const dialog = document.getElementById('aim-raw-card-viewer');
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function renderRawCardViewerContent(card, context) {
    const roleText = rawCardRoleText(card);
    const fromPicker = context === 'picker';
    const driveLink = card.driveLink && card.driveLink !== 'undefined' && card.driveLink !== 'null' ? card.driveLink : '';
    const viewerImage = renderRawCardVisual(card, 'large');
    const driveLabel = '在 Google Drive 開啟原始檔';
    const imageStage = driveLink
      ? `<a class="aim-raw-card-viewer-image-link" href="${Store.escapeHtml(driveLink)}" target="_blank" rel="noopener noreferrer" aria-label="${driveLabel}" title="${driveLabel}">${viewerImage}</a>`
      : viewerImage;
    return `
      <section class="aim-raw-card-viewer-panel" data-action="noop">
        <div class="aim-raw-card-viewer-head">
          <h2>名片預覽</h2>
          <button class="aim-button aim-icon-button" data-action="close-raw-card-viewer" type="button" aria-label="關閉">×</button>
        </div>
        <div class="aim-raw-card-viewer-body">
          <div class="aim-raw-card-viewer-image">${imageStage}</div>
          <div class="aim-raw-card-viewer-info">
            <strong>${Store.escapeHtml(card.name || '未命名名片')}</strong>
            ${card.company ? `<span class="aim-raw-card-viewer-company">${Store.escapeHtml(card.company)}</span>` : ''}
            ${roleText ? `<span>${Store.escapeHtml(roleText)}</span>` : ''}
            ${driveLink ? `<a class="aim-raw-card-viewer-drive" href="${Store.escapeHtml(driveLink)}" target="_blank" rel="noopener noreferrer">${driveLabel}</a>` : ''}
          </div>
        </div>
        <div class="aim-raw-card-viewer-foot">
          <button class="aim-button" data-action="close-raw-card-viewer" type="button">${fromPicker ? '返回' : '關閉'}</button>
          ${fromPicker ? `<button class="aim-button aim-button-primary" data-action="select-viewer-card" data-card-id="${Store.escapeHtml(card.cardId)}" type="button">選擇此名片</button>` : ''}
        </div>
      </section>
    `;
  }

  function renderHardDeleteConfirmDialog() {
    if (!ui.hardDeleteConfirm || !canHardDelete()) return '';
    const target = ui.hardDeleteConfirm;
    const title = target.type === 'activity' ? '永久刪除活動' : '永久刪除紀錄';
    const message = target.type === 'activity'
      ? `永久刪除「${target.name || ''}」？\n此動作會刪除此活動、表單版本、表單項目與所有紀錄，且無法復原。`
      : '確定要永久刪除此紀錄？\n此動作無法復原。';
    return `
      <div class="aim-dialog-backdrop" data-action="close-hard-delete-dialog"></div>
      <section class="aim-dialog aim-hard-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="aim-hard-delete-title">
        <div class="aim-dialog-head"><h2 id="aim-hard-delete-title">${Store.escapeHtml(title)}</h2><button class="aim-button aim-icon-button" data-action="close-hard-delete-dialog" type="button" aria-label="關閉">×</button></div>
        <div class="aim-dialog-body">${message.split('\n').map(line => `<p>${Store.escapeHtml(line)}</p>`).join('')}</div>
        <div class="aim-dialog-foot"><button class="aim-button" data-action="close-hard-delete-dialog" type="button">取消</button><button class="aim-button aim-button-danger" data-action="confirm-hard-delete" type="button">永久刪除</button></div>
      </section>
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
            <h2>全部紀錄</h2>
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
    return analyticFields(activity, records).filter(f => ['single_choice', 'multiple_choice', 'dropdown'].includes(f.type)).map(field => {
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
    return analyticFields(activity, records).filter(f => f.type === 'number').map(field => {
      const values = records.map(r => Number(r.answers[field.fieldId])).filter(Number.isFinite);
      const sum = values.reduce((a, b) => a + b, 0);
      return `<div class="aim-panel"><h2>${Store.escapeHtml(field.title)}</h2><dl class="aim-definition-list"><dt>筆數</dt><dd>${values.length}</dd><dt>平均</dt><dd>${values.length ? (sum / values.length).toFixed(1) : '-'}</dd><dt>最小</dt><dd>${values.length ? Math.min(...values) : '-'}</dd><dt>最大</dt><dd>${values.length ? Math.max(...values) : '-'}</dd></dl></div>`;
    }).join('');
  }

  function textBrowser(activity, records) {
    const fields = analyticFields(activity, records).filter(f => f.type === 'long_text');
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
          <div class="aim-drawer-actions">${canHardDelete() ? `<button class="aim-button aim-button-danger-soft" data-action="open-hard-delete-submission" data-id="${record.id}" type="button">永久刪除</button>` : ''}<button class="aim-button" data-action="close-drawer" type="button">關閉</button>${editing ? '<button class="aim-button aim-button-primary" data-action="save-record" type="button">儲存修改</button>' : ''}</div>
        </div>
      </aside>
    `;
  }

  function renderAnswer(field, answers, editable, otherAnswers, cardLink) {
    if (field.type === 'section_heading') return `<section class="aim-runtime-section"><h3>${Store.escapeHtml(field.title)}</h3>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</section>`;
    if (field.type === 'information_text') return `<section class="aim-runtime-info"><h3>${Store.escapeHtml(field.title)}</h3>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}</section>`;
    if (field.type === 'form_thumbnail') return editable ? `<section class="aim-runtime-component">${renderFormThumbnailPreview(field)}</section>` : '';
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
    const activityLink = event.target.closest('.aim-activity-link');
    if (!activityLink || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    activityLink.click();
  });

  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (ui.formDesignConfirm) ui.formDesignConfirm = null;
    else if (ui.hardDeleteConfirm) ui.hardDeleteConfirm = null;
    else if (ui.cardPicker) ui.cardPicker = null;
    else return;
    render();
  });

  root.addEventListener('click', async event => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (await handleFormDesignAction(action, el, event)) return;
    if (action === 'home') {
      goHome();
    }
    if (action === 'activity-overview' && canManageActivities()) {
      ui.view = 'workspace';
      ui.tab = 'overview';
    }
    if (action === 'all' && canManageActivities()) { ui.view = 'overview'; ui.tab = 'overview'; }
    if (action === 'open' && canManageActivities()) {
      ui.selectedActivityId = el.dataset.id;
      ui.view = 'workspace';
      ui.tab = 'overview';
      await loadRecordsForActivity(ui.selectedActivityId, { includeVoid: true });
    }
    if (action === 'recorder-open' && isRecorder()) {
      ui.selectedActivityId = el.dataset.id;
      ui.view = 'workspace';
      ui.tab = 'records';
      ui.records.scope = 'entry';
      await loadRecordsForActivity(ui.selectedActivityId, { includeVoid: true });
    }
    if (action === 'tab') {
      selectTab(el.dataset.tab);
      if (ui.tab === 'form') await loadFormForActivity(ui.selectedActivityId);
      if (ui.tab === 'records' || ui.tab === 'analytics') await loadRecordsForActivity(ui.selectedActivityId, { includeVoid: true });
    }
    if (action === 'sort' && canManageActivities()) sort(el.dataset.key);
    if (action === 'clear-overview' && canManageActivities()) ui.overview = { q: '', status: 'all', sort: 'name', dir: 'asc' };
    if (action === 'new-activity' && canManageActivities()) ui.dialog = freshActivityDraft();
    if (action === 'duplicate' && canManageActivities()) openDuplicate(el.dataset.id);
    if (action === 'open-hard-delete-activity' && canHardDelete()) openHardDeleteActivity(el.dataset.id);
    if (action === 'open-hard-delete-submission' && canHardDelete()) openHardDeleteSubmission(el.dataset.id);
    if (action === 'close-hard-delete-dialog') ui.hardDeleteConfirm = null;
    if (action === 'confirm-hard-delete' && canHardDelete()) await confirmHardDelete();
    if (action === 'close-dialog') ui.dialog = null;
    if (action === 'save-activity-dialog' && canManageActivities() && !(await saveActivityDialog())) return;
    if (action === 'settings' && canManageActivities()) ui.drawer = settingsDraft(selectedActivity());
    if (action === 'close-drawer') ui.drawer = null;
    if (action === 'save-settings' && canManageActivities()) await saveSettings();
    if (action === 'reset' && canManageActivities()) toast(formalDeferredMessage);
    if (action === 'line-login' && window.ActivityIntelligenceSession?.loginWithLine) await window.ActivityIntelligenceSession.loginWithLine();
    if (action === 'add-field' && canDesignForm()) addField();
    if (action === 'select-field' && canDesignForm()) ui.selectedFieldId = el.dataset.id;
    if (action === 'move-field' && canDesignForm()) moveField(el.dataset.id, Number(el.dataset.dir));
    if (action === 'toggle-field' && canDesignForm()) toggleField(el.dataset.id);
    if (action === 'copy-field' && canDesignForm()) copyField(el.dataset.id);
    if (action === 'delete-field' && canDesignForm()) deleteField(el.dataset.id);
    if (action === 'retire-field' && canDesignForm()) retireField(el.dataset.id);
    if (action === 'scope' && (canManageRecords() || isRecorder())) {
      const allowed = ['entry', 'all'];
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
    if (action === 'save-record') await saveRecord();
    if (action === 'void-record') await voidRecord(el.dataset.id);
    if (action === 'cancel-void-record') await cancelVoidRecord(el.dataset.id);
    if (action === 'quick-save-next') await saveQuickRecord();
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
    if (action === 'open-card-lightbox') {
      const card = rawCardForViewer(el.dataset.cardId);
      if (card) openRawCardViewer(card, el.dataset.viewerContext || 'linked');
      return true;
    }
    if (action === 'card-picker-page') {
      setCardPickerPage(Number(el.dataset.page));
      return true;
    }
    if (action === 'close-card-picker') {
      ui.cardPicker = null;
      render();
      return true;
    }
    if (action === 'choose-card') {
      selectRawCard(el.dataset.cardId);
      render();
      return true;
    }
    if (action === 'mock-link-card') {
      ui.formPreviewCardLinked = true;
      scheduleFormPreviewRefresh();
      return true;
    }
    if (action === 'mock-unlink-card') {
      ui.formPreviewCardLinked = false;
      scheduleFormPreviewRefresh();
      return true;
    }
    if (action === 'runtime-link-card') {
      await setRuntimeCardLink(el.dataset.context, true);
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
      render();
      return true;
    }
    if (action === 'reset-thumbnail-media') {
      updateThumbnailSettings({
        fit: thumbnailDefaults.fit,
        focalX: thumbnailDefaults.focalX,
        focalY: thumbnailDefaults.focalY,
        zoom: thumbnailDefaults.zoom
      });
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

  function defaultPreviewPlacementForField(field) {
    const options = previewPlacementOptionsForField(field || {});
    return options[0] ? options[0][0] : 'none';
  }

  function setPreviewPlacementDraft(placement) {
    const nextPlacement = placement === 'none' ? 'none' : normalizePreviewPlacement(placement, ui.formDesignDraft && ui.formDesignDraft.type);
    if (!ui.formDesignDraft || !isPreviewPlacementEligible(ui.formDesignDraft) || !nextPlacement) return;
    if (!canUsePreviewPlacement(ui.formDesignDraft, nextPlacement)) {
      render();
      return;
    }
    updateFormDesignDraft({
      previewPlacement: nextPlacement,
      settings: {
        ...(ui.formDesignDraft.settings || {}),
        previewPlacement: nextPlacement
      }
    });
    scheduleFormPreviewRefresh();
    render();
  }

  function canUsePreviewPlacement(field, placement) {
    if (placement === 'none') return true;
    const activity = selectedActivity();
    const design = activity && formDesign(activity);
    const currentKey = designerItemKey(field);
    const items = (design && design.draft && design.draft.items ? design.draft.items : []).filter(item => designerItemKey(item) !== currentKey);
    if (placement === 'primary' && items.some(item => previewPlacementForItem(item) === 'primary')) {
      ui.formDesignMessage = '預覽卡片最多只能設定一個主要摘要欄位。';
      return false;
    }
    if (placement === 'text' && items.filter(item => previewPlacementForItem(item) === 'text').length >= 2) {
      ui.formDesignMessage = '預覽卡片最多只能設定兩個文字摘要欄位。';
      return false;
    }
    return true;
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
    if (draft.previewPlacement && !canUsePreviewPlacement(draft, draft.previewPlacement)) {
      render();
      return;
    }
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
    previewRefreshFrame = 0;
    const preview = document.querySelector('.aim-preview');
    if (!preview) return;
    preview.innerHTML = renderFormPreview(selectedActivity());
    bindFormPreviewControls();
  }

  function scheduleFormPreviewRefresh() {
    if (previewRefreshFrame) return;
    const scheduler = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : callback => window.setTimeout(callback, 16);
    previewRefreshFrame = scheduler(() => {
      previewRefreshFrame = 0;
      refreshFormPreview();
    });
  }

  function cancelScheduledFormPreviewRefresh() {
    if (!previewRefreshFrame) return;
    if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(previewRefreshFrame);
    else window.clearTimeout(previewRefreshFrame);
    previewRefreshFrame = 0;
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
    bindThumbnailMediaControls();
    bindFormPreviewControls();
    bind('aim-record-q', value => { ui.records.q = value; });
    bind('aim-record-recorder', value => { ui.records.recorder = value; }, 'change');
    bind('aim-record-state', value => {
      ui.records.state = value;
      ui.records.showVoidRecords = value !== 'normal';
    }, 'change');
    bindCardPickerSearch();
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
    bindRecordAnswerControls(document);
    bindQuickAnswerControls(document);
    bindAutoGrowingTextareas();
    initFormDesignAutoGrow();
    fitRecordPreviewBadges();
  }

  function bindQuickAnswerControls(scope) {
    const rootNode = scope || document;
    rootNode.querySelectorAll('.aim-quick-input').forEach(node => {
      const eventName = node.tagName === 'SELECT' ? 'change' : 'input';
      node.addEventListener(eventName, () => {
        const before = answerHasOther(ui.quickAnswers[node.dataset.field]);
        setQuickAnswer(node.dataset.field, node.value);
        refreshQuickAnswerListIfOtherChanged(before, ui.quickAnswers[node.dataset.field]);
      });
    });
    rootNode.querySelectorAll('.aim-quick-radio').forEach(node => node.addEventListener('change', () => {
      if (!node.checked) return;
      const before = answerHasOther(ui.quickAnswers[node.dataset.field]);
      setQuickAnswer(node.dataset.field, node.value);
      refreshQuickAnswerListIfOtherChanged(before, ui.quickAnswers[node.dataset.field]);
    }));
    rootNode.querySelectorAll('.aim-quick-check').forEach(node => node.addEventListener('change', () => {
      const before = answerHasOther(ui.quickAnswers[node.dataset.field]);
      const list = new Set(ui.quickAnswers[node.dataset.field] || []);
      if (node.checked) list.add(node.value);
      else list.delete(node.value);
      setQuickAnswer(node.dataset.field, Array.from(list));
      refreshQuickAnswerListIfOtherChanged(before, ui.quickAnswers[node.dataset.field]);
    }));
    rootNode.querySelectorAll('.aim-quick-other-input').forEach(node => node.addEventListener('input', () => setQuickOtherAnswer(node.dataset.field, node.value)));
  }

  function bindRecordAnswerControls(scope) {
    const rootNode = scope || document;
    rootNode.querySelectorAll('.aim-record-input').forEach(node => {
      const eventName = node.tagName === 'SELECT' ? 'change' : 'input';
      node.addEventListener(eventName, () => {
        const before = ui.drawer && ui.drawer.working ? answerHasOther(ui.drawer.working[node.dataset.field]) : false;
        setWorking(node.dataset.field, node.value);
        refreshRecordDrawerAnswerListIfOtherChanged(before, ui.drawer && ui.drawer.working && ui.drawer.working[node.dataset.field]);
      });
    });
    rootNode.querySelectorAll('.aim-record-radio').forEach(node => node.addEventListener('change', () => {
      if (!node.checked) return;
      const before = ui.drawer && ui.drawer.working ? answerHasOther(ui.drawer.working[node.dataset.field]) : false;
      setWorking(node.dataset.field, node.value);
      refreshRecordDrawerAnswerListIfOtherChanged(before, ui.drawer && ui.drawer.working && ui.drawer.working[node.dataset.field]);
    }));
    rootNode.querySelectorAll('.aim-record-check').forEach(node => node.addEventListener('change', () => {
      if (!ui.drawer || !ui.drawer.working) return;
      const before = answerHasOther(ui.drawer.working[node.dataset.field]);
      const list = new Set(ui.drawer.working[node.dataset.field] || []);
      if (node.checked) list.add(node.value);
      else list.delete(node.value);
      setWorking(node.dataset.field, Array.from(list));
      refreshRecordDrawerAnswerListIfOtherChanged(before, ui.drawer.working[node.dataset.field]);
    }));
    rootNode.querySelectorAll('.aim-record-other-input').forEach(node => node.addEventListener('input', () => setWorkingOther(node.dataset.field, node.value)));
  }

  function answerHasOther(value) {
    return value === otherAnswerValue || (Array.isArray(value) && value.includes(otherAnswerValue));
  }

  function refreshQuickAnswerListIfOtherChanged(before, value) {
    if (before !== answerHasOther(value)) refreshQuickAnswerList();
  }

  function refreshRecordDrawerAnswerListIfOtherChanged(before, value) {
    if (before !== answerHasOther(value)) refreshRecordDrawerAnswerList();
  }

  function refreshQuickAnswerList() {
    const activity = selectedActivity();
    const list = document.querySelector('.aim-entry-form .aim-answer-list');
    if (!activity || !list) return;
    const open = activityStatus(activity).key === 'open';
    list.innerHTML = quickEntryFields(activity).map(field => renderQuickField(field, open)).join('');
    bindQuickAnswerControls(list);
    bindAutoGrowingTextareasIn(list);
  }

  function refreshRecordDrawerAnswerList() {
    if (!ui.drawer || ui.drawer.type !== 'record') return;
    const activity = selectedActivity();
    const record = ui.drawer.id ? state.records.find(r => r.id === ui.drawer.id) : null;
    const list = document.querySelector('.aim-drawer .aim-answer-list');
    if (!activity || !record || !list) return;
    const editing = record.status !== 'void';
    const working = ui.drawer.working || Store.clone(record.answers);
    const workingOther = ui.drawer.workingOther || Store.clone(otherAnswersForRecord(record));
    const workingCardLink = ui.drawer.workingCardLink || Store.clone(cardLinkForRecord(record));
    const items = snapshotRecordItems(record, activity);
    list.innerHTML = items.map(field => renderAnswer(field, working, editing, workingOther, workingCardLink)).join('');
    bindRecordAnswerControls(list);
    bindAutoGrowingTextareasIn(list);
  }

  function bindAutoGrowingTextareas() {
    bindAutoGrowingTextareasIn(document);
  }

  function bindAutoGrowingTextareasIn(scope) {
    const rootNode = scope || document;
    rootNode.querySelectorAll('.aim-auto-grow:not(.aim-field-design-input)').forEach(textarea => {
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
        scheduleFormPreviewRefresh();
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
      scheduleFormPreviewRefresh();
    });
    const previewEnabled = document.getElementById('aim-field-preview-enabled');
    if (previewEnabled) previewEnabled.addEventListener('change', () => {
      const placement = previewEnabled.checked ? defaultPreviewPlacementForField(ui.formDesignDraft) : 'none';
      setPreviewPlacementDraft(placement);
    });
    const previewPlacement = document.getElementById('aim-field-preview-placement');
    if (previewPlacement) previewPlacement.addEventListener('change', () => {
      setPreviewPlacementDraft(previewPlacement.value);
    });
    document.querySelectorAll('.aim-option-input').forEach(input => {
      input.addEventListener('input', () => {
        const options = (ui.formDesignDraft && ui.formDesignDraft.options ? ui.formDesignDraft.options : []).slice();
        options[Number(input.dataset.optionIndex)] = input.value;
        updateFormDesignDraft({ options });
        scheduleFormPreviewRefresh();
      });
    });
  }

  function bindThumbnailMediaControls() {
    const upload = document.getElementById('aim-thumbnail-upload');
    if (upload) {
      upload.addEventListener('change', async () => {
        if (upload.files && upload.files[0]) await uploadThumbnailImage(upload.files[0]);
      });
    }

    document.querySelectorAll('[data-thumbnail-control="zoom"]').forEach(input => {
      input.addEventListener('input', () => {
        updateThumbnailSettings({ zoom: input.value });
        updateThumbnailPreviewStyles();
        scheduleFormPreviewRefresh();
      });
      input.addEventListener('change', () => render());
    });

    document.querySelectorAll('[data-thumbnail-drag="true"]').forEach(target => {
      target.addEventListener('pointerdown', event => startThumbnailDrag(event, target));
    });
  }

  async function uploadThumbnailImage(file) {
    if (!ui.formDesignDraft || ui.formDesignDraft.type !== 'form_thumbnail' || writeInFlight) return;
    const activity = selectedActivity();
    if (!activity) return;
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(file.type)) {
      toast('請上傳 JPG、PNG 或 WebP 圖片。');
      return;
    }

    writeInFlight = true;
    render();
    try {
      const uploaded = await window.ActivityIntelligenceApi.uploadMedia(file, {
        activityId: activity.id,
        itemKey: designerItemKey(ui.formDesignDraft)
      });
      updateThumbnailSettings({
        driveFileId: uploaded.fileId,
        fit: thumbnailDefaults.fit,
        focalX: thumbnailDefaults.focalX,
        focalY: thumbnailDefaults.focalY,
        zoom: thumbnailDefaults.zoom
      });
      toast('圖片已上傳，請儲存草稿以保留設定。');
    } catch (error) {
      toast(error.message || '圖片上傳失敗。');
    } finally {
      writeInFlight = false;
      render();
    }
  }

  function updateThumbnailSettings(patch) {
    if (!ui.formDesignDraft || ui.formDesignDraft.type !== 'form_thumbnail') return;
    const current = thumbnailSettingsForItem(ui.formDesignDraft);
    const nextThumbnail = normalizeThumbnailSettings({
      settings: {
        thumbnail: {
          ...current,
          ...patch
        }
      }
    });
    updateFormDesignDraft({
      settings: {
        ...(ui.formDesignDraft.settings || {}),
        thumbnail: nextThumbnail
      }
    });
  }

  function updateThumbnailPreviewStyles() {
    const thumbnail = thumbnailSettingsForItem(ui.formDesignDraft || {});
    document.querySelectorAll('.aim-form-thumbnail-image img').forEach(img => {
      img.setAttribute('style', thumbnailImageStyle(thumbnail));
    });
  }

  function startThumbnailDrag(event, target) {
    if (!ui.formDesignDraft || ui.formDesignDraft.type !== 'form_thumbnail') return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const start = thumbnailSettingsForItem(ui.formDesignDraft);
    const origin = { x: event.clientX, y: event.clientY };
    target.setPointerCapture(event.pointerId);
    target.classList.add('aim-thumbnail-dragging');
    event.preventDefault();

    const move = moveEvent => {
      const deltaX = ((moveEvent.clientX - origin.x) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - origin.y) / rect.height) * 100;
      updateThumbnailSettings({
        focalX: start.focalX - deltaX,
        focalY: start.focalY - deltaY
      });
      updateThumbnailPreviewStyles();
      scheduleFormPreviewRefresh();
    };

    const stop = () => {
      target.classList.remove('aim-thumbnail-dragging');
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
      render();
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
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
        scheduleFormPreviewRefresh();
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
        scheduleFormPreviewRefresh();
      });
    });
    document.querySelectorAll('.aim-form-preview-select').forEach(node => {
      node.addEventListener('change', () => {
        const fieldId = node.dataset.previewField;
        ui.formPreviewAnswers[fieldId] = node.value === '__other' ? { other: true, otherText: '' } : { value: node.value };
        scheduleFormPreviewRefresh();
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
      const groups = Array.from(container.querySelectorAll('[data-preview-group]'));
      const badges = Array.from(container.querySelectorAll('[data-preview-badge]'));
      const seps = Array.from(container.querySelectorAll('[data-preview-sep]'));
      const overflow = container.querySelector('[data-preview-overflow]');
      if (!overflow) return;
      // Reset: show all badges and seps, hide overflow
      groups.forEach(group => { group.hidden = false; });
      badges.forEach(badge => { badge.hidden = false; });
      seps.forEach(sep => { sep.hidden = false; });
      overflow.hidden = true;
      if (container.scrollWidth <= container.clientWidth) return;
      if (groups.length) {
        overflow.hidden = false;
        let hiddenCount = 0;
        for (let index = groups.length - 1; index >= 0; index -= 1) {
          groups[index].hidden = true;
          hiddenCount += Number(groups[index].dataset.previewCount || 1);
          overflow.textContent = `+${hiddenCount}`;
          seps.forEach(sep => {
            const allItems = Array.from(container.children);
            const sepIndex = allItems.indexOf(sep);
            const hasGroupAfter = allItems.slice(sepIndex + 1).some(el => el.dataset.previewGroup !== undefined && !el.hidden);
            const hasGroupBefore = allItems.slice(0, sepIndex).some(el => el.dataset.previewGroup !== undefined && !el.hidden);
            sep.hidden = !hasGroupAfter || !hasGroupBefore;
          });
          if (container.scrollWidth <= container.clientWidth) break;
        }
        return;
      }
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

  function bindCardPickerSearch() {
    const node = document.getElementById('aim-card-picker-q');
    if (!node || !ui.cardPicker) return;
    let composing = false;
    const update = () => {
      if (!ui.cardPicker) return;
      ui.cardPicker.q = node.value;
      ui.cardPicker.page = 1;
      refreshCardPickerResults();
    };
    node.addEventListener('compositionstart', () => { composing = true; });
    node.addEventListener('compositionend', () => {
      composing = false;
      update();
    });
    node.addEventListener('input', () => {
      if (!composing) update();
    });
  }

  async function switchPreviewRole(value) {
    if (window.ActivityIntelligenceSession?.setLocalPreviewRole) {
      window.ActivityIntelligenceSession.setLocalPreviewRole(value);
    }
    currentUser = await resolveFormalCurrentUser();
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
    ui.records.state = 'normal';
    ui.records.showVoidRecords = false;
    ui.records.low = false;
  }

  function activeAdvancedFilterCount() {
    const stateFilterIsExplicit = ui.records.showVoidRecords ? ui.records.state !== 'all' : ui.records.state !== 'normal';
    return [
      ui.records.recorder !== 'all',
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
      high: 0,
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
    if (item.type === 'form_thumbnail') return item.thumbnailTitle || item.altText || '4:1 表單頁首橫幅';
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
          ...(normalized.previewPlacement ? { previewPlacement: normalized.previewPlacement } : {}),
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

  async function setRuntimeCardLink(context, linked) {
    if (!linked) {
      const next = { linked: false, cardId: null, card: null };
      if (context === 'drawer' && ui.drawer) ui.drawer.workingCardLink = next;
      else if (context === 'quick') ui.quickCardLink = next;
      return;
    }
    try {
      await loadRawCards({ force: true });
      ui.cardPicker = { context, q: '', page: 1 };
    } catch (error) {
      toast(error.message || 'RAW card load failed.');
    }
  }

  function setCardPickerPage(page) {
    if (!ui.cardPicker) return;
    ui.cardPicker.page = Math.max(Number(page) || 1, 1);
    refreshCardPickerResults();
  }

  function refreshCardPickerResults() {
    const results = document.getElementById('aim-card-picker-results');
    if (results) results.innerHTML = renderCardPickerResults();
    const pagination = document.getElementById('aim-card-picker-pagination');
    if (pagination) pagination.innerHTML = renderCardPickerPaginationForCurrent();
  }

  function selectRawCard(cardId) {
    const card = rawCardById(cardId);
    if (!card) return toast('找不到選擇的 RAW 名片。');
    const next = { linked: true, cardId: card.cardId, card };
    const context = ui.cardPicker && ui.cardPicker.context;
    if (context === 'drawer' && ui.drawer) ui.drawer.workingCardLink = next;
    else if (context === 'quick') ui.quickCardLink = next;
    ui.cardPicker = null;
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

  async function saveQuickRecord() {
    const activity = selectedActivity();
    if (!canCreateRecord(activity)) return toast('表單目前未開放，無法新增紀錄。');
    if (writeInFlight) return;
    const items = publishedRecordItems(activity);
    writeInFlight = true;
    try {
      const answers = cleanAnswersForItems(ui.quickAnswers || {}, items);
      const cardLink = cleanCardLink(ui.quickCardLink);
      const submission = await window.ActivityIntelligenceApi.createSubmission(activity.id, {
        answers: payloadAnswersForItems(answers, items),
        otherAnswers: cleanOtherAnswers(ui.quickOtherAnswers || {}, ui.quickAnswers || {}, items),
        cardId: cardLink.cardId || null
      });
      replaceRecord(submission);
      ui.quickAnswers = {};
      ui.quickOtherAnswers = {};
      ui.quickCardLink = { linked: false, cardId: null, card: null };
      ui.focusQuickFirst = true;
      ui.tab = 'records';
      ui.records.scope = 'entry';
      toast('已儲存一筆紀錄。');
    } catch (error) {
      toast(error.message || 'Submission save failed.');
    } finally {
      writeInFlight = false;
    }
  }

  async function saveRecord() {
    const record = state.records.find(r => r.id === ui.drawer.id);
    if (!canEditRecord(record, selectedActivity())) return toast('沒有權限編輯此紀錄。');
    if (writeInFlight) return;
    const items = snapshotRecordItems(record, selectedActivity());
    writeInFlight = true;
    try {
      const answers = cleanAnswersForItems(ui.drawer.working || {}, items);
      const cardLink = cleanCardLink(ui.drawer.workingCardLink || cardLinkForRecord(record));
      const updated = await window.ActivityIntelligenceApi.updateSubmission(record.id, {
        answers: payloadAnswersForItems(answers, items),
        otherAnswers: cleanOtherAnswers(ui.drawer.workingOther || {}, ui.drawer.working || {}, items),
        cardId: cardLink.cardId || null
      });
      replaceRecord(updated);
      ui.drawer = null;
      toast('已儲存紀錄。');
    } catch (error) {
      toast(error.message || 'Submission update failed.');
    } finally {
      writeInFlight = false;
    }
  }

  function payloadAnswersForItems(answers, items) {
    const itemsByField = new Map((items || []).map(item => [item.fieldId, item]));
    return Object.entries(answers || {}).reduce((acc, [fieldId, value]) => {
      const item = itemsByField.get(fieldId);
      acc[fieldId] = item && item.type === 'yes_no' ? value === yesNoOptions[0] : value;
      return acc;
    }, {});
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
    return cardLink && cardLink.linked && cardLink.cardId ? { linked: true, cardId: cardLink.cardId, card: cardLink.card || null } : { linked: false, cardId: null, card: null };
  }

  async function voidRecord(id) {
    const record = state.records.find(r => r.id === id);
    if (!canVoidRecord(record, selectedActivity())) return toast('沒有權限作廢此紀錄。');
    if (!window.confirm('確定要作廢此紀錄？')) return;
    if (writeInFlight) return;
    writeInFlight = true;
    try {
      const updated = await window.ActivityIntelligenceApi.voidSubmission(id);
      replaceRecord(updated);
      if (ui.drawer && ui.drawer.type === 'record' && ui.drawer.id === record.id) ui.drawer = null;
      toast('已作廢紀錄。');
    } catch (error) {
      toast(error.message || 'Submission void failed.');
    } finally {
      writeInFlight = false;
    }
  }

  async function cancelVoidRecord(id) {
    const record = state.records.find(r => r.id === id);
    if (!canCancelVoidRecord(record, selectedActivity())) return toast('沒有權限取消作廢此紀錄。');
    if (!window.confirm('確定要取消作廢此紀錄？')) return;
    if (writeInFlight) return;
    writeInFlight = true;
    try {
      const updated = await window.ActivityIntelligenceApi.restoreSubmission(id);
      replaceRecord(updated);
      if (ui.drawer && ui.drawer.type === 'record' && ui.drawer.id === record.id) ui.drawer = null;
      toast('已取消作廢紀錄。');
    } catch (error) {
      toast(error.message || 'Submission restore failed.');
    } finally {
      writeInFlight = false;
    }
  }

  function openHardDeleteActivity(activityId) {
    const activity = state.activities.find(item => item.id === activityId);
    if (!activity) return toast('找不到活動。');
    ui.hardDeleteConfirm = { type: 'activity', id: activity.id, name: activity.name };
  }

  function openHardDeleteSubmission(submissionId) {
    const record = state.records.find(item => item.id === submissionId);
    if (!record) return toast('找不到紀錄。');
    ui.hardDeleteConfirm = { type: 'submission', id: record.id };
  }

  async function confirmHardDelete() {
    if (!ui.hardDeleteConfirm || writeInFlight) return;
    const target = ui.hardDeleteConfirm;
    writeInFlight = true;
    try {
      if (target.type === 'activity') await hardDeleteActivity(target.id);
      if (target.type === 'submission') await hardDeleteSubmission(target.id);
      ui.hardDeleteConfirm = null;
    } catch (error) {
      toast(error.message || 'Permanent delete failed.');
    } finally {
      writeInFlight = false;
    }
  }

  async function hardDeleteSubmission(submissionId) {
    await window.ActivityIntelligenceApi.hardDeleteSubmission(submissionId);
    state.records = state.records.filter(record => record.id !== submissionId);
    ui.expandedRecords.personal.delete(submissionId);
    ui.expandedRecords.all.delete(submissionId);
    if (ui.drawer && ui.drawer.type === 'record' && ui.drawer.id === submissionId) ui.drawer = null;
    toast('已永久刪除紀錄。');
  }

  async function hardDeleteActivity(activityId) {
    await window.ActivityIntelligenceApi.hardDeleteActivity(activityId);
    state.activities = state.activities.filter(activity => activity.id !== activityId);
    state.records = state.records.filter(record => record.activityId !== activityId);
    formBundles.delete(activityId);
    [...recordLoadState.keys()].forEach(key => {
      if (String(key).startsWith(`${activityId}:`)) recordLoadState.delete(key);
    });
    ui.expandedRecords.personal.clear();
    ui.expandedRecords.all.clear();
    if (ui.selectedActivityId === activityId) ui.selectedActivityId = (state.activities[0] && state.activities[0].id) || null;
    state.selectedActivityId = ui.selectedActivityId;
    ui.drawer = null;
    ui.dialog = null;
    ui.cardPicker = null;
    ui.view = 'overview';
    ui.tab = 'overview';
    toast('已永久刪除活動。');
  }

  function exportCsv(records, activity, scope) {
    const rows = records;
    const fields = exportFields(activity, rows);
    const header = ['活動名稱', '紀錄 ID', '表單版本 ID', '建立者', '建立時間', '最近更新者', '最近更新', '紀錄狀態', 'RAW card ID', 'RAW card name', 'RAW card company', ...fields.map(f => f.title)];
    const body = rows.map(r => {
      const card = cardLinkForRecord(r).card || {};
      return [
        activity.name,
        r.id,
        r.formVersionId || '',
        r.createdByDisplayName,
        Store.formatDateTime(r.createdAt),
        r.updatedByDisplayName,
        Store.formatDateTime(r.updatedAt),
        r.status === 'void' ? '作廢' : '有效',
        r.cardId || '',
        card.name || '',
        card.company || '',
        ...fields.map(f => Store.answerText(displayAnswerValue(f, r.answers[f.fieldId], otherAnswersForRecord(r))))
      ];
    });
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
    return analyticFields(activity, records).filter(f => !['section_heading', 'information_text', 'form_thumbnail', 'card_link'].includes(f.type));
  }

  function analyticFields(activity, records) {
    const known = new Set();
    const fields = [];
    const add = item => {
      const normalized = normalizeDesignerItem(item);
      if (!normalized.fieldId || known.has(normalized.fieldId)) return;
      known.add(normalized.fieldId);
      fields.push(normalized);
    };
    (activity.formFields || []).forEach(add);
    (records || []).forEach(record => snapshotRecordItems(record, activity).forEach(add));
    return fields;
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
