import crypto from 'node:crypto';
import express from 'express';
import { config } from '../config.js';

const ACCESS_COOKIE = 'homies_app_access';
const TOKEN_MESSAGE = 'homies-shop-assistant-app-access-v1';

export function createAccessRouter() {
  const router = express.Router();

  router.get('/status', (req, res) => {
    res.json({
      enabled: isAppAccessEnabled(),
      unlocked: hasAppAccess(req)
    });
  });

  router.post('/unlock', (req, res) => {
    if (!isAppAccessEnabled()) {
      res.json({ ok: true, enabled: false });
      return;
    }

    if (!validateAccessPassword(req.body?.password)) {
      res.status(401).json({ error: 'Incorrect app access password.' });
      return;
    }

    res.cookie(ACCESS_COOKIE, accessToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureCookieRequired(),
      maxAge: 1000 * 60 * 60 * 12
    });
    res.json({ ok: true, enabled: true });
  });

  router.post('/lock', (req, res) => {
    res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
    res.json({ ok: true });
  });

  return router;
}

export function requireAppAccess(req, res, next) {
  if (isPublicApiRoute(req) || hasAppAccess(req)) {
    next();
    return;
  }

  res.status(401).json({ error: 'App access required.' });
}

export function requireAppPageAccess(req, res, next) {
  if (!isAppAccessEnabled() || hasAppAccess(req)) {
    next();
    return;
  }

  if (req.method === 'GET') {
    res.redirect(accessRedirectUrl(req.originalUrl));
    return;
  }

  res.status(401).send('App access required.');
}

export function accessPageHtml(returnToValue = '/') {
  const returnTo = safeReturnTo(returnToValue);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>HOMIES SHOP ASSISTANT Login</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body class="access-page">
    <main class="access-shell">
      <form id="accessForm" class="access-card">
        <img class="access-logo" src="/assets/homies-proshop-logo.png" alt="Homies Proshop">
        <p class="eyebrow">Homies Approved</p>
        <h1>Shop Assistant</h1>
        <label>Access Password
          <input name="password" type="password" autocomplete="current-password" required autofocus>
        </label>
        <button type="submit">Login</button>
        <p id="accessError" class="access-error hidden"></p>
      </form>
    </main>
    <script>
      const returnTo = ${JSON.stringify(returnTo)};
      const form = document.querySelector('#accessForm');
      const error = document.querySelector('#accessError');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.classList.add('hidden');
        const response = await fetch('/api/access/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: form.elements.password.value })
        });
        const payload = await response.json();
        if (!response.ok) {
          error.textContent = payload.error || 'Access failed.';
          error.classList.remove('hidden');
          return;
        }
        window.location.href = returnTo;
      });
    </script>
  </body>
</html>`;
}

function isAppAccessEnabled() {
  return Boolean(config.appAccessPassword);
}

function hasAppAccess(req) {
  if (!isAppAccessEnabled()) return true;

  const cookieToken = readCookie(req, ACCESS_COOKIE);
  const expectedToken = accessToken();
  return Boolean(cookieToken) && timingSafeEqual(cookieToken, expectedToken);
}

function validateAccessPassword(password) {
  return timingSafeEqual(String(password || ''), config.appAccessPassword);
}

function accessToken() {
  return crypto
    .createHmac('sha256', config.appAccessPassword)
    .update(TOKEN_MESSAGE)
    .digest('hex');
}

function timingSafeEqual(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  return (
    valueBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const prefix = `${name}=`;
  const cookie = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
}

function isPublicApiRoute(req) {
  return req.method === 'GET' && req.path === '/health';
}

function isSecureCookieRequired() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookieRequired()
  };
}

function safeReturnTo(value) {
  const path = Array.isArray(value) ? value[0] : value;
  const normalized = String(path || '/');

  if (!normalized.startsWith('/') || normalized.startsWith('//') || normalized.startsWith('/access')) {
    return '/';
  }

  return normalized;
}

function accessRedirectUrl(returnTo) {
  const safePath = safeReturnTo(returnTo);
  return safePath === '/'
    ? '/access'
    : `/access?returnTo=${encodeURIComponent(safePath)}`;
}
