import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReports, groupSales } from '../server/services/reportBuilder.js';

test('groupSales totals sales by a provided period key', () => {
  const rows = groupSales(
    [
      { date: '2026-01-01', quantity: 1, amount: 1000 },
      { date: '2026-01-01', quantity: 2, amount: 3000 },
      { date: '2026-01-02', quantity: 1, amount: 500 }
    ],
    (sale) => sale.date
  );

  assert.deepEqual(rows, [
    { period: '2026-01-01', units: 3, sales: 4000 },
    { period: '2026-01-02', units: 1, sales: 500 }
  ]);
});

test('buildReports includes core inventory and sales reports', () => {
  const reports = buildReports(
    [
      {
        productCode: '26sap148',
        productName: '2026 SAPPAROD PRO',
        category: 'BOARDS',
        size: '148',
        srp: 37000,
        quantity: 1,
        stockStatus: 'low-stock',
        lastCountedAt: '2026-06-03'
      }
    ],
    [{ date: '2026-01-01', productCode: '26sap148', quantity: 1, amount: 37000 }]
  );

  assert.equal(reports.length, 9);
  assert.equal(reports[1].title, 'REPORT LOW STOCK');
  assert.deepEqual(reports[3].rows[1], ['2026-01-01', 1, 37000]);
});
