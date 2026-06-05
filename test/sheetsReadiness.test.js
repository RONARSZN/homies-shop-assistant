import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeSheetsReadiness } from '../server/services/sheetsReadiness.js';

test('summarizeSheetsReadiness reports sheet access and missing setup sheets', () => {
  const summary = summarizeSheetsReadiness({
    setup: {
      spreadsheetTitle: 'Homies Inventory',
      spreadsheetTimeZone: 'Asia/Manila',
      hasCurrentInventory: false,
      hasAdjustments: true
    },
    productCount: 42,
    salesCount: 7
  });

  assert.deepEqual(summary, {
    spreadsheetTitle: 'Homies Inventory',
    spreadsheetTimeZone: 'Asia/Manila',
    productCount: 42,
    salesCount: 7,
    hasCurrentInventory: false,
    hasAdjustments: true,
    missingSetupSheets: ['CURRENT INVENTORY']
  });
});
