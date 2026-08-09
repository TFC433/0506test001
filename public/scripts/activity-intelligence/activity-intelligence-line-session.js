(function () {
  'use strict';

  const LOCAL_ROLE_KEY = 'activity-intelligence-local-role';
  const LOCAL_MANUAL_LOGIN_KEY = 'activity-intelligence-local-manual-login';
  const LOCAL_ROLE_HEADER = 'x-activity-intelligence-local-role';
  const ALLOWED_ROLES = new Set(['super_admin', 'admin', 'recorder']);

  let liffInitialized = false;
  let currentSession = null;

  function isLocalDevelopment() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function localPreviewRole() {
    if (!isLocalDevelopment()) return '';
    const value = sessionStorage.getItem(LOCAL_ROLE_KEY) || '';
    return ALLOWED_ROLES.has(value) ? value : '';
  }

  function setLocalPreviewRole(role) {
    if (!isLocalDevelopment()) return;
    if (ALLOWED_ROLES.has(role)) sessionStorage.setItem(LOCAL_ROLE_KEY, role);
    else sessionStorage.removeItem(LOCAL_ROLE_KEY);
  }

  function localManualLoginEnabled() {
    try {
      return isLocalDevelopment() && sessionStorage.getItem(LOCAL_MANUAL_LOGIN_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setLocalManualLoginEnabled(enabled) {
    if (!isLocalDevelopment()) return;
    try {
      if (enabled) sessionStorage.setItem(LOCAL_MANUAL_LOGIN_KEY, '1');
      else sessionStorage.removeItem(LOCAL_MANUAL_LOGIN_KEY);
    } catch (_) {
      // Local test state is only an auto-login UI preference; session cookie remains authoritative.
    }
  }

  function effectiveSession(session) {
    if (!session || !session.authenticated) return session;
    const previewRole = localPreviewRole();
    return {
      ...session,
      realRole: session.role,
      role: previewRole || session.role,
      localPreviewRole: previewRole,
      localPreviewEnabled: isLocalDevelopment(),
      canLocalLogin: isLocalDevelopment()
    };
  }

  async function readSession() {
    const response = await fetch('/api/line/session', { credentials: 'same-origin' });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  }

  async function ensureLiffReady() {
    if (typeof liff === 'undefined' || !window.LIFF_ID) return false;
    if (!liffInitialized) {
      await liff.init({ liffId: window.LIFF_ID });
      liffInitialized = true;
    }
    return true;
  }

  async function createSession(options = {}) {
    const headers = {};

    if (isLocalDevelopment()) {
      if (!options.forceLocal && !localManualLoginEnabled()) {
        return {
          authenticated: false,
          message: '請先使用 LINE 登入後繼續。',
          canLineLogin: true,
          localPreviewEnabled: true,
          canLocalLogin: true
        };
      }
      headers.Authorization = 'Bearer TEST_LOCAL_TOKEN';
    } else {
      if (!await ensureLiffReady()) {
        return { authenticated: false, message: 'LINE LIFF 尚未準備完成。', canLineLogin: false };
      }

      if (!liff.isLoggedIn()) {
        return { authenticated: false, message: '請先使用 LINE 登入。', canLineLogin: true };
      }

      const idToken = liff.getIDToken();
      if (!idToken) {
        return { authenticated: false, message: '無法取得 LINE 登入憑證。', canLineLogin: true };
      }

      headers.Authorization = `Bearer ${idToken}`;
    }

    const response = await fetch('/api/line/session', {
      method: 'POST',
      headers,
      credentials: 'same-origin'
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok && body.success) return body;
    if (response.status === 403) {
      return {
        authenticated: false,
        forbidden: true,
        userId: body.yourUserId,
        message: body.message || '此 LINE 帳號尚未開通活動情報權限。'
      };
    }

    return { authenticated: false, message: body.message || '建立 LINE 工作階段失敗。' };
  }

  async function ensureSession(options = {}) {
    if (!options.forceRefresh) {
      const existing = await readSession();
      if (existing.response.ok && existing.body.success) {
        currentSession = existing.body;
        return effectiveSession(currentSession);
      }

      if (existing.response.status === 403) {
        currentSession = {
          authenticated: false,
          forbidden: true,
          userId: existing.body.yourUserId,
          message: existing.body.message || '此 LINE 帳號尚未開通活動情報權限。'
        };
        return currentSession;
      }

      if (existing.response.status !== 401) {
        currentSession = {
          authenticated: false,
          message: existing.body.message || 'LINE 工作階段驗證失敗。'
        };
        return currentSession;
      }
    }

    currentSession = await createSession();
    return effectiveSession(currentSession);
  }

  function requestHeaders() {
    const role = localPreviewRole();
    return role ? { [LOCAL_ROLE_HEADER]: role } : {};
  }

  async function recoverSession() {
    const session = await ensureSession({ forceRefresh: true });
    return Boolean(session && session.authenticated);
  }

  async function localTestLogin() {
    if (!isLocalDevelopment()) return { authenticated: false };
    setLocalManualLoginEnabled(true);
    currentSession = await createSession({ forceLocal: true });
    return effectiveSession(currentSession);
  }

  async function loginWithLine() {
    if (!await ensureLiffReady()) return;
    if (!liff.isLoggedIn()) liff.login();
  }

  async function logout() {
    try {
      await fetch('/api/line/session', {
        method: 'DELETE',
        credentials: 'same-origin'
      });
    } catch (error) {
      console.warn('[ActivityIntelligenceSession] Session logout request failed:', error.message);
    }

    try {
      if (typeof liff !== 'undefined' && liffInitialized && liff.isLoggedIn()) {
        liff.logout();
      }
    } catch (error) {
      console.warn('[ActivityIntelligenceSession] LIFF logout skipped:', error.message);
    }

    currentSession = null;
    window.location.reload();
  }

  async function localTestLogout() {
    if (!isLocalDevelopment()) return;
    setLocalManualLoginEnabled(false);
    try {
      await fetch('/api/line/session', {
        method: 'DELETE',
        credentials: 'same-origin'
      });
    } catch (error) {
      console.warn('[ActivityIntelligenceSession] Local test logout request failed:', error.message);
    }

    currentSession = null;
    window.location.reload();
  }

  window.ActivityIntelligenceSession = Object.freeze({
    ensureSession,
    recoverSession,
    requestHeaders,
    isLocalDevelopment,
    localPreviewRole,
    setLocalPreviewRole,
    loginWithLine,
    localTestLogin,
    localTestLogout,
    logout
  });
})();
