import assert from 'node:assert/strict';
import test from 'node:test';
import { toClientMessage } from '../public/userFacingErrors.js';

test('toClientMessage explains browser connection failures in plain language', () => {
  assert.equal(
    toClientMessage('Failed to fetch'),
    'The app cannot reach the server right now. Check that the app is running, then try again.'
  );
});

test('toClientMessage hides technical JSON parsing errors', () => {
  assert.equal(
    toClientMessage('Unexpected token < in JSON at position 0'),
    'The app received an unexpected response. Refresh the page and try again.'
  );
});
