import { SALES_START_ROW } from './constants.js';

const SECTION_WORDS = new Set([
  'BOARDS',
  'BINDINGS',
  'VESTS',
  'HELMETS',
  'WAKESKATES',
  'APPAREL',
  'ACCESSORIES'
]);

export function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function excelSerialToDate(serial) {
  if (typeof serial !== 'number') return serial || '';
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000).toISOString().slice(0, 10);
}

export function parseProducts(rows) {
  let currentCategory = '';
  let currentName = '';

  return rows
    .slice(1)
    .map((row) => {
      const description = clean(row[0]);
      const size = clean(row[1]);
      const productCode = clean(row[2]);
      const srp = toNumber(row[3]);

      if (description && !productCode) {
        currentCategory = SECTION_WORDS.has(description.toUpperCase())
          ? description
          : currentCategory;
        currentName = SECTION_WORDS.has(description.toUpperCase())
          ? currentName
          : description;
      }

      if (!productCode || productCode.toLowerCase() === 'item code') {
        return null;
      }

      if (description) currentName = description;

      return {
        skuId: buildSkuId(productCode, size),
        productCode,
        productName: currentName || productCode,
        category: currentCategory,
        size,
        srp,
        searchText: [productCode, currentName, currentCategory, size, srp]
          .filter((value) => value !== null && value !== undefined)
          .join(' ')
          .toLowerCase()
      };
    })
    .filter(Boolean);
}

export function parseInventory(rows) {
  return rows
    .slice(1)
    .filter((row) => clean(row[0]) || clean(row[1]))
    .map((row) => ({
      skuId: clean(row[0]),
      productCode: clean(row[1]),
      productName: clean(row[2]),
      size: clean(row[3]),
      srp: toNumber(row[4]),
      quantity: toNumber(row[5]),
      lowStockThreshold: toNumber(row[6]) ?? 2,
      lastCountedAt: clean(row[7]),
      notes: clean(row[8]),
      active: clean(row[9]).toLowerCase() !== 'false'
    }));
}

export function parseSales(rows) {
  return rows
    .map((row, index) => ({ row, rowNumber: SALES_START_ROW + index }))
    .slice(1)
    .filter(({ row }) => clean(row[1]) || clean(row[2]))
    .filter(({ row }) => clean(row[2]).toLowerCase() !== 'grand total')
    .map(({ row, rowNumber }) => ({
      rowNumber,
      month: clean(row[0]),
      date: excelSerialToDate(row[1]),
      productCode: clean(row[2]),
      quantity: toNumber(row[3]) ?? 0,
      amount: toNumber(row[4]) ?? 0,
      customerName: clean(row[5]),
      remarks: clean(row[6])
    }));
}

export function parsePendingSales(rows) {
  return rows
    .map((row, index) => ({ row, rowNumber: index + 1 }))
    .slice(1)
    .filter(({ row }) => clean(row[0]) || clean(row[3]))
    .map(({ row, rowNumber }) => ({
      rowNumber,
      pendingId: clean(row[0]),
      submittedAt: clean(row[1]),
      saleDate: excelSerialToDate(row[2]),
      skuId: clean(row[3]),
      productCode: clean(row[4]),
      productName: clean(row[5]),
      size: clean(row[6]),
      quantity: toNumber(row[7]) ?? 0,
      amount: toNumber(row[8]) ?? 0,
      customerName: clean(row[9]),
      staffName: clean(row[10]),
      notes: clean(row[11]),
      status: clean(row[12]) || 'PENDING',
      actionedAt: clean(row[13]),
      frontDeskStaff: clean(row[14]),
      cancelReason: clean(row[15])
    }));
}

export function mergeProductsWithInventory(products, inventory) {
  const inventoryBySku = new Map(inventory.map((item) => [item.skuId, item]));

  return products.map((product) => {
    const stock = inventoryBySku.get(product.skuId);
    const quantity = stock?.quantity ?? null;
    const lowStockThreshold = stock?.lowStockThreshold ?? 2;

    return {
      ...product,
      quantity,
      lowStockThreshold,
      lastCountedAt: stock?.lastCountedAt || '',
      notes: stock?.notes || '',
      active: stock?.active ?? true,
      stockStatus: getStockStatus(quantity, lowStockThreshold)
    };
  });
}

export function buildInventorySeedRows(products, inventory) {
  const existingSkuIds = new Set(inventory.map((item) => item.skuId));

  return products
    .filter((product) => !existingSkuIds.has(product.skuId))
    .map((product) => [
      product.skuId,
      product.productCode,
      product.productName,
      product.size,
      product.srp ?? '',
      '',
      2,
      '',
      '',
      true
    ]);
}

export function getStockStatus(quantity, lowStockThreshold = 2) {
  if (quantity === null || quantity === undefined) return 'uncounted';
  if (quantity <= 0) return 'sold-out';
  if (quantity <= lowStockThreshold) return 'low-stock';
  return 'in-stock';
}

export function buildSkuId(productCode, size) {
  return [slug(productCode), slug(size || 'na')].filter(Boolean).join('__');
}

export function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
