import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCanAppend,
  assertCanClear,
  assertCanEnsureSheet,
  assertCanUpdate
} from '../server/services/sheetWritePolicy.js';

test('sale submit writes are limited to pending sales', () => {
  assert.doesNotThrow(() => assertCanAppend('sale-submit', "'PENDING SALES'!A:P"));

  assert.throws(() => assertCanAppend('sale-submit', "'SALES'!A:G"), /not approved/);
  assert.throws(
    () => assertCanUpdate('sale-submit', "'CURRENT INVENTORY'!F12"),
    /not approved/
  );
  assert.throws(
    () => assertCanUpdate('sale-submit', "'ITEM CODES and SRPs'!D12"),
    /not approved/
  );
  assert.throws(
    () => assertCanUpdate('sale-submit', "'2026 INVENTORY'!F12"),
    /not approved/
  );
});

test('old direct sale write path is not approved', () => {
  assert.throws(
    () => assertCanAppend('sale', "'SALES'!A:G"),
    /Unknown sheet write action/
  );
  assert.throws(
    () => assertCanUpdate('sale', "'CURRENT INVENTORY'!F12"),
    /Unknown sheet write action/
  );
});

test('front desk verification writes only to SALES, CURRENT INVENTORY, and pending status', () => {
  assert.doesNotThrow(() => assertCanUpdate('front-desk-verify', "'SALES'!A12:G12"));
  assert.doesNotThrow(() => assertCanUpdate('front-desk-verify', "'CURRENT INVENTORY'!F12"));
  assert.doesNotThrow(() => assertCanUpdate('front-desk-verify', "'PENDING SALES'!M12:O12"));

  assert.throws(
    () => assertCanAppend('front-desk-verify', "'PENDING SALES'!A:P"),
    /not approved/
  );
  assert.throws(
    () => assertCanUpdate('front-desk-verify', "'ITEM CODES and SRPs'!D12"),
    /not approved/
  );
});

test('front desk cancellation writes only to pending status and canceled sales', () => {
  assert.doesNotThrow(() => assertCanUpdate('front-desk-cancel', "'PENDING SALES'!M12:P12"));
  assert.doesNotThrow(() => assertCanAppend('front-desk-cancel', "'CANCELED SALES'!A:P"));

  assert.throws(() => assertCanAppend('front-desk-cancel', "'SALES'!A:G"), /not approved/);
  assert.throws(
    () => assertCanUpdate('front-desk-cancel', "'CURRENT INVENTORY'!F12"),
    /not approved/
  );
});

test('inventory adjustment writes are limited to CURRENT INVENTORY and ADJUSTMENTS', () => {
  assert.doesNotThrow(() => assertCanUpdate('adjustment', "'CURRENT INVENTORY'!F12"));
  assert.doesNotThrow(() => assertCanAppend('adjustment', "'ADJUSTMENTS'!A:K"));

  assert.throws(
    () => assertCanUpdate('adjustment', "'ITEM CODES and SRPs'!D12"),
    /not approved/
  );
});

test('stock count writes are limited to count columns in CURRENT INVENTORY', () => {
  assert.doesNotThrow(() => assertCanUpdate('stock-count', "'CURRENT INVENTORY'!F12"));
  assert.doesNotThrow(() => assertCanUpdate('stock-count', "'CURRENT INVENTORY'!H12"));
  assert.doesNotThrow(() => assertCanUpdate('stock-count', "'CURRENT INVENTORY'!I12"));

  assert.throws(() => assertCanAppend('stock-count', "'SALES'!A:G"), /not approved/);
  assert.throws(() => assertCanAppend('stock-count', "'ADJUSTMENTS'!A:K"), /not approved/);
  assert.throws(
    () => assertCanUpdate('stock-count', "'ITEM CODES and SRPs'!D12"),
    /not approved/
  );
  assert.throws(
    () => assertCanUpdate('stock-count', "'CURRENT INVENTORY'!G12"),
    /not approved/
  );
  assert.throws(
    () => assertCanUpdate('stock-count', "'2026 INVENTORY'!F12"),
    /not approved/
  );
});

test('old official sale cancellation write path is not approved', () => {
  assert.throws(
    () => assertCanAppend('sale-cancellation', "'SALES'!A:G"),
    /Unknown sheet write action/
  );
  assert.throws(
    () => assertCanUpdate('sale-cancellation', "'CURRENT INVENTORY'!F12"),
    /Unknown sheet write action/
  );
});

test('product management is the only action that can edit ITEM CODES and SRPs', () => {
  assert.doesNotThrow(() =>
    assertCanUpdate('product-management', "'ITEM CODES and SRPs'!D12")
  );

  assert.throws(
    () => assertCanUpdate('adjustment', "'ITEM CODES and SRPs'!D12"),
    /not approved/
  );
});

test('report writes are limited to REPORT tabs', () => {
  assert.doesNotThrow(() => assertCanEnsureSheet('report', 'REPORT DAILY SALES'));
  assert.doesNotThrow(() => assertCanClear('report', "'REPORT DAILY SALES'!A:Z"));
  assert.doesNotThrow(() => assertCanUpdate('report', "'REPORT DAILY SALES'!A1"));

  assert.throws(() => assertCanClear('report', "'SALES'!A:Z"), /not approved/);
  assert.throws(() => assertCanEnsureSheet('report', 'SALES'), /not approved/);
});

test('setup writes are limited to CURRENT INVENTORY and ADJUSTMENTS', () => {
  assert.doesNotThrow(() => assertCanEnsureSheet('setup', 'CURRENT INVENTORY'));
  assert.doesNotThrow(() => assertCanEnsureSheet('setup', 'ADJUSTMENTS'));
  assert.doesNotThrow(() => assertCanEnsureSheet('setup', 'PENDING SALES'));
  assert.doesNotThrow(() => assertCanEnsureSheet('setup', 'CANCELED SALES'));
  assert.doesNotThrow(() => assertCanUpdate('setup', "'CURRENT INVENTORY'!A1:J1"));
  assert.doesNotThrow(() => assertCanUpdate('setup', "'ADJUSTMENTS'!A1:K1"));
  assert.doesNotThrow(() => assertCanUpdate('setup', "'PENDING SALES'!A1:P1"));
  assert.doesNotThrow(() => assertCanUpdate('setup', "'CANCELED SALES'!A1:P1"));
  assert.doesNotThrow(() => assertCanAppend('setup', "'CURRENT INVENTORY'!A:J"));

  assert.throws(() => assertCanUpdate('setup', "'SALES'!A1:G1"), /not approved/);
  assert.throws(() => assertCanEnsureSheet('setup', 'INDIO INVENTORY'), /not approved/);
});
