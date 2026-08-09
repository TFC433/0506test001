(function () {
  'use strict';

  const RETURN_TARGETS = Object.freeze({
    form: '/views/activity-intelligence.html',
    ocr: '/leads-view.html'
  });
  const LOGIN_ATTEMPT_KEY = 'tfc-liff-bridge-login-attempt';

  function status(message) {
    const el = document.getElementById('liff-bridge-status');
    if (el) el.textContent = message;
  }

  function safeReturnKey() {
    return new URLSearchParams(window.location.search).get('return') || '';
  }

  function targetFor(returnKey) {
    return RETURN_TARGETS[returnKey] || '';
  }

  function canonicalBridgeUrl(returnKey) {
    const url = new URL('/liff/', window.location.origin);
    url.searchParams.set('return', returnKey);
    return url.toString();
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

  function fail(message) {
    clearAttempt();
    status(message);
  }

  async function runBridge() {
    const returnKey = safeReturnKey();
    const target = targetFor(returnKey);
    if (!target) {
      fail('Invalid LINE login destination.');
      return;
    }

    status('Checking session...');
    try {
      const existing = await readExistingSession();
      if (existing.response.ok && existing.body.success) {
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
        liff.login({ redirectUri: canonicalBridgeUrl(returnKey) });
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
