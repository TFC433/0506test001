(function () {
  'use strict';

  const LOCAL_ROLE_KEY = 'activity-intelligence-local-role';
  const LOCAL_MANUAL_LOGIN_KEY = 'activity-intelligence-local-manual-login';
  const LOCAL_ROLE_HEADER = 'x-activity-intelligence-local-role';
  const LIFF_RETURN_TARGET_KEY = 'tfc_liff_return_target';
  const LIFF_LOGIN_ATTEMPT_KEY = 'tfc-liff-bridge-login-attempt';
  const LIFF_EXPIRED_TOKEN_RECOVERY_KEY = 'tfc-liff-expired-token-recovery';
  const ALLOWED_ROLES = new Set(['super_admin', 'admin', 'recorder']);

  let currentSession = null;

  function isLocalDevelopment() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function isMobileBrowser() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
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
    if (session.accessClass === 'guest' && session.whitelisted === false) {
      return {
        ...session,
        role: null,
        realRole: null,
        localPreviewRole: '',
        localPreviewEnabled: false,
        canLocalLogin: isLocalDevelopment()
      };
    }
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

  function bridgeLoginUrl() {
    if (isMobileBrowser()) {
      const bridgeUrl = new URL('/liff/', window.location.origin);
      bridgeUrl.searchParams.set('product', 'form');
      return bridgeUrl.toString();
    }

    if (window.LIFF_ID) {
      const liffUrl = new URL(`https://liff.line.me/${encodeURIComponent(window.LIFF_ID)}/`);
      liffUrl.searchParams.set('product', 'form');
      return liffUrl.toString();
    }

    const bridgeUrl = new URL('/liff/', window.location.origin);
    bridgeUrl.searchParams.set('product', 'form');
    return bridgeUrl.toString();
  }

  function storeBridgeReturnTarget() {
    try {
      sessionStorage.setItem(LIFF_RETURN_TARGET_KEY, 'form');
      return true;
    } catch (error) {
      console.warn('[ActivityIntelligenceSession] Unable to store LINE return target:', error.message);
      return false;
    }
  }

  function clearBridgeReturnTarget() {
    try {
      sessionStorage.removeItem(LIFF_RETURN_TARGET_KEY);
    } catch (_) {
      // Routing state is non-auth, temporary browser state.
    }
  }

  function clearStaleLiffLoginAttempt() {
    try {
      sessionStorage.removeItem(LIFF_LOGIN_ATTEMPT_KEY);
      sessionStorage.removeItem(LIFF_EXPIRED_TOKEN_RECOVERY_KEY);
    } catch (_) {
      // LIFF auth markers are non-auth loop-prevention state.
    }
  }

  async function createSession(options = {}) {
    const headers = {};

    if (isLocalDevelopment()) {
      if (!options.forceLocal && !localManualLoginEnabled()) {
        return {
          authenticated: false,
          message: '請先使用 LINE 登入後繼續',
          canLineLogin: true,
          localPreviewEnabled: true,
          canLocalLogin: true
        };
      }
      headers.Authorization = 'Bearer TEST_LOCAL_TOKEN';
    } else {
      return { authenticated: false, message: '請先使用 LINE 登入。', canLineLogin: true };
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
    if (currentSession && currentSession.accessClass === 'guest' && currentSession.whitelisted === false) return {};
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
    if (isLocalDevelopment()) {
      await localTestLogin();
      window.location.reload();
      return;
    }
    clearStaleLiffLoginAttempt();
    if (!storeBridgeReturnTarget()) return;
    window.location.assign(bridgeLoginUrl());
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
      if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
        liff.logout();
      }
    } catch (error) {
      console.warn('[ActivityIntelligenceSession] LIFF logout skipped:', error.message);
    }

    currentSession = null;
    clearBridgeReturnTarget();
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
    clearBridgeReturnTarget();
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
