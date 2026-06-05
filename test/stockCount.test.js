import assert from 'node:assert/strict';
import test from 'node:test';
import { saveStockCount } from '../server/services/stockCountService.js';

const inventoryRows = [
  [
    'SKU ID',
    'Product Code',
    'Product Name',
    'Size',
    'SRP',
    'Verified Quantity',
    'Low Stock Threshold',
    'Last Counted At',
    'Notes',
    'Active'
  ],
  ['vest__m', 'vest', 'Impact Vest', 'M', 3500, 2, 2, '', '', true],
  ['board__na', 'board', 'Wakeboard', '', 37000, 1, 1, '', '', false]
];

test('stock count save requires STOCK_COUNT_PASSWORD', async () => {
  await assert.rejects(
    () =>
      saveStockCount(
        { skuId: 'vest__m', quantity: 4, password: '' },
        fakeDeps({ stockCountPassword: 'stock-secret' })
      ),
    /Incorrect stock count password/
  );
});

test('wrong stock count password is rejected', async () => {
  await assert.rejects(
    () =>
      saveStockCount(
        { skuId: 'vest__m', quantity: 4, password: 'wrong' },
        fakeDeps({ stockCountPassword: 'stock-secret' })
      ),
    /Incorrect stock count password/
  );
});

test('missing STOCK_COUNT_PASSWORD returns clear setup error', async () => {
  await assert.rejects(
    () =>
      saveStockCount(
        { skuId: 'vest__m', quantity: 4, password: 'stock-secret' },
        fakeDeps({ stockCountPassword: '' })
      ),
    /Stock count password is not configured/
  );
});

test('valid stock count updates only CURRENT INVENTORY', async () => {
  const writes = [];

  await saveStockCount(
    { skuId: 'vest__m', quantity: 4, notes: 'Counted during setup', password: 'stock-secret' },
    fakeDeps({ stockCountPassword: 'stock-secret', writes })
  );

  assert.deepEqual(
    writes.map((write) => write.range),
    [
      "'CURRENT INVENTORY'!F2",
      "'CURRENT INVENTORY'!H2",
      "'CURRENT INVENTORY'!I2"
    ]
  );
  assert.equal(writes.some((write) => write.range.includes("'SALES'")), false);
  assert.equal(writes.some((write) => write.range.includes("'ADJUSTMENTS'")), false);
  assert.equal(writes.some((write) => write.range.includes("'ITEM CODES and SRPs'")), false);
});

test('valid stock count updates quantity, last counted date, and notes', async () => {
  const writes = [];

  await saveStockCount(
    { skuId: 'vest__m', quantity: 8, notes: 'Top shelf', password: 'stock-secret' },
    fakeDeps({ stockCountPassword: 'stock-secret', writes, manilaDate: () => '2026-06-05' })
  );

  assert.deepEqual(writes, [
    { range: "'CURRENT INVENTORY'!F2", values: [[8]] },
    { range: "'CURRENT INVENTORY'!H2", values: [['2026-06-05']] },
    { range: "'CURRENT INVENTORY'!I2", values: [['Top shelf']] }
  ]);
});

test('stock count does not write notes when notes are not provided', async () => {
  const writes = [];

  await saveStockCount(
    { skuId: 'vest__m', quantity: 8, password: 'stock-secret' },
    fakeDeps({ stockCountPassword: 'stock-secret', writes })
  );

  assert.deepEqual(
    writes.map((write) => write.range),
    ["'CURRENT INVENTORY'!F2", "'CURRENT INVENTORY'!H2"]
  );
});

test('invalid quantities are rejected', async () => {
  const deps = fakeDeps({ stockCountPassword: 'stock-secret' });

  await assert.rejects(
    () => saveStockCount({ skuId: 'vest__m', quantity: -1, password: 'stock-secret' }, deps),
    /Quantity must be a whole number 0 or higher/
  );
  await assert.rejects(
    () => saveStockCount({ skuId: 'vest__m', quantity: 1.5, password: 'stock-secret' }, deps),
    /Quantity must be a whole number 0 or higher/
  );
});

test('missing SKU returns a clear error', async () => {
  await assert.rejects(
    () => saveStockCount({ quantity: 4, password: 'stock-secret' }, fakeDeps({ stockCountPassword: 'stock-secret' })),
    /Product is required/
  );
});

test('inactive products cannot be stock counted', async () => {
  await assert.rejects(
    () =>
      saveStockCount(
        { skuId: 'board__na', quantity: 4, password: 'stock-secret' },
        fakeDeps({ stockCountPassword: 'stock-secret' })
      ),
    /Product is not active/
  );
});

function fakeDeps({
  stockCountPassword,
  rows = inventoryRows,
  writes = [],
  manilaDate = () => '2026-06-05'
} = {}) {
  return {
    stockCountPassword,
    getValues: async () => rows,
    updateValues: async (range, values) => {
      writes.push({ range, values });
    },
    manilaDate
  };
}
