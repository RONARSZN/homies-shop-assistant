import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInventoryMovementSummary } from '../server/services/inventoryMovement.js';

const products = [
  { productCode: 'board', productName: 'Wakeboard', size: '148' },
  { productCode: 'vest', productName: 'Impact Vest', size: 'M' },
  { productCode: 'hat', productName: 'Cap', size: '' },
  { productCode: 'zero', productName: 'No Movement', size: '' }
];

test('movement summary uses only verified official SALES from the last 30 days', () => {
  const summary = buildInventoryMovementSummary({
    products,
    sales: [
      officialSale('2026-06-05', 'board', 2, 74000),
      officialSale('2026-06-01', 'vest', 1, 3500),
      officialSale('2026-05-07', 'hat', 3, 1500),
      officialSale('2026-05-06', 'board', 9, 333000),
      {
        pendingId: 'PEND-001',
        saleDate: '2026-06-05',
        productCode: 'board',
        quantity: 4,
        amount: 148000,
        status: 'PENDING'
      }
    ],
    referenceDate: '2026-06-05'
  });

  assert.equal(summary.totalUnits, 6);
  assert.equal(summary.totalSalesAmount, 79000);
  assert.equal(summary.productsWithMovement, 3);
  assert.equal(summary.bestMovingProduct.productCode, 'hat');
});

test('products with zero movement are excluded from product charts', () => {
  const summary = buildInventoryMovementSummary({
    products,
    sales: [
      officialSale('2026-06-05', 'board', 2, 74000),
      officialSale('2026-06-04', 'vest', 1, 3500)
    ],
    referenceDate: '2026-06-05'
  });

  assert.deepEqual(
    summary.topByUnits.map((item) => item.productCode),
    ['board', 'vest']
  );
  assert.equal(summary.topByUnits.some((item) => item.productCode === 'zero'), false);
  assert.equal(summary.topBySales.some((item) => item.productCode === 'zero'), false);
});

test('top moving products are sorted correctly by units and sales amount', () => {
  const summary = buildInventoryMovementSummary({
    products,
    sales: [
      officialSale('2026-06-05', 'board', 2, 74000),
      officialSale('2026-06-04', 'vest', 5, 17500),
      officialSale('2026-06-03', 'hat', 3, 1500)
    ],
    referenceDate: '2026-06-05'
  });

  assert.deepEqual(
    summary.topByUnits.map((item) => [item.productCode, item.units]),
    [
      ['vest', 5],
      ['hat', 3],
      ['board', 2]
    ]
  );
  assert.deepEqual(
    summary.topBySales.map((item) => [item.productCode, item.salesAmount]),
    [
      ['board', 74000],
      ['vest', 17500],
      ['hat', 1500]
    ]
  );
});

test('daily movement covers the last 30 days with verified totals', () => {
  const summary = buildInventoryMovementSummary({
    products,
    sales: [
      officialSale('2026-06-05', 'board', 2, 74000),
      officialSale('2026-05-07', 'hat', 3, 1500)
    ],
    referenceDate: '2026-06-05'
  });

  assert.equal(summary.daily.length, 30);
  assert.deepEqual(summary.daily[0], {
    date: '2026-05-07',
    units: 3,
    salesAmount: 1500
  });
  assert.deepEqual(summary.daily.at(-1), {
    date: '2026-06-05',
    units: 2,
    salesAmount: 74000
  });
});

function officialSale(date, productCode, quantity, amount) {
  return { date, productCode, quantity, amount };
}
