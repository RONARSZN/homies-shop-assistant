import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cancelPendingSaleItem,
  cancelPendingSaleTransaction,
  getFrontDeskQueue,
  logSale,
  unlockFrontDesk,
  verifyPendingSaleItem,
  verifyPendingSaleTransaction
} from '../server/services/shopService.js';

const products = [
  {
    skuId: 'board__148',
    productCode: '26sap148',
    productName: 'Sapparod Pro',
    size: '148',
    quantity: 3,
    active: true
  },
  {
    skuId: 'vest__m',
    productCode: 'vest',
    productName: 'Impact Vest',
    size: 'M',
    quantity: 5,
    active: true
  }
];

const salesRows = [
  ['2026', 'DATE', 'ITEM CODE', 'QTY', 'AMOUNT', 'CUSTOMER NAME', 'REMARKS'],
  ['JUNE'],
  [],
  [],
  [],
  ['', '', 'GRAND TOTAL', 0, 0]
];

test('sale submit creates pending sale rows only', async () => {
  const writes = [];

  const result = await logSale(
    saleInput(),
    fakeDeps({
      writes,
      pendingId: () => 'PEND-001',
      timestamp: () => '2026-06-05T10:00:00+08:00'
    })
  );

  assert.equal(result.pendingId, 'PEND-001');
  assert.deepEqual(writes.map((write) => write.range), ["'PENDING SALES'!A:P"]);
  assert.equal(writes.some((write) => write.range.includes("'SALES'")), false);
  assert.equal(writes.some((write) => write.range.includes("'CURRENT INVENTORY'")), false);
  assert.deepEqual(
    writes[0].values.map((row) => [row[0], row[3], row[12]]),
    [
      ['PEND-001', 'board__148', 'PENDING'],
      ['PEND-001', 'vest__m', 'PENDING']
    ]
  );
});

test('pending multi-item sale uses one Pending ID with multiple item rows', async () => {
  const writes = [];

  await logSale(
    saleInput(),
    fakeDeps({
      writes,
      pendingId: () => 'PEND-002'
    })
  );

  assert.equal(writes[0].values.length, 2);
  assert.deepEqual(writes[0].values.map((row) => row[0]), ['PEND-002', 'PEND-002']);
});

test('Front Desk unlock requires FRONT_DESK_PASSWORD', () => {
  assert.throws(
    () => unlockFrontDesk({ password: 'front-secret' }, { frontDeskPassword: '' }),
    /Front Desk password is not configured/
  );
  assert.throws(
    () => unlockFrontDesk({ password: 'wrong' }, { frontDeskPassword: 'front-secret' }),
    /Incorrect Front Desk password/
  );
  assert.deepEqual(
    unlockFrontDesk({ password: 'front-secret' }, { frontDeskPassword: 'front-secret' }),
    { ok: true }
  );
});

test('verify item writes official sale row and deducts inventory', async () => {
  const writes = [];

  await verifyPendingSaleItem(
    { rowNumber: 2, staffName: 'Front Desk', password: 'front-secret' },
    fakeDeps({ writes, frontDeskPassword: 'front-secret' })
  );

  assert.deepEqual(
    writes.map((write) => write.range),
    [
      "'SALES'!A7:G7",
      "'CURRENT INVENTORY'!F2",
      "'PENDING SALES'!M2:O2"
    ]
  );
  assert.deepEqual(writes[0].values, [['June', '2026-06-05', '26sap148', 1, 37000, 'Juan', 'Mark']]);
  assert.deepEqual(writes[1].values, [[2]]);
  assert.deepEqual(writes[2].values, [['VERIFIED', '2026-06-05T10:00:00+08:00', 'Front Desk']]);
});

test('verify all handles all pending rows in a transaction', async () => {
  const writes = [];

  await verifyPendingSaleTransaction(
    { pendingId: 'PEND-001', staffName: 'Front Desk', password: 'front-secret' },
    fakeDeps({ writes, frontDeskPassword: 'front-secret' })
  );

  assert.deepEqual(
    writes.map((write) => write.range),
    [
      "'SALES'!A7:G7",
      "'CURRENT INVENTORY'!F2",
      "'PENDING SALES'!M2:O2",
      "'SALES'!A7:G7",
      "'CURRENT INVENTORY'!F3",
      "'PENDING SALES'!M3:O3"
    ]
  );
});

test('cancel item requires password again and cancel reason', async () => {
  await assert.rejects(
    () =>
      cancelPendingSaleItem(
        { rowNumber: 2, staffName: 'Front Desk', password: '', cancelReason: 'Customer changed mind' },
        fakeDeps({ frontDeskPassword: 'front-secret' })
      ),
    /Incorrect Front Desk password/
  );
  await assert.rejects(
    () =>
      cancelPendingSaleItem(
        { rowNumber: 2, staffName: 'Front Desk', password: 'front-secret', cancelReason: '' },
        fakeDeps({ frontDeskPassword: 'front-secret' })
      ),
    /Cancel reason is required/
  );
});

