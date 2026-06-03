import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildInventorySeedRows,
  buildSkuId,
  excelSerialToDate,
  mergeProductsWithInventory,
  parseProducts,
  parseSales
} from '../server/sheets/parsers.js';

test('parseProducts fills product names down across size variants', () => {
  const rows = [
    ['DESCRIPTION', 'SIZE', 'ITEM CODE', 'SRP'],
    ['BOARDS'],
    ['2026 SAPPAROD PRO', 148, '26sap148', 37000],
    [null, 152, '26sap152', 37000]
  ];

  const products = parseProducts(rows);

  assert.equal(products.length, 2);
  assert.equal(products[1].productName, '2026 SAPPAROD PRO');
  assert.equal(products[1].category, 'BOARDS');
  assert.equal(products[1].skuId, '26sap152__152');
});

test('mergeProductsWithInventory marks uncounted products clearly', () => {
  const products = [
    {
      skuId: '26sap152__152',
      productCode: '26sap152',
      productName: '2026 SAPPAROD PRO',
      size: '152'
    }
  ];

  const merged = mergeProductsWithInventory(products, []);

  assert.equal(merged[0].quantity, null);
  assert.equal(merged[0].stockStatus, 'uncounted');
});

test('parseSales converts Google date serials and skips grand totals', () => {
  const rows = [
    [2026, 'DATE', 'ITEM CODE', 'QTY', 'AMOUNT', 'CUSTOMER NAME', 'REMARKS'],
    ['JANUARY', 46023, '26sap148', 1, 37000, 'Mark', 'Cash'],
    ['', '', 'GRAND TOTAL', '', 37000]
  ];

  const sales = parseSales(rows);

  assert.equal(sales.length, 1);
  assert.equal(sales[0].date, '2026-01-01');
  assert.equal(sales[0].amount, 37000);
});

test('buildSkuId uses product code and size instead of product code alone', () => {
  assert.equal(buildSkuId('JA21613', 'XL'), 'ja21613__xl');
});

test('buildInventorySeedRows only creates rows for missing products', () => {
  const products = [
    {
      skuId: '26sap148__148',
      productCode: '26sap148',
      productName: '2026 SAPPAROD PRO',
      size: '148',
      srp: 37000
    },
    {
      skuId: '26sap152__152',
      productCode: '26sap152',
      productName: '2026 SAPPAROD PRO',
      size: '152',
      srp: 37000
    }
  ];
  const existingInventory = [{ skuId: '26sap148__148' }];

  const seedRows = buildInventorySeedRows(products, existingInventory);

  assert.deepEqual(seedRows, [
    [
      '26sap152__152',
      '26sap152',
      '2026 SAPPAROD PRO',
      '152',
      37000,
      '',
      2,
      '',
      '',
      true
    ]
  ]);
});
