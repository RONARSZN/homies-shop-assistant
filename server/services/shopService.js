import {
  CURRENT_INVENTORY_RANGE,
  PRODUCT_RANGE,
  SALES_RANGE,
  SHEETS
} from '../sheets/constants.js';
import {
  appendValues,
  clearValues,
  ensureSheet,
  ensureSetupSheets,
  getSpreadsheetMetadata,
  getValues,
  updateValues
} from '../sheets/client.js';
import {
  buildInventorySeedRows,
  mergeProductsWithInventory,
  parseInventory,
  parseProducts,
  parseSales
} from '../sheets/parsers.js';
import { buildReports } from './reportBuilder.js';

export async function getSetupStatus() {
  const metadata = await getSpreadsheetMetadata();
  const titles = metadata.sheets.map((sheet) => sheet.properties.title);
  return {
    spreadsheetTitle: metadata.properties.title,
    spreadsheetTimeZone: metadata.properties.timeZone,
    hasCurrentInventory: titles.includes(SHEETS.currentInventory),
    hasAdjustments: titles.includes(SHEETS.adjustments)
  };
}

export async function setupSheets() {
  await ensureSetupSheets();
  const [productRows, inventoryRows] = await Promise.all([
    getValues(PRODUCT_RANGE),
    getOptionalValues(CURRENT_INVENTORY_RANGE)
  ]);
  const seedRows = buildInventorySeedRows(
    parseProducts(productRows),
    parseInventory(inventoryRows)
  );

  if (seedRows.length) {
    await appendValues(`'${SHEETS.currentInventory}'!A:J`, seedRows);
  }

  return getSetupStatus();
}

export async function getProducts() {
  const [productRows, inventoryRows] = await Promise.all([
    getValues(PRODUCT_RANGE),
    getOptionalValues(CURRENT_INVENTORY_RANGE)
  ]);

  return mergeProductsWithInventory(
    parseProducts(productRows),
    parseInventory(inventoryRows)
  );
}

export async function getSales() {
  return parseSales(await getValues(SALES_RANGE));
}

export async function getAnalytics() {
  const [products, sales] = await Promise.all([getProducts(), getSales()]);
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const unitsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const soldByCode = new Map();

  for (const sale of sales) {
    soldByCode.set(
      sale.productCode,
      (soldByCode.get(sale.productCode) || 0) + sale.quantity
    );
  }

  const bestSellers = [...soldByCode.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([productCode, quantity]) => ({ productCode, quantity }));

  return {
    totalSales,
    unitsSold,
    bestSellers,
    lowStock: products.filter((item) => item.stockStatus === 'low-stock'),
    soldOut: products.filter((item) => item.stockStatus === 'sold-out'),
    uncounted: products.filter((item) => item.stockStatus === 'uncounted')
  };
}

export async function generateReports() {
  const [products, sales] = await Promise.all([getProducts(), getSales()]);
  const reports = buildReports(products, sales);

  for (const report of reports) {
    await ensureSheet(report.title);
    await clearValues(`'${report.title}'!A:Z`);
    await updateValues(`'${report.title}'!A1`, report.rows);
  }

  return {
    ok: true,
    reports: reports.map((report) => report.title)
  };
}

export async function logSale(input) {
  const sale = normalizeSale(input);
  const products = await getProducts();
  const product = products.find((item) => item.skuId === sale.skuId);

  if (!product) throw new Error('Product was not found.');
  if (product.quantity === null) {
    throw new Error('This product has not been physically counted yet.');
  }
  if (product.quantity - sale.quantitySold < 0 && !sale.confirmNegativeStock) {
    throw new Error('Sale would make stock negative.');
  }

  await appendValues(`'${SHEETS.sales}'!A:G`, [
    [
      '',
      sale.date,
      product.productCode,
      sale.quantitySold,
      sale.salePrice,
      sale.customerName,
      formatRemarks(sale)
    ]
  ]);

  await setInventoryQuantity(product.skuId, product.quantity - sale.quantitySold);
  return { ok: true };
}

export async function adjustInventory(input) {
  const adjustment = normalizeAdjustment(input);
  const products = await getProducts();
  const product = products.find((item) => item.skuId === adjustment.skuId);

  if (!product) throw new Error('Product was not found.');
  if (!adjustment.reason) throw new Error('Adjustment reason is required.');

  const before = product.quantity ?? 0;
  const after = adjustment.quantityAfter;
  await setInventoryQuantity(product.skuId, after);
  await appendValues(`'${SHEETS.adjustments}'!A:K`, [
    [
      adjustment.date,
      product.skuId,
      product.productCode,
      product.productName,
      product.size,
      before,
      after,
      after - before,
      adjustment.reason,
      adjustment.staffName,
      adjustment.notes
    ]
  ]);

  return { ok: true };
}

async function setInventoryQuantity(skuId, quantity) {
  const rows = await getValues(CURRENT_INVENTORY_RANGE);
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === skuId);

  if (rowIndex === -1) {
    throw new Error('SKU is missing from CURRENT INVENTORY.');
  }

  await updateValues(`'${SHEETS.currentInventory}'!F${rowIndex + 1}`, [[quantity]]);
}

async function getOptionalValues(range) {
  try {
    return await getValues(range);
  } catch (error) {
    if (String(error.message || '').includes('Unable to parse range')) return [];
    throw error;
  }
}

function normalizeSale(input) {
  return {
    skuId: input.skuId,
    date: input.date || manilaDate(),
    quantitySold: Number(input.quantitySold),
    salePrice: Number(input.salePrice),
    discount: input.discount || '',
    paymentMethod: input.paymentMethod || '',
    customerName: input.customerName || '',
    staffName: input.staffName || '',
    notes: input.notes || '',
    receiptRef: input.receiptRef || '',
    confirmNegativeStock: Boolean(input.confirmNegativeStock)
  };
}

function normalizeAdjustment(input) {
  return {
    skuId: input.skuId,
    date: input.date || manilaDate(),
    quantityAfter: Number(input.quantityAfter),
    reason: input.reason || '',
    staffName: input.staffName || '',
    notes: input.notes || ''
  };
}

function formatRemarks(sale) {
  return [
    sale.paymentMethod && `Payment: ${sale.paymentMethod}`,
    sale.discount && `Discount: ${sale.discount}`,
    sale.staffName && `Staff: ${sale.staffName}`,
    sale.receiptRef && `Ref: ${sale.receiptRef}`,
    sale.notes
  ]
    .filter(Boolean)
    .join(' | ');
}

function manilaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
