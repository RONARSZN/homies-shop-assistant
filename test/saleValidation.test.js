import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSaleLines,
  normalizeSale
} from '../server/services/saleValidation.js';

test('normalizeSale accepts multiple sale items with shared fields', () => {
  const sale = normalizeSale({
    paymentMethod: 'Cash',
    customerName: 'Mark',
    staffName: 'Mark',
    items: [
      { skuId: 'board__148', quantitySold: '1', salePrice: '37000' },
      { skuId: 'vest__m', quantitySold: '2', salePrice: '7000' }
    ]
  });

  assert.equal(sale.paymentMethod, 'Cash');
  assert.equal(sale.items.length, 2);
  assert.deepEqual(sale.items[1], {
    skuId: 'vest__m',
    quantitySold: 2,
    salePrice: 7000
  });
});

test('buildSaleLines validates total quantity per SKU before stock deduction', () => {
  const sale = normalizeSale({
    items: [
      { skuId: 'board__148', quantitySold: '1', salePrice: '37000' },
      { skuId: 'board__148', quantitySold: '2', salePrice: '37000' }
    ]
  });

  assert.throws(
    () =>
      buildSaleLines({
        sale,
        products: [
          {
            skuId: 'board__148',
            productCode: '26sap148',
            quantity: 2
          }
        ]
      }),
    /Sale would make stock negative/
  );
});

test('buildSaleLines returns row data and stock updates for valid items', () => {
  const sale = normalizeSale({
    date: '2026-06-04',
    paymentMethod: 'Cash',
    customerName: 'Mark',
    staffName: 'Mark',
    items: [
      { skuId: 'board__148', quantitySold: '1', salePrice: '37000' },
      { skuId: 'vest__m', quantitySold: '2', salePrice: '7000' }
    ]
  });
  const result = buildSaleLines({
    sale,
    products: [
      { skuId: 'board__148', productCode: '26sap148', quantity: 2 },
      { skuId: 'vest__m', productCode: 'vest', quantity: 4 }
    ]
  });

  assert.deepEqual(
    result.lines.map((line) => ({
      productCode: line.product.productCode,
      stockLeft: line.stockLeft,
      quantitySold: line.item.quantitySold
    })),
    [
      { productCode: '26sap148', stockLeft: 1, quantitySold: 1 },
      { productCode: 'vest', stockLeft: 2, quantitySold: 2 }
    ]
  );
});
