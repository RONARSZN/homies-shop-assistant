import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSaleRows,
  findSalesWriteRange
} from '../server/services/shopService.js';

test('buildSaleRows writes existing SALES format with staff name only in remarks', () => {
  const rows = buildSaleRows({
    sale: {
      date: '2026-06-04',
      customerName: 'Juan',
      staffName: 'Mark',
      paymentMethod: 'GCash',
      discount: '100',
      receiptRef: 'OR-123',
      notes: 'Do not write this to remarks'
    },
    lines: [
      {
        item: { quantitySold: 2, salePrice: 1500 },
        product: { productCode: 'vest' }
      }
    ]
  });

  assert.deepEqual(rows, [
    ['June', '2026-06-04', 'vest', 2, 1500, 'Juan', 'Mark']
  ]);
});

test('findSalesWriteRange uses the first blank row in the matching month section', () => {
  const range = findSalesWriteRange({
    saleDate: '2026-06-04',
    rowCount: 2,
    rows: [
      ['2026', 'DATE', 'ITEM CODE', 'QTY', 'AMOUNT', 'CUSTOMER NAME', 'REMARKS'],
      ['MAY'],
      ['', '2026-05-01', 'vest', 1, 100, 'Juan', 'Mark'],
      ['', '', 'GRAND TOTAL', 1, 100],
      ['JUNE'],
      ['', '2026-06-01', 'board', 1, 200, 'Ana', 'Mark'],
      [],
      [],
      ['', '', 'GRAND TOTAL', 1, 200]
    ]
  });

  assert.equal(range, "'SALES'!A11:G12");
});

test('findSalesWriteRange rejects a month section without enough blank rows', () => {
  assert.throws(
    () =>
      findSalesWriteRange({
        saleDate: '2026-06-04',
        rowCount: 2,
        rows: [
          ['2026', 'DATE', 'ITEM CODE', 'QTY', 'AMOUNT', 'CUSTOMER NAME', 'REMARKS'],
          ['JUNE'],
          ['', '2026-06-01', 'board', 1, 200, 'Ana', 'Mark'],
          [],
          ['', '', 'GRAND TOTAL', 1, 200]
        ]
      }),
    /No empty sales rows available/
  );
});
