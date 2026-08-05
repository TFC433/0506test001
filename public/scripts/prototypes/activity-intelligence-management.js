(function () {
  'use strict';

  const Store = window.AIMStore;
  const root = document.getElementById('aim-root');
  const fieldTypes = [
    ['short_text', '短文字'],
    ['long_text', '長文字'],
    ['single_choice', '單選'],
    ['multiple_choice', '多選'],
    ['dropdown', '下拉選單'],
    ['number', '數字'],
    ['section_heading', '區段標題']
  ];

  let state = Store.load();
  let currentUser = null;
  let ui = {
    view: 'overview',
    tab: 'overview',
    selectedActivityId: state.selectedActivityId || (state.activities[0] && state.activities[0].id),
    selectedFieldId: null,
    dialog: null,
    drawer: null,
    toast: '',
    focusQuickFirst: false,
    quickAnswers: {},
    overview: { q: '', status: 'all', sort: 'name', dir: 'asc' },
    records: { scope: 'all', q: '', recorder: 'all', priority: 'all', state: 'normal', low: false, start: '', end: '' },
    analytics: { recorder: 'all', start: '', end: '', q: '' },
    includeVoidCsv: false
  };

  init();

  async function init() {
    currentUser = await Store.resolveCurrentUser();
    applyRoleLanding();
    render();
  }

  function save() {
    state.selectedActivityId = ui.selectedActivityId;
    Store.save(state);
  }

  function applyRoleLanding() {
    if (!currentUser || !currentUser.authenticated) return;
    if (isRecorder()) {
      const open = openActivities();
      ui.tab = 'entry';
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
    return state.activities.filter(activity => Store.activityStatus(activity).key === 'open');
  }

  function selectedActivity() {
    return state.activities.find(a => a.id === ui.selectedActivityId) || state.activities[0];
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
        <header class="aim-topbar">
          <div class="aim-brand">
            <h1>活動情報管理</h1>
            <span>單一桌面角色原型 V2</span>
          </div>
          <div class="aim-actions">
            ${renderPreviewControl()}
            <div class="aim-user" aria-label="目前使用者">
              <span>${Store.escapeHtml(currentUser.source || 'LINE 白名單')}</span>
              <strong>${Store.escapeHtml(currentUser.displayName || currentUser.userId || '')}</strong>
              <span>${Store.escapeHtml(currentUser.authenticated ? Store.roleLabel(currentUser.role) : '尚未取得角色')}</span>
            </div>
          </div>
        </header>
        <main class="aim-main">
          ${renderPreviewBanner()}
          ${content}
        </main>
      </div>
      ${renderDialog()}
      ${renderDrawer()}
      ${ui.toast ? `<div class="aim-toast" role="status">${Store.escapeHtml(ui.toast)}</div>` : ''}
    `;
  }

  function renderPreviewControl() {
    if (!Store.isLocalhost()) return '';
    const selected = Store.previewSelection();
    return `
      <label class="aim-preview-control">本機角色預覽
        <select class="aim-select" id="aim-role-preview" aria-label="本機角色預覽">
          ${option('real', '實際白名單角色', selected)}
          ${Store.ROLES.map(role => option(role, Store.roleLabel(role), selected)).join('')}
        </select>
      </label>
    `;
  }

  function renderPreviewBanner() {
    if (!currentUser || !currentUser.isPrototypePreview) return '';
    return `
      <div class="aim-preview-banner" role="status">
        <strong>本機模擬角色：${Store.escapeHtml(Store.roleLabel(currentUser.role))}</strong>
        <span>這只會改變原型前端呈現，不會修改後端 Session、JWT、Cookie、Google Sheet 或 LINE 白名單。</span>
        <button class="aim-button aim-button-soft" type="button" data-action="use-real-role">回到實際白名單角色</button>
      </div>
    `;
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
        <div class="aim-page-head">
          <div>
            <h2 class="aim-page-title">選擇開放中的活動</h2>
            <p class="aim-subtitle">目前有多個活動開放填寫，請選擇要紀錄的活動。</p>
          </div>
        </div>
        <div class="aim-activity-chooser">
          ${rows.map(activity => `
            <button class="aim-chooser-row" type="button" data-action="recorder-open" data-id="${activity.id}">
              <strong>${Store.escapeHtml(activity.name)}</strong>
              <span>${Store.formatDate(activity.formOpenStart)} - ${Store.formatDate(activity.formOpenEnd)}</span>
              ${Store.activitySubtitle(activity) ? `<span>${Store.escapeHtml(Store.activitySubtitle(activity))}</span>` : ''}
              ${statusPill(Store.activityStatus(activity))}
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
        <p>請等待管理員開放活動表單後再新增情報紀錄。</p>
      </section>
    `;
  }

  function renderOverview() {
    const rows = filteredActivities();
    const kpis = overviewKpis();
    return `
      <section>
        <div class="aim-page-head">
          <div>
            <h2 class="aim-page-title">活動總覽</h2>
            <p class="aim-subtitle">管理活動、表單開放期間、情報紀錄、分析與 CSV 匯出。</p>
          </div>
          <button class="aim-button aim-button-primary" type="button" data-action="new-activity">新增活動</button>
        </div>
        <div class="aim-kpi-grid">
          <div class="aim-kpi"><span>活動總數</span><strong>${state.activities.length}</strong></div>
          <div class="aim-kpi"><span>開放中</span><strong>${kpis.open}</strong></div>
          <div class="aim-kpi"><span>有效情報紀錄</span><strong>${kpis.activeRecords}</strong></div>
          <div class="aim-kpi"><span>今日新增</span><strong>${kpis.today}</strong></div>
        </div>
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
                ${th('formOpenStart', '表單開放期間')}
                <th>展期</th>
                ${th('status', '狀態')}
                ${th('total', '情報總數')}
                ${th('today', '今日新增')}
                ${th('lastRecord', '最近紀錄')}
                ${th('updatedAt', '最近更新')}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(renderActivityRow).join('') || '<tr><td colspan="9"><div class="aim-empty">沒有符合篩選條件的活動。</div></td></tr>'}
            </tbody>
          </table>
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
    const status = Store.activityStatus(activity);
    const ex = Store.activitySubtitle(activity) || '-';
    return `
      <tr>
        <td><strong>${Store.escapeHtml(activity.name)}</strong></td>
        <td>${Store.formatDate(activity.formOpenStart)} - ${Store.formatDate(activity.formOpenEnd)}</td>
        <td>${Store.escapeHtml(ex.replace('展期：', ''))}</td>
        <td>${statusPill(status)}</td>
        <td>${metrics.total}</td>
        <td>${metrics.today}</td>
        <td>${metrics.lastRecord ? Store.formatDateTime(metrics.lastRecord) : '-'}</td>
        <td>${Store.formatDateTime(activity.updatedAt)}</td>
        <td>
          <div class="aim-actions">
            <button class="aim-button" type="button" data-action="open" data-id="${activity.id}">進入活動</button>
            <button class="aim-button" type="button" data-action="duplicate" data-id="${activity.id}">複製活動</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderWorkspace() {
    const activity = selectedActivity();
    if (!activity) return canManageActivities() ? renderOverview() : renderNoOpenActivity();
    const status = Store.activityStatus(activity);
    const metrics = activityMetrics(activity.id);
    return `
      <section>
        <div class="aim-workspace-head">
          <div>
            ${canManageActivities() ? '<button class="aim-button" type="button" data-action="all">活動總覽</button>' : ''}
            <h2 class="aim-workspace-title">${Store.escapeHtml(activity.name)}</h2>
            <div class="aim-workspace-meta">
              ${Store.activitySubtitle(activity) ? `<span class="aim-meta-chip">${Store.escapeHtml(Store.activitySubtitle(activity))}</span>` : ''}
              <span class="aim-meta-chip">表單開放 <strong>${Store.formatDate(activity.formOpenStart)} - ${Store.formatDate(activity.formOpenEnd)}</strong></span>
              ${statusPill(status)}
              <span class="aim-meta-chip">有效紀錄 <strong>${metrics.active}</strong></span>
              <span class="aim-meta-chip">今日 <strong>${metrics.today}</strong></span>
            </div>
          </div>
          ${canManageActivities() ? '<button class="aim-button" type="button" data-action="settings">活動設定</button>' : ''}
        </div>
        <nav class="aim-tabs" aria-label="活動模組">
          ${canManageActivities() ? tab('overview', '活動概況') : ''}
          ${canDesignForm() ? tab('form', '表單設計') : ''}
          ${isRecorder() ? tab('entry', '新增情報') : ''}
          ${isRecorder() ? tab('all_records', '全部紀錄') : tab('records', '情報紀錄')}
          ${isRecorder() ? tab('my_records', '我的紀錄') : ''}
          ${canUseAnalytics() ? tab('analytics', '數據分析') : ''}
        </nav>
        ${renderTab(activity)}
      </section>
    `;
  }

  function tab(key, label) {
    return `<button class="aim-tab" role="tab" aria-selected="${ui.tab === key}" data-action="tab" data-tab="${key}" type="button">${label}</button>`;
  }

  function renderTab(activity) {
    if (isRecorder()) {
      if (ui.tab === 'all_records') return renderRecords(activity, 'all');
      if (ui.tab === 'my_records') return renderRecords(activity, 'mine');
      return renderQuickEntry(activity);
    }
    if (ui.tab === 'form' && canDesignForm()) return renderForm(activity);
    if (ui.tab === 'records') return renderRecords(activity, ui.records.scope);
    if (ui.tab === 'analytics' && canUseAnalytics()) return renderAnalytics(activity);
    return renderActivityOverview(activity);
  }

  function renderActivityOverview(activity) {
    const metrics = activityMetrics(activity.id);
    const status = Store.activityStatus(activity);
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
          <div class="aim-grid-3">
            <div class="aim-panel"><h3>表單狀態</h3><dl class="aim-definition-list"><dt>欄位數</dt><dd>${activity.formFields.filter(f => !f.retired).length}</dd><dt>可填寫狀態</dt><dd>${formState(status.key)}</dd></dl></div>
            <div class="aim-panel"><h3>追蹤品質</h3><dl class="aim-definition-list"><dt>高優先</dt><dd>${metrics.high}</dd><dt>低完整度</dt><dd>${metrics.low}</dd></dl></div>
            <div class="aim-panel"><h3>快速操作</h3><div class="aim-actions" style="justify-content:flex-start">${canDesignForm() ? '<button class="aim-button" data-action="tab" data-tab="form" type="button">表單設計</button>' : ''}<button class="aim-button" data-action="tab" data-tab="records" type="button">情報紀錄</button><button class="aim-button" data-action="tab" data-tab="analytics" type="button">數據分析</button><button class="aim-button aim-button-soft" data-action="export-all" type="button">匯出 CSV</button></div></div>
          </div>
        </div>
        <div class="aim-panel">
          <h3>最近紀錄</h3>
          <div class="aim-latest-list">${latest.map(r => `<button class="aim-latest-item" data-action="record" data-id="${r.id}" type="button" style="text-align:left"><strong>${Store.escapeHtml(Store.recordSummary(r))}</strong><span class="aim-small">${Store.formatDateTime(r.createdAt)}，${Store.escapeHtml(r.createdByDisplayName)} 建立</span></button>`).join('') || '<div class="aim-empty">目前沒有有效紀錄。</div>'}</div>
        </div>
      </div>
    `;
  }

  function renderQuickEntry(activity) {
    const status = Store.activityStatus(activity);
    const open = status.key === 'open';
    const recent = recordsFor(activity.id).filter(r => r.status !== 'void').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    return `
      ${!open ? '<div class="aim-warning">表單目前未開放，紀錄者不能新增或編輯自己的紀錄。</div>' : ''}
      <div class="aim-recorder-layout">
        <div class="aim-panel">
          <div class="aim-panel-title-row">
            <h2>新增情報</h2>
            <div class="aim-actions">
              <button class="aim-button aim-button-primary" data-action="quick-save-next" ${open ? '' : 'disabled'} type="button">儲存並繼續新增</button>
              <button class="aim-button" data-action="quick-save-view" ${open ? '' : 'disabled'} type="button">儲存並查看紀錄</button>
            </div>
          </div>
          <div class="aim-answer-list">
            ${activity.formFields.filter(f => f.visible && !f.retired).map(field => renderQuickField(field, open)).join('')}
          </div>
        </div>
        <aside class="aim-panel aim-recorder-context">
          <h2>目前活動</h2>
          <dl class="aim-definition-list">
            <dt>活動</dt><dd>${Store.escapeHtml(activity.name)}</dd>
            <dt>紀錄者</dt><dd>${Store.escapeHtml(currentUser.displayName)}</dd>
            <dt>表單期間</dt><dd>${Store.formatDate(activity.formOpenStart)} - ${Store.formatDate(activity.formOpenEnd)}</dd>
            <dt>狀態</dt><dd>${statusPill(status)}</dd>
          </dl>
          <div class="aim-context-link"><button class="aim-button" data-action="tab" data-tab="all_records" type="button">查看全部紀錄</button></div>
          <h2>最近紀錄</h2>
          <div class="aim-latest-list">${recent.map(r => `<button class="aim-latest-item" data-action="record" data-id="${r.id}" type="button" style="text-align:left"><strong>${Store.escapeHtml(Store.recordSummary(r))}</strong><span class="aim-small">${Store.escapeHtml(r.createdByDisplayName)}，${Store.formatDateTime(r.createdAt)}</span></button>`).join('') || '<div class="aim-empty">尚無紀錄。</div>'}</div>
        </aside>
      </div>
    `;
  }

  function renderQuickField(field, enabled) {
    if (field.type === 'section_heading') return `<div class="aim-answer"><h4>${Store.escapeHtml(field.title)}</h4></div>`;
    const value = ui.quickAnswers[field.fieldId];
    const label = `<label>${Store.escapeHtml(field.title)}</label>${field.helperText ? `<span class="aim-small">${Store.escapeHtml(field.helperText)}</span>` : ''}`;
    if (field.type === 'long_text') return `<div class="aim-field">${label}<textarea class="aim-textarea aim-quick-input" data-field="${field.fieldId}" ${enabled ? '' : 'disabled'}>${Store.escapeHtml(value || '')}</textarea></div>`;
    if (field.type === 'number') return `<div class="aim-field">${label}<input class="aim-input aim-quick-input" type="number" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}" ${enabled ? '' : 'disabled'}></div>`;
    if (field.type === 'dropdown') return `<div class="aim-field">${label}<select class="aim-select aim-quick-input" data-field="${field.fieldId}" ${enabled ? '' : 'disabled'}>${option('', '請選擇', value || '')}${(field.options || []).map(o => option(o, o, value || '')).join('')}</select></div>`;
    if (field.type === 'single_choice') return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-quick-radio" name="quick-${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${value === o ? 'checked' : ''} ${enabled ? '' : 'disabled'}> ${Store.escapeHtml(o)}</label>`).join('')}</div>`;
    if (field.type === 'multiple_choice') {
      const values = Array.isArray(value) ? value : [];
      return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-quick-check" data-field="${field.fieldId}" type="checkbox" value="${Store.escapeHtml(o)}" ${values.includes(o) ? 'checked' : ''} ${enabled ? '' : 'disabled'}> ${Store.escapeHtml(o)}</label>`).join('')}</div>`;
    }
    return `<div class="aim-field">${label}<input class="aim-input aim-quick-input" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}" ${enabled ? '' : 'disabled'}></div>`;
  }

  function renderForm(activity) {
    const status = Store.activityStatus(activity);
    const selected = activity.formFields.find(f => f.fieldId === ui.selectedFieldId) || activity.formFields[0];
    if (selected) ui.selectedFieldId = selected.fieldId;
    return `
      ${status.key === 'open' ? '<div class="aim-warning">此活動表單正在開放中，調整欄位會影響後續紀錄填寫。</div>' : ''}
      <div class="aim-form-designer">
        <div class="aim-panel">
          <div class="aim-panel-title-row"><h2>表單欄位設計</h2><div class="aim-actions"><select class="aim-select" id="aim-add-field-type">${fieldTypes.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="aim-button aim-button-primary" data-action="add-field" type="button">新增欄位</button></div></div>
          <div class="aim-field-list">${activity.formFields.map((field, index) => renderFieldRow(activity, field, index)).join('')}</div>
          ${selected ? renderFieldEditor(activity, selected) : ''}
        </div>
        <aside class="aim-panel"><h2>填寫預覽</h2><div class="aim-preview">${activity.formFields.filter(f => f.visible && !f.retired).map(renderPreviewField).join('') || '<div class="aim-empty">尚未建立可顯示欄位。</div>'}</div></aside>
      </div>
    `;
  }

  function renderFieldRow(activity, field, index) {
    const hasAnswers = fieldHasAnswers(activity.id, field.fieldId);
    return `
      <div class="aim-field-row" aria-selected="${ui.selectedFieldId === field.fieldId}">
        <button type="button" data-action="select-field" data-id="${field.fieldId}" style="border:0;background:transparent;padding:0;text-align:left;cursor:pointer">
          <div class="aim-field-row-title"><span>${Store.escapeHtml(field.title || '未命名欄位')}</span><span class="aim-pill">${fieldTypeLabel(field.type)}</span>${field.visible ? '' : '<span class="aim-pill aim-pill-hidden">已隱藏</span>'}${field.retired ? '<span class="aim-pill aim-pill-retired">已停用</span>' : ''}${hasAnswers ? '<span class="aim-pill">已有回答</span>' : ''}</div>
          <div class="aim-small">${Store.escapeHtml(field.fieldId)}</div>
        </button>
        <div class="aim-field-row-actions"><button class="aim-button aim-icon-button" data-action="move-field" data-id="${field.fieldId}" data-dir="-1" ${index === 0 ? 'disabled' : ''} type="button">^</button><button class="aim-button aim-icon-button" data-action="move-field" data-id="${field.fieldId}" data-dir="1" ${index === activity.formFields.length - 1 ? 'disabled' : ''} type="button">v</button></div>
      </div>
    `;
  }

  function renderFieldEditor(activity, field) {
    const hasAnswers = fieldHasAnswers(activity.id, field.fieldId);
    const optionTypes = ['single_choice', 'multiple_choice', 'dropdown'];
    return `
      <div class="aim-panel" style="margin-top:12px">
        <div class="aim-panel-title-row"><h3>欄位設定</h3><span class="aim-small">${Store.escapeHtml(field.fieldId)}</span></div>
        <div class="aim-editor-grid"><div class="aim-field"><label>標題</label><input class="aim-input" id="aim-field-title" value="${Store.escapeHtml(field.title)}" ${field.retired ? 'disabled' : ''}></div><div class="aim-field"><label>類型</label><select class="aim-select" id="aim-field-type" ${field.retired || hasAnswers ? 'disabled' : ''}>${fieldTypes.map(([k, l]) => option(k, l, field.type)).join('')}</select></div></div>
        <div class="aim-field"><label>說明文字</label><input class="aim-input" id="aim-field-helper" value="${Store.escapeHtml(field.helperText || '')}" ${field.retired ? 'disabled' : ''}></div>
        ${optionTypes.includes(field.type) ? `<div class="aim-field"><label>選項，每行一個</label><textarea class="aim-textarea" id="aim-field-options" ${field.retired ? 'disabled' : ''}>${Store.escapeHtml((field.options || []).join('\n'))}</textarea></div>` : ''}
        <div class="aim-actions" style="justify-content:flex-start"><button class="aim-button" data-action="toggle-field" data-id="${field.fieldId}" ${field.retired ? 'disabled' : ''} type="button">${field.visible ? '隱藏欄位' : '顯示欄位'}</button><button class="aim-button" data-action="copy-field" data-id="${field.fieldId}" type="button">複製欄位</button><button class="aim-button aim-button-danger" data-action="${hasAnswers ? 'retire-field' : 'delete-field'}" data-id="${field.fieldId}" ${field.retired ? 'disabled' : ''} type="button">${hasAnswers ? '停用欄位' : '刪除欄位'}</button></div>
      </div>
    `;
  }

  function renderPreviewField(field) {
    if (field.type === 'section_heading') return `<div class="aim-preview-field"><h4>${Store.escapeHtml(field.title)}</h4></div>`;
    const label = `<h4>${Store.escapeHtml(field.title)}</h4>${field.helperText ? `<p>${Store.escapeHtml(field.helperText)}</p>` : ''}`;
    if (field.type === 'long_text') return `<div class="aim-preview-field">${label}<textarea class="aim-textarea" disabled></textarea></div>`;
    if (field.type === 'number') return `<div class="aim-preview-field">${label}<input class="aim-input" type="number" disabled></div>`;
    if (field.type === 'dropdown') return `<div class="aim-preview-field">${label}<select class="aim-select" disabled><option>請選擇...</option>${(field.options || []).map(o => `<option>${Store.escapeHtml(o)}</option>`).join('')}</select></div>`;
    if (field.type === 'single_choice' || field.type === 'multiple_choice') return `<div class="aim-preview-field">${label}<div class="aim-preview-options">${(field.options || []).map(o => `<label><input type="${field.type === 'single_choice' ? 'radio' : 'checkbox'}" disabled> ${Store.escapeHtml(o)}</label>`).join('')}</div></div>`;
    return `<div class="aim-preview-field">${label}<input class="aim-input" disabled></div>`;
  }

  function renderRecords(activity, forcedScope) {
    const scope = forcedScope || ui.records.scope;
    const rows = filteredRecords(activity, scope);
    const recorders = unique(recordsFor(activity.id).map(r => r.createdByDisplayName));
    const management = canManageRecords();
    return `
      <div class="aim-panel">
        <div class="aim-panel-title-row">
          <h2>${scope === 'mine' ? '我的紀錄' : '全部紀錄'}</h2>
          ${management ? `<div class="aim-actions"><label class="aim-checkbox"><input id="aim-csv-void" type="checkbox" ${ui.includeVoidCsv ? 'checked' : ''}> CSV 包含作廢紀錄</label><button class="aim-button" data-action="export-filtered" type="button">匯出篩選 CSV</button><button class="aim-button" data-action="export-all" type="button">匯出全部 CSV</button><button class="aim-button aim-button-primary" data-action="new-record" ${Store.activityStatus(activity).key === 'open' ? '' : 'disabled'} type="button">新增情報紀錄</button></div>` : ''}
        </div>
        <div class="aim-record-toolbar">
          ${management ? `<div class="aim-record-switch"><button data-action="scope" data-scope="mine" aria-pressed="${ui.records.scope === 'mine'}" type="button">我的紀錄</button><button data-action="scope" data-scope="all" aria-pressed="${ui.records.scope === 'all'}" type="button">全部紀錄</button></div>` : '<span class="aim-small">同活動紀錄</span>'}
          <input class="aim-input" id="aim-record-start" type="date" value="${ui.records.start}" aria-label="開始日期">
          <input class="aim-input" id="aim-record-end" type="date" value="${ui.records.end}" aria-label="結束日期">
          <select class="aim-select" id="aim-record-recorder">${option('all', '全部紀錄者', ui.records.recorder)}${recorders.map(r => option(r, r, ui.records.recorder)).join('')}</select>
          <input class="aim-input" id="aim-record-q" value="${Store.escapeHtml(ui.records.q)}" placeholder="搜尋姓名、公司或內容">
          <select class="aim-select" id="aim-record-priority">${option('all', '全部優先度', ui.records.priority)}${['高', '中', '低', '未判斷'].map(p => option(p, p, ui.records.priority)).join('')}</select>
          <div class="aim-actions"><select class="aim-select" id="aim-record-state">${option('normal', '有效', ui.records.state)}${option('void', '作廢', ui.records.state)}${option('all', '有效與作廢', ui.records.state)}</select><label class="aim-checkbox"><input id="aim-record-low" type="checkbox" ${ui.records.low ? 'checked' : ''}> 低完整度</label><button class="aim-button" data-action="clear-records" type="button">清除</button></div>
        </div>
        <div class="aim-small" style="margin-bottom:8px">共 ${rows.length} 筆</div>
        <div class="aim-table-wrap"><table class="aim-table"><thead><tr><th>建立時間</th><th>紀錄者</th><th>客戶資訊</th><th>欄位完整度</th><th>後續優先度</th><th>最近更新</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(r => renderRecordRow(r, activity)).join('') || '<tr><td colspan="8"><div class="aim-empty">沒有符合篩選條件的紀錄。</div></td></tr>'}</tbody></table></div>
      </div>
    `;
  }

  function renderRecordRow(record, activity) {
    const coverage = recordCoverage(record, activity);
    return `<tr><td>${Store.formatDateTime(record.createdAt)}</td><td>${Store.escapeHtml(record.createdByDisplayName)}</td><td>${Store.escapeHtml(Store.recordSummary(record))}</td><td>${coverage.answered}/${coverage.total}<div class="aim-coverage-bar"><span style="width:${coverage.percent}%"></span></div></td><td>${priorityPill(record.answers.fld_priority || '未判斷')}</td><td>${Store.formatDateTime(record.updatedAt)}</td><td>${record.status === 'void' ? '<span class="aim-pill aim-pill-void">作廢</span>' : '<span class="aim-pill aim-pill-open">有效</span>'}</td><td><button class="aim-button" data-action="record" data-id="${record.id}" type="button">查看</button></td></tr>`;
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
        </div></div>
        <div class="aim-dialog-foot"><button class="aim-button" data-action="close-dialog" type="button">取消</button><button class="aim-button aim-button-primary" data-action="save-activity-dialog" type="button">${duplicate ? '建立複製活動' : '建立活動'}</button></div>
      </section>
    `;
  }

  function renderDrawer() {
    if (!ui.drawer) return '';
    if (ui.drawer.type === 'settings' && canManageActivities()) return settingsDrawer();
    if (ui.drawer.type === 'record') return recordDrawer();
    return '';
  }

  function settingsDrawer() {
    const activity = selectedActivity();
    return `
      <div class="aim-drawer-backdrop" data-action="close-drawer"></div>
      <aside class="aim-drawer" role="dialog" aria-modal="true">
        <div class="aim-drawer-head"><h2>活動設定</h2><button class="aim-button aim-icon-button" data-action="close-drawer" aria-label="關閉活動設定" type="button">x</button></div>
        <div class="aim-drawer-body">
          <div class="aim-field"><label>活動名稱</label><input class="aim-input" id="aim-settings-name" value="${Store.escapeHtml(activity.name)}"></div>
          <div class="aim-modal-grid"><div class="aim-field"><label>表單開放開始日期</label><input class="aim-input" id="aim-settings-form-start" type="date" value="${activity.formOpenStart}"></div><div class="aim-field"><label>表單開放結束日期</label><input class="aim-input" id="aim-settings-form-end" type="date" value="${activity.formOpenEnd}"></div><div class="aim-field"><label>展期開始日期（選填）</label><input class="aim-input" id="aim-settings-ex-start" type="date" value="${activity.exhibitionStart || ''}"></div><div class="aim-field"><label>展期結束日期（選填）</label><input class="aim-input" id="aim-settings-ex-end" type="date" value="${activity.exhibitionEnd || ''}"></div></div>
          <div class="aim-field"><label>活動說明</label><textarea class="aim-textarea" id="aim-settings-description">${Store.escapeHtml(activity.description || '')}</textarea></div>
          <dl class="aim-definition-list"><dt>活動 ID</dt><dd>${Store.escapeHtml(activity.id)}</dd><dt>建立者</dt><dd>${Store.escapeHtml(activity.createdByDisplayName)}</dd><dt>建立時間</dt><dd>${Store.formatDateTime(activity.createdAt)}</dd><dt>最近更新者</dt><dd>${Store.escapeHtml(activity.updatedByDisplayName)}</dd><dt>最近更新</dt><dd>${Store.formatDateTime(activity.updatedAt)}</dd><dt>狀態</dt><dd>${statusPill(Store.activityStatus(activity))}</dd></dl>
          <div class="aim-panel" style="margin-top:16px"><div class="aim-panel-title-row"><h3>Prototype 資料</h3><button class="aim-button aim-button-danger" data-action="reset" type="button">重設 Prototype 資料</button></div></div>
        </div>
        <div class="aim-drawer-foot"><button class="aim-button" data-action="close-drawer" type="button">關閉</button><button class="aim-button aim-button-primary" data-action="save-settings" type="button">儲存設定</button></div>
      </aside>
    `;
  }

  function recordDrawer() {
    const activity = selectedActivity();
    const record = ui.drawer.id ? state.records.find(r => r.id === ui.drawer.id) : null;
    const creating = ui.drawer.mode === 'create';
    const editable = creating ? canCreateRecord(activity) : canEditRecord(record, activity);
    const editing = (ui.drawer.mode === 'edit' || creating) && editable;
    const working = ui.drawer.working || (record ? Store.clone(record.answers) : {});
    const otherRecorderRecord = isRecorder() && record && record.createdByUserId !== currentUser.userId;
    const ownRecorderRecord = isRecorder() && record && record.createdByUserId === currentUser.userId;
    return `
      <div class="aim-drawer-backdrop" data-action="close-drawer"></div>
      <aside class="aim-drawer" role="dialog" aria-modal="true">
        <div class="aim-drawer-head"><h2>${creating ? '新增情報紀錄' : editing ? '編輯紀錄' : '紀錄明細'}</h2><button class="aim-button aim-icon-button" data-action="close-drawer" type="button" aria-label="關閉紀錄">x</button></div>
        <div class="aim-drawer-body">
          ${otherRecorderRecord ? `<div class="aim-readonly-note">此筆紀錄由 ${Store.escapeHtml(record.createdByDisplayName)} 建立，你可以檢視但不可編輯或作廢。</div>` : ''}
          ${ownRecorderRecord ? `<div class="aim-readonly-note">${Store.activityStatus(activity).key === 'open' ? '自己的紀錄可編輯。' : '表單已不開放，紀錄者只能檢視自己的紀錄。'}</div>` : ''}
          ${record ? `<dl class="aim-definition-list" style="margin-bottom:14px"><dt>紀錄 ID</dt><dd>${record.id}</dd><dt>建立者</dt><dd>${Store.escapeHtml(record.createdByDisplayName)}</dd><dt>建立時間</dt><dd>${Store.formatDateTime(record.createdAt)}</dd><dt>最近更新者</dt><dd>${Store.escapeHtml(record.updatedByDisplayName)}</dd><dt>最近更新</dt><dd>${Store.formatDateTime(record.updatedAt)}</dd><dt>狀態</dt><dd>${record.status === 'void' ? '作廢' : '有效'}</dd></dl>` : ''}
          <div class="aim-answer-list">${activity.formFields.map(field => renderAnswer(field, working, editing)).join('')}</div>
        </div>
        <div class="aim-drawer-foot">${record && !editing && canEditRecord(record, activity) ? `<button class="aim-button" data-action="edit-record" data-id="${record.id}" type="button">編輯</button>` : ''}${record && !editing && canManageRecords() ? `<button class="aim-button aim-button-danger" data-action="${record.status === 'void' ? 'restore-record' : 'void-record'}" data-id="${record.id}" type="button">${record.status === 'void' ? '還原紀錄' : '作廢紀錄'}</button>` : ''}<button class="aim-button" data-action="close-drawer" type="button">關閉</button>${editing ? `<button class="aim-button aim-button-primary" data-action="${creating ? 'save-new-record' : 'save-record'}" type="button">儲存紀錄</button>` : ''}</div>
      </aside>
    `;
  }

  function renderAnswer(field, answers, editable) {
    if (field.type === 'section_heading') return `<div class="aim-answer"><h4>${Store.escapeHtml(field.title)}</h4></div>`;
    const value = answers[field.fieldId];
    if (!editable) return `<div class="aim-answer"><h4>${Store.escapeHtml(field.title)} ${field.retired ? '<span class="aim-pill aim-pill-retired">已停用</span>' : ''}</h4><div>${Store.escapeHtml(Store.answerText(value) || '-')}</div></div>`;
    if (field.retired) return '';
    if (field.type === 'long_text') return `<div class="aim-field"><label>${Store.escapeHtml(field.title)}</label><textarea class="aim-textarea aim-record-input" data-field="${field.fieldId}">${Store.escapeHtml(value || '')}</textarea></div>`;
    if (field.type === 'number') return `<div class="aim-field"><label>${Store.escapeHtml(field.title)}</label><input class="aim-input aim-record-input" type="number" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}"></div>`;
    if (field.type === 'dropdown') return `<div class="aim-field"><label>${Store.escapeHtml(field.title)}</label><select class="aim-select aim-record-input" data-field="${field.fieldId}">${option('', '請選擇', value || '')}${(field.options || []).map(o => option(o, o, value || '')).join('')}</select></div>`;
    if (field.type === 'single_choice') return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-record-radio" name="${field.fieldId}" data-field="${field.fieldId}" type="radio" value="${Store.escapeHtml(o)}" ${value === o ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}</div>`;
    if (field.type === 'multiple_choice') {
      const values = Array.isArray(value) ? value : [];
      return `<div class="aim-field"><span class="aim-field-title">${Store.escapeHtml(field.title)}</span>${(field.options || []).map(o => `<label class="aim-checkbox"><input class="aim-record-check" data-field="${field.fieldId}" type="checkbox" value="${Store.escapeHtml(o)}" ${values.includes(o) ? 'checked' : ''}> ${Store.escapeHtml(o)}</label>`).join('')}</div>`;
    }
    return `<div class="aim-field"><label>${Store.escapeHtml(field.title)}</label><input class="aim-input aim-record-input" data-field="${field.fieldId}" value="${Store.escapeHtml(value || '')}"></div>`;
  }

  root.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'use-real-role') switchPreviewRole('real');
    if (action === 'all' && canManageActivities()) { ui.view = 'overview'; ui.tab = 'overview'; }
    if (action === 'open' && canManageActivities()) { ui.selectedActivityId = el.dataset.id; ui.view = 'workspace'; ui.tab = 'overview'; }
    if (action === 'recorder-open' && isRecorder()) { ui.selectedActivityId = el.dataset.id; ui.view = 'workspace'; ui.tab = 'entry'; }
    if (action === 'tab') selectTab(el.dataset.tab);
    if (action === 'sort' && canManageActivities()) sort(el.dataset.key);
    if (action === 'clear-overview' && canManageActivities()) ui.overview = { q: '', status: 'all', sort: 'name', dir: 'asc' };
    if (action === 'new-activity' && canManageActivities()) ui.dialog = { type: 'activity', mode: 'create' };
    if (action === 'duplicate' && canManageActivities()) openDuplicate(el.dataset.id);
    if (action === 'close-dialog') ui.dialog = null;
    if (action === 'save-activity-dialog' && canManageActivities()) saveActivityDialog();
    if (action === 'settings' && canManageActivities()) ui.drawer = { type: 'settings' };
    if (action === 'close-drawer') ui.drawer = null;
    if (action === 'save-settings' && canManageActivities()) saveSettings();
    if (action === 'reset' && canManageActivities()) resetData();
    if (action === 'add-field' && canDesignForm()) addField();
    if (action === 'select-field' && canDesignForm()) ui.selectedFieldId = el.dataset.id;
    if (action === 'move-field' && canDesignForm()) moveField(el.dataset.id, Number(el.dataset.dir));
    if (action === 'toggle-field' && canDesignForm()) toggleField(el.dataset.id);
    if (action === 'copy-field' && canDesignForm()) copyField(el.dataset.id);
    if (action === 'delete-field' && canDesignForm()) deleteField(el.dataset.id);
    if (action === 'retire-field' && canDesignForm()) retireField(el.dataset.id);
    if (action === 'scope' && canManageRecords()) ui.records.scope = el.dataset.scope;
    if (action === 'clear-records') ui.records = { scope: ui.records.scope, q: '', recorder: 'all', priority: 'all', state: 'normal', low: false, start: '', end: '' };
    if (action === 'new-record' && canManageRecords() && canCreateRecord(selectedActivity())) ui.drawer = { type: 'record', mode: 'create', working: {} };
    if (action === 'record') ui.drawer = { type: 'record', mode: 'view', id: el.dataset.id };
    if (action === 'edit-record') {
      const record = state.records.find(r => r.id === el.dataset.id);
      if (canEditRecord(record, selectedActivity())) ui.drawer = { type: 'record', mode: 'edit', id: record.id, working: Store.clone(record.answers) };
    }
    if (action === 'save-new-record') saveNewRecord();
    if (action === 'save-record') saveRecord();
    if (action === 'void-record' && canManageRecords()) voidRecord(el.dataset.id);
    if (action === 'restore-record' && canManageRecords()) restoreRecord(el.dataset.id);
    if (action === 'quick-save-next') saveQuickRecord(true);
    if (action === 'quick-save-view') saveQuickRecord(false);
    if (action === 'export-filtered' && canExport()) exportCsv(filteredRecords(selectedActivity(), ui.records.scope), selectedActivity(), 'filtered');
    if (action === 'export-all' && canExport()) exportCsv(recordsFor(selectedActivity().id).filter(r => r.status !== 'void' || ui.includeVoidCsv), selectedActivity(), 'all');
    if (action === 'clear-analytics' && canUseAnalytics()) ui.analytics = { recorder: 'all', start: '', end: '', q: '' };
    save();
    render();
  });

  function bindInputs() {
    const preview = document.getElementById('aim-role-preview');
    if (preview) preview.addEventListener('change', () => switchPreviewRole(preview.value));
    bind('aim-overview-q', value => { ui.overview.q = value; });
    bind('aim-overview-status', value => { ui.overview.status = value; }, 'change');
    bind('aim-dialog-name', value => { if (ui.dialog) ui.dialog.name = value; });
    bind('aim-dialog-form-start', value => { if (ui.dialog) ui.dialog.formOpenStart = value; }, 'change');
    bind('aim-dialog-form-end', value => { if (ui.dialog) ui.dialog.formOpenEnd = value; }, 'change');
    bind('aim-dialog-ex-start', value => { if (ui.dialog) ui.dialog.exhibitionStart = value; }, 'change');
    bind('aim-dialog-ex-end', value => { if (ui.dialog) ui.dialog.exhibitionEnd = value; }, 'change');
    bind('aim-dialog-description', value => { if (ui.dialog) ui.dialog.description = value; });
    bind('aim-settings-name', value => { if (ui.drawer) ui.drawer.name = value; });
    bind('aim-settings-form-start', value => { if (ui.drawer) ui.drawer.formOpenStart = value; }, 'change');
    bind('aim-settings-form-end', value => { if (ui.drawer) ui.drawer.formOpenEnd = value; }, 'change');
    bind('aim-settings-ex-start', value => { if (ui.drawer) ui.drawer.exhibitionStart = value; }, 'change');
    bind('aim-settings-ex-end', value => { if (ui.drawer) ui.drawer.exhibitionEnd = value; }, 'change');
    bind('aim-settings-description', value => { if (ui.drawer) ui.drawer.description = value; });
    bind('aim-field-title', value => updateField({ title: value }));
    bind('aim-field-helper', value => updateField({ helperText: value }));
    bind('aim-field-type', value => updateField({ type: value, options: ['single_choice', 'multiple_choice', 'dropdown'].includes(value) ? ['選項 1', '選項 2'] : [] }), 'change');
    bind('aim-field-options', value => updateField({ options: value.split('\n').map(v => v.trim()).filter(Boolean) }));
    bind('aim-record-q', value => { ui.records.q = value; });
    bind('aim-record-recorder', value => { ui.records.recorder = value; }, 'change');
    bind('aim-record-priority', value => { ui.records.priority = value; }, 'change');
    bind('aim-record-state', value => { ui.records.state = value; }, 'change');
    bind('aim-record-start', value => { ui.records.start = value; }, 'change');
    bind('aim-record-end', value => { ui.records.end = value; }, 'change');
    bindCheck('aim-record-low', value => { ui.records.low = value; });
    bindCheck('aim-csv-void', value => { ui.includeVoidCsv = value; });
    bind('aim-analytics-start', value => { ui.analytics.start = value; }, 'change');
    bind('aim-analytics-end', value => { ui.analytics.end = value; }, 'change');
    bind('aim-analytics-recorder', value => { ui.analytics.recorder = value; }, 'change');
    bind('aim-analytics-q', value => { ui.analytics.q = value; });
    document.querySelectorAll('.aim-record-input').forEach(node => node.addEventListener('input', () => setWorking(node.dataset.field, node.value)));
    document.querySelectorAll('.aim-record-radio').forEach(node => node.addEventListener('change', () => { if (node.checked) setWorking(node.dataset.field, node.value); }));
    document.querySelectorAll('.aim-record-check').forEach(node => node.addEventListener('change', () => {
      const list = new Set(ui.drawer.working[node.dataset.field] || []);
      if (node.checked) list.add(node.value);
      else list.delete(node.value);
      setWorking(node.dataset.field, Array.from(list));
    }));
    document.querySelectorAll('.aim-quick-input').forEach(node => node.addEventListener('input', () => setQuickAnswer(node.dataset.field, node.value)));
    document.querySelectorAll('.aim-quick-radio').forEach(node => node.addEventListener('change', () => { if (node.checked) setQuickAnswer(node.dataset.field, node.value); }));
    document.querySelectorAll('.aim-quick-check').forEach(node => node.addEventListener('change', () => {
      const list = new Set(ui.quickAnswers[node.dataset.field] || []);
      if (node.checked) list.add(node.value);
      else list.delete(node.value);
      setQuickAnswer(node.dataset.field, Array.from(list));
    }));
  }

  async function switchPreviewRole(value) {
    Store.setPreviewSelection(value);
    currentUser = await Store.resolveCurrentUser();
    ui.drawer = null;
    ui.dialog = null;
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
      ui.tab = ['entry', 'all_records', 'my_records'].includes(tabName) ? tabName : 'entry';
      return;
    }
    if (tabName === 'form' && !canDesignForm()) ui.tab = 'overview';
    else if (tabName === 'analytics' && !canUseAnalytics()) ui.tab = 'overview';
    else ui.tab = tabName;
  }

  function filteredActivities() {
    const q = ui.overview.q.trim().toLowerCase();
    return state.activities.map(a => ({ ...a, ...activityMetrics(a.id), status: Store.activityStatus(a).key }))
      .filter(a => ui.overview.status === 'all' || Store.activityStatus(a).key === ui.overview.status)
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
      open: state.activities.filter(a => Store.activityStatus(a).key === 'open').length,
      activeRecords: state.records.filter(r => r.status !== 'void').length,
      today: state.records.filter(r => r.status !== 'void' && r.createdAt.slice(0, 10) === Store.CURRENT_DATE).length
    };
  }

  function recordCoverage(record, activity) {
    const fields = activity.formFields.filter(f => f.type !== 'section_heading' && !f.retired);
    const answered = fields.filter(f => hasValue(record.answers[f.fieldId])).length;
    return { answered, total: fields.length, percent: fields.length ? Math.round(answered / fields.length * 100) : 0 };
  }

  function filteredRecords(activity, scope) {
    const q = ui.records.q.trim().toLowerCase();
    return recordsFor(activity.id).filter(r => {
      if (scope === 'mine' && r.createdByUserId !== currentUser.userId) return false;
      if (ui.records.state !== 'all' && (ui.records.state === 'void') !== (r.status === 'void')) return false;
      if (ui.records.recorder !== 'all' && r.createdByDisplayName !== ui.records.recorder) return false;
      if (ui.records.priority !== 'all' && (r.answers.fld_priority || '未判斷') !== ui.records.priority) return false;
      if (ui.records.start && r.createdAt.slice(0, 10) < ui.records.start) return false;
      if (ui.records.end && r.createdAt.slice(0, 10) > ui.records.end) return false;
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
      description: source.description
    };
  }

  function saveActivityDialog() {
    const d = ui.dialog || {};
    const validation = validateActivity(d);
    if (validation) return toast(validation);
    const source = d.sourceId ? state.activities.find(a => a.id === d.sourceId) : null;
    const activity = {
      id: Store.uid('act'),
      name: d.name.trim(),
      formOpenStart: d.formOpenStart,
      formOpenEnd: d.formOpenEnd,
      exhibitionStart: d.exhibitionStart || '',
      exhibitionEnd: d.exhibitionEnd || '',
      description: d.description || '',
      formFields: Store.clone(source ? source.formFields : Store.defaultFields()),
      createdByUserId: currentUser.userId,
      createdByDisplayName: currentUser.displayName,
      createdAt: Store.nowStamp(),
      updatedByUserId: currentUser.userId,
      updatedByDisplayName: currentUser.displayName,
      updatedAt: Store.nowStamp()
    };
    if (source) activity.formFields = activity.formFields.map(f => ({ ...f, fieldId: Store.uid('fld') }));
    state.activities.push(activity);
    ui.dialog = null;
    ui.selectedActivityId = activity.id;
    ui.view = 'workspace';
    ui.tab = 'overview';
    toast(source ? '已建立複製活動。' : '已建立活動。');
  }

  function saveSettings() {
    const a = selectedActivity();
    const d = { ...a, ...ui.drawer };
    const validation = validateActivity(d);
    if (validation) return toast(validation);
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

  function addField() {
    const activity = selectedActivity();
    const type = document.getElementById('aim-add-field-type').value;
    const field = { fieldId: Store.uid('fld'), type, title: fieldTypeLabel(type), helperText: '', options: ['single_choice', 'multiple_choice', 'dropdown'].includes(type) ? ['選項 1', '選項 2'] : [], visible: true, retired: false };
    activity.formFields.push(field);
    ui.selectedFieldId = field.fieldId;
    Store.touch(activity, currentUser);
    toast('已新增欄位。');
  }

  function updateField(patch) {
    if (!canDesignForm()) return;
    const field = selectedActivity().formFields.find(f => f.fieldId === ui.selectedFieldId);
    if (!field) return;
    Object.assign(field, patch);
    Store.touch(selectedActivity(), currentUser);
  }

  function moveField(fieldId, dir) {
    const list = selectedActivity().formFields;
    const index = list.findIndex(f => f.fieldId === fieldId);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= list.length) return;
    const [field] = list.splice(index, 1);
    list.splice(next, 0, field);
    Store.touch(selectedActivity(), currentUser);
    toast('已更新欄位順序。');
  }

  function toggleField(fieldId) {
    const field = selectedActivity().formFields.find(f => f.fieldId === fieldId);
    field.visible = !field.visible;
    Store.touch(selectedActivity(), currentUser);
    toast(field.visible ? '已顯示欄位。' : '已隱藏欄位。');
  }

  function copyField(fieldId) {
    const list = selectedActivity().formFields;
    const index = list.findIndex(f => f.fieldId === fieldId);
    const copy = { ...Store.clone(list[index]), fieldId: Store.uid('fld'), title: `${list[index].title} 複製`, retired: false };
    list.splice(index + 1, 0, copy);
    ui.selectedFieldId = copy.fieldId;
    Store.touch(selectedActivity(), currentUser);
    toast('已複製欄位。');
  }

  function deleteField(fieldId) {
    const activity = selectedActivity();
    activity.formFields = activity.formFields.filter(f => f.fieldId !== fieldId);
    ui.selectedFieldId = activity.formFields[0] && activity.formFields[0].fieldId;
    Store.touch(activity, currentUser);
    toast('已刪除欄位。');
  }

  function retireField(fieldId) {
    const field = selectedActivity().formFields.find(f => f.fieldId === fieldId);
    if (!window.confirm(`確定要停用「${field.title}」？已有回答的資料會保留。`)) return;
    field.retired = true;
    field.visible = false;
    Store.touch(selectedActivity(), currentUser);
    toast('已停用欄位。');
  }

  function fieldHasAnswers(activityId, fieldId) {
    return recordsFor(activityId).some(r => hasValue(r.answers[fieldId]));
  }

  function setWorking(fieldId, value) {
    if (!ui.drawer || !ui.drawer.working) return;
    if (Array.isArray(value) ? value.length : String(value || '').trim()) ui.drawer.working[fieldId] = value;
    else delete ui.drawer.working[fieldId];
  }

  function setQuickAnswer(fieldId, value) {
    if (Array.isArray(value) ? value.length : String(value || '').trim()) ui.quickAnswers[fieldId] = value;
    else delete ui.quickAnswers[fieldId];
  }

  function canCreateRecord(activity) {
    return currentUser && currentUser.authenticated && activity && Store.activityStatus(activity).key === 'open';
  }

  function canEditRecord(record, activity) {
    if (!record || record.status === 'void') return false;
    if (canManageRecords()) return true;
    return isRecorder() && record.createdByUserId === currentUser.userId && Store.activityStatus(activity).key === 'open';
  }

  function saveNewRecord() {
    if (!canCreateRecord(selectedActivity())) return toast('表單目前未開放，無法新增紀錄。');
    createRecord(selectedActivity(), clean(ui.drawer.working || {}));
    ui.drawer = null;
    toast('已建立情報紀錄。');
  }

  function saveQuickRecord(stayOnEntry) {
    const activity = selectedActivity();
    if (!canCreateRecord(activity)) return toast('表單目前未開放，無法新增紀錄。');
    createRecord(activity, clean(ui.quickAnswers || {}));
    ui.quickAnswers = {};
    ui.focusQuickFirst = stayOnEntry;
    ui.tab = stayOnEntry ? 'entry' : 'all_records';
    toast('已儲存一筆情報。');
  }

  function createRecord(activity, answers) {
    state.records.push({
      id: Store.uid('rec'),
      activityId: activity.id,
      status: 'active',
      answers,
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
    record.answers = clean(ui.drawer.working || {});
    record.updatedByUserId = currentUser.userId;
    record.updatedByDisplayName = currentUser.displayName;
    record.updatedAt = Store.nowStamp();
    ui.drawer = { type: 'record', mode: 'view', id: record.id };
    toast('已儲存紀錄。');
  }

  function voidRecord(id) {
    if (!window.confirm('確定要作廢此紀錄？')) return;
    const record = state.records.find(r => r.id === id);
    record.status = 'void';
    record.updatedByUserId = currentUser.userId;
    record.updatedByDisplayName = currentUser.displayName;
    record.updatedAt = Store.nowStamp();
    toast('已作廢紀錄。');
  }

  function restoreRecord(id) {
    const record = state.records.find(r => r.id === id);
    record.status = 'active';
    record.updatedByUserId = currentUser.userId;
    record.updatedByDisplayName = currentUser.displayName;
    record.updatedAt = Store.nowStamp();
    toast('已還原紀錄。');
  }

  function exportCsv(records, activity, scope) {
    const rows = records.filter(r => ui.includeVoidCsv || r.status !== 'void');
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
    if (!window.confirm('確定要重設 Prototype 資料？這會還原 V2 繁體中文範例資料。')) return;
    state = Store.reset();
    ui.selectedActivityId = state.selectedActivityId;
    ui.view = 'overview';
    ui.tab = 'overview';
    ui.drawer = null;
    toast('已重設 Prototype 資料。');
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
    const found = fieldTypes.find(([key]) => key === type);
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
