import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSaleCancellationRow,
  normalizeSaleCancellation,
  resolveCancellationProduct
} from '../server/services/shopService.js';
import { parseSales } from '../server/sheets/parsers.js';

test('parseSales includes the sheet row number for cancellation targeting', () => {
  const sales = parseSales([
    ['Month', 'Date', 'Item Code', 'Quantity', 'Amount', 'Customer', 'Remarks'],
    ['June', '2026-06-04', 'vest', 2, 7000, 'Juan', 'Mark']
  ]);

  assert.equal(sales[0].rowNumber, 6);
});

test('buildSaleCancellationRow creates a negative SALES row with audit details', () => {
  const row = buildSaleCancellationRow({
    sale: {
      rowNumber: 18,
      date: '2026-06-04',
      productCode: 'vest',
      quantity: 2,
      amount: 7000,
      customerName: 'Juan'
    },
    cancellation: {
      date: '2026-06-05',
      staffName: 'Mark',
      reason: 'Customer returned product'
    }
  });

  assert.deepEqual(row, [
    'June',
    '2026-06-05',
    'vest',
    -2,
    -7000,
    'Juan',
    'CANCELLED row 18 by Mark: Customer returned product'
  ]);
});

test('normalizeSaleCancellation requires a sale row and reason', () => {
  assert.throws(
    () => normalizeSaleCancellation({ rowNumber: '', reason: 'Return' }),
    /Sale row is required/
  );
  assert.throws(
    () => normalizeSaleCancellation({ rowNumber: 18, reason: '' }),
    /Cancellation reason is required/
  );
});

test('resolveCancellationProduct auto-selects a unique product code', () => {
  const product = resolveCancellationProduct({
    sale: { productCode: 'vest' },
    products: [
      { skuId: 'board__na', productCode: 'board' },
      { skuId: 'vest__m', productCode: 'vest' }
    ]
  });

  assert.equal(product.skuId, 'vest__m');
});

test('resolveCancellationProduct requires skuId when product code is ambiguous', () => {
  assert.throws(
    () =>
      resolveCancellationProduct({
        sale: { productCode: 'vest' },
        products: [
          { skuId: 'vest__m', productCode: 'vest' },
          { skuId: 'vest__l', productCode: 'vest' }
        ]
      }),
    /Choose the exact product size/
  );
});
