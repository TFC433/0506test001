(function () {
  'use strict';

  const STORAGE_KEY = 'aim-prototype-v2';
  const ROLE_PREVIEW_KEY = 'aim-prototype-role-preview';
  const ROLES = ['super_admin', 'admin', 'recorder'];
  const ROLE_PREVIEW_VALUES = ['real', ...ROLES];
  const ROLE_LABELS = {
    super_admin: '最高管理員',
    admin: '管理員',
    recorder: '紀錄者'
  };
  const CURRENT_DATE = '2026-08-05';

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function nowStamp() {
    const date = new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ROLES.includes(normalized) ? normalized : 'recorder';
  }

  function roleLabel(role) {
    return ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS.recorder;
  }

  function isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  function previewSelection() {
    if (!isLocalhost()) return 'real';
    const value = sessionStorage.getItem(ROLE_PREVIEW_KEY);
    return ROLE_PREVIEW_VALUES.includes(value) ? value : 'real';
  }

  function setPreviewSelection(value) {
    if (!isLocalhost()) return;
    if (value === 'real') sessionStorage.removeItem(ROLE_PREVIEW_KEY);
    else if (ROLES.includes(value)) sessionStorage.setItem(ROLE_PREVIEW_KEY, value);
  }

  async function fetchRealSession() {
    const response = await fetch('/api/line/session', { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Session HTTP ${response.status}`);
    const data = await response.json();
    if (!data || data.authenticated !== true || !data.userId) {
      throw new Error('Unauthenticated session');
    }
    return {
      authenticated: true,
      isPrototypePreview: false,
      userId: data.userId,
      displayName: data.displayName || data.userId,
      role: normalizeRole(data.role),
      realRole: normalizeRole(data.role),
      pictureUrl: data.pictureUrl || null,
      source: 'LINE 白名單'
    };
  }

  async function resolveCurrentUser() {
    let realUser = null;
    let realError = null;

    try {
      realUser = await fetchRealSession();
    } catch (error) {
      realError = error;
    }

    if (!isLocalhost()) {
      return realUser || {
        authenticated: false,
        message: '尚未取得有效的 LINE 白名單工作階段。'
      };
    }

    const selectedPreview = previewSelection();
    if (selectedPreview !== 'real') {
      return {
        authenticated: true,
        isPrototypePreview: true,
        previewSelection: selectedPreview,
        userId: 'TEST_LOCAL_USER',
        displayName: 'TestUser',
        role: selectedPreview,
        realRole: realUser ? realUser.role : null,
        realAuthenticated: Boolean(realUser),
        pictureUrl: null,
        source: 'local_prototype_preview'
      };
    }

    if (realUser) {
      return {
        ...realUser,
        previewSelection: 'real',
        realAuthenticated: true
      };
    }

    return {
      authenticated: false,
      isPrototypePreview: false,
      previewSelection: 'real',
      realAuthenticated: false,
      role: 'recorder',
      userId: '',
      displayName: '尚未登入',
      source: '尚未取得 LINE Session',
      message: '本機目前沒有有效的 LINE 工作階段。請選擇預覽角色進行原型檢視，或回到實際白名單角色後重新登入。',
      error: realError ? realError.message : ''
    };
  }

  function formatDate(value) {
    return value ? String(value).replace(/-/g, '/') : '';
  }

  function formatDateTime(value) {
    if (!value) return '-';
    return String(value).replace(/^(\d{4})-(\d{2})-(\d{2})/, '$1/$2/$3');
  }

  function field(fieldId, type, title, options) {
    return {
      fieldId,
      type,
      title,
      helperText: '',
      options: options || [],
      visible: true,
      retired: false
    };
  }

  function defaultFields() {
    return [
      field('fld_basic', 'section_heading', '基本資訊'),
      field('fld_customer_name', 'short_text', '客戶或受訪者姓名'),
      field('fld_company', 'short_text', '公司名稱'),
      field('fld_job_title', 'short_text', '職稱'),
      field('fld_visitors', 'number', '來訪人數'),
      field('fld_interests', 'multiple_choice', '感興趣的主題', ['自動化', 'AI', 'IoT', 'OT', '資料整合', '其他']),
      field('fld_scale', 'dropdown', '公司規模', ['1-10 人', '11-50 人', '51-200 人', '201-500 人', '501 人以上', '未提供']),
      field('fld_priority', 'single_choice', '後續追蹤優先度', ['高', '中', '低', '未判斷']),
      field('fld_notes', 'long_text', '情報紀錄'),
      field('fld_followup', 'long_text', '後續處理')
    ];
  }

  function activityStatus(activity) {
    const today = CURRENT_DATE;
    if (today < activity.formOpenStart) return { key: 'upcoming', label: '尚未開放' };
    if (today >= activity.formOpenStart && today <= activity.formOpenEnd) return { key: 'open', label: '開放中' };
    return { key: 'ended', label: '已結束' };
  }

  function makeActivity(id, name, formOpenStart, formOpenEnd, exhibitionStart, exhibitionEnd, description) {
    return {
      id,
      name,
      formOpenStart,
      formOpenEnd,
      exhibitionStart: exhibitionStart || '',
      exhibitionEnd: exhibitionEnd || '',
      description: description || '',
      formFields: defaultFields(),
      createdByUserId: 'mock-super-admin-user',
      createdByDisplayName: 'Josh Chen',
      createdAt: '2026-07-15 09:00',
      updatedByUserId: 'mock-super-admin-user',
      updatedByDisplayName: 'Josh Chen',
      updatedAt: '2026-07-15 09:00'
    };
  }

  function makeRecord(activityId, recordId, createdAt, creator, answers, status) {
    return {
      id: recordId,
      activityId,
      status: status || 'active',
      answers,
      createdByUserId: creator.userId,
      createdByDisplayName: creator.displayName,
      createdAt,
      updatedByUserId: creator.userId,
      updatedByDisplayName: creator.displayName,
      updatedAt: createdAt
    };
  }

  function fixture() {
    const tairosId = 'act-tairos-2026';
    const josh = { userId: 'mock-super-admin-user', displayName: 'Josh Chen' };
    const mina = { userId: 'mock-recorder-mina', displayName: 'Mina Lee' };
    const alex = { userId: 'mock-recorder-alex', displayName: 'Alex Wu' };
    const activities = [
      makeActivity(tairosId, '2026TaiRoS', '2026-08-01', '2026-08-29', '2026-08-01', '2026-08-29', '展期活動的情報蒐集，表單開放期間獨立控制可填寫狀態。'),
      makeActivity('act-ai-summit-2026', '智慧製造高峰會', '2026-09-10', '2026-09-12', '', '', '後續活動範例，沒有展期日期也可建立活動。'),
      makeActivity('act-smart-factory-2026', '智慧工廠研討會', '2026-07-04', '2026-07-06', '2026-07-04', '2026-07-06', '已結束活動範例，僅保留紀錄查閱與分析。')
    ];

    return {
      activities,
      records: [
        makeRecord(tairosId, 'rec-1001', '2026-08-01 10:12', josh, {
          fld_customer_name: 'Alicia Wang',
          fld_company: 'NovaMotion Robotics',
          fld_job_title: '技術副理',
          fld_visitors: 4,
          fld_interests: ['自動化', 'AI', 'OT'],
          fld_scale: '201-500 人',
          fld_priority: '高',
          fld_notes: '正在評估 CNC 產線的資料整合，希望兩週內安排技術討論。',
          fld_followup: '提供案例資料並安排顧問會議。'
        }),
        makeRecord(tairosId, 'rec-1002', '2026-08-01 13:45', mina, {
          fld_customer_name: 'Ben Huang',
          fld_company: 'Everwell Components',
          fld_job_title: '廠長',
          fld_visitors: 2,
          fld_interests: ['IoT', '資料整合'],
          fld_scale: '51-200 人',
          fld_priority: '中',
          fld_notes: '主要關心設備稼動率與告警整合。',
          fld_followup: '寄送 OT 盤點清單。'
        }),
        makeRecord(tairosId, 'rec-1003', '2026-08-02 09:30', alex, {
          fld_customer_name: 'Chris Lin',
          fld_company: 'BrightWorks',
          fld_visitors: 1,
          fld_interests: ['AI'],
          fld_scale: '11-50 人',
          fld_priority: '低',
          fld_notes: '早期了解階段。'
        }),
        makeRecord(tairosId, 'rec-1004', '2026-08-02 16:08', josh, {
          fld_customer_name: 'Dana Kuo',
          fld_company: 'Formax Industrial',
          fld_job_title: '營運主管',
          fld_visitors: 3,
          fld_interests: ['自動化', '資料整合'],
          fld_scale: '501 人以上',
          fld_priority: '高',
          fld_notes: '希望串接多廠區資訊看板。',
          fld_followup: '安排需求訪談。'
        }),
        makeRecord(tairosId, 'rec-1005', '2026-08-03 11:20', mina, {
          fld_customer_name: 'Elaine Tsai',
          fld_company: 'HarborTech',
          fld_job_title: '產品經理',
          fld_visitors: 5,
          fld_interests: ['其他', 'AI'],
          fld_scale: '未提供',
          fld_priority: '未判斷',
          fld_notes: '現場詢問資料品質與模型維護方式。'
        }),
        makeRecord(tairosId, 'rec-1006', '2026-08-03 15:35', alex, {
          fld_customer_name: '重複紀錄',
          fld_company: 'NovaMotion Robotics',
          fld_priority: '中',
          fld_notes: '與 rec-1001 重複，保留作作廢範例。'
        }, 'void'),
        makeRecord(tairosId, 'rec-1007', '2026-08-04 10:02', josh, {
          fld_customer_name: 'Frank Ho'
        }),
        makeRecord(tairosId, 'rec-1008', '2026-08-04 12:55', mina, {
          fld_customer_name: 'Grace Chen',
          fld_company: 'MetricFab',
          fld_job_title: '製程工程師',
          fld_visitors: 2,
          fld_interests: ['OT', 'IoT'],
          fld_scale: '51-200 人',
          fld_priority: '中',
          fld_notes: '正在整理 PLC 與感測器資料，想先從單線驗證。'
        }),
        makeRecord(tairosId, 'rec-1009', '2026-08-04 17:18', alex, {
          fld_customer_name: 'Helen Yu',
          fld_company: 'AlphaMed Devices',
          fld_job_title: '資訊主管',
          fld_visitors: 1,
          fld_interests: ['AI', '資料整合'],
          fld_scale: '201-500 人',
          fld_priority: '高',
          fld_notes: '關注資安隔離與醫材法規流程。',
          fld_followup: '提供權限模型與稽核紀錄範例。'
        }),
        makeRecord(tairosId, 'rec-1010', '2026-08-05 09:42', josh, {
          fld_customer_name: 'Ivan Lai',
          fld_company: 'GreenAxis',
          fld_job_title: '總經理',
          fld_visitors: 3,
          fld_interests: ['自動化', 'IoT', 'AI'],
          fld_scale: '11-50 人',
          fld_priority: '高',
          fld_notes: '新廠規劃階段，希望一併納入資料基礎設施。',
          fld_followup: '下週安排方案簡報。'
        }),
        makeRecord(tairosId, 'rec-1011', '2026-08-05 11:05', mina, {
          fld_customer_name: 'Jenny Kao',
          fld_company: 'Northstar Plastics',
          fld_visitors: 2,
          fld_interests: ['資料整合'],
          fld_scale: '201-500 人',
          fld_priority: '中',
          fld_notes: '已有 MES，想了解跨系統資料彙整。'
        }),
        makeRecord(tairosId, 'rec-1012', '2026-08-05 14:18', alex, {
          fld_customer_name: 'Ken Mori',
          fld_company: 'Sakura Automation',
          fld_job_title: '海外業務',
          fld_visitors: 4,
          fld_interests: ['自動化', 'OT', '其他'],
          fld_scale: '501 人以上',
          fld_priority: '低',
          fld_notes: '代理商合作初步交流。',
          fld_followup: '由業務窗口後續聯繫。'
        }),
        makeRecord('act-smart-factory-2026', 'rec-2001', '2026-07-04 10:10', josh, {
          fld_customer_name: 'Lena Chang',
          fld_company: 'ProtoLine',
          fld_priority: '中',
          fld_notes: '已結束活動的紀錄範例。'
        })
      ],
      selectedActivityId: tairosId
    };
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && Array.isArray(parsed.activities) && Array.isArray(parsed.records)) return parsed;
    } catch (_) {}
    return reset();
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function reset() {
    const state = fixture();
    save(state);
    return state;
  }

  function touch(entity, user) {
    entity.updatedByUserId = user.userId;
    entity.updatedByDisplayName = user.displayName;
    entity.updatedAt = nowStamp();
  }

  function answerText(value) {
    if (Array.isArray(value)) return value.join(' | ');
    return value == null ? '' : String(value);
  }

  function recordSummary(record) {
    const name = record.answers.fld_customer_name || '未填姓名';
    const company = record.answers.fld_company ? `, ${record.answers.fld_company}` : '';
    const priority = record.answers.fld_priority ? ` - ${record.answers.fld_priority}` : '';
    return `${name}${company}${priority}`;
  }

  function activitySubtitle(activity) {
    if (!activity.exhibitionStart && !activity.exhibitionEnd) return '';
    return `展期：${formatDate(activity.exhibitionStart)} - ${formatDate(activity.exhibitionEnd)}`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.AIMStore = {
    STORAGE_KEY,
    ROLE_PREVIEW_KEY,
    ROLES,
    ROLE_PREVIEW_VALUES,
    ROLE_LABELS,
    CURRENT_DATE,
    uid,
    clone,
    nowStamp,
    normalizeRole,
    roleLabel,
    isLocalhost,
    previewSelection,
    setPreviewSelection,
    resolveCurrentUser,
    formatDate,
    formatDateTime,
    defaultFields,
    activityStatus,
    load,
    save,
    reset,
    touch,
    answerText,
    recordSummary,
    activitySubtitle,
    escapeHtml
  };
})();
