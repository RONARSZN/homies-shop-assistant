import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findProductBySaleSearchLabel,
  saleSearchLabel
} from '../public/productSearch.js';

test('saleSearchLabel includes code, name, size, price, and quantity', () => {
  assert.equal(
    saleSearchLabel({
      productCode: '26sap148',
      productName: '2026 SAPPAROD PRO',
      size: '148',
      srp: 37000,
      quantity: 2
    }),
    '26sap148 - 2026 SAPPAROD PRO - Size 148 - PHP 37,000 - Stock 2'
  );
});

test('findProductBySaleSearchLabel returns the selected active product', () => {
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
      skuId: 'hidden__xl',
      productCode: 'hidden',
      productName: 'Hidden Vest',
      size: 'XL',
      srp: 5000,
      quantity: 1,
      active: false
    }
  ];

  assert.equal(
    findProductBySaleSearchLabel(
      products,
      '26sap148 - 2026 SAPPAROD PRO - Size 148 - PHP 37,000 - Stock 2'
    ).skuId,
    '26sap148__148'
  );
  assert.equal(findProductBySaleSearchLabel(products, 'Hidden Vest'), null);
});