test('cancel item does not write to SALES or inventory and appends to CANCELED SALES', async () => {
  const writes = [];

  await cancelPendingSaleItem(
    {
      rowNumber: 2,
      staffName: 'Front Desk',
      password: 'front-secret',
      cancelReason: 'Customer changed mind'
    },
    fakeDeps({ writes, frontDeskPassword: 'front-secret' })
  );

  assert.deepEqual(
    writes.map((write) => write.range),
    ["'PENDING SALES'!M2:P2", "'CANCELED SALES'!A:P"]
  );
  assert.equal(writes.some((write) => write.range.includes("'SALES'!A")), false);
  assert.equal(writes.some((write) => write.range.includes("'CURRENT INVENTORY'")), false);
  assert.equal(writes[1].values[0][12], 'CANCELED');
  assert.equal(writes[1].values[0][15], 'Customer changed mind');
});

test('cancel all handles all pending rows in a transaction', async () => {
  const writes = [];

  await cancelPendingSaleTransaction(
    {
      pendingId: 'PEND-001',
      staffName: 'Front Desk',
      password: 'front-secret',
      cancelReason: 'Duplicate transaction'
    },
    fakeDeps({ writes, frontDeskPassword: 'front-secret' })
  );

  assert.deepEqual(
    writes.map((write) => write.range),
    [
      "'PENDING SALES'!M2:P2",
      "'CANCELED SALES'!A:P",
      "'PENDING SALES'!M3:P3",
      "'CANCELED SALES'!A:P"
    ]
  );
});

test('default Front Desk view excludes verified and canceled items', async () => {
  const queue = await getFrontDeskQueue(fakeDeps({
    pendingRows: [
      pendingRow('PEND-001', 'board__148', 'PENDING'),
      pendingRow('PEND-001', 'vest__m', 'VERIFIED'),
      pendingRow('PEND-002', 'hat__na', 'CANCELED')
    ]
  }));

  assert.deepEqual(queue.transactions.map((transaction) => transaction.pendingId), ['PEND-001']);
  assert.equal(queue.transactions[0].items.length, 1);
});

test('history toggle can show recent verified and canceled items', async () => {
  const queue = await getFrontDeskQueue(
    fakeDeps({
      pendingRows: [
        pendingRow('PEND-001', 'board__148', 'PENDING'),
        pendingRow('PEND-001', 'vest__m', 'VERIFIED'),
        pendingRow('PEND-002', 'hat__na', 'CANCELED')
      ]
    }),
    { includeHistory: true }
  );

  assert.equal(queue.transactions.length, 2);
  assert.equal(queue.transactions[0].items.length, 2);
});

test('missing FRONT_DESK_PASSWORD returns clear setup error for actions', async () => {
  await assert.rejects(
    () =>
      verifyPendingSaleItem(
        { rowNumber: 2, staffName: 'Front Desk', password: 'front-secret' },
        fakeDeps({ frontDeskPassword: '' })
      ),
    /Front Desk password is not configured/
  );
});

function saleInput() {
  return {
    date: '2026-06-05',
    customerName: 'Juan',
    staffName: 'Mark',
    notes: 'Paid in full',
    items: [
      { skuId: 'board__148', quantitySold: 1, salePrice: 37000 },
      { skuId: 'vest__m', quantitySold: 2, salePrice: 7000 }
    ]
  };
}

function pendingRows() {
  return [
    pendingRow('PEND-001', 'board__148', 'PENDING'),
    pendingRow('PEND-001', 'vest__m', 'PENDING')
  ];
}

function pendingRow(pendingId, skuId, status) {
  const product = products.find((item) => item.skuId === skuId) || {
    skuId,
    productCode: 'hat',
    productName: 'Hat',
    size: 'N/A'
  };

  return [
    pendingId,
    '2026-06-05T09:00:00+08:00',
    '2026-06-05',
    product.skuId,
    product.productCode,
    product.productName,
    product.size,
    skuId === 'vest__m' ? 2 : 1,
    skuId === 'vest__m' ? 7000 : 37000,
    'Juan',
    'Mark',
    'Paid in full',
    status,
    status === 'PENDING' ? '' : '2026-06-05T10:00:00+08:00',
    status === 'PENDING' ? '' : 'Front Desk',
    status === 'CANCELED' ? 'No stock' : ''
  ];
}

function fakeDeps({
  writes = [],
  frontDeskPassword = 'front-secret',
  pendingRows: customPendingRows = pendingRows(),
  pendingId = () => 'PEND-001',
  timestamp = () => '2026-06-05T10:00:00+08:00'
} = {}) {
  return {
    frontDeskPassword,
    getProducts: async () => products,
    getValues: async (range) => {
      if (range.includes('PENDING SALES')) return [['headers'], ...customPendingRows];
      if (range.includes('CURRENT INVENTORY')) {
        return [
          ['SKU ID', 'Product Code', 'Product Name', 'Size', 'SRP', 'Verified Quantity'],
          ['board__148', '26sap148', 'Sapparod Pro', '148', 37000, 3],
          ['vest__m', 'vest', 'Impact Vest', 'M', 3500, 5]
        ];
      }
      if (range.includes('SALES')) return salesRows;
      return [];
    },
    appendValues: async (range, values) => {
      writes.push({ range, values });
    },
    updateValues: async (range, values) => {
      writes.push({ range, values });
    },
    createPendingId: pendingId,
    now: timestamp
  };
}
