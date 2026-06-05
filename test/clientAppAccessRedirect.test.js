import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appAccessRedirectUrl,
  shouldRedirectToAccess
} from '../public/appAccessRedirect.js';

test('shouldRedirectToAccess detects the app gate response only', () => {
  assert.equal(
    shouldRedirectToAccess({ status: 401, error: 'App access required.' }),
    true
  );
  assert.equal(
    shouldRedirectToAccess({ status: 400, error: 'App access required.' }),
    false
  );
  assert.equal(
    shouldRedirectToAccess({ status: 401, error: 'Incorrect editor password.' }),
    false
  );
});

test('appAccessRedirectUrl preserves the current app destination', () => {
  assert.equal(
    appAccessRedirectUrl('/front-desk?history=true'),
    '/access?returnTo=%2Ffront-desk%3Fhistory%3Dtrue'
  );
  assert.equal(appAccessRedirectUrl('/access'), '/access');
  assert.equal(appAccessRedirectUrl('https://bad.example/path'), '/access');
});
