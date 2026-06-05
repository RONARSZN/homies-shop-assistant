import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../server/app.js';
import { config } from '../server/config.js';

test('health remains public when app access is configured', async () => {
  const previousPassword = config.appAccessPassword;
  config.appAccessPassword = 'staging-access';

  const server = createApp().listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
  } finally {
    config.appAccessPassword = previousPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('protected API actions require app access before existing route logic runs', async () => {
  const previousAccessPassword = config.appAccessPassword;
  const previousEditorPassword = config.itemEditorPassword;
  config.appAccessPassword = 'staging-access';
  config.itemEditorPassword = 'editor-secret';

  const server = createApp().listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skuId: 'vest__m',
        quantityAfter: 4,
        reason: 'Correction',
        staffName: 'Mark',
        password: 'wrong'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'App access required.');
  } finally {
    config.appAccessPassword = previousAccessPassword;
    config.itemEditorPassword = previousEditorPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('unlocking app access allows existing protected route behavior', async () => {
  const previousAccessPassword = config.appAccessPassword;
  const previousEditorPassword = config.itemEditorPassword;
  config.appAccessPassword = 'staging-access';
  config.itemEditorPassword = 'editor-secret';

  const server = createApp().listen(0);

  try {
    const { port } = server.address();
    const unlockResponse = await fetch(`http://127.0.0.1:${port}/api/access/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'staging-access' })
    });
    const unlockBody = await unlockResponse.json();
    const cookie = unlockResponse.headers.get('set-cookie');

    assert.equal(unlockResponse.status, 200);
    assert.equal(unlockBody.ok, true);
    assert.match(cookie, /homies_app_access=/);

    const response = await fetch(`http://127.0.0.1:${port}/api/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie
      },
      body: JSON.stringify({
        skuId: 'vest__m',
        quantityAfter: 4,
        reason: 'Correction',
        staffName: 'Mark',
        password: 'wrong'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Incorrect editor password.');
  } finally {
    config.appAccessPassword = previousAccessPassword;
    config.itemEditorPassword = previousEditorPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('locking app access clears the access cookie and blocks protected APIs again', async () => {
  const previousAccessPassword = config.appAccessPassword;
  config.appAccessPassword = 'staging-access';

  const server = createApp().listen(0);

  try {
    const { port } = server.address();
    const unlockResponse = await fetch(`http://127.0.0.1:${port}/api/access/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'staging-access' })
    });
    const cookie = unlockResponse.headers.get('set-cookie');

    const lockResponse = await fetch(`http://127.0.0.1:${port}/api/access/lock`, {
      method: 'POST',
      headers: { Cookie: cookie }
    });
    const lockCookie = lockResponse.headers.get('set-cookie');
    const response = await fetch(`http://127.0.0.1:${port}/api/setup`, {
      headers: { Cookie: lockCookie }
    });
    const body = await response.json();

    assert.equal(lockResponse.status, 200);
    assert.match(lockCookie, /homies_app_access=;/);
    assert.equal(response.status, 401);
    assert.equal(body.error, 'App access required.');
  } finally {
    config.appAccessPassword = previousAccessPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('access page returns to a safe returnTo path after unlock', async () => {
  const previousAccessPassword = config.appAccessPassword;
  config.appAccessPassword = 'staging-access';

  const server = createApp().listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/access?returnTo=%2Ffront-desk%3Fhistory%3Dtrue`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /const returnTo = "\/front-desk\?history=true";/);
    assert.match(html, /window\.location\.href = returnTo;/);
  } finally {
    config.appAccessPassword = previousAccessPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('locked app page requests redirect to login even without an html accept header', async () => {
  const previousAccessPassword = config.appAccessPassword;
  config.appAccessPassword = 'staging-access';

  const server = createApp().listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/front-desk?history=true`, {
      headers: { Accept: 'application/json' },
      redirect: 'manual'
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/access?returnTo=%2Ffront-desk%3Fhistory%3Dtrue');
  } finally {
    config.appAccessPassword = previousAccessPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('access page is a simple password-only login screen', async () => {
  const previousAccessPassword = config.appAccessPassword;
  config.appAccessPassword = 'staging-access';

  const server = createApp().listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/access`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<title>HOMIES SHOP ASSISTANT Login<\/title>/);
    assert.match(html, /<button type="submit">Login<\/button>/);
    assert.doesNotMatch(html, /staging access password/i);
  } finally {
    config.appAccessPassword = previousAccessPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});
