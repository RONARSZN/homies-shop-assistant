import assert from 'node:assert/strict';
import test from 'node:test';
import { toUserFacingError } from '../server/services/userFacingErrors.js';

test('toUserFacingError explains Google connection failures in plain language', () => {
  const error = new Error(
    'request to https://www.googleapis.com/oauth2/v4/token failed, reason: getaddrinfo ENOTFOUND www.googleapis.com'
  );

  assert.equal(
    toUserFacingError(error),
    'The app cannot connect to Google Sheets right now. Check the internet connection, then try again.'
  );
});

test('toUserFacingError keeps existing plain app messages', () => {
  assert.equal(
    toUserFacingError(new Error('Incorrect editor password.')),
    'Incorrect editor password.'
  );
});
