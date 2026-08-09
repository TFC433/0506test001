(function () {
  'use strict';

  const RETURN_TARGETS = Object.freeze({
    form: '/views/activity-intelligence.html',
    ocr: '/leads-view.html'
  });
  const RETURN_TARGET_KEY = 'tfc_liff_return_target';
  const LOGIN_ATTEMPT_KEY = 'tfc-liff-bridge-login-attempt';

  function status(message) {
    const el = document.getElementById('liff-bridge-status');
    if (el) el.textContent = message;
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

  function fail(message) {
    clearAttempt();
    clearReturnTarget();
    status(message);
  }

  async function runBridge() {
    const returnKey = storedReturnKey();
    const target = targetFor(returnKey);
    if (!target) {
      fail('Invalid LINE login destination.');
      return;
    }

    status('Checking session...');
    try {
      const existing = await readExistingSession();
      if (existing.response.ok && existing.body.success) {
        clearAttempt();
        clearReturnTarget();
        window.location.replace(target);
        return;
      }
      if (existing.response.status === 403) {
        fail('LINE account is not authorized.');
        return;
      }
    } catch (_) {
      // Continue to LIFF auth; session read failures are handled by the exchange result.
    }

    if (typeof liff === 'undefined' || !window.LIFF_ID) {
      fail('LINE login is unavailable.');
      return;
    }

    try {
      status('Preparing LINE login...');
      await liff.init({ liffId: window.LIFF_ID });

      if (!liff.isLoggedIn()) {
        const attempted = sessionStorage.getItem(LOGIN_ATTEMPT_KEY);
        if (attempted === returnKey) {
          fail('LINE login did not complete.');
          return;
        }

        sessionStorage.setItem(LOGIN_ATTEMPT_KEY, returnKey);
        liff.login({ redirectUri: canonicalBridgeUrl() });
        return;
      }

      clearAttempt();
      const idToken = liff.getIDToken();
      if (!idToken) {
        fail('LINE login token was not returned.');
        return;
      }

      status('Creating session...');
      const created = await postLineSession(idToken);
      if (created.response.ok && created.body.success) {
        clearReturnTarget();
        window.location.replace(target);
        return;
      }

      if (created.response.status === 403) {
        fail('LINE account is not authorized.');
        return;
      }

      fail('LINE session could not be created.');
    } catch (_) {
      fail('LINE login could not be completed.');
    }
  }

  runBridge();
})();
