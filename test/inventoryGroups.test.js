import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getInventoryView,
  groupInventoryByCategory
} from '../public/inventoryGroups.js';

test('groupInventoryByCategory groups active products by classification in sheet order', () => {
  const groups = groupInventoryByCategory([
    { productName: 'Wakeboard A', category: 'BOARDS', active: true },
    { productName: 'Vest A', category: 'VESTS', active: true },
    { productName: 'Wakeboard B', category: 'BOARDS', active: true },
    { productName: 'Hidden', category: 'BOARDS', active: false },
    { productName: 'Loose Item', category: '', active: true }
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      category: group.category,
      count: group.products.length,
      names: group.products.map((product) => product.productName)
    })),
    [
      { category: 'BOARDS', count: 2, names: ['Wakeboard A', 'Wakeboard B'] },
      { category: 'VESTS', count: 1, names: ['Vest A'] },
      { category: 'Unclassified', count: 1, names: ['Loose Item'] }
    ]
  );
});

test('getInventoryView shows category cards until a group is opened or search is used', () => {
  const products = [
    {
      productName: 'Wakeboard A',
      category: 'BOARDS',
      active: true,
      searchText: 'wakeboard a',
      stockStatus: 'uncounted'
    },
    {
      productName: 'Vest A',
      category: 'VESTS',
      active: true,
      searchText: 'vest a',
      stockStatus: 'uncounted'
    }
  ];

  assert.equal(
    getInventoryView(products, {
      query: '',
      stockFilter: 'all',
      selectedCategory: null
    }).mode,
    'categories'
  );

  assert.deepEqual(
    getInventoryView(products, {
      query: '',
      stockFilter: 'all',
      selectedCategory: 'BOARDS'
    }).groups.map((group) => group.category),
    ['BOARDS']
  );

  assert.deepEqual(
    getInventoryView(products, {
      query: 'vest',
      stockFilter: 'all',
      selectedCategory: null
    }).groups.map((group) => group.category),
    ['VESTS']
  );
});
