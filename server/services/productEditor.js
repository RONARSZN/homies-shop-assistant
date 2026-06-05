import { PRODUCT_RANGE, SHEETS, CURRENT_INVENTORY_RANGE } from '../sheets/constants.js';
import { getValues, updateValues } from '../sheets/client.js';
import { buildSkuId, clean } from '../sheets/parsers.js';
import { assertCanUpdate } from './sheetWritePolicy.js';

export function validateEditorPassword(inputPassword, configuredPassword) {
  return Boolean(configuredPassword && inputPassword === configuredPassword);
}

export function findProductSheetRow(rows, skuId) {
  const startRow = 3;

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const size = clean(row[1]);
    const productCode = clean(row[2]);

    if (productCode && buildSkuId(productCode, size) === skuId) {
      return startRow + index;
    }
  }

  return null;
}

export async function updateProductPrice({ skuId, srp }) {
  const price = Number(srp);
  if (!skuId) throw new Error('Product is required.');
  if (!Number.isFinite(price) || price < 0) throw new Error('Valid price is required.');

  const productRows = await getValues(PRODUCT_RANGE);
  const productSheetRow = findProductSheetRow(productRows, skuId);

  if (!productSheetRow) throw new Error('Product row was not found.');

  const productRange = `'${SHEETS.products}'!D${productSheetRow}`;
  assertCanUpdate('product-management', productRange);
  await updateValues(productRange, [[price]]);
  await updateCurrentInventoryPrice(skuId, price);

  return { ok: true };
}

async function updateCurrentInventoryPrice(skuId, price) {
  const rows = await getValues(CURRENT_INVENTORY_RANGE);
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === skuId);

  if (rowIndex === -1) return;

  const inventoryPriceRange = `'${SHEETS.currentInventory}'!E${rowIndex + 1}`;
  assertCanUpdate('product-management', inventoryPriceRange);
  await updateValues(inventoryPriceRange, [[price]]);
}
