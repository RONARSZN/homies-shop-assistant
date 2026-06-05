import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSalePayloadFromRows } from '../public/saleItems.js';

test('buildSalePayloadFromRows resolves selected products into sale items', () => {
  const products = [
    {
      skuId: '26sap148__148',
      productCode: '26sap148',
      productName: '2026 SAPPAROD PRO',
      size: '148',
      srp: 37000,
      quantity: 2,
      active: true
    },
    {
      skuId: 'vest__m',
      productCode: 'vest',
      productName: 'Impact Vest',
      size: 'M',
      srp: 7500,
      quantity: 4,
      active: true
    }
  ];

  const payload = buildSalePayloadFromRows({
    products,
    rows: [
      {
        productSearch:
          '26sap148 - 2026 SAPPAROD PRO - Size 148 - PHP 37,000 - Stock 2',
        quantitySold: '1',
        salePrice: '37000'
      },
      {
        productSearch: 'vest - Impact Vest - Size M - PHP 7,500 - Stock 4',
        quantitySold: '2',
        salePrice: '7000'
      }
    ],
    sharedFields: {
      paymentMethod: 'Cash',
      customerName: 'Mark',
      staffName: 'Mark',
      receiptRef: 'R-1',
      notes: 'Bundle',
      confirmNegativeStock: false
    }
  });

  assert.deepEqual(payload, {
    paymentMethod: 'Cash',
    customerName: 'Mark',
    staffName: 'Mark',
    receiptRef: 'R-1',
    notes: 'Bundle',
    confirmNegativeStock: false,
    items: [
      { skuId: '26sap148__148', quantitySold: 1, salePrice: 37000 },
      { skuId: 'vest__m', quantitySold: 2, salePrice: 7000 }
    ]
  });
});

test('buildSalePayloadFromRows rejects unmatched product search text', () => {
  assert.throws(
    () =>
      buildSalePayloadFromRows({
        products: [],
        rows: [{ productSearch: 'missing', quantitySold: '1', salePrice: '1' }],
        sharedFields: {}
      }),
    /Choose a product/
  );
});
