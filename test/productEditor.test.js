import assert from 'node:assert/strict';
import test from 'node:test';
import { findProductSheetRow, validateEditorPassword } from '../server/services/productEditor.js';

test('validateEditorPassword requires configured password match', () => {
  assert.equal(validateEditorPassword('secret', 'secret'), true);
  assert.equal(validateEditorPassword('wrong', 'secret'), false);
  assert.equal(validateEditorPassword('secret', ''), false);
});

test('findProductSheetRow maps SKU to ITEM CODES and SRPs sheet row number', () => {
  const rows = [
    ['DESCRIPTION', 'SIZE', 'ITEM CODE', 'SRP'],
    ['BOARDS'],
    ['2026 SAPPAROD PRO', 148, '26sap148', 37000],
    ['', 152, '26sap152', 37000]
  ];

  assert.equal(findProductSheetRow(rows, '26sap148__148'), 5);
  assert.equal(findProductSheetRow(rows, '26sap152__152'), 6);
  assert.equal(findProductSheetRow(rows, 'missing__na'), null);
});
