import {
  CURRENT_INVENTORY_RANGE,
  PENDING_SALES_RANGE,
  PRODUCT_RANGE,
  SALES_RANGE,
  SHEETS
} from '../sheets/constants.js';
import { config } from '../config.js';
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
  parsePendingSales,
  parseProducts,
  parseSales
} from '../sheets/parsers.js';
import { buildReports } from './reportBuilder.js';
import { buildInventoryMovementSummary } from './inventoryMovement.js';
import { buildSaleLines, normalizeSale } from './saleValidation.js';
import {
  assertCanAppend,
  assertCanClear,
  assertCanUpdate
} from './sheetWritePolicy.js';
import { notifySaleLogged } from './whatsappNotifier.js';

export async function getSetupStatus() {
  const metadata = await getSpreadsheetMetadata();
  const titles = metadata.sheets.map((sheet) => sheet.properties.title);
  return {
    spreadsheetTitle: metadata.properties.title,
    spreadsheetTimeZone: metadata.properties.timeZone,
    hasCurrentInventory: titles.includes(SHEETS.currentInventory),
    hasAdjustments: titles.includes(SHEETS.adjustments),
    hasPendingSales: titles.includes(SHEETS.pendingSales),
    hasCanceledSales: titles.includes(SHEETS.canceledSales)
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
    const range = `'${SHEETS.currentInventory}'!A:J`;
    assertCanAppend('setup', range);
    await appendValues(range, seedRows);
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

export async function getFrontDeskQueue(deps = defaultDeps(), options = {}) {
  const rows = await deps.getValues(PENDING_SALES_RANGE);
  const items = parsePendingSales(rows);
  const visibleItems = options.includeHistory
    ? items
    : items.filter((item) => item.status === 'PENDING');

  return { transactions: groupPendingTransactions(visibleItems) };
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
    inventoryMovement: buildInventoryMovementSummary({ products, sales }),
    lowStock: products.filter((item) => item.stockStatus === 'low-stock'),
    soldOut: products.filter((item) => item.stockStatus === 'sold-out'),
    uncounted: products.filter((item) => item.stockStatus === 'uncounted')
  };
}

export async function generateReports() {
  const [products, sales] = await Promise.all([getProducts(), getSales()]);
  const reports = buildReports(products, sales);

  for (const report of reports) {
    await ensureSheet(report.title, 'report');

    const clearRange = `'${report.title}'!A:Z`;
    assertCanClear('report', clearRange);
    await clearValues(clearRange);

    const updateRange = `'${report.title}'!A1`;
    assertCanUpdate('report', updateRange);
    await updateValues(updateRange, report.rows);
  }

  return {
    ok: true,
    reports: reports.map((report) => report.title)
  };
}

export async function logSale(input, deps = defaultDeps()) {
  const sale = normalizeSale(input);
  const products = await deps.getProducts();
  const { lines } = buildSaleLines({ sale, products });
  const pendingId = deps.createPendingId();
  const submittedAt = deps.now();
  const pendingRows = buildPendingSaleRows({ sale, lines, pendingId, submittedAt });
  const pendingRange = `'${SHEETS.pendingSales}'!A:P`;

  assertCanAppend('sale-submit', pendingRange);
  await deps.appendValues(pendingRange, pendingRows);

  return {
    ok: true,
    pendingId,
    itemCount: pendingRows.length
  };
}

export function unlockFrontDesk(input, deps = defaultDeps()) {
  assertFrontDeskPassword(input?.password, deps.frontDeskPassword);
  return { ok: true };
}

export async function verifyPendingSaleItem(input, deps = defaultDeps()) {
  assertFrontDeskPassword(input?.password, deps.frontDeskPassword);
  const item = await findPendingItem(input.rowNumber, deps);
  await verifyPendingItem(item, input, deps);
  return { ok: true };
}

export async function verifyPendingSaleTransaction(input, deps = defaultDeps()) {
  assertFrontDeskPassword(input?.password, deps.frontDeskPassword);
  const items = await findPendingTransaction(input.pendingId, deps);

  for (const item of items) {
    await verifyPendingItem(item, input, deps);
  }

  return { ok: true, itemCount: items.length };
}

export async function cancelPendingSaleItem(input, deps = defaultDeps()) {
  assertFrontDeskPassword(input?.password, deps.frontDeskPassword);
  const cancelReason = String(input.cancelReason || '').trim();
  if (!cancelReason) throw new Error('Cancel reason is required.');

  const item = await findPendingItem(input.rowNumber, deps);
  await cancelPendingItem(item, { ...input, cancelReason }, deps);
  return { ok: true };
}

export async function cancelPendingSaleTransaction(input, deps = defaultDeps()) {
  assertFrontDeskPassword(input?.password, deps.frontDeskPassword);
  const cancelReason = String(input.cancelReason || '').trim();
  if (!cancelReason) throw new Error('Cancel reason is required.');

  const items = await findPendingTransaction(input.pendingId, deps);

  for (const item of items) {
    await cancelPendingItem(item, { ...input, cancelReason }, deps);
  }

  return { ok: true, itemCount: items.length };
}

export async function cancelSale(input) {
  throw new Error('Official sale cancellation is disabled. Cancel pending sales from Front Desk before verification.');
}

export async function adjustInventory(input) {
  const adjustment = normalizeAdjustment(input);
  const products = await getProducts();
  const product = products.find((item) => item.skuId === adjustment.skuId);

  if (!product) throw new Error('Product was not found.');
  if (!adjustment.reason) throw new Error('Adjustment reason is required.');

  const before = product.quantity ?? 0;
  const after = adjustment.quantityAfter;
  await setInventoryQuantity(product.skuId, after, 'adjustment');

  const adjustmentsRange = `'${SHEETS.adjustments}'!A:K`;
  assertCanAppend('adjustment', adjustmentsRange);
  await appendValues(adjustmentsRange, [
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

async function setInventoryQuantity(skuId, quantity, action, deps = defaultDeps()) {
  const rows = await deps.getValues(CURRENT_INVENTORY_RANGE);
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === skuId);

  if (rowIndex === -1) {
    throw new Error('SKU is missing from CURRENT INVENTORY.');
  }

  const range = `'${SHEETS.currentInventory}'!F${rowIndex + 1}`;
  assertCanUpdate(action, range);
  await deps.updateValues(range, [[quantity]]);
}

async function writeSalesRows({ action, saleDate, rows, deps = defaultDeps() }) {
  const currentRows = await deps.getValues(SALES_RANGE);
  const range = findSalesWriteRange({
    saleDate,
    rowCount: rows.length,
    rows: currentRows
  });

  assertCanUpdate(action, range);
  await deps.updateValues(range, rows);
}

async function getOptionalValues(range) {
  try {
    return await getValues(range);
  } catch (error) {
    if (String(error.message || '').includes('Unable to parse range')) return [];
    throw error;
  }
}

function defaultDeps() {
  return {
    frontDeskPassword: config.frontDeskPassword,
    getProducts,
    getValues,
    appendValues,
    updateValues,
    createPendingId,
    now: manilaTimestamp
  };
}

function assertFrontDeskPassword(password, frontDeskPassword) {
  if (!frontDeskPassword) {
    throw new Error('Front Desk password is not configured. Set FRONT_DESK_PASSWORD.');
  }
  if (!password || password !== frontDeskPassword) {
    throw new Error('Incorrect Front Desk password.');
  }
}

async function findPendingItem(rowNumber, deps) {
  const normalizedRowNumber = Number(rowNumber);
  if (!Number.isInteger(normalizedRowNumber) || normalizedRowNumber <= 1) {
    throw new Error('Pending sale item is required.');
  }

  const items = parsePendingSales(await deps.getValues(PENDING_SALES_RANGE));
  const item = items.find((candidate) => candidate.rowNumber === normalizedRowNumber);
  if (!item) throw new Error('Pending sale item was not found.');
  if (item.status !== 'PENDING') {
    throw new Error('This pending sale item has already been actioned.');
  }
  return item;
}

async function findPendingTransaction(pendingId, deps) {
  const normalizedPendingId = String(pendingId || '').trim();
  if (!normalizedPendingId) throw new Error('Pending ID is required.');

  const items = parsePendingSales(await deps.getValues(PENDING_SALES_RANGE))
    .filter((item) => item.pendingId === normalizedPendingId && item.status === 'PENDING');

  if (!items.length) throw new Error('No pending sale items were found for this transaction.');
  return items;
}

async function verifyPendingItem(item, input, deps) {
  await writeSalesRows({
    action: 'front-desk-verify',
    saleDate: item.saleDate,
    rows: [buildSaleRowFromPending(item)],
    deps
  });

  const product = (await deps.getProducts()).find((candidate) => candidate.skuId === item.skuId);
  if (!product) throw new Error('Product was not found.');
  if (product.quantity === null) throw new Error('This product has not been physically counted yet.');

  await setInventoryQuantity(
    item.skuId,
    product.quantity - item.quantity,
    'front-desk-verify',
    deps
  );

  const range = `'${SHEETS.pendingSales}'!M${item.rowNumber}:O${item.rowNumber}`;
  assertCanUpdate('front-desk-verify', range);
  await deps.updateValues(range, [['VERIFIED', deps.now(), input.staffName || '']]);
}

async function cancelPendingItem(item, input, deps) {
  const actionedAt = deps.now();
  const frontDeskStaff = input.staffName || '';
  const range = `'${SHEETS.pendingSales}'!M${item.rowNumber}:P${item.rowNumber}`;
  const canceledRange = `'${SHEETS.canceledSales}'!A:P`;

  assertCanUpdate('front-desk-cancel', range);
  await deps.updateValues(range, [['CANCELED', actionedAt, frontDeskStaff, input.cancelReason]]);

  assertCanAppend('front-desk-cancel', canceledRange);
  await deps.appendValues(canceledRange, [
    pendingItemToRow({
      ...item,
      status: 'CANCELED',
      actionedAt,
      frontDeskStaff,
      cancelReason: input.cancelReason
    })
  ]);
}

function groupPendingTransactions(items) {
  const byPendingId = new Map();

  for (const item of items) {
    if (!byPendingId.has(item.pendingId)) {
      byPendingId.set(item.pendingId, {
        pendingId: item.pendingId,
        submittedAt: item.submittedAt,
        saleDate: item.saleDate,
        customerName: item.customerName,
        staffName: item.staffName,
        notes: item.notes,
        items: []
      });
    }
    byPendingId.get(item.pendingId).items.push(item);
  }

  return [...byPendingId.values()].sort((a, b) =>
    String(b.submittedAt).localeCompare(String(a.submittedAt))
  );
}

function buildPendingSaleRows({ sale, lines, pendingId, submittedAt }) {
  return lines.map(({ item, product }) => [
    pendingId,
    submittedAt,
    sale.date,
    product.skuId,
    product.productCode,
    product.productName,
    product.size,
    item.quantitySold,
    item.salePrice,
    sale.customerName,
    sale.staffName,
    sale.notes,
    'PENDING',
    '',
    '',
    ''
  ]);
}

function buildSaleRowFromPending(item) {
  return [
    monthName(item.saleDate),
    item.saleDate,
    item.productCode,
    item.quantity,
    item.amount,
    item.customerName,
    item.staffName
  ];
}

function pendingItemToRow(item) {
  return [
    item.pendingId,
    item.submittedAt,
    item.saleDate,
    item.skuId,
    item.productCode,
    item.productName,
    item.size,
    item.quantity,
    item.amount,
    item.customerName,
    item.staffName,
    item.notes,
    item.status,
    item.actionedAt,
    item.frontDeskStaff,
    item.cancelReason
  ];
}

export function normalizeAdjustment(input) {
  return {
    skuId: input.skuId,
    date: input.date || manilaDate(),
    quantityAfter: Number(input.quantityAfter),
    reason: input.reason || '',
    staffName: input.staffName || '',
    notes: input.notes || ''
  };
}

export function normalizeSaleCancellation(input) {
  const rowNumber = Number(input.rowNumber);
  const reason = input.reason || '';

  if (!Number.isInteger(rowNumber) || rowNumber <= 0) {
    throw new Error('Sale row is required.');
  }
  if (!reason.trim()) throw new Error('Cancellation reason is required.');

  return {
    rowNumber,
    skuId: input.skuId || '',
    date: input.date || manilaDate(),
    reason,
    staffName: input.staffName || ''
  };
}

export function resolveCancellationProduct({ sale, products, skuId = '' }) {
  const candidates = products.filter(
    (product) => product.productCode === sale.productCode
  );

  if (skuId) {
    const selected = candidates.find((product) => product.skuId === skuId);
    if (!selected) throw new Error('Selected product does not match the sale.');
    return selected;
  }

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    throw new Error('Choose the exact product size to restore stock.');
  }

  throw new Error('Product was not found.');
}

function manilaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila'
  }).format(new Date());
}

function manilaTimestamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+08:00`;
}

function createPendingId() {
  return `PEND-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

export function buildSaleRows({ sale, lines }) {
  return lines.map(({ item, product }) => [
    monthName(sale.date),
    sale.date,
    product.productCode,
    item.quantitySold,
    item.salePrice,
    sale.customerName,
    sale.staffName
  ]);
}

export function buildSaleCancellationRow({ sale, cancellation }) {
  return [
    monthName(cancellation.date),
    cancellation.date,
    sale.productCode,
    -sale.quantity,
    -sale.amount,
    sale.customerName,
    cancellationRemark({ sale, cancellation })
  ];
}

export function findSalesWriteRange({ saleDate, rowCount, rows }) {
  const month = monthName(saleDate).toUpperCase();
  const monthIndex = rows.findIndex(
    (row) => String(row[0] || '').trim().toUpperCase() === month
  );

  if (monthIndex === -1) {
    throw new Error(`No ${month} section was found in SALES.`);
  }

  const totalIndex = rows.findIndex(
    (row, index) =>
      index > monthIndex &&
      String(row[2] || '').trim().toUpperCase() === 'GRAND TOTAL'
  );

  if (totalIndex === -1) {
    throw new Error(`No ${month} grand total row was found in SALES.`);
  }

  for (let index = monthIndex + 1; index <= totalIndex - rowCount; index += 1) {
    const candidateRows = rows.slice(index, index + rowCount);
    if (candidateRows.every(isBlankSalesRow)) {
      const startRow = 5 + index;
      const endRow = startRow + rowCount - 1;
      return `'${SHEETS.sales}'!A${startRow}:G${endRow}`;
    }
  }

  throw new Error(`No empty sales rows available in the ${month} section.`);
}

