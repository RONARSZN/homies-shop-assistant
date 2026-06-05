import { config } from '../config.js';
import { CURRENT_INVENTORY_RANGE, SHEETS } from '../sheets/constants.js';
import { getValues, updateValues } from '../sheets/client.js';
import { clean } from '../sheets/parsers.js';
import { assertCanUpdate } from './sheetWritePolicy.js';

export async function saveStockCount(input, deps = {}) {
  const service = {
    stockCountPassword: config.stockCountPassword,
    getValues,
    updateValues,
    manilaDate,
    ...deps
  };
  const count = normalizeStockCount(input);

  validateStockCountPassword(input.password, service.stockCountPassword);

  const rows = await service.getValues(CURRENT_INVENTORY_RANGE);
  const rowIndex = rows.findIndex((row, index) => index > 0 && clean(row[0]) === count.skuId);

  if (rowIndex === -1) throw new Error('Product is missing from CURRENT INVENTORY.');
  if (clean(rows[rowIndex][9]).toLowerCase() === 'false') {
    throw new Error('Product is not active.');
  }

  const rowNumber = rowIndex + 1;
  await updateStockCountCell(`'${SHEETS.currentInventory}'!F${rowNumber}`, [[count.quantity]], service);
  await updateStockCountCell(`'${SHEETS.currentInventory}'!H${rowNumber}`, [[service.manilaDate()]], service);

  if (count.notes) {
    await updateStockCountCell(`'${SHEETS.currentInventory}'!I${rowNumber}`, [[count.notes]], service);
  }

  return { ok: true };
}

export function normalizeStockCount(input = {}) {
  const quantity = Number(input.quantity);

  if (!clean(input.skuId)) throw new Error('Product is required.');
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('Quantity must be a whole number 0 or higher.');
  }

  return {
    skuId: clean(input.skuId),
    quantity,
    countedBy: clean(input.countedBy),
    notes: clean(input.notes)
  };
}

export function validateStockCountPassword(inputPassword, configuredPassword) {
  if (!configuredPassword) {
    throw new Error('Stock count password is not configured.');
  }
  if (inputPassword !== configuredPassword) {
    throw new Error('Incorrect stock count password.');
  }
}

async function updateStockCountCell(range, values, service) {
  assertCanUpdate('stock-count', range);
  await service.updateValues(range, values);
}

function manilaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila'
  }).format(new Date());
}
