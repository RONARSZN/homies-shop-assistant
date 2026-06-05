import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAdjustment } from '../server/services/shopService.js';

test('normalizeAdjustment defaults the adjustment date when none is provided', () => {
  const adjustment = normalizeAdjustment({
    skuId: 'vest__m',
    quantityAfter: '4',
    reason: 'Correction'
  });

  assert.match(adjustment.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(adjustment.quantityAfter, 4);
});