function isBlankSalesRow(row = []) {
  return row.every((cell) => String(cell ?? '').trim() === '');
}

function cancellationRemark({ sale, cancellation }) {
  const staff = cancellation.staffName || 'Unknown staff';
  const reason = cancellation.reason || 'No reason provided';
  return `CANCELLED row ${sale.rowNumber} by ${staff}: ${reason}`;
}

function monthName(date) {
  const parsed = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'Asia/Manila'
  }).format(parsed);
}

export async function notifySaleLinesLoggedSafely({
  sale,
  lines,
  notifySaleLoggedImpl = notifySaleLogged,
  logger = console
}) {
  const results = [];

  for (const { item, product, stockLeft } of lines) {
    try {
      const result = await notifySaleLoggedImpl({
        sale: { ...sale, ...item },
        product,
        stockLeft,
        whatsappConfig: config.whatsapp
      });
      if (result.messageId) {
        logger.log(`WhatsApp notification accepted by Meta: ${result.messageId}`);
      }
      results.push(result);
    } catch (error) {
      const debug = error.debug || {};
      logger.warn(
        `WhatsApp notification failed: ${error.message || 'Unknown error.'}`,
        debug
      );
      results.push({
        sent: false,
        error: error.message || 'WhatsApp notification failed.',
        debug
      });
    }
  }

  const failed = results.find((result) => result.error);
  if (failed) return failed;
  return results.length === 1 ? results[0] : { sent: results.some((result) => result.sent), results };
}
