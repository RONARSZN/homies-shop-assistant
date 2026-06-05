import { google } from 'googleapis';
import { config, hasGoogleConfig } from '../config.js';
import {
  ADJUSTMENTS_HEADERS,
  CURRENT_INVENTORY_HEADERS,
  PENDING_SALES_HEADERS,
  SHEETS
} from './constants.js';
import { assertCanEnsureSheet, assertCanUpdate } from '../services/sheetWritePolicy.js';

let sheetsClient;

export function getSheetsClient() {
  if (!hasGoogleConfig()) {
    throw new Error('Google Sheets environment variables are not configured.');
  }

  if (!sheetsClient) {
    const auth = new google.auth.JWT({
      email: config.googleServiceAccountEmail,
      key: config.googlePrivateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
  }

  return sheetsClient;
}

export async function getSpreadsheetMetadata() {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: config.spreadsheetId
  });
  return response.data;
}

export async function getValues(range) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });
  return response.data.values || [];
}

export async function appendValues(range, values) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });
}

export async function updateValues(range, values) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
}

export async function clearValues(range) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range
  });
}

export async function ensureSheet(title, action = 'report') {
  assertCanEnsureSheet(action, title);

  const metadata = await getSpreadsheetMetadata();
  const exists = metadata.sheets.some((sheet) => sheet.properties.title === title);
  if (exists) return;

  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }]
    }
  });
}

export async function ensureSetupSheets() {
  const metadata = await getSpreadsheetMetadata();
  const existing = new Set(metadata.sheets.map((sheet) => sheet.properties.title));
  const requests = [];

  if (!existing.has(SHEETS.currentInventory)) {
    assertCanEnsureSheet('setup', SHEETS.currentInventory);
    requests.push({ addSheet: { properties: { title: SHEETS.currentInventory } } });
  }

  if (!existing.has(SHEETS.adjustments)) {
    assertCanEnsureSheet('setup', SHEETS.adjustments);
    requests.push({ addSheet: { properties: { title: SHEETS.adjustments } } });
  }

  if (!existing.has(SHEETS.pendingSales)) {
    assertCanEnsureSheet('setup', SHEETS.pendingSales);
    requests.push({ addSheet: { properties: { title: SHEETS.pendingSales } } });
  }

  if (!existing.has(SHEETS.canceledSales)) {
    assertCanEnsureSheet('setup', SHEETS.canceledSales);
    requests.push({ addSheet: { properties: { title: SHEETS.canceledSales } } });
  }

  if (requests.length) {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.spreadsheetId,
      requestBody: { requests }
    });
  }

  const currentInventoryHeaderRange = `'${SHEETS.currentInventory}'!A1:J1`;
  const adjustmentsHeaderRange = `'${SHEETS.adjustments}'!A1:K1`;
  const pendingSalesHeaderRange = `'${SHEETS.pendingSales}'!A1:P1`;
  const canceledSalesHeaderRange = `'${SHEETS.canceledSales}'!A1:P1`;

  assertCanUpdate('setup', currentInventoryHeaderRange);
  await updateValues(currentInventoryHeaderRange, [CURRENT_INVENTORY_HEADERS]);

  assertCanUpdate('setup', adjustmentsHeaderRange);
  await updateValues(adjustmentsHeaderRange, [ADJUSTMENTS_HEADERS]);

  assertCanUpdate('setup', pendingSalesHeaderRange);
  await updateValues(pendingSalesHeaderRange, [PENDING_SALES_HEADERS]);

  assertCanUpdate('setup', canceledSalesHeaderRange);
  await updateValues(canceledSalesHeaderRange, [PENDING_SALES_HEADERS]);
}
