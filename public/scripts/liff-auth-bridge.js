(function () {
  'use strict';

  const RETURN_TARGETS = Object.freeze({
    form: '/views/activity-intelligence.html',
    ocr: '/leads-view.html'
  });
  const PRODUCT_THEMES = Object.freeze({
    form: {
      bodyClass: 'liff-bridge-form',
      logo: '/images/portal/form.png',
      logoAlt: 'FANUC forms'
    },
    ocr: {
      bodyClass: 'liff-bridge-ocr',
      logo: '/images/portal/ocr.png',
      logoAlt: 'FANUC card OCR'
    }
  });
  const RETURN_TARGET_KEY = 'tfc_liff_return_target';
  const LOGIN_ATTEMPT_KEY = 'tfc-liff-bridge-login-attempt';
  const COPY_DEFAULT_TEXT = '複製 User ID';

  let activeReturnKey = '';
  let copyResetTimer = 0;

  function el(id) {
    return document.getElementById(id);
  }

  function storedReturnKey() {
    try {
      return sessionStorage.getItem(RETURN_TARGET_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function targetFor(returnKey) {
    return RETURN_TARGETS[returnKey] || '';
  }

  function canonicalBridgeUrl() {
    return new URL('/liff/', window.location.origin).toString();
  }

  function applyTheme(returnKey) {
    document.body.classList.remove('liff-bridge-form', 'liff-bridge-ocr', 'liff-bridge-invalid');

    const theme = PRODUCT_THEMES[returnKey];
    const logo = el('liff-bridge-logo');
    if (!theme) {
      document.body.classList.add('liff-bridge-invalid');
      if (logo) logo.hidden = true;
      return;
    }

    document.body.classList.add(theme.bodyClass);
    if (logo) {
      logo.src = theme.logo;
      logo.alt = theme.logoAlt;
      logo.hidden = false;
    }
  }

  function setText(title, message) {
    const titleEl = el('liff-bridge-title');
    const messageEl = el('liff-bridge-message');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) textOrHide(messageEl, message);
  }

  function textOrHide(node, text) {
    node.textContent = text || '';
    node.hidden = !text;
  }

  function setBusy(isBusy) {
    const spinner = el('liff-bridge-spinner');
    if (spinner) spinner.hidden = !isBusy;
  }

  function setUserPanel(userId) {
    const panel = el('liff-bridge-user-panel');
    const userIdEl = el('liff-bridge-user-id');
    if (!panel || !userIdEl) return;
    userIdEl.textContent = userId || '';
    panel.hidden = !userId;
  }

  function renderState(state, options = {}) {
    applyTheme(activeReturnKey);
    document.body.dataset.bridgeState = state;
    setUserPanel('');

    if (state === 'processing') {
      setText('正在確認身分', '正在透過 LINE 驗證您的帳號，請稍候…');
      setBusy(true);
      return;
    }

    if (state === 'forbidden') {
      setText(
        '尚未取得存取權限',
        '你的 LINE 帳號目前尚未加入系統白名單。\n請將下方 User ID 提供給系統管理員，以申請存取權限。'
      );
      setBusy(false);
      setUserPanel(options.userId || '');
      return;
    }

    if (state === 'failed') {
      setText('登入驗證未完成', '請返回原系統後重新嘗試。');
      setBusy(false);
      return;
    }

    setText('登入連結已失效', '請從原系統重新登入。');
    setBusy(false);
  }

  async function readExistingSession() {
    const response = await fetch('/api/line/session', { credentials: 'same-origin' });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  }

  async function postLineSession(idToken) {
    const response = await fetch('/api/line/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`
      },
      credentials: 'same-origin'
    });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  }

  function clearAttempt() {
    try {
      sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
    } catch (_) {
      // Session storage is only used to prevent repeated automatic login attempts.
    }
  }

  function clearReturnTarget() {
    try {
      sessionStorage.removeItem(RETURN_TARGET_KEY);
    } catch (_) {
      // Routing state is non-auth, temporary browser state.
    }
  }

  function invalidEntry() {
    clearAttempt();
    clearReturnTarget();
    renderState('invalid');
  }

  function failAuthentication() {
    clearAttempt();
    clearReturnTarget();
    renderState('failed');
  }

  function forbidden(userId) {
    clearAttempt();
    clearReturnTarget();
    renderState('forbidden', { userId });
  }

  async function copyUserId() {
    const button = el('liff-bridge-copy');
    const userId = (el('liff-bridge-user-id') && el('liff-bridge-user-id').textContent || '').trim();
    if (!button || !userId) return;

    window.clearTimeout(copyResetTimer);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(userId);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = userId;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        if (!document.execCommand('copy')) throw new Error('copy failed');
        textArea.remove();
      }
      button.textContent = '已複製';
    } catch (_) {
      button.textContent = '複製失敗';
    }

    copyResetTimer = window.setTimeout(() => {
      button.textContent = COPY_DEFAULT_TEXT;
    }, 1800);
  }

  async function runBridge() {
    activeReturnKey = storedReturnKey();
    const target = targetFor(activeReturnKey);
    if (!target) {
      invalidEntry();
      return;
    }

    renderState('processing');

    try {
      const existing = await readExistingSession();
      if (existing.response.ok && existing.body.success) {
        clearAttempt();
        clearReturnTarget();
        window.location.replace(target);
        return;
      }
      if (existing.response.status === 403) {
        forbidden(existing.body.yourUserId || existing.body.userId || '');
        return;
      }
    } catch (_) {
      // Continue to LIFF auth; session read failures are handled by the exchange result.
    }

    if (typeof liff === 'undefined' || !window.LIFF_ID) {
      failAuthentication();
      return;
    }

    try {
      await liff.init({ liffId: window.LIFF_ID });

      if (!liff.isLoggedIn()) {
        const attempted = sessionStorage.getItem(LOGIN_ATTEMPT_KEY);
        if (attempted === activeReturnKey) {
          failAuthentication();
          return;
        }

        sessionStorage.setItem(LOGIN_ATTEMPT_KEY, activeReturnKey);
        liff.login({ redirectUri: canonicalBridgeUrl() });
        return;
      }

      clearAttempt();
      const idToken = liff.getIDToken();
      if (!idToken) {
        failAuthentication();
        return;
      }

      const created = await postLineSession(idToken);
      if (created.response.ok && created.body.success) {
        clearReturnTarget();
        window.location.replace(target);
        return;
      }

      if (created.response.status === 403) {
        forbidden(created.body.yourUserId || created.body.userId || '');
        return;
      }

      failAuthentication();
    } catch (_) {
      failAuthentication();
    }
  }

  const copyButton = el('liff-bridge-copy');
  if (copyButton) copyButton.addEventListener('click', copyUserId);
  runBridge();
})();
